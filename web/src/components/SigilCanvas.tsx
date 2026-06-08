import { useEffect, useRef, useState, useCallback } from 'react'
import type { Rite } from '../types'
import { Pt } from '../game/sigil/recognizer'
import {
  sigilRecognizer, SIGIL_GUIDES, SIGIL_MATCH_THRESHOLD,
  FAMILY_SIGIL_NAME,
} from '../game/sigil/sigils'
import { TIER_STROKES } from '../game/catalog'

const SIZE = 320
const GUIDE_FADE_USES = 4   // ghost-guide fades over the first few traces (spec §4)

interface SigilCanvasProps {
  rite: Rite
  targetCellName: string
  onMatch: () => void
  onCancel: () => void
}

function guideUsesKey(family: string) { return `fhtagn.sigil.uses.${family}` }

export default function SigilCanvas({ rite, targetCellName, onMatch, onCancel }: SigilCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointsRef = useRef<Pt[]>([])
  const strokeRef = useRef(-1)
  const drawingRef = useRef(false)
  const [strokeCount, setStrokeCount] = useState(0)
  const [status, setStatus] = useState<string>('')

  const requiredStrokes = TIER_STROKES[rite.tier]
  const uses = Number(localStorage.getItem(guideUsesKey(rite.family)) ?? 0)
  const guideOpacity = Math.max(0, (GUIDE_FADE_USES - uses) / GUIDE_FADE_USES) * 0.5

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, SIZE, SIZE)

    // Ghost guide of the expected sigil, fading with mastery.
    if (guideOpacity > 0) {
      const guide = SIGIL_GUIDES[rite.family]
      ctx.strokeStyle = `rgba(31, 158, 143, ${guideOpacity})`
      ctx.lineWidth = 2
      ctx.setLineDash([6, 6])
      ctx.beginPath()
      guide.forEach(([gx, gy], i) => {
        const x = gx * SIZE, y = gy * SIZE
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      })
      ctx.stroke()
      ctx.setLineDash([])
    }

    // The player's strokes.
    ctx.strokeStyle = '#c9a227'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    let prev: Pt | null = null
    ctx.beginPath()
    for (const p of pointsRef.current) {
      if (prev && prev.id === p.id) {
        ctx.lineTo(p.x, p.y)
      } else {
        ctx.moveTo(p.x, p.y)
      }
      prev = p
    }
    ctx.stroke()
  }, [rite.family, guideOpacity])

  useEffect(() => { redraw() }, [redraw])

  const localPoint = (e: React.PointerEvent): Pt => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, id: strokeRef.current }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    drawingRef.current = true
    strokeRef.current += 1
    setStrokeCount(strokeRef.current + 1)
    pointsRef.current.push(localPoint(e))
    canvasRef.current?.setPointerCapture(e.pointerId)
    redraw()
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current) return
    pointsRef.current.push(localPoint(e))
    redraw()
  }

  const onPointerUp = () => { drawingRef.current = false }

  const clear = () => {
    pointsRef.current = []
    strokeRef.current = -1
    setStrokeCount(0)
    setStatus('')
    redraw()
  }

  const evaluate = () => {
    const pts = pointsRef.current
    if (strokeCount < requiredStrokes) {
      setStatus(`The ${FAMILY_SIGIL_NAME[rite.family]} demands ${requiredStrokes} stroke${requiredStrokes > 1 ? 's' : ''}.`)
      return
    }
    const match = sigilRecognizer().recognize(pts)
    if (match && match.name === rite.family && match.score >= SIGIL_MATCH_THRESHOLD) {
      localStorage.setItem(guideUsesKey(rite.family), String(uses + 1))
      setStatus('')
      onMatch()
    } else {
      // Poor match wastes the gesture but never punishes (spec §4).
      setStatus('The sigil falters and fades. Trace it again.')
      clear()
    }
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 120,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--crimson)', fontSize: 16, letterSpacing: 2 }}>
            TRACE {FAMILY_SIGIL_NAME[rite.family].toUpperCase()}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
            {rite.riteType} → {targetCellName} · {requiredStrokes} stroke{requiredStrokes > 1 ? 's' : ''}
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
          <button onClick={clear} style={btnGhost}>Clear</button>
          <button onClick={evaluate} style={btnPrimary} disabled={strokeCount === 0}>
            Complete the rite
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', maxWidth: SIZE, textAlign: 'center' }}>
          Strokes traced: {strokeCount}/{requiredStrokes}. A faltered sigil costs nothing — trace again.
        </div>
      </div>
    </div>
  )
}

const btnGhost: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '8px 14px', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 13,
}

const btnPrimary: React.CSSProperties = {
  background: 'var(--crimson)', border: 'none',
  borderRadius: 8, padding: '8px 16px', color: '#0a0a12', cursor: 'pointer', fontWeight: 600, fontSize: 13,
}
