import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const SLAB_H = 0.25  // épaisseur constante du slab (m)

const SEG_COLOR = { ramp: 0x3b82f6, palier: 0x94a3b8 }
const SEG_EDGE  = { ramp: 0x1e3a8a, palier: 0x475569 }

export default function RampeVelo3D({ segments, largeur }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!segments?.length || !containerRef.current) return

    const container = containerRef.current
    const W = container.clientWidth  || 560
    const H = container.clientHeight || 280

    // ── Scene ────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf1f5f9)
    scene.fog = new THREE.FogExp2(0xf1f5f9, 0.01)

    // ── Camera ───────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(40, W / H, 0.01, 1000)

    // ── Renderer ─────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)

    // ── Lights ───────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.7))
    const sun = new THREE.DirectionalLight(0xfffbe6, 1.0)
    sun.position.set(20, 30, 15)
    sun.castShadow = true
    sun.shadow.camera.near = 0.1
    sun.shadow.camera.far  = 200
    sun.shadow.camera.left = sun.shadow.camera.bottom = -30
    sun.shadow.camera.right = sun.shadow.camera.top   = 30
    sun.shadow.mapSize.set(1024, 1024)
    scene.add(sun)
    const fill = new THREE.DirectionalLight(0xdde8ff, 0.35)
    fill.position.set(-15, 8, -8)
    scene.add(fill)

    // ── Geometry : slab 25 cm suivant la pente ────────────────────────────────
    // Shape dans le plan XY : top = profil, bottom = profil − SLAB_H
    const totalW  = segments.at(-1).xEnd
    const w       = largeur

    segments.forEach(seg => {
      const shape = new THREE.Shape()
      shape.moveTo(seg.xStart, seg.elevDep)
      shape.lineTo(seg.xEnd,   seg.elevArr)
      shape.lineTo(seg.xEnd,   seg.elevArr - SLAB_H)
      shape.lineTo(seg.xStart, seg.elevDep - SLAB_H)
      shape.closePath()

      const geom = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false })

      const mesh = new THREE.Mesh(geom,
        new THREE.MeshPhongMaterial({ color: SEG_COLOR[seg.type] ?? SEG_COLOR.ramp, shininess: 50 }),
      )
      mesh.castShadow    = true
      mesh.receiveShadow = true
      scene.add(mesh)

      scene.add(new THREE.LineSegments(
        new THREE.EdgesGeometry(geom, 12),
        new THREE.LineBasicMaterial({ color: SEG_EDGE[seg.type] ?? SEG_EDGE.ramp, transparent: true, opacity: 0.45 }),
      ))
    })

    // ── Ground ────────────────────────────────────────────────────────────────
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(totalW + 12, w + 12),
      new THREE.MeshLambertMaterial({ color: 0xdde3ec }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.set(totalW / 2, -SLAB_H, w / 2)
    ground.receiveShadow = true
    scene.add(ground)

    const gridSize = Math.ceil(Math.max(totalW + 8, w + 8))
    const grid = new THREE.GridHelper(gridSize, Math.min(gridSize * 2, 40), 0xb0bcc9, 0xcdd5df)
    grid.position.set(totalW / 2, -SLAB_H, w / 2)
    scene.add(grid)

    // ── Camera position ───────────────────────────────────────────────────────
    const cx      = totalW / 2
    const cz      = w / 2
    const span    = Math.max(totalW, w, 3)
    const totalH  = segments.at(-1).elevArr
    camera.position.set(
      cx - span * 0.5,
      totalH + span * 0.5,
      cz + span * 1.0,
    )
    camera.lookAt(cx, totalH / 2, cz)

    // ── OrbitControls ─────────────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(cx, totalH / 2, cz)
    controls.enableDamping = true
    controls.dampingFactor = 0.07
    controls.minDistance   = 0.5
    controls.maxDistance   = 200
    controls.maxPolarAngle = Math.PI / 2 + 0.1
    controls.update()

    // ── Loop ──────────────────────────────────────────────────────────────────
    let rafId
    const animate = () => {
      rafId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // ── Resize ────────────────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      const nw = container.clientWidth
      const nh = container.clientHeight
      camera.aspect = nw / nh
      camera.updateProjectionMatrix()
      renderer.setSize(nw, nh)
    })
    ro.observe(container)

    // ── Cleanup ───────────────────────────────────────────────────────────────
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
      style={{ height: 280 }}>
      <div ref={containerRef} className="absolute inset-0" />
      <span className="absolute bottom-2 right-3 text-[10px] text-slate-400 pointer-events-none select-none">
        Clic + glisser · scroll pour zoomer
      </span>
    </div>
  )
}
