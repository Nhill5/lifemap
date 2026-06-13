// The scheduler tick. pg_cron POSTs here every ~15 min (see the
// 20260612_notify_cron migration). For each user with a push subscription we
// check whether their *local* clock has just crossed a notification window
// (morning kickoff / evening mirror), and if so — and they're not in quiet
// hours, haven't already had that type today, and are under the daily budget —
// we send it. Per-type/per-day rows in notifications_log make this idempotent,
// so a generous match window is safe: the first tick past the time fires once.
//
// Self-contained (mirrors send-notification's send loop) so it deploys as a
// single file. Guarded by x-notify-secret; verify_jwt=false.
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "https://esm.sh/web-push@3.6.7"

// .trim() guards against trailing whitespace/newlines pasted into the dashboard
// secret editor — web-push rejects a VAPID key with any stray char.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const NOTIFY_SECRET = (Deno.env.get("NOTIFY_SECRET") ?? "").trim()
const VAPID_PUBLIC = (Deno.env.get("VAPID_PUBLIC_KEY") ?? "").trim()
const VAPID_PRIVATE = (Deno.env.get("VAPID_PRIVATE_KEY") ?? "").trim()
const VAPID_SUBJECT = (Deno.env.get("VAPID_SUBJECT") ?? "mailto:hello@lifemap.app").trim()

const DAILY_BUDGET = 4
// How long after a window's time we'll still fire it. Wider than the cron
// interval so a missed/late tick is forgiven; dedupe keeps it once/day.
const MATCH_WINDOW_MIN = 30

// LifeMap voice: short, second-person, present. Firm at the kickoff, gentle at night.
const MESSAGES = {
  morning_kickoff: { title: "Plan today", body: "Two minutes to set the day. Commit a plan and the rest gets easier.", url: "/now" },
  evening_mirror: { title: "Reflect on today", body: "30 seconds — one honest line about how today went.", url: "/mirror/evening" },
} as const
type WindowType = keyof typeof MESSAGES

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } })

function localParts(tz: string): { date: string; minutes: number } {
  const now = new Date()
  let date: string, hhmm: string
  try {
    date = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now)
    hhmm = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(now)
  } catch {
    date = now.toISOString().slice(0, 10)
    hhmm = now.toISOString().slice(11, 16)
  }
  const [h, m] = hhmm.split(":").map(Number)
  return { date, minutes: h * 60 + m }
}

function hhmmToMin(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s)
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

function minToHHMM(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`
}

function inQuiet(now: string, start: string | null, end: string | null): boolean {
  if (!start || !end) return false
  return start <= end ? (now >= start && now < end) : (now >= start || now < end)
}

// deno-lint-ignore no-explicit-any
async function sendPushToUser(svc: any, userId: string, payload: { title: string; body: string; url: string; tag: string }): Promise<number> {
  const { data: subs } = await svc.from("push_subscriptions").select("*").eq("user_id", userId)
  if (!subs || subs.length === 0) return 0
  const body = JSON.stringify(payload)
  let sent = 0
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body)
      sent++
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        await svc.from("push_subscriptions").delete().eq("endpoint", s.endpoint) // stale endpoint
      }
    }
  }
  return sent
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return json({ error: "method not allowed" }, 405)
    if (!NOTIFY_SECRET || req.headers.get("x-notify-secret") !== NOTIFY_SECRET) return json({ error: "unauthorized" }, 401)
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) return json({ error: "vapid not configured" }, 500)

    const svc = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

    // Only consider users who can actually receive a push.
    const { data: subRows } = await svc.from("push_subscriptions").select("user_id")
    const userIds = [...new Set((subRows ?? []).map((r: { user_id: string }) => r.user_id))]
    if (userIds.length === 0) return json({ ok: true, sent: 0, fired: [] })

    const { data: profiles } = await svc
      .from("profiles")
      .select("id, timezone, notification_windows, quiet_hours")
      .in("id", userIds)

    let sent = 0
    const fired: { user: string; type: WindowType }[] = []

    for (const p of profiles ?? []) {
      const nw = (p.notification_windows ?? null) as Record<string, string> | null
      if (!nw || (!nw.morning_kickoff && !nw.evening_mirror)) continue

      const tz = (p.timezone as string) ?? "UTC"
      const { date, minutes } = localParts(tz)
      const nowHHMM = minToHHMM(minutes)
      const qh = (p.quiet_hours ?? null) as { start?: string; end?: string } | null

      for (const type of ["morning_kickoff", "evening_mirror"] as WindowType[]) {
        const w = nw[type]
        if (!w) continue
        const windowMin = hhmmToMin(w)
        if (windowMin == null) continue

        const diff = minutes - windowMin
        if (diff < 0 || diff >= MATCH_WINDOW_MIN) continue
        if (inQuiet(nowHHMM, qh?.start ?? null, qh?.end ?? null)) continue

        // Already sent this type today?
        const { count: dupe } = await svc.from("notifications_log")
          .select("*", { count: "exact", head: true })
          .eq("user_id", p.id).eq("type", type).eq("date", date)
        if ((dupe ?? 0) > 0) continue

        // Under the daily budget?
        const { count: total } = await svc.from("notifications_log")
          .select("*", { count: "exact", head: true })
          .eq("user_id", p.id).eq("date", date)
        if ((total ?? 0) >= DAILY_BUDGET) continue

        const n = await sendPushToUser(svc, p.id as string, { ...MESSAGES[type], tag: type })
        if (n > 0) {
          await svc.from("notifications_log").insert({ user_id: p.id, type, date })
          sent += n
          fired.push({ user: p.id as string, type })
        }
      }
    }

    return json({ ok: true, sent, fired })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
