import { useEffect, useRef, useState, useCallback } from 'react'
import type { Rite } from '../types'
import { SIGIL_GRAPHS, FAMILY_SIGIL_NAME, edgeKey } from '../game/sigil/sigils'

// Square sigil pad; shrinks to fit narrow phones. Node positions and pointer
// coords share this SIZE, so snapping stays accurate at any size.
const SIZE = Math.min(320, Math.max(240, window.innerWidth - 48))
const GUIDE_FADE_USES = 8                    // ghost-edges fade over the first several rites (spec §4)
const SNAP_PX = Math.max(34, SIZE * 0.17)    // generous tap-radius around each node (ported from goetia)

interface SigilCanvasProps {
  rite: Rite
  targetCellName: string
  onMatch: () => void
  onCancel: () => void
}

function guideUsesKey(family: string) { return `fhtagn.sigil.uses.${family}` }

export default function SigilCanvas({ rite, targetCellName, onMatch, onCancel }: SigilCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const fromNodeRef = useRef(-1)               // node a drag started from (snapped), or -1
  const livePtRef = useRef<{ x: number; y: number } | null>(null)
  const boundRef = useRef<Set<string>>(new Set())   // edge keys already connected
  const perfectingRef = useRef(false)          // true while the snap-to-perfect animation plays
  const [boundCount, setBoundCount] = useState(0)
  const [status, setStatus] = useState('')

  const graph = SIGIL_GRAPHS[rite.family]
  const totalEdges = graph.edges.length
  const uses = Number(localStorage.getItem(guideUsesKey(rite.family)) ?? 0)
  const guideOpacity = Math.max(0, (GUIDE_FADE_USES - uses) / GUIDE_FADE_USES) * 0.45

  const nodePx = useCallback((i: number) => ({
    x: graph.nodes[i].x * SIZE, y: graph.nodes[i].y * SIZE,
  }), [graph])

  // Shared backdrop: faint ghost-edges still to bind, the bound edges in gold,
  // and the snap-nodes themselves (always a little visible — "the points").
  const drawBackdrop = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Ghost guide of unbound edges, fading with mastery.
    if (guideOpacity > 0) {
      ctx.strokeStyle = `rgba(31, 158, 143, ${guideOpacity})`
      ctx.lineWidth = 2
      ctx.setLineDash([6, 6])
      for (const [a, b] of graph.edges) {
        if (boundRef.current.has(edgeKey(a, b))) continue
        const p = nodePx(a), q = nodePx(b)
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke()
      }
      ctx.setLineDash([])
    }

    // Bound edges, solid gold.
    ctx.strokeStyle = '#c9a227'
    ctx.lineWidth = 3
    for (const [a, b] of graph.edges) {
      if (!boundRef.current.has(edgeKey(a, b))) continue
      const p = nodePx(a), q = nodePx(b)
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke()
    }

    // Snap-nodes. A node touched by a bound edge glows gold; the rest stay teal.
    const bound = new Set<number>()
    for (const [a, b] of graph.edges) {
      if (boundRef.current.has(edgeKey(a, b))) { bound.add(a); bound.add(b) }
    }
    const dotOpacity = Math.max(0.35, guideOpacity * 2)
    graph.nodes.forEach((_, i) => {
      const { x, y } = nodePx(i)
      const lit = bound.has(i) || i === fromNodeRef.current
      ctx.beginPath()
      ctx.arc(x, y, lit ? 7 : 5, 0, Math.PI * 2)
      ctx.fillStyle = lit ? `rgba(201, 162, 39, ${dotOpacity})` : `rgba(31, 158, 143, ${dotOpacity})`
      ctx.fill()
    })
  }, [graph, guideOpacity, nodePx])

  const redraw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, SIZE, SIZE)
    drawBackdrop(ctx)

    // In-progress drag: a gold thread from the start-node to the pointer.
    if (drawingRef.current && fromNodeRef.current >= 0 && livePtRef.current) {
      const p = nodePx(fromNodeRef.current)
      ctx.strokeStyle = 'rgba(201, 162, 39, 0.6)'
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(p.x, p.y)
      ctx.lineTo(livePtRef.current.x, livePtRef.current.y); ctx.stroke()
    }
  }, [drawBackdrop, nodePx])

  useEffect(() => { redraw() }, [redraw])

  const localPoint = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  // Nearest node within the snap radius, or -1 (goetia's getNearestNodeId).
  const nearestNode = (pt: { x: number; y: number }): number => {
    let best = SNAP_PX, idx = -1
    graph.nodes.forEach((_, i) => {
      const { x, y } = nodePx(i)
      const d = Math.hypot(pt.x - x, pt.y - y)
      if (d < best) { best = d; idx = i }
    })
    return idx
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (perfectingRef.current) return
    const pt = localPoint(e)
    drawingRef.current = true
    fromNodeRef.current = nearestNode(pt)
    livePtRef.current = pt
    canvasRef.current?.setPointerCapture(e.pointerId)
    redraw()
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current) return
    livePtRef.current = localPoint(e)
    redraw()
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drawingRef.current) return
    drawingRef.current = false
    const from = fromNodeRef.current
    const to = nearestNode(localPoint(e))
    fromNodeRef.current = -1
    livePtRef.current = null

    // Bind the edge if the drag joined two distinct, adjacent nodes.
    if (from >= 0 && to >= 0 && from !== to) {
      const key = edgeKey(from, to)
      const isRealEdge = graph.edges.some(([a, b]) => edgeKey(a, b) === key)
      if (isRealEdge && !boundRef.current.has(key)) {
        boundRef.current.add(key)
        setBoundCount(boundRef.current.size)
        setStatus('')
        if (boundRef.current.size === totalEdges) { succeed(); return }
      }
    }
    redraw()
  }

  const clear = () => {
    boundRef.current = new Set()
    fromNodeRef.current = -1
    livePtRef.current = null
    setBoundCount(0)
    setStatus('')
    redraw()
  }

  // All edges bound: remember the mastery, then sweep the finished sigil in
  // bright gold before the rite resolves.
  const succeed = () => {
    localStorage.setItem(guideUsesKey(rite.family), String(uses + 1))
    perfectingRef.current = true
    const canvas = canvasRef.current
    if (!canvas) { onMatch(); return }
    const ctx = canvas.getContext('2d')!
    const DURATION = 460

    let startTs: number | null = null
    const frame = (ts: number) => {
      if (startTs === null) startTs = ts
      const t = Math.min(1, (ts - startTs) / DURATION)
      ctx.clearRect(0, 0, SIZE, SIZE)
      drawBackdrop(ctx)
      ctx.strokeStyle = `rgba(255, 215, 106, ${0.4 + 0.6 * t})`
      ctx.shadowColor = 'rgba(255, 215, 106, 0.9)'
      ctx.shadowBlur = 6 + 14 * t
      ctx.lineWidth = 4
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      for (const [a, b] of graph.edges) {
        const p = nodePx(a), q = nodePx(b)
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke()
      }
      ctx.shadowBlur = 0
      if (t < 1) requestAnimationFrame(frame)
      else window.setTimeout(onMatch, 160)
    }
    requestAnimationFrame(frame)
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 120,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ textAlign: 'center' }}>
          <div className="eyebrow" style={{ color: 'var(--crimson)', fontSize: 20, letterSpacing: 3, textShadow: '0 0 18px rgba(207,53,80,0.4)' }}>
            BIND {FAMILY_SIGIL_NAME[rite.family].toUpperCase()}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
            {rite.riteType} → {targetCellName} · {totalEdges} bond{totalEdges > 1 ? 's' : ''}
          </div>
        </div>

        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={{
            width: SIZE, height: SIZE, touchAction: 'none',
            borderRadius: 12, border: '1px solid var(--border)',
            background: 'radial-gradient(circle at 50% 50%, rgba(31,158,143,0.06), rgba(6,9,16,0.9))',
            cursor: 'crosshair',
          }}
        />

        <div style={{ height: 16, fontSize: 12, color: 'var(--crimson)' }}>{status}</div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={btnGhost}>Cancel</button>
          <button onClick={clear} style={btnGhost} disabled={boundCount === 0}>Clear</button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', maxWidth: SIZE, textAlign: 'center' }}>
          Drag point to point to bind the sigil — {boundCount}/{totalEdges} bound. It completes itself.
        </div>
      </div>
    </div>
  )
}

const btnGhost: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '8px 14px', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 13,
}
