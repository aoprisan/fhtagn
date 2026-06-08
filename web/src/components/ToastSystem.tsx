import { useState, useCallback, useRef } from 'react'

export type ToastType = 'chant' | 'revelation' | 'rite' | 'rite_incoming' | 'roil' | 'bargain'

export interface Toast {
  id: number
  message: string
  type: ToastType
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const addToast = useCallback((message: string, type: ToastType = 'chant') => {
    const id = nextId.current++
    setToasts(prev => [...prev.slice(-4), { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  return { toasts, addToast }
}

interface ToastSystemProps {
  toasts: Toast[]
}

export default function ToastSystem({ toasts }: ToastSystemProps) {
  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)',
      zIndex: 50, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center',
    }}>
      {toasts.map(toast => (
        <div key={toast.id} style={{
          background: getToastBg(toast.type),
          border: `1px solid ${getToastBorder(toast.type)}`,
          borderRadius: 8, padding: '8px 16px',
          fontSize: 12, color: 'var(--text)',
          fontFamily: 'var(--font-sans)',
          animation: 'toastIn 0.3s ease-out',
          backdropFilter: 'blur(8px)',
          maxWidth: 320, textAlign: 'center',
        }}>
          {toast.message}
        </div>
      ))}
      <style>{`
        @keyframes toastIn {
          0% { transform: translateY(-10px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function getToastBg(type: ToastType): string {
  switch (type) {
    case 'revelation': return 'rgba(201, 162, 39, 0.15)'
    case 'rite': return 'rgba(201, 48, 74, 0.15)'
    case 'rite_incoming': return 'rgba(201, 48, 74, 0.22)'
    case 'roil': return 'rgba(120, 90, 160, 0.2)'
    case 'bargain': return 'rgba(95, 45, 140, 0.26)'
    default: return 'var(--bg-panel)'
  }
}

function getToastBorder(type: ToastType): string {
  switch (type) {
    case 'revelation': return 'rgba(201, 162, 39, 0.35)'
    case 'rite': return 'rgba(201, 48, 74, 0.35)'
    case 'rite_incoming': return 'rgba(201, 48, 74, 0.5)'
    case 'roil': return 'rgba(150, 120, 200, 0.4)'
    case 'bargain': return 'rgba(150, 90, 210, 0.55)'
    default: return 'var(--border)'
  }
}
