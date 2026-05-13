import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const SEG_COLOR = { racc: 0xfbbf24, ramp: 0x22c55e }
const SEG_EDGE  = { racc: 0x92400e, ramp: 0x14532d }

const SLAB_H    = 0.30   // épaisseur de la dalle, m
const LANDING_D = 3.0    // profondeur des paliers (axe X), m
const LANDING_W = 10.0   // largeur des paliers (axe Z), m
const LANDING_COLOR = 0x94a3b8
const LANDING_EDGE  = 0x475569

function slabShape(x0, y0, x1, y1) {
  const s = new THREE.Shape()
  s.moveTo(x0, y0 - SLAB_H)
  s.lineTo(x1, y1 - SLAB_H)
  s.lineTo(x1, y1)
  s.lineTo(x0, y0)
  s.closePath()
  return s
}

const DOUBLE_SENS_THRESHOLD = 5.5  // m
const DASH_LEN = 2.0   // longueur d'un tiret, m
const DASH_GAP = 1.0   // écart entre tirets, m
const DASH_W   = 0.12  // largeur du tiret, m
const MARK_T   = 0.025 // épaisseur au-dessus de la surface, m

// Trace une ligne de marquage centrale sur la surface d'un segment incliné
function addCenterLine(scene, segments, w) {
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const zCenter = (w - DASH_W) / 2  // position Z du tiret (centré sur la rampe)

  segments.forEach(seg => {
    const dx     = seg.xEnd - seg.xStart
    const dy     = seg.elevArr - seg.elevDep
    const arcLen = Math.sqrt(dx * dx + dy * dy)
    if (arcLen < 0.01) return
    const cos_a = dx / arcLen
    const sin_a = dy / arcLen
    // Normale à la surface (perpendiculaire, vers le haut)
    const nx = -sin_a
    const ny =  cos_a

    let s = DASH_GAP / 2  // démarre légèrement en retrait
    while (s < arcLen) {
      const s0 = s
      const s1 = Math.min(s + DASH_LEN, arcLen)
      if (s1 - s0 < 0.1) { s += DASH_LEN + DASH_GAP; continue }

      const x0 = seg.xStart + s0 * cos_a,  y0 = seg.elevDep + s0 * sin_a
      const x1 = seg.xStart + s1 * cos_a,  y1 = seg.elevDep + s1 * sin_a

      const shape = new THREE.Shape()
      shape.moveTo(x0,             y0)
      shape.lineTo(x1,             y1)
      shape.lineTo(x1 + nx*MARK_T, y1 + ny*MARK_T)
      shape.lineTo(x0 + nx*MARK_T, y0 + ny*MARK_T)
      shape.closePath()

      const geom = new THREE.ExtrudeGeometry(shape, { depth: DASH_W, bevelEnabled: false })
      const mesh = new THREE.Mesh(geom, mat)
      mesh.position.z = zCenter
      scene.add(mesh)

      s += DASH_LEN + DASH_GAP
    }
  })
}

function addSlab(scene, shape, w, color, edgeColor, zOffset = 0) {
  const geom = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false })
  const mat  = new THREE.MeshPhongMaterial({ color, shininess: 35 })
  const mesh = new THREE.Mesh(geom, mat)
  mesh.position.z    = zOffset
  mesh.castShadow    = true
  mesh.receiveShadow = true
  scene.add(mesh)
  const edgeLine = new THREE.LineSegments(new THREE.EdgesGeometry(geom, 10),
    new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: 0.5 }))
  edgeLine.position.z = zOffset
  scene.add(edgeLine)
}

export default function Ramp3D({ segments, largeur }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!segments?.length || !containerRef.current) return

    const container = containerRef.current
    const W = container.clientWidth  || 560
    const H = container.clientHeight || 320

    // ── Scene ──────────────────────────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf1f5f9)
    scene.fog = new THREE.FogExp2(0xf1f5f9, 0.012)

    // ── Camera ─────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(40, W / H, 0.01, 1000)

    // ── Renderer ───────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)

    // ── Lights ─────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.65))
    const sun = new THREE.DirectionalLight(0xfffbe6, 1.1)
    sun.position.set(20, 30, 15)
    sun.castShadow = true
    sun.shadow.camera.near = 0.1
    sun.shadow.camera.far  = 200
    sun.shadow.camera.left = sun.shadow.camera.bottom = -40
    sun.shadow.camera.right = sun.shadow.camera.top   =  40
    sun.shadow.mapSize.set(1024, 1024)
    scene.add(sun)
    const fill = new THREE.DirectionalLight(0xdde8ff, 0.4)
    fill.position.set(-15, 8, -8)
    scene.add(fill)

    // ── Geometry ───────────────────────────────────────────────────────────
    const totalW = segments.at(-1).xEnd
    const totalH = segments.at(-1).elevArr
    const w      = largeur

    // Segments — dalle inclinée 30 cm
    segments.forEach(seg => {
      addSlab(scene,
        slabShape(seg.xStart, seg.elevDep, seg.xEnd, seg.elevArr),
        w, SEG_COLOR[seg.type], SEG_EDGE[seg.type],
      )
    })

    // Marquage central double sens
    if (w >= DOUBLE_SENS_THRESHOLD) {
      addCenterLine(scene, segments, w)
    }

    // Paliers — centrés sur la largeur de la rampe
    const landingZ = (w - LANDING_W) / 2
    addSlab(scene, slabShape(-LANDING_D, 0, 0, 0),
      LANDING_W, LANDING_COLOR, LANDING_EDGE, landingZ)
    addSlab(scene, slabShape(totalW, totalH, totalW + LANDING_D, totalH),
      LANDING_W, LANDING_COLOR, LANDING_EDGE, landingZ)

    // ── Ground ─────────────────────────────────────────────────────────────
    const sceneW    = totalW + LANDING_D * 2
    const sceneZMax = Math.max(w, LANDING_W)
    const groundGeom = new THREE.PlaneGeometry(sceneW + 8, sceneZMax + 8)
    const groundMesh = new THREE.Mesh(groundGeom,
      new THREE.MeshLambertMaterial({ color: 0xdde3ec }))
    groundMesh.rotation.x = -Math.PI / 2
    groundMesh.position.set(totalW / 2, -0.01, w / 2)
    groundMesh.receiveShadow = true
    scene.add(groundMesh)

    const gridSize = Math.ceil(Math.max(sceneW + 6, sceneZMax + 6))
    const grid = new THREE.GridHelper(gridSize, Math.min(gridSize, 30), 0xb0bcc9, 0xcdd5df)
    grid.position.set(totalW / 2, 0, w / 2)
    scene.add(grid)

    // ── Camera position ─────────────────────────────────────────────────────
    const cx   = totalW / 2
    const cz   = w / 2
    const span = Math.max(totalW + LANDING_D * 2, w)
    camera.position.set(
      cx - span * 0.55,
      totalH + span * 0.5,
      cz + span * 1.0,
    )
    camera.lookAt(cx, totalH * 0.3, cz)

    // ── OrbitControls ───────────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(cx, totalH * 0.3, cz)
    controls.enableDamping = true
    controls.dampingFactor = 0.07
    controls.minDistance   = 1
    controls.maxDistance   = 300
    controls.maxPolarAngle = Math.PI / 2 + 0.1
    controls.update()

    // ── Loop ────────────────────────────────────────────────────────────────
    let rafId
    const animate = () => {
      rafId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // ── Resize ──────────────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      const nw = container.clientWidth
      const nh = container.clientHeight
      camera.aspect = nw / nh
      camera.updateProjectionMatrix()
      renderer.setSize(nw, nh)
    })
    ro.observe(container)

    // ── Cleanup ─────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
      controls.dispose()
      scene.traverse(obj => {
        obj.geometry?.dispose()
        if (obj.material) {
          ;(Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => m.dispose())
        }
      })
      renderer.dispose()
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
    }
  }, [segments, largeur])

  return (
    <div className="relative bg-slate-100 rounded-xl border border-gray-200 shadow-sm overflow-hidden"
      style={{ height: 320 }}>
      <div ref={containerRef} className="absolute inset-0" />
      <span className="absolute bottom-2 right-3 text-[10px] text-slate-400 pointer-events-none select-none">
        Clic + glisser pour orbiter · scroll pour zoomer
      </span>
    </div>
  )
}
