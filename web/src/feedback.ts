/**
 * Tactile + audible feedback for the chant orb. Kept tiny and dependency-free:
 * haptics ride on navigator.vibrate, and sound is synthesised with the Web
 * Audio API so there are no asset files to ship or preload. Everything is
 * feature-detected and fails silently where unsupported (e.g. desktop without
 * a vibration motor, or browsers that block audio before a gesture).
 */

// ── haptics ────────────────────────────────────────────────────────────────

function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

/** A crisp single tap — the default chant feel. */
export function hapticTap() {
  if (canVibrate()) navigator.vibrate(12)
}

/** A heftier confirm for committing actions (e.g. JOIN). */
export function hapticConfirm() {
  if (canVibrate()) navigator.vibrate([18, 40, 28])
}

/** A stuttering buzz to say "no" when rate-limited. */
export function hapticReject() {
  if (canVibrate()) navigator.vibrate([14, 30, 14])
}

// ── sound ────────────────────────────────────────────────────────────────

let ctx: AudioContext | null = null
let muted = false

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    try {
      ctx = new Ctor()
    } catch {
      return null
    }
  }
  // Browsers suspend the context until a user gesture; tap handlers are gestures.
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function setMuted(value: boolean) {
  muted = value
}

export function isMuted(): boolean {
  return muted
}

/**
 * A short, watery resonant pluck. A low fundamental plus a perfect-fifth
 * overtone give it a chime-like, faintly ritual quality. `intensity` (0..1)
 * nudges pitch and brightness up so rapid chanting feels like it's building.
 */
export function playChant(intensity = 0) {
  if (muted) return
  const ac = audio()
  if (!ac) return

  const now = ac.currentTime
  const lift = Math.min(1, Math.max(0, intensity))
  const base = 196 * Math.pow(2, lift * 0.5) // G3, rising up to ~a fourth
  const detune = 1 + (Math.random() * 0.012 - 0.006) // tiny organic wobble

  const out = ac.createGain()
  out.gain.value = 0.0001
  out.connect(ac.destination)

  // Quick pluck envelope.
  const peak = 0.16 + lift * 0.06
  out.gain.setValueAtTime(0.0001, now)
  out.gain.exponentialRampToValueAtTime(peak, now + 0.008)
  out.gain.exponentialRampToValueAtTime(0.0001, now + 0.28)

  // Gentle low-pass that opens slightly with intensity.
  const filter = ac.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 1400 + lift * 1600
  filter.Q.value = 0.8
  filter.connect(out)

  const fundamental = ac.createOscillator()
  fundamental.type = 'triangle'
  fundamental.frequency.value = base * detune

  const fifth = ac.createOscillator()
  fifth.type = 'sine'
  fifth.frequency.value = base * 1.5 * detune
  const fifthGain = ac.createGain()
  fifthGain.gain.value = 0.4
  fifth.connect(fifthGain).connect(filter)
  fundamental.connect(filter)

  fundamental.start(now)
  fifth.start(now)
  fundamental.stop(now + 0.3)
  fifth.stop(now + 0.3)
}

/** A warmer two-note rise for committing actions like JOIN. */
export function playConfirm() {
  if (muted) return
  const ac = audio()
  if (!ac) return
  const now = ac.currentTime
  ;[261.63, 392].forEach((freq, i) => {
    const t = now + i * 0.09
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = 'triangle'
    osc.frequency.value = freq
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34)
    osc.connect(g).connect(ac.destination)
    osc.start(t)
    osc.stop(t + 0.36)
  })
}

/** A short dissonant thud for the rate-limited "slow down". */
export function playReject() {
  if (muted) return
  const ac = audio()
  if (!ac) return
  const now = ac.currentTime
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(140, now)
  osc.frequency.exponentialRampToValueAtTime(90, now + 0.16)
  g.gain.setValueAtTime(0.0001, now)
  g.gain.exponentialRampToValueAtTime(0.12, now + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.2)
  osc.connect(g).connect(ac.destination)
  osc.start(now)
  osc.stop(now + 0.22)
}
