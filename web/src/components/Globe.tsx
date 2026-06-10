import { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import GlobeGL from 'react-globe.gl'
import * as THREE from 'three'
import type { Cell } from '../types'
import * as topojson from 'topojson-client'

// Bundled locally (see public/) so GitHub Pages works with no third-party calls.
const WORLD_ATLAS_URL = `${import.meta.env.BASE_URL}countries-110m.json`

interface GlobeProps {
  cells: Cell[]
  userCellId: string | null
  onCellClick: (cell: Cell) => void
  selectedCellId: string | null
  pulsingCellId: string | null
  roilStrike?: { lat: number; lng: number; key: number } | null  // the Roil falls here
  targetStatus?: (cell: Cell) => 'valid' | 'invalid' | 'home' | null
  paused?: boolean   // stop auto-rotation (e.g. while aiming a rite)
}

interface Beam { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; born: number }

export default function Globe({ cells, userCellId, onCellClick, selectedCellId, pulsingCellId, roilStrike, targetStatus, paused }: GlobeProps) {
  const globeRef = useRef<any>(null)
  const [polygons, setPolygons] = useState<any[]>([])
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight })
  // Active Roil shockwaves (violet rings) and the descending beams that drive them.
  const [roilRings, setRoilRings] = useState<{ lat: number; lng: number; id: number }[]>([])
  const beamsRef = useRef<Beam[]>([])

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    const handleResize = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        setDimensions({ width: window.innerWidth, height: window.innerHeight })
      }, 150)
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(timeout)
    }
  }, [])

  // Load country polygons
  useEffect(() => {
    fetch(WORLD_ATLAS_URL)
      .then(r => r.json())
      .then(worldData => {
        const countries = topojson.feature(worldData, worldData.objects.countries)
        setPolygons((countries as any).features)
      })
      .catch(() => {})
  }, [])

  // Auto-rotate (paused while aiming a rite, so targets hold still) and
  // constrain how far the seeker may draw in / pull back from the void.
  useEffect(() => {
    if (!globeRef.current) return
    const controls = globeRef.current.controls()
    if (controls) {
      controls.autoRotate = !paused
      controls.autoRotateSpeed = 0.35
      controls.enableDamping = false
      controls.enableZoom = true
      controls.zoomSpeed = 0.8
      controls.minDistance = 140   // closest the eye may press to the sphere
      controls.maxDistance = 520   // farthest it may recede
    }
  }, [paused])

  // Zoom by nudging the camera altitude toward/away from the surface. Reads the
  // live point-of-view so taps compound, and animates so it feels like drifting.
  const zoom = useCallback((factor: number) => {
    if (!globeRef.current) return
    const pov = globeRef.current.pointOfView()
    const altitude = Math.max(0.35, Math.min(3.6, pov.altitude * factor))
    globeRef.current.pointOfView({ ...pov, altitude }, 400)
  }, [])

  // Azathoth's strike: a tapering violet column lances down from the void onto the
  // cell, wide at the sky and narrowing to the point of impact. Added straight to
  // the scene and animated in the render loop above (react-globe.gl has no beam layer).
  const spawnBeam = useCallback((lat: number, lng: number) => {
    const globe = globeRef.current
    if (!globe?.getCoords || !globe.scene) return
    const scene = globe.scene()
    if (!scene) return
    const b = globe.getCoords(lat, lng, 0.004)
    const t = globe.getCoords(lat, lng, 0.62)
    const baseV = new THREE.Vector3(b.x, b.y, b.z)
    const topV = new THREE.Vector3(t.x, t.y, t.z)
    const height = baseV.distanceTo(topV)
    const dir = topV.clone().sub(baseV).normalize()
    const geo = new THREE.CylinderGeometry(2.6, 0.5, height, 18, 1, true)  // wide at the void
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0xa878e0),
      transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.copy(baseV.clone().add(topV).multiplyScalar(0.5))
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
    scene.add(mesh)
    beamsRef.current.push({ mesh, mat, born: Date.now() })
  }, [])

  // When the Roil falls, lance a beam down and ripple a violet shockwave out;
  // the ring clears itself once it has propagated.
  useEffect(() => {
    if (!roilStrike) return
    spawnBeam(roilStrike.lat, roilStrike.lng)
    const ring = { lat: roilStrike.lat, lng: roilStrike.lng, id: roilStrike.key }
    setRoilRings(prev => [...prev, ring])
    const timer = setTimeout(() => {
      setRoilRings(prev => prev.filter(r => r.id !== ring.id))
    }, 1400)
    return () => clearTimeout(timer)
  }, [roilStrike?.key, spawnBeam])

  // Abyssal void globe: a dark sphere with a slow teal pulse, no Earth texture.
  useEffect(() => {
    if (!globeRef.current) return
    const globe = globeRef.current

    let frameId: number
    let globeMat: THREE.MeshPhongMaterial | null = null

    const animate = () => {
      const t = Date.now() * 0.001
      const scene = globe.scene()

      if (!globeMat && scene) {
        scene.traverse((obj: THREE.Object3D) => {
          if (globeMat) return
          if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshPhongMaterial && obj.geometry instanceof THREE.SphereGeometry) {
            globeMat = obj.material
            globeMat.color = new THREE.Color(0x05080f)
            globeMat.emissive = new THREE.Color(0x04201d)
            globeMat.emissiveIntensity = 0.4
          }
        })
      }

      if (globeMat) {
        const intensity = 0.28 + 0.14 * Math.sin(t * 0.35)
        globeMat.emissiveIntensity = intensity
        const hue = 0.47 + 0.02 * Math.sin(t * 0.2) // teal range
        globeMat.emissive.setHSL(hue, 0.7, 0.08)
      }

      // Landmass faint glow
      if (scene && !(scene as any).__glowApplied) {
        scene.traverse((obj: THREE.Object3D) => {
          if (obj instanceof THREE.Mesh && obj.material) {
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
            for (const mat of mats) {
              if (mat instanceof THREE.MeshLambertMaterial && mat.color) {
                mat.emissive = new THREE.Color(0x0a2a26)
                mat.emissiveIntensity = 0.4
              }
            }
          }
        })
        ;(scene as any).__glowApplied = true
      }

      // The Roil's reach: fade each descending beam, slam it home, then retire it.
      if (scene) {
        const beams = beamsRef.current
        for (let i = beams.length - 1; i >= 0; i--) {
          const b = beams[i]
          const age = (Date.now() - b.born) / 1000
          if (age >= 1) {
            scene.remove(b.mesh)
            b.mesh.geometry.dispose()
            b.mat.dispose()
            beams.splice(i, 1)
            continue
          }
          const k = age            // 0 → 1 over one second
          const flicker = 0.7 + 0.3 * Math.abs(Math.sin(age * 42))
          b.mat.opacity = 0.85 * (1 - k) * flicker
          const slamY = k < 0.15 ? 1.3 - (k / 0.15) * 0.3 : 1
          b.mesh.scale.set(1 + k * 0.5, slamY, 1 + k * 0.5)
        }
      }

      frameId = requestAnimationFrame(animate)
    }

    const timer = setTimeout(() => { frameId = requestAnimationFrame(animate) }, 1000)

    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(frameId)
    }
  }, [])

  // Fly to the player's cell — ONCE per cell. Cells tick constantly (devotion),
  // so without this guard the flight would re-fire on every update and snap the
  // camera back to altitude 1.5, undoing any zoom the seeker has set.
  const flownToRef = useRef<string | null>(null)
  useEffect(() => {
    if (!globeRef.current || !userCellId) return
    if (flownToRef.current === userCellId) return
    const cell = cells.find(c => c.id === userCellId)
    if (cell) {
      flownToRef.current = userCellId
      setTimeout(() => {
        globeRef.current.pointOfView({ lat: cell.lat, lng: cell.lng, altitude: 1.5 }, 1500)
      }, 500)
    }
  }, [userCellId, cells])

  const maxDevotion = useMemo(() => Math.max(1, ...cells.map(c => c.devotion)), [cells])

  const pointAltitude = useCallback((d: any) => {
    const cell = d as Cell
    if (cell.devotion === 0) return 0.001
    return 0.001 + 0.012 * Math.log10(cell.devotion) / Math.log10(Math.max(10, maxDevotion))
  }, [maxDevotion])

  const pointColor = useCallback((d: any) => {
    const cell = d as Cell
    const status = targetStatus?.(cell)
    if (status === 'valid') return '#d8a93aee'
    if (status === 'invalid') return '#cf355066'
    if (status === 'home') return '#f0c54a'
    if (cell.id === userCellId) return '#f0c54a'       // sickly tallow gold — yours
    if (cell.id === selectedCellId) return '#46e6cd'   // lure-light — selected
    return cell.devotion > 0 ? '#2bbfa8cc' : '#2bbfa83a'
  }, [userCellId, selectedCellId, targetStatus])

  const pointRadius = useCallback((d: any) => {
    const cell = d as Cell
    const status = targetStatus?.(cell)
    if (status === 'valid') return 0.42
    if (status === 'invalid') return 0.16
    if (cell.id === userCellId) return 0.4 + Math.min(0.4, 0.4 * Math.log10(Math.max(1, cells.find(c => c.id === userCellId)?.devotion ?? 1)) / Math.log10(Math.max(10, maxDevotion)))
    if (cell.devotion > 0) return 0.15 + Math.min(0.35, 0.35 * Math.log10(cell.devotion) / Math.log10(Math.max(10, maxDevotion)))
    return 0.12
  }, [userCellId, maxDevotion, cells, targetStatus])

  const handlePointClick = useCallback((point: any) => {
    const cell = point as Cell
    onCellClick(cell)
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: cell.lat, lng: cell.lng, altitude: 1.8 }, 800)
    }
  }, [onCellClick])

  const pointLabel = useCallback((d: any) => {
    const cell = d as Cell
    const status = targetStatus?.(cell)
    const hint = status === 'valid'
      ? '<br/><span style="color:#d8a93a;">valid target</span>'
      : status === 'invalid'
        ? '<br/><span style="color:#cf3550;">beyond this working</span>'
        : ''
    return `<div style="font-family: sans-serif; font-size: 13px; color: #e8e8f0; text-align: center;">
      <b>${cell.name}</b>, ${cell.country}<br/>
      <span style="font-family: monospace; color: #c9a227;">${cell.devotion.toLocaleString()} devotion</span>${hint}
    </div>`
  }, [targetStatus])

  const cellsRef = useRef(cells)
  cellsRef.current = cells
  const ringsData = useMemo(() => {
    const out: { lat: number; lng: number; kind: 'pulse' | 'roil' }[] = []
    if (pulsingCellId) {
      const cell = cellsRef.current.find(c => c.id === pulsingCellId)
      if (cell) out.push({ lat: cell.lat, lng: cell.lng, kind: 'pulse' })
    }
    for (const r of roilRings) out.push({ lat: r.lat, lng: r.lng, kind: 'roil' })
    return out
  }, [pulsingCellId, roilRings])

  return (
    <>
    <GlobeGL
      ref={globeRef}
      // No Earth/space textures — the void is the aesthetic and keeps us CDN-free.
      backgroundColor="#02040a"
      polygonsData={polygons}
      polygonCapColor={() => 'rgba(10, 28, 30, 0.6)'}
      polygonSideColor={() => 'rgba(43, 191, 168, 0.06)'}
      polygonStrokeColor={() => 'rgba(70, 230, 205, 0.28)'}
      polygonAltitude={0.006}
      pointsData={cells}
      pointLat="lat"
      pointLng="lng"
      pointAltitude={pointAltitude}
      pointColor={pointColor}
      pointRadius={pointRadius}
      pointLabel={pointLabel}
      onPointClick={handlePointClick}
      pointsTransitionDuration={0}
      ringsData={ringsData}
      ringLat="lat"
      ringLng="lng"
      // The Roil rings ride the same layer as the teal pulse, but ripple faster,
      // wider, and in Azathoth's violet, fading as they spread.
      ringColor={(d: any) => (d.kind === 'roil' ? (t: number) => `rgba(168, 120, 224, ${(1 - t) * 0.9})` : '#46e6cd')}
      ringMaxRadius={(d: any) => (d.kind === 'roil' ? 7 : 3)}
      ringPropagationSpeed={(d: any) => (d.kind === 'roil' ? 6 : 2)}
      ringRepeatPeriod={(d: any) => (d.kind === 'roil' ? 280 : 800)}
      atmosphereColor="#2bbfa8"
      atmosphereAltitude={0.22}
      animateIn={true}
      width={dimensions.width}
      height={dimensions.height}
    />

    {/* Zoom controls — left side, clear of the chant orb (bottom-right) and the
        dock. Sized for a thumb. */}
    <div className="globe-zoom">
      <button aria-label="Draw closer" onClick={() => zoom(0.72)}>+</button>
      <button aria-label="Pull back" onClick={() => zoom(1.38)}>−</button>
    </div>

    <style>{`
      .globe-zoom {
        position: absolute;
        left: 18px;
        bottom: 32px;
        z-index: 10;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .globe-zoom button {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: 1px solid rgba(70, 230, 205, 0.45);
        background: radial-gradient(circle at 36% 32%, rgba(20,52,48,0.92), rgba(6,18,22,0.92));
        color: #8ff3df;
        font-family: var(--font-display);
        font-size: 26px;
        line-height: 1;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 0 18px rgba(43,191,168,0.3), inset 0 1px 6px rgba(255,255,255,0.12);
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        transition: transform 0.1s ease, box-shadow 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .globe-zoom button:active {
        transform: scale(0.9);
        box-shadow: 0 0 26px rgba(43,191,168,0.55), inset 0 1px 6px rgba(255,255,255,0.12);
      }
      @media (max-width: 768px) {
        .globe-zoom {
          left: 16px;
          bottom: calc(var(--dock-h) + var(--safe-b) + 14px);
        }
        .globe-zoom button { width: 54px; height: 54px; font-size: 30px; }
      }
    `}</style>
    </>
  )
}
