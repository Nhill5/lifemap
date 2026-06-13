import { useState, useEffect, useRef, type CSSProperties } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { BackBar } from '@/components/layout/BackBar'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { SketchCanvas } from '@/components/ui/SketchCanvas'
import { useBucketNotes, useBucketNote, type SceneElement } from '@/hooks/useBucketNotes'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { AccentSlot } from '@/types'

/** Lightweight bucket name/color lookup (avoids pulling the whole detail hook). */
function useBucketHead(bucketId: string | undefined) {
  const { user } = useAuth()
  const [head, setHead] = useState<{ name: string; color: AccentSlot } | null>(null)
  useEffect(() => {
    if (!user || !bucketId) return
    supabase.from('buckets').select('name, color').eq('id', bucketId).maybeSingle()
      .then(({ data }) => { if (data) setHead(data as { name: string; color: AccentSlot }) })
  }, [user, bucketId])
  return head
}

function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

/* ------------------------------------------------------------------ */
/*  Notes list for a bucket                                             */
/* ------------------------------------------------------------------ */

export function BucketNotesPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const head = useBucketHead(id)
  const { notes, loading, createNote, remove } = useBucketNotes(id)
  const [creating, setCreating] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  async function newNote() {
    setCreating(true)
    try {
      const n = await createNote()
      if (n) navigate(`/buckets/${id}/notes/${n.id}`)
    } finally { setCreating(false) }
  }

  return (
    <AppShell>
      <BackBar to={`/buckets/${id}`} label={head?.name ?? 'Bucket'} />

      <div style={{ marginBottom: 20 }}>
        <Eyebrow style={{ marginBottom: 6, display: 'block' }}>Notes &amp; sketches</Eyebrow>
        <h2 style={{ fontFamily: 'var(--font-voice)', fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em' }}>
          {head?.name ?? 'Bucket'}
        </h2>
      </div>

      <div style={{ marginBottom: 22 }}>
        <Button variant="primary" onClick={newNote} disabled={creating} style={{ width: '100%' }}>
          {creating ? 'Creating…' : '+ New sketch'}
        </Button>
      </div>

      {loading ? (
        <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}>Loading…</div>
      ) : notes.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>
          No sketches yet. A canvas for messy thinking — diagrams, plans, whatever doesn't fit in a list.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notes.map(n => (
            <div key={n.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: '12px 14px' }}>
              <button onClick={() => navigate(`/buckets/${id}/notes/${n.id}`)}
                style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{n.title ?? 'Untitled sketch'}</div>
                <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>
                  {n.scene.length} element{n.scene.length === 1 ? '' : 's'} · edited {fmtWhen(n.updated_at)}
                </div>
              </button>
              {confirmId === n.id ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button onClick={() => { setConfirmId(null); remove(n.id) }} style={{ background: 'none', border: 'none', color: 'var(--warm)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
                  <button onClick={() => setConfirmId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>No</button>
                </div>
              ) : (
                <button onClick={() => setConfirmId(n.id)} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
              )}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  )
}

/* ------------------------------------------------------------------ */
/*  Canvas editor (one note)                                            */
/* ------------------------------------------------------------------ */

export function NoteEditorPage() {
  const { id, noteId } = useParams<{ id: string; noteId: string }>()
  const { note, loading } = useBucketNote(noteId)
  const { saveScene, rename } = useBucketNotes(undefined)

  const [title, setTitle] = useState('')
  const [savedAt, setSavedAt] = useState<'saving' | 'saved' | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestScene = useRef<SceneElement[]>([])

  useEffect(() => { if (note) setTitle(note.title ?? '') }, [note])

  function onSceneChange(scene: SceneElement[]) {
    if (!noteId) return
    latestScene.current = scene
    setSavedAt('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await saveScene(noteId, latestScene.current)
      setSavedAt('saved')
    }, 700)
  }

  // Flush a pending save on unmount so nothing is lost on navigate-away.
  useEffect(() => () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      if (noteId) saveScene(noteId, latestScene.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const inputStyle: CSSProperties = {
    background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)',
    padding: '8px 11px', color: 'var(--text)', fontSize: 15, fontWeight: 600, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box', flex: 1, minWidth: 0,
  }

  return (
    <AppShell>
      <BackBar to={`/buckets/${id}/notes`} label="Notes" />

      {loading ? (
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}>Loading…</div>
      ) : !note ? (
        <div style={{ textAlign: 'center', marginTop: 48, color: 'var(--text-faint)' }}>Sketch not found.</div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={() => noteId && rename(noteId, title)}
              onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
              placeholder="Untitled sketch"
              maxLength={80}
              style={inputStyle}
            />
            <span style={{ fontSize: 12, color: 'var(--text-faint)', whiteSpace: 'nowrap', minWidth: 48, textAlign: 'right' }}>
              {savedAt === 'saving' ? 'Saving…' : savedAt === 'saved' ? 'Saved ✓' : ''}
            </span>
          </div>

          <SketchCanvas initialScene={note.scene} onChange={onSceneChange} />
        </>
      )}
    </AppShell>
  )
}
