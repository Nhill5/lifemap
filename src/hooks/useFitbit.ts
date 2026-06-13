import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToday } from '@/hooks/useToday'
import type { FitbitConnection, FitbitMetric } from '@/types'

export type FitbitMetrics = Partial<Record<FitbitMetric, number>>

export function useFitbit() {
  const { user } = useAuth()
  const today = useToday()
  const [connection, setConnection] = useState<FitbitConnection | null>(null)
  const [metrics, setMetrics] = useState<FitbitMetrics>({})
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!user) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    Promise.all([
      supabase.from('fitbit_connections').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('fitbit_data').select('metric, value').eq('user_id', user.id).eq('date', today),
    ]).then(([connRes, dataRes]) => {
      if (cancelled) return
      setConnection((connRes.data ?? null) as FitbitConnection | null)
      const m: FitbitMetrics = {}
      for (const r of (dataRes.data ?? []) as { metric: FitbitMetric; value: number }[]) m[r.metric] = r.value
      setMetrics(m)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [user, today, tick])

  /** Kick off OAuth: fetch the authorize URL (server-built) and redirect. */
  async function connect() {
    setError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError('Not signed in'); return }
    const base = import.meta.env.VITE_SUPABASE_URL as string
    const res = await fetch(`${base}/functions/v1/fitbit-auth?action=start`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok || !body.url) { setError(body.error ?? 'Could not start Fitbit connect'); return }
    window.location.href = body.url
  }

  async function sync() {
    setSyncing(true)
    setError(null)
    try {
      const { data, error } = await supabase.functions.invoke('fitbit-sync', { body: { date: today } })
      if (error) { setError(error.message); return }
      if (data?.error) { setError(data.error); return }
      refetch()
    } finally {
      setSyncing(false)
    }
  }

  return {
    connected: !!connection,
    connection,
    metrics,
    loading,
    syncing,
    error,
    connect,
    sync,
    refetch,
  }
}
