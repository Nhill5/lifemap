import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { JournalEntry, JournalScope } from '@/types'

export function useJournal(date: string, scope: JournalScope) {
  const { user } = useAuth()
  const [entry, setEntry] = useState<JournalEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tick, setTick] = useState(0)
  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!user) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id).eq('date', date).eq('scope', scope)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setEntry((data ?? null) as JournalEntry | null)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [user, date, scope, tick])

  async function save(prompt: string, body: string) {
    if (!user) return
    setSaving(true)
    try {
      if (entry?.id) {
        await supabase.from('journal_entries').update({ prompt, body }).eq('id', entry.id)
      } else {
        await supabase.from('journal_entries').insert({ user_id: user.id, date, scope, prompt, body })
      }
      refetch()
    } finally { setSaving(false) }
  }

  return { entry, loading, saving, save }
}
