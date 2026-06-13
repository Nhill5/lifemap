import { useRef, useEffect, useState, useCallback, type CSSProperties, type PointerEvent } from 'react'
import type { SceneElement } from '@/hooks/useBucketNotes'

type Tool = 'pen' | 'eraser' | 'text'

const PALETTE = ['#ECEAE3', '#5FD39E', '#F4B14C', '#6FA8FF', '#C58CF0', '#FF8C8C']
const WIDTHS = [2, 4, 8, 16]

/**
 * A minimal hand-drawn canvas: pen, eraser, text, undo, clear. No dependency —
 * the scene is a JSON element list the parent persists. Strokes draw
 * incrementally for smoothness; the whole scene is re-rendered on undo / clear /
 * resize. Coordinates are CSS pixels; the backing store is scaled for DPR.
 */
export function SketchCanvas({
  initialScene, onChange,
}: {
  initialScene: SceneElement[]
  onChange: (scene: SceneElement[]) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const sceneRef = useRef<SceneElement[]>(initialScene)
  const draftRef = useRef<{ color: string; width: number; erase: boolean; points: [number, number][] } | null>(null)
  const dprRef = useRef(1)

  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState(PALETTE[0])
  const [width, setWidth] = useState(WIDTHS[1])
  const [, force] = useState(0) // re-render toolbar state (undo availability)

  const ctx = () => canvasRef.current?.getContext('2d') ?? null

  const drawStroke = useCallback((c: CanvasRenderingContext2D, el: Extract<SceneElement, { type: 'stroke' }>) => {
    if (el.points.length === 0) return
    c.save()
    c.globalCompositeOperation = el.erase ? 'destination-out' : 'source-over'
    c.strokeStyle = el.color
    c.lineWidth = el.width
    c.lineCap = 'round'
    c.lineJoin = 'round'
    c.beginPath()
    const [x0, y0] = el.points[0]
    c.moveTo(x0, y0)
    if (el.points.length === 1) c.lineTo(x0 + 0.01, y0) // a dot
    for (let i = 1; i < el.points.length; i++) c.lineTo(el.points[i][0], el.points[i][1])
    c.stroke()
    c.restore()
  }, [])

  const drawText = useCallback((c: CanvasRenderingContext2D, el: Extract<SceneElement, { type: 'text' }>) => {
    c.save()
    c.globalCompositeOperation = 'source-over'
    c.fillStyle = el.color
    c.font = `${el.size}px "Hanken Grotesk", system-ui, sans-serif`
    c.textBaseline = 'top'
    el.text.split('\n').forEach((line, i) => c.fillText(line, el.x, el.y + i * el.size * 1.25))
    c.restore()
  }, [])

  const redraw = useCallback(() => {
    const c = ctx(); const canvas = canvasRef.current
    if (!c || !canvas) return
    c.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0)
    c.clearRect(0, 0, canvas.width / dprRef.current, canvas.height / dprRef.current)
    for (const el of sceneRef.current) {
      if (el.type === 'stroke') drawStroke(c, el)
      else drawText(c, el)
    }
  }, [drawStroke, drawText])

  // Size the backing store to the container × DPR, then repaint.
  const resize = useCallback(() => {
    const canvas = canvasRef.current; const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    dprRef.current = dpr
    const { width: w, height: h } = wrap.getBoundingClientRect()
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    redraw()
  }, [redraw])

  useEffect(() => {
    resize()
    const ro = new ResizeObserver(resize)
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [resize])

  function pointFromEvent(e: PointerEvent<HTMLCanvasElement>): [number, number] {
    const rect = canvasRef.current!.getBoundingClientRect()
    return [e.clientX - rect.left, e.clientY - rect.top]
  }

  function commit() {
    onChange([...sceneRef.current])
    force(n => n + 1)
  }

  function onPointerDown(e: PointerEvent<HTMLCanvasElement>) {
    const p = pointFromEvent(e)
    if (tool === 'text') {
      const text = window.prompt('Text')
      if (text && text.trim()) {
        sceneRef.current.push({ type: 'text', x: p[0], y: p[1], text: text.trim(), color, size: Math.max(14, width * 4) })
        redraw(); commit()
      }
      return
    }
    canvasRef.current?.setPointerCapture(e.pointerId)
    draftRef.current = { color, width: tool === 'eraser' ? width * 3 : width, erase: tool === 'eraser', points: [p] }
  }

  function onPointerMove(e: PointerEvent<HTMLCanvasElement>) {
    const d = draftRef.current
    if (!d) return
    const p = pointFromEvent(e)
    const prev = d.points[d.points.length - 1]
    d.points.push(p)
    const c = ctx()
    if (c) {
      // incremental segment using the in-progress draft's style
      drawStroke(c, { type: 'stroke', color: d.color, width: d.width, erase: d.erase, points: [prev, p] })
    }
  }

  function endStroke() {
    const d = draftRef.current
    draftRef.current = null
    if (!d || d.points.length === 0) return
    sceneRef.current.push({ type: 'stroke', color: d.color, width: d.width, erase: d.erase, points: d.points })
    commit()
  }

  function undo() {
    sceneRef.current = sceneRef.current.slice(0, -1)
    redraw(); commit()
  }

  const [confirmClear, setConfirmClear] = useState(false)
  function clearAll() {
    sceneRef.current = []
    redraw(); commit(); setConfirmClear(false)
  }

  const toolBtn = (active: boolean): CSSProperties => ({
    background: active ? 'var(--text)' : 'none', color: active ? 'var(--bg)' : 'var(--text-dim)',
    border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '7px 12px',
    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={toolBtn(tool === 'pen')} onClick={() => setTool('pen')}>✎ Pen</button>
          <button style={toolBtn(tool === 'eraser')} onClick={() => setTool('eraser')}>Eraser</button>
          <button style={toolBtn(tool === 'text')} onClick={() => setTool('text')}>T</button>
        </div>

        <div style={{ width: 1, height: 22, background: 'var(--line)' }} />

        {/* Colors */}
        <div style={{ display: 'flex', gap: 6 }}>
          {PALETTE.map(c => (
            <button key={c} onClick={() => { setColor(c); if (tool === 'eraser') setTool('pen') }} aria-label={`Color ${c}`}
              style={{
                width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer',
                border: color === c ? '2px solid var(--text)' : '2px solid var(--line)',
              }} />
          ))}
        </div>

        <div style={{ width: 1, height: 22, background: 'var(--line)' }} />

        {/* Widths */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {WIDTHS.map(w => (
            <button key={w} onClick={() => setWidth(w)} aria-label={`Width ${w}`}
              style={{
                width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', cursor: 'pointer',
                background: 'none', border: width === w ? '1px solid var(--text)' : '1px solid var(--line)',
              }}>
              <span style={{ width: w + 2, height: w + 2, borderRadius: '50%', background: 'var(--text-dim)' }} />
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button style={toolBtn(false)} onClick={undo} disabled={sceneRef.current.length === 0}>↶ Undo</button>
          {confirmClear ? (
            <>
              <button style={{ ...toolBtn(false), color: 'var(--warm)' }} onClick={clearAll}>Clear all</button>
              <button style={toolBtn(false)} onClick={() => setConfirmClear(false)}>Cancel</button>
            </>
          ) : (
            <button style={toolBtn(false)} onClick={() => setConfirmClear(true)} disabled={sceneRef.current.length === 0}>Clear</button>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={wrapRef}
        style={{
          position: 'relative', height: 'min(68vh, 560px)', width: '100%',
          background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)',
          overflow: 'hidden', touchAction: 'none',
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onPointerLeave={endStroke}
          style={{ display: 'block', cursor: tool === 'text' ? 'text' : 'crosshair' }}
        />
      </div>
    </div>
  )
}
