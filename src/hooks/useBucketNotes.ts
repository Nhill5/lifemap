import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Json } from '@/lib/database.types'

/** A single drawn element in a note's scene. Coordinates are CSS pixels. */
export type SceneElement =
  | { type: 'stroke'; color: string; width: number; erase?: boolean; points: [number, number][] }
  | { type: 'text'; x: number; y: number; text: string; color: string; size: number }

export interface BucketNote {
  id: string
  bucket_id: string
  title: string | null
  scene: SceneElement[]
  created_at: string
  updated_at: string
}

type Row = Omit<BucketNote, 'scene'> & { scene: unknown }

function parseScene(s: unknown): SceneElement[] {
  return Array.isArray(s) ? (s as SceneElement[]) : []
}

export function useBucketNotes(bucketId: string | undefined) {
  const { user } = useAuth()
  const [notes, setNotes] = useState<BucketNote[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!user || !bucketId) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    supabase
      .from('bucket_notes')
      .select('id, bucket_id, title, scene, created_at, updated_at')
      .eq('user_id', user.id)
      .eq('bucket_id', bucketId)
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return
        setNotes((data ?? []).map((r) => ({ ...(r as Row), scene: parseScene((r as Row).scene) })))
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [user, bucketId, tick])

  async function createNote(title?: string): Promise<BucketNote | null> {
    if (!user || !bucketId) return null
    const { data } = await supabase
      .from('bucket_notes')
      .insert({ user_id: user.id, bucket_id: bucketId, title: title?.trim() || null, scene: [] })
      .select('id, bucket_id, title, scene, created_at, updated_at')
      .single()
    refetch()
    return data ? { ...(data as Row), scene: parseScene((data as Row).scene) } : null
  }

  async function saveScene(noteId: string, scene: SceneElement[]) {
    await supabase
      .from('bucket_notes')
      .update({ scene: scene as unknown as Json, updated_at: new Date().toISOString() })
      .eq('id', noteId)
  }

  async function rename(noteId: string, title: string | null) {
    await supabase.from('bucket_notes').update({ title: title?.trim() || null }).eq('id', noteId)
    refetch()
  }

  async function remove(noteId: string) {
    await supabase.from('bucket_notes').delete().eq('id', noteId)
    refetch()
  }

  return { notes, loading, createNote, saveScene, rename, remove, refetch }
}

/** Fetch one note directly (the canvas editor opens by id). */
export function useBucketNote(noteId: string | undefined) {
  const { user } = useAuth()
  const [note, setNote] = useState<BucketNote | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !noteId) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    supabase
      .from('bucket_notes')
      .select('id, bucket_id, title, scene, created_at, updated_at')
      .eq('user_id', user.id)
      .eq('id', noteId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setNote(data ? { ...(data as Row), scene: parseScene((data as Row).scene) } : null)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [user, noteId])

  return { note, loading }
}
