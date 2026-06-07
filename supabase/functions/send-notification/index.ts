// Sends a Web Push to a user, respecting the ~4/day budget and quiet hours
// (§10). Triggered server-side (cron / backend) with a shared secret — not a
// user JWT — so verify_jwt=false and we check x-notify-secret ourselves.
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "https://esm.sh/web-push@3.6.7"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const NOTIFY_SECRET = Deno.env.get("NOTIFY_SECRET") ?? ""
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? ""
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? ""
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:hello@lifemap.app"

const DAILY_BUDGET = 4
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } })

function nowHHMMInTz(tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date())
  } catch {
    return new Date().toISOString().slice(11, 16)
  }
}
function todayInTz(tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date())
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}
function inQuiet(now: string, start: string | null, end: string | null): boolean {
  if (!start || !end) return false
  return start <= end ? (now >= start && now < end) : (now >= start || now < end)
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405)
  if (!NOTIFY_SECRET || req.headers.get("x-notify-secret") !== NOTIFY_SECRET) return json({ error: "unauthorized" }, 401)
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return json({ error: "vapid not configured" }, 500)

  const { user_id, type, title, body, url } = await req.json().catch(() => ({}))
  if (!user_id || !type || !title) return json({ error: "user_id, type, title required" }, 400)

  const svc = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

  // Timezone-aware budget + quiet-hours gate
  const { data: profile } = await svc.from("profiles").select("timezone, quiet_hours").eq("id", user_id).maybeSingle()
  const tz = profile?.timezone ?? "UTC"
  const date = todayInTz(tz)
  const now = nowHHMMInTz(tz)
  const qh = (profile?.quiet_hours ?? null) as { start?: string; end?: string } | null
  if (inQuiet(now, qh?.start ?? null, qh?.end ?? null)) return json({ skipped: "quiet_hours" })

  const { count } = await svc.from("notifications_log")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user_id).eq("date", date)
  if ((count ?? 0) >= DAILY_BUDGET) return json({ skipped: "budget" })

  const { data: subs } = await svc.from("push_subscriptions").select("*").eq("user_id", user_id)
  if (!subs || subs.length === 0) return json({ skipped: "no_subscription" })

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
  const payload = JSON.stringify({ title, body: body ?? "", url: url ?? "/now", tag: type })

  let sent = 0
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      )
      sent++
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        await svc.from("push_subscriptions").delete().eq("endpoint", s.endpoint) // stale endpoint
      }
    }
  }

  if (sent > 0) {
    await svc.from("notifications_log").insert({ user_id, type, date })
  }
  return json({ ok: true, sent })
})
