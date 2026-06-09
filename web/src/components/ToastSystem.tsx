import { useState, useCallback, useRef } from 'react'

export type ToastType = 'chant' | 'revelation' | 'rite' | 'rite_incoming' | 'roil' | 'bargain' | 'convert' | 'awakening'

export interface Toast {
  id: number
  message: string
  type: ToastType
}

// Whispers linger long enough to be read; an awakening echoes far longer.
const TTL_MS = 3600
const AWAKENING_TTL_MS = 7000

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const addToast = useCallback((message: string, type: ToastType = 'chant') => {
    const id = nextId.current++
    setToasts(prev => [...prev.slice(-4), { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, type === 'awakening' ? AWAKENING_TTL_MS : TTL_MS)
  }, [])

  return { toasts, addToast }
}

interface ToastSystemProps {
  toasts: Toast[]
}

// Each voice from the deep speaks in its own glyph and glow.
const VOICE: Record<ToastType, { glyph: string; color: string; glow: string }> = {
  chant: { glyph: '◦', color: 'var(--text-dim)', glow: 'rgba(221, 212, 189, 0.25)' },
  revelation: { glyph: '✶', color: '#e8c96a', glow: 'rgba(216, 169, 58, 0.5)' },
  rite: { glyph: '✸', color: '#e06277', glow: 'rgba(207, 53, 80, 0.45)' },
  rite_incoming: { glyph: '✸', color: '#ef4f6e', glow: 'rgba(207, 53, 80, 0.65)' },
  roil: { glyph: '∴', color: '#a99ad4', glow: 'rgba(124, 107, 176, 0.55)' },
  bargain: { glyph: '⛧', color: '#b58ae8', glow: 'rgba(154, 95, 224, 0.55)' },
  convert: { glyph: '✧', color: '#46e6cd', glow: 'rgba(70, 230, 205, 0.45)' },
  awakening: { glyph: '✦', color: '#f0cf7a', glow: 'rgba(216, 169, 58, 0.7)' },
}

export default function ToastSystem({ toasts }: ToastSystemProps) {
  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'absolute', top: 78, left: '50%', transform: 'translateX(-50%)',
      zIndex: 50, display: 'flex', flexDirection: 'column', gap: 9, alignItems: 'center',
      pointerEvents: 'none', width: 'min(440px, calc(100vw - 32px))',
    }}>
      {toasts.map(toast => {
        const v = VOICE[toast.type]
        const grand = toast.type === 'awakening'
        return (
          <div key={toast.id} style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 9,
            maxWidth: '100%', textAlign: 'center',
            fontFamily: grand ? 'var(--font-display)' : 'var(--font-body)',
            fontStyle: grand ? 'normal' : 'italic',
            fontWeight: grand ? 500 : 400,
            fontSize: grand ? 16 : 13.5,
            letterSpacing: grand ? 2 : 0.4,
            textTransform: grand ? 'uppercase' : 'none',
            lineHeight: 1.45,
            color: v.color,
            textShadow: `0 0 14px ${v.glow}, 0 0 2px ${v.glow}, 0 1px 8px rgba(0, 0, 0, 0.9)`,
            animation: `whisper ${grand ? AWAKENING_TTL_MS : TTL_MS}ms ease-in-out forwards`,
          }}>
            <span aria-hidden style={{ fontStyle: 'normal', fontSize: grand ? 15 : 12, opacity: 0.85 }}>
              {v.glyph}
            </span>
            <span>{toast.message}</span>
          </div>
        )
      })}
      <style>{`
        @keyframes whisper {
          0% { opacity: 0; filter: blur(7px); transform: translateY(9px) scale(1.04); }
          7% { opacity: 1; filter: blur(0); transform: none; }
          82% { opacity: 1; filter: blur(0); transform: none; }
          100% { opacity: 0; filter: blur(5px); transform: translateY(-7px); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes whisper {
            0% { opacity: 0; }
            7% { opacity: 1; }
            82% { opacity: 1; }
            100% { opacity: 0; }
          }
        }
      `}</style>
    </div>
  )
}
