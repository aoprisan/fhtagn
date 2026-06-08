import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', color: 'var(--text)',
          background: 'var(--bg)', gap: 16,
        }}>
          <span style={{ fontSize: 18, fontWeight: 600 }}>Something went wrong</span>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 20px', borderRadius: 6, border: 'none',
              background: 'var(--gold)', color: '#000', cursor: 'pointer',
              fontWeight: 600, fontSize: 14,
            }}
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
