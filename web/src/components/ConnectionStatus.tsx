import type { ConnectionState } from '../hooks/useGameClient'

interface ConnectionStatusProps {
  state: ConnectionState
}

export default function ConnectionStatus({ state }: ConnectionStatusProps) {
  if (state === 'connected') return null

  const isConnecting = state === 'connecting'

  return (
    <div style={{
      position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
      zIndex: 50, padding: '6px 16px', borderRadius: 8,
      background: isConnecting ? 'rgba(201, 162, 39, 0.15)' : 'rgba(201, 48, 74, 0.15)',
      border: `1px solid ${isConnecting ? 'rgba(201, 162, 39, 0.3)' : 'rgba(201, 48, 74, 0.3)'}`,
      backdropFilter: 'blur(8px)',
      fontSize: 12, fontFamily: 'var(--font-mono)',
      color: isConnecting ? 'var(--gold)' : 'var(--crimson)',
    }}>
      {isConnecting ? 'Reaching into the dark…' : 'The connection is severed'}
    </div>
  )
}
