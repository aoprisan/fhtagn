import { useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

// Owns every PWA-facing moment: service-worker registration (so the build runs
// offline against the in-browser sim), the "offline ready" notice, the install
// invitation — Android/desktop via beforeinstallprompt, iOS via a hint since
// Safari fires no such event — and the always-visible update button. Themed to
// the Drowned Vigil.

const DISMISS_KEY = 'fhtagn.install.dismissed'
const BASE = import.meta.env.BASE_URL
const UPDATE_CHECK_MS = 60 * 60 * 1000   // hourly background check while open

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
  // The update button is ALWAYS rendered; this is only its transient activity state.
  const [updateState, setUpdateState] = useState<'idle' | 'checking' | 'current'>('idle')
  const swReg = useRef<ServiceWorkerRegistration | null>(null)
  const checkTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      swReg.current = reg ?? null
      if (reg) {
        // A long-lived tab still hears about new builds without being asked.
        const t = setInterval(() => { reg.update().catch(() => {}) }, UPDATE_CHECK_MS)
        window.addEventListener('beforeunload', () => clearInterval(t))
      }
    },
    onRegisterError(err) {
      console.warn('[fhtagn] service worker registration failed', err)
    },
  })

  // The one button, three moods: a new build waits → apply it (reloads); no
  // service worker (dev / unsupported) → plain reload; otherwise → ask the
  // network for a fresher build and report back.
  async function checkForUpdate() {
    if (needRefresh) {
      await updateServiceWorker(true)
      return
    }
    if (!swReg.current) {
      window.location.reload()
      return
    }
    setUpdateState('checking')
    try { await swReg.current.update() } catch { /* offline — nothing to fetch */ }
    // Give a freshly found worker a beat to surface needRefresh before
    // declaring the build current.
    clearTimeout(checkTimer.current)
    checkTimer.current = setTimeout(() => {
      setUpdateState(s => (s === 'checking' ? 'current' : s))
    }, 1200)
  }

  // "Up to date" lingers a breath, then the button goes quiet again.
  useEffect(() => {
    if (updateState !== 'current') return
    const t = setTimeout(() => setUpdateState('idle'), 2600)
    return () => clearTimeout(t)
  }, [updateState])

  useEffect(() => () => clearTimeout(checkTimer.current), [])

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
      {/* Always shown: the player can pull a new build at any moment. It glows
          when one is already waiting. */}
      <button
        className={`vigil-update ${needRefresh ? 'vigil-update--ready' : ''}`}
        onClick={checkForUpdate}
        disabled={updateState === 'checking'}
        title={needRefresh
          ? 'A new build is ready — apply and reload'
          : 'Check for a new build of the Vigil'}
      >
        <span className="vigil-update__rune" aria-hidden>{needRefresh ? '✦' : '⟳'}</span>
        {needRefresh
          ? 'Update ready — renew'
          : updateState === 'checking'
            ? 'Consulting the stars…'
            : updateState === 'current'
              ? 'The Vigil is current'
              : 'Update'}
      </button>

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
