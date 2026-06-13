// Fitbit OAuth — start + callback. Tokens are exchanged, AES-GCM encrypted,
// and stored server-side only (§22). Deployed with verify_jwt=false because
// the OAuth callback is hit by Fitbit (no Supabase JWT); the `start` action
// authenticates the caller manually via the Authorization header.
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const FITBIT_AUTHORIZE = "https://www.fitbit.com/oauth2/authorize"
const FITBIT_TOKEN = "https://api.fitbit.com/oauth2/token"
const SCOPES = "activity heartrate sleep weight profile"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!
const CLIENT_ID = Deno.env.get("FITBIT_CLIENT_ID") ?? ""
const CLIENT_SECRET = Deno.env.get("FITBIT_CLIENT_SECRET") ?? ""
const APP_URL = Deno.env.get("APP_URL") ?? "https://lifemap-silk.vercel.app"
const REDIRECT_URI = Deno.env.get("FITBIT_REDIRECT_URI") ?? `${SUPABASE_URL}/functions/v1/fitbit-auth`
const TOKEN_KEY = Deno.env.get("FITBIT_TOKEN_KEY") ?? ""

const cors = {
  "Access-Control-Allow-Origin": APP_URL,
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
}

/* ---- byte / base64 helpers ---- */
function b2b64(b: Uint8Array) { let s = ""; for (const x of b) s += String.fromCharCode(x); return btoa(s) }
function b642b(s: string) { const bin = atob(s); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a }
function b64url(s: string) { return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") }
function unb64url(s: string) { return atob(s.replace(/-/g, "+").replace(/_/g, "/")) }

/* ---- HMAC-signed OAuth state (prevents CSRF / forged callbacks) ---- */
async function hmac(msg: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(TOKEN_KEY), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg)))
  return b2b64(sig).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}
async function makeState(uid: string) { return `${b64url(uid)}.${await hmac(uid)}` }
async function readState(state: string): Promise<string> {
  const [u, sig] = state.split(".")
  const uid = unb64url(u)
  if ((await hmac(uid)) !== sig) throw new Error("bad state")
  return uid
}

/* ---- AES-GCM token encryption ---- */
async function aesKey() {
  return crypto.subtle.importKey("raw", b642b(TOKEN_KEY), "AES-GCM", false, ["encrypt", "decrypt"])
}
async function enc(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(), new TextEncoder().encode(plain)))
  const out = new Uint8Array(iv.length + ct.length); out.set(iv); out.set(ct, iv.length)
  return b2b64(out)
}

function redirect(status: string) {
  return new Response(null, { status: 302, headers: { ...cors, Location: `${APP_URL}/settings?fitbit=${status}` } })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const action = url.searchParams.get("action")

  try {
    // 1) START — authenticated client asks for the authorize URL
    if (action === "start") {
      const jwt = req.headers.get("Authorization")?.replace("Bearer ", "")
      if (!jwt) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } })
      const authClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: `Bearer ${jwt}` } } })
      const { data: { user } } = await authClient.auth.getUser()
      if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } })
      if (!CLIENT_ID || !TOKEN_KEY) return new Response(JSON.stringify({ error: "fitbit not configured" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } })

      const state = await makeState(user.id)
      const authorize = `${FITBIT_AUTHORIZE}?response_type=code&client_id=${CLIENT_ID}` +
        `&scope=${encodeURIComponent(SCOPES)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${encodeURIComponent(state)}`
      return new Response(JSON.stringify({ url: authorize }), { headers: { ...cors, "Content-Type": "application/json" } })
    }

    // 2) CALLBACK — Fitbit redirects here with ?code & ?state
    if (code) {
      const state = url.searchParams.get("state") ?? ""
      const uid = await readState(state)

      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
      })
      const tokenRes = await fetch(FITBIT_TOKEN, {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      })
      if (!tokenRes.ok) return redirect("error")
      const tok = await tokenRes.json()

      const svc = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
      const expiresAt = new Date(Date.now() + (tok.expires_in ?? 28800) * 1000).toISOString()
      await svc.from("fitbit_tokens").upsert({
        user_id: uid,
        access_token: await enc(tok.access_token),
        refresh_token: await enc(tok.refresh_token),
        expires_at: expiresAt,
      }, { onConflict: "user_id" })
      await svc.from("fitbit_connections").upsert({
        user_id: uid, connected_at: new Date().toISOString(), scopes: tok.scope ?? SCOPES,
      }, { onConflict: "user_id" })

      return redirect("connected")
    }

    return new Response(JSON.stringify({ error: "bad request" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } })
  } catch (_e) {
    return action === "start"
      ? new Response(JSON.stringify({ error: "server error" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } })
      : redirect("error")
  }
})
