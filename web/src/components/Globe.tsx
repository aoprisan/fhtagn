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
  paused?: boolean   // stop auto-rotation (e.g. while aiming a rite)
}

export default function Globe({ cells, userCellId, onCellClick, selectedCellId, pulsingCellId, paused }: GlobeProps) {
  const globeRef = useRef<any>(null)
  const [polygons, setPolygons] = useState<any[]>([])
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight })

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

  // Auto-rotate (paused while aiming a rite, so targets hold still)
  useEffect(() => {
    if (!globeRef.current) return
    const controls = globeRef.current.controls()
    if (controls) {
      controls.autoRotate = !paused
      controls.autoRotateSpeed = 0.35
      controls.enableDamping = false
    }
  }, [paused])

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

      frameId = requestAnimationFrame(animate)
    }

    const timer = setTimeout(() => { frameId = requestAnimationFrame(animate) }, 1000)

    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(frameId)
    }
  }, [])

  // Fly to the player's cell on mount
  useEffect(() => {
    if (!globeRef.current || !userCellId) return
    const cell = cells.find(c => c.id === userCellId)
    if (cell) {
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
    if (cell.id === userCellId) return '#f0c54a'       // sickly tallow gold — yours
    if (cell.id === selectedCellId) return '#46e6cd'   // lure-light — selected
    return cell.devotion > 0 ? '#2bbfa8cc' : '#2bbfa83a'
  }, [userCellId, selectedCellId])

  const pointRadius = useCallback((d: any) => {
    const cell = d as Cell
    if (cell.id === userCellId) return 0.4 + Math.min(0.4, 0.4 * Math.log10(Math.max(1, cells.find(c => c.id === userCellId)?.devotion ?? 1)) / Math.log10(Math.max(10, maxDevotion)))
    if (cell.devotion > 0) return 0.15 + Math.min(0.35, 0.35 * Math.log10(cell.devotion) / Math.log10(Math.max(10, maxDevotion)))
    return 0.12
  }, [userCellId, maxDevotion, cells])

  const handlePointClick = useCallback((point: any) => {
    const cell = point as Cell
    onCellClick(cell)
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: cell.lat, lng: cell.lng, altitude: 1.8 }, 800)
    }
  }, [onCellClick])

  const pointLabel = useCallback((d: any) => {
    const cell = d as Cell
    return `<div style="font-family: sans-serif; font-size: 13px; color: #e8e8f0; text-align: center;">
      <b>${cell.name}</b>, ${cell.country}<br/>
      <span style="font-family: monospace; color: #c9a227;">${cell.devotion.toLocaleString()} devotion</span>
    </div>`
  }, [])

  const cellsRef = useRef(cells)
  cellsRef.current = cells
  const ringsData = useMemo(() => {
    if (!pulsingCellId) return []
    const cell = cellsRef.current.find(c => c.id === pulsingCellId)
    if (!cell) return []
    return [{ lat: cell.lat, lng: cell.lng }]
  }, [pulsingCellId])

  return (
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
      ringColor={() => '#46e6cd'}
      ringMaxRadius={3}
      ringPropagationSpeed={2}
      ringRepeatPeriod={800}
      atmosphereColor="#2bbfa8"
      atmosphereAltitude={0.22}
      animateIn={true}
      width={dimensions.width}
      height={dimensions.height}
    />
  )
}
