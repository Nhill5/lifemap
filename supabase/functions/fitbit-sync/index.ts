// Fitbit sync — pulls steps / sleep / resting HR / active minutes into
// fitbit_data, and weight straight into chief_goal_progress (auto-feeds the
// outcome tracker, §9). Tokens are read+decrypted server-side only; refreshed
// when expired. Deployed with verify_jwt=true.
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!
const CLIENT_ID = Deno.env.get("FITBIT_CLIENT_ID") ?? ""
const CLIENT_SECRET = Deno.env.get("FITBIT_CLIENT_SECRET") ?? ""
const APP_URL = Deno.env.get("APP_URL") ?? "https://lifemap-silk.vercel.app"
const TOKEN_KEY = Deno.env.get("FITBIT_TOKEN_KEY") ?? ""
const FITBIT_TOKEN = "https://api.fitbit.com/oauth2/token"

const cors = {
  "Access-Control-Allow-Origin": APP_URL,
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } })

function b2b64(b: Uint8Array) { let s = ""; for (const x of b) s += String.fromCharCode(x); return btoa(s) }
function b642b(s: string) { const bin = atob(s); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a }
async function aesKey() { return crypto.subtle.importKey("raw", b642b(TOKEN_KEY), "AES-GCM", false, ["encrypt", "decrypt"]) }
async function enc(plain: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(), new TextEncoder().encode(plain)))
  const out = new Uint8Array(iv.length + ct.length); out.set(iv); out.set(ct, iv.length)
  return b2b64(out)
}
async function dec(b64: string) {
  const data = b642b(b64); const iv = data.slice(0, 12); const ct = data.slice(12)
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await aesKey(), ct)
  return new TextDecoder().decode(pt)
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405)

  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!jwt) return json({ error: "unauthorized" }, 401)

  const authClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: `Bearer ${jwt}` } } })
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return json({ error: "unauthorized" }, 401)
  if (!CLIENT_ID || !TOKEN_KEY) return json({ error: "fitbit not configured" }, 500)

  const svc = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
  const uid = user.id

  let date = new Date().toISOString().slice(0, 10)
  try { const body = await req.json(); if (body?.date) date = String(body.date).slice(0, 10) } catch { /* default today */ }

  // Soft rate-limit: skip if synced in the last 30s
  const { data: conn } = await svc.from("fitbit_connections").select("last_sync_at").eq("user_id", uid).maybeSingle()
  if (conn?.last_sync_at && Date.now() - Date.parse(conn.last_sync_at) < 30_000) {
    return json({ throttled: true })
  }

  const { data: tokRow } = await svc.from("fitbit_tokens").select("*").eq("user_id", uid).maybeSingle()
  if (!tokRow) return json({ error: "not connected" }, 400)

  let access = await dec(tokRow.access_token)
  const refresh = await dec(tokRow.refresh_token)

  // Refresh if expiring within a minute
  if (Date.parse(tokRow.expires_at) <= Date.now() + 60_000) {
    const r = await fetch(FITBIT_TOKEN, {
      method: "POST",
      headers: { Authorization: `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh }),
    })
    if (!r.ok) return json({ error: "token refresh failed" }, 502)
    const t = await r.json()
    access = t.access_token
    await svc.from("fitbit_tokens").update({
      access_token: await enc(t.access_token),
      refresh_token: await enc(t.refresh_token),
      expires_at: new Date(Date.now() + (t.expires_in ?? 28800) * 1000).toISOString(),
    }).eq("user_id", uid)
  }

  const fb = async (path: string) => {
    const res = await fetch(`https://api.fitbit.com${path}`, { headers: { Authorization: `Bearer ${access}` } })
    return res.ok ? await res.json() : null
  }

  const [act, heart, sleep, weight] = await Promise.all([
    fb(`/1/user/-/activities/date/${date}.json`),
    fb(`/1/user/-/activities/heart/date/${date}/1d.json`),
    fb(`/1.2/user/-/sleep/date/${date}.json`),
    fb(`/1/user/-/body/log/weight/date/${date}.json`),
  ])

  const steps = act?.summary?.steps ?? null
  const activeMin = act?.summary ? (act.summary.veryActiveMinutes ?? 0) + (act.summary.fairlyActiveMinutes ?? 0) : null
  const restingHr = heart?.["activities-heart"]?.[0]?.value?.restingHeartRate ?? null
  const minutesAsleep = sleep?.summary?.totalMinutesAsleep ?? null
  const weightVal = weight?.weight?.[0]?.weight ?? null

  const rows: { user_id: string; date: string; metric: string; value: number }[] = []
  if (steps != null) rows.push({ user_id: uid, date, metric: "steps", value: steps })
  if (activeMin != null) rows.push({ user_id: uid, date, metric: "active_minutes", value: activeMin })
  if (restingHr != null) rows.push({ user_id: uid, date, metric: "resting_hr", value: restingHr })
  if (minutesAsleep != null) rows.push({ user_id: uid, date, metric: "sleep", value: minutesAsleep })
  if (rows.length) await svc.from("fitbit_data").upsert(rows, { onConflict: "user_id,date,metric" })

  // Weight auto-feeds the outcome tracker for a fitness weight goal (§9, §12)
  let weightFed = false
  if (weightVal != null) {
    const { data: goals } = await svc
      .from("chief_goals")
      .select("id, target_unit, buckets!inner(color)")
      .eq("user_id", uid).eq("status", "active").eq("buckets.color", "fitness")
    const weighty = (goals ?? []).find((g: { target_unit: string | null }) =>
      ["lb", "lbs", "kg", "kgs", "pound", "pounds"].includes((g.target_unit ?? "").toLowerCase())
    ) ?? (goals ?? [])[0]
    if (weighty) {
      await svc.from("chief_goal_progress").upsert(
        { user_id: uid, chief_goal_id: weighty.id, date, value: weightVal },
        { onConflict: "chief_goal_id,date" },
      )
      weightFed = true
    }
  }

  await svc.from("fitbit_connections").upsert(
    { user_id: uid, last_sync_at: new Date().toISOString() }, { onConflict: "user_id" },
  )

  return json({ ok: true, date, steps, active_minutes: activeMin, resting_hr: restingHr, sleep: minutesAsleep, weight: weightVal, weightFed })
})
