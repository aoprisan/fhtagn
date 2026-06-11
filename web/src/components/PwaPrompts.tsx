import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

// Owns every PWA-facing moment: service-worker registration (so the build runs
// offline against the in-browser sim), the "offline ready" notice, and the
// install invitation — Android/desktop via beforeinstallprompt, iOS via a hint
// since Safari fires no such event. Themed to the Drowned Vigil.

const DISMISS_KEY = 'fhtagn.install.dismissed'
const BASE = import.meta.env.BASE_URL

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari exposes its own flag rather than display-mode.
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent)
}

export default function PwaPrompts() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [iosHint, setIosHint] = useState(false)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(err) {
      console.warn('[fhtagn] service worker registration failed', err)
    },
  })

  // Capture the install opportunity (Android/desktop), or fall back to the iOS hint.
  useEffect(() => {
    if (dismissed || isStandalone()) return

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setDeferred(null)
      setIosHint(false)
      localStorage.setItem(DISMISS_KEY, '1')
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)

    // iOS never fires beforeinstallprompt — offer the manual path instead.
    if (isIos()) {
      const t = setTimeout(() => setIosHint(true), 4000)
      return () => {
        clearTimeout(t)
        window.removeEventListener('beforeinstallprompt', onBeforeInstall)
        window.removeEventListener('appinstalled', onInstalled)
      }
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [dismissed])

  // Offline-ready notice retires itself after a breath.
  useEffect(() => {
    if (!offlineReady) return
    const t = setTimeout(() => setOfflineReady(false), 5200)
    return () => clearTimeout(t)
  }, [offlineReady, setOfflineReady])

  function dismiss() {
    setDeferred(null)
    setIosHint(false)
    setDismissed(true)
    localStorage.setItem(DISMISS_KEY, '1')
  }

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
    setDismissed(true)
    localStorage.setItem(DISMISS_KEY, '1')
  }

  const showInstall = !dismissed && (deferred !== null || iosHint)

  return (
    <>
      {/* A fresh build is waiting — let the player apply it on their own beat
          rather than reloading mid-chant. updateServiceWorker(true) reloads. */}
      {needRefresh && (
        <aside className="vigil-install vigil-update" role="dialog" aria-label="Update FHTAGN">
          <img className="vigil-install__sigil" src={`${BASE}favicon.svg`} alt="" aria-hidden width={44} height={44} />
          <div className="vigil-install__body">
            <h3>New rites have arrived</h3>
            <p>A newer Vigil waits. Renew now to take it up — your cult is untouched.</p>
          </div>
          <div className="vigil-install__acts">
            <button className="vigil-install__yes" onClick={() => updateServiceWorker(true)}>
              Renew the Vigil
            </button>
            <button className="vigil-install__no" onClick={() => setNeedRefresh(false)} aria-label="Dismiss">
              Later
            </button>
          </div>
        </aside>
      )}

      {showInstall && (
        <aside className="vigil-install" role="dialog" aria-label="Install FHTAGN">
          <img className="vigil-install__sigil" src={`${BASE}favicon.svg`} alt="" aria-hidden width={44} height={44} />
          <div className="vigil-install__body">
            <h3>Bind the Vigil</h3>
            {deferred ? (
              <p>Anchor FHTAGN to this device — it keeps watch even when the stars go dark.</p>
            ) : (
              <p>
                Tap <span className="vigil-install__key">Share</span> then{' '}
                <span className="vigil-install__key">Add to Home Screen</span> to anchor the Vigil.
              </p>
            )}
          </div>
          <div className="vigil-install__acts">
            {deferred && (
              <button className="vigil-install__yes" onClick={install}>
                Anchor it
              </button>
            )}
            <button className="vigil-install__no" onClick={dismiss} aria-label="Dismiss">
              {deferred ? 'Not yet' : 'Dismiss'}
            </button>
          </div>
        </aside>
      )}

      {offlineReady && (
        <div className="vigil-offline" role="status">
          <span className="vigil-offline__rune" aria-hidden>
            ✶
          </span>
          The rites are secured — the Vigil holds without the network.
        </div>
      )}
    </>
  )
}
