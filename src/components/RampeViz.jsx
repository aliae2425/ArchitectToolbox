import { useMemo, useState, lazy, Suspense } from 'react'

const Ramp3D = lazy(() => import('./Ramp3D'))

const PALIER_L = 1.40
const LEAD    = 1.40
const Y_EXAG  = 6

const SCENARIOS = [
  { pente: 5,  maxRampL: 10,  stroke: '#16a34a', fill: '#bbf7d0', label: '5 %',  note: 'optimal' },
  { pente: 8,  maxRampL: 2,   stroke: '#d97706', fill: '#fde68a', label: '8 %',  note: 'toléré ≤ 2 m' },
  { pente: 12, maxRampL: 0.5, stroke: '#dc2626', fill: '#fecaca', label: '12 %', note: 'ERP exist. ≤ 0,5 m' },
]

function computeProfile(denivelee, pente, maxRampL) {
  const lr = denivelee / (pente / 100)
  const n  = Math.ceil(lr / maxRampL)
  const lt = lr / n
  const ht = denivelee / n

  const segs = []
  let x = 0, y = 0
  const add = (dx, dy, t) => {
    segs.push({ x1: x, y1: y, x2: x + dx, y2: y + dy, type: t })
    x += dx; y += dy
  }

  add(LEAD, 0, 'palier')
  for (let i = 0; i < n; i++) {
    add(lt, ht, 'ramp')
    if (i < n - 1) add(PALIER_L, 0, 'palier')
  }
  add(LEAD, 0, 'palier')

  const pts = [{ x: 0, y: 0 }]
  segs.forEach(s => {
    const last = pts[pts.length - 1]
    if (s.x2 !== last.x || s.y2 !== last.y) pts.push({ x: s.x2, y: s.y2 })
  })

  return { segs, pts, W: x, lr, n, np: n - 1, compliant: lr <= maxRampL }
}

function boundaryXs(segs) {
  const set = new Set()
  segs.forEach(s => { set.add(s.x1); set.add(s.x2) })
  return [...set].sort((a, b) => a - b)
}

const interPaliers = segs =>
  segs.filter((s, i) => s.type === 'palier' && i > 0 && i < segs.length - 1)

function pmrSegsTo3D(segs) {
  return segs.map(s => ({
    id: `${s.x1}-${s.x2}`,
    type: s.type === 'ramp' ? 'ramp' : 'racc',
    xStart:   s.x1,
    xEnd:     s.x2,
    elevDep:  s.y1,
    elevArr:  s.y2,
    pente:    s.x2 - s.x1 > 0 ? (s.y2 - s.y1) / (s.x2 - s.x1) * 100 : 0,
    longueur: s.x2 - s.x1,
    hauteur:  s.y2 - s.y1,
  }))
}

export default function RampeViz({ denivelee, largeur = 1.40 }) {
  const d = parseFloat(denivelee)
  const w = parseFloat(largeur) || 1.40

  const [tab3D, setTab3D] = useState(0)

  const profiles = useMemo(() => {
    if (!d || d <= 0) return null
    return SCENARIOS.map(s => ({ ...s, p: computeProfile(d, s.pente, s.maxRampL) }))
  }, [d, w])

  if (!profiles) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
        <span className="block text-4xl mb-3">📐</span>
        <p className="text-sm">Saisissez une dénivelée pour voir la prévisualisation.</p>
      </div>
    )
  }

  const SVG_W = 560
  const ML = 48, MR = 16
  const MT_C = 22, MB_C = 28
  const MT_P = 30, MB_P = 28
  const UW = SVG_W - ML - MR

  // Scale from widest profile (5 %) so all curves fit
  const refW = profiles[0].p.W
  const xs   = UW / refW
  const ysRaw = xs * Y_EXAG
  const UH   = Math.max(d * ysRaw, 55)
  const ys   = UH / d

  const sx = rx => ML + rx * xs
  const sy = ry => MT_C + UH + 10 - ry * ys

  const COUPE_H = MT_C + UH + 10 + MB_C

  const ROW_H      = 28
  const COTE_H     = 22
  const ROW_GAP    = 8
  const ROW_STRIDE = ROW_H + COTE_H + ROW_GAP
  const PLAN_H     = MT_P + SCENARIOS.length * ROW_STRIDE - ROW_GAP + MB_P

  const coteLineY = y0 => y0 + ROW_H + 6
  const coteTextY = y0 => y0 + ROW_H + 18

  const svgStyle = { width: '100%', minWidth: 480, height: 'auto', display: 'block' }

  const midPaliers5 = interPaliers(profiles[0].p.segs)

  return (
    <div className="space-y-3">

      {/* ── COUPE ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 pt-3 pb-4">
        <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1">Coupe</p>
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${SVG_W} ${COUPE_H}`} style={svgStyle}>
            <defs>
              <marker id="c-up" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="5" markerHeight="5" orient="auto">
                <polygon points="0,0 6,3 0,6" fill="#9ca3af" />
              </marker>
              <marker id="c-dn" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <polygon points="0,0 6,3 0,6" fill="#9ca3af" />
              </marker>
            </defs>

            {/* Reference lines */}
            <line x1={ML - 6} y1={sy(0)} x2={SVG_W} y2={sy(0)} stroke="#e5e7eb" strokeWidth="1" />
            <line x1={ML - 6} y1={sy(d)} x2={SVG_W} y2={sy(d)} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="5 4" />

            {/* Intermediate NF reference lines (5 % reference) */}
            {midPaliers5.map((seg, i) => (
              <line key={i}
                x1={ML - 6} y1={sy(seg.y1)} x2={SVG_W} y2={sy(seg.y1)}
                stroke="#e5e7eb" strokeWidth="1" strokeDasharray="5 4" opacity="0.8" />
            ))}

            {/* Δh arrow */}
            <line x1={ML - 28} y1={sy(0)} x2={ML - 28} y2={sy(d)}
              stroke="#9ca3af" strokeWidth="1.5" markerEnd="url(#c-up)" markerStart="url(#c-dn)" />
            <text x={ML - 32} y={(sy(0) + sy(d)) / 2} fontSize="10" fill="#6b7280"
              textAnchor="middle" dominantBaseline="middle"
              transform={`rotate(-90,${ML - 32},${(sy(0) + sy(d)) / 2})`}>
              Δh = {d.toFixed(2)} m
            </text>

            {/* NF labels */}
            <text x={ML - 4} y={sy(0) + 13} fontSize="9" fill="#9ca3af">N.F. ±0</text>
            {midPaliers5.map((seg, i) => (
              <text key={i} x={ML - 4} y={sy(seg.y1) - 4} fontSize="9" fill="#9ca3af">
                +{seg.y1.toFixed(2)} m
              </text>
            ))}
            <text x={ML - 4} y={sy(d) - 5} fontSize="9" fill="#9ca3af">+{d.toFixed(2)} m</text>

            {/* Profile polylines — all 3 overlaid */}
            {profiles.map(({ pente, stroke, p }, i) => {
              const ptsStr = p.pts.map(pt => `${sx(pt.x).toFixed(1)},${sy(pt.y).toFixed(1)}`).join(' ')
              return (
                <polyline key={pente} points={ptsStr} fill="none" stroke={stroke}
                  strokeWidth={i === 0 ? 2.5 : 2}
                  strokeDasharray={!p.compliant ? '7 4' : ''}
                  strokeLinejoin="round" strokeLinecap="round" />
              )
            })}

            {/* Palier tick marks */}
            {profiles.map(({ stroke, p }) =>
              interPaliers(p.segs).map((seg, i) => (
                <line key={i}
                  x1={sx(seg.x1)} y1={sy(seg.y1) - 10}
                  x2={sx(seg.x1)} y2={sy(seg.y1) + 10}
                  stroke={stroke} strokeWidth="1" strokeDasharray="3 2" opacity="0.55" />
              ))
            )}
          </svg>
        </div>

        <div className="flex gap-5 flex-wrap pt-3 mt-1 border-t border-gray-100">
          {SCENARIOS.map(s => (
            <div key={s.pente} className="flex items-center gap-1.5 text-xs">
              <div className="w-7 h-1.5 rounded-full flex-shrink-0" style={{ background: s.stroke }} />
              <span className="font-bold" style={{ color: s.stroke }}>{s.label}</span>
              <span className="text-gray-400">{s.note}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── PLAN ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 pt-3 pb-4">
        <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1">Plan</p>
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${SVG_W} ${PLAN_H}`} style={svgStyle}>
            <defs>
              <marker id="p-up" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="5" markerHeight="5" orient="auto">
                <polygon points="0,0 6,3 0,6" fill="#9ca3af" />
              </marker>
              <marker id="p-dn" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <polygon points="0,0 6,3 0,6" fill="#9ca3af" />
              </marker>
            </defs>

            {/* Largeur dimension */}
            <line x1={ML - 28} y1={MT_P} x2={ML - 28} y2={MT_P + ROW_H}
              stroke="#9ca3af" strokeWidth="1" markerEnd="url(#p-up)" markerStart="url(#p-dn)" />
            <text x={ML - 32} y={MT_P + ROW_H / 2} fontSize="10" fill="#6b7280"
              textAnchor="middle" dominantBaseline="middle"
              transform={`rotate(-90,${ML - 32},${MT_P + ROW_H / 2})`}>
              l = {w.toFixed(2)} m
            </text>

            {/* Scenario rows */}
            {profiles.map(({ stroke, fill, label, p }, idx) => {
              const y0  = MT_P + idx * ROW_STRIDE
              const clY = coteLineY(y0)
              const ctY = coteTextY(y0)
              const bxs = boundaryXs(p.segs)

              return (
                <g key={label}>
                  {p.segs.map((seg, si) => {
                    const isApprDep = si === 0 || si === p.segs.length - 1
                    const isNonConf = !p.compliant && seg.type === 'ramp'
                    return (
                      <rect key={si}
                        x={sx(seg.x1)} y={y0}
                        width={Math.max(sx(seg.x2) - sx(seg.x1), 0.5)}
                        height={ROW_H}
                        fill={seg.type === 'ramp' ? fill : isApprDep ? '#f0fdf4' : '#f3f4f6'}
                        fillOpacity={isNonConf ? 0.45 : 1}
                        stroke={stroke}
                        strokeWidth="1"
                        strokeDasharray={
                          isNonConf ? '5 3' :
                          seg.type === 'palier' && isApprDep ? '3 2' :
                          ''
                        }
                      />
                    )
                  })}

                  <text x={sx(p.W) + 8} y={y0 + ROW_H / 2 - 6}
                    fontSize="12" fill={stroke} fontWeight="700" dominantBaseline="middle">
                    {label}
                  </text>
                  <text x={sx(p.W) + 8} y={y0 + ROW_H / 2 + 9} fontSize="10" fill="#9ca3af">
                    {p.W.toFixed(2)} m
                  </text>

                  {/* Dimension line */}
                  <line x1={sx(0)} y1={clY} x2={sx(p.W)} y2={clY}
                    stroke="#d1d5db" strokeWidth="0.75" />
                  {bxs.map(bx => (
                    <line key={bx}
                      x1={sx(bx)} y1={clY - 4} x2={sx(bx)} y2={clY + 4}
                      stroke="#9ca3af" strokeWidth="0.75" />
                  ))}

                  {/* Segment length labels */}
                  {p.segs.map((seg, si) => {
                    const segPx = sx(seg.x2) - sx(seg.x1)
                    const midX  = (sx(seg.x1) + sx(seg.x2)) / 2
                    const lenM  = seg.x2 - seg.x1
                    if (segPx < 30) return null
                    return (
                      <text key={si} x={midX} y={ctY} fontSize="9"
                        fill={seg.type === 'ramp' ? stroke : '#9ca3af'}
                        fontWeight={seg.type === 'ramp' ? '600' : '400'}
                        textAnchor="middle">
                        {lenM.toFixed(2)} m
                      </text>
                    )
                  })}

                  {/* Total length arrow (first row only) */}
                  {idx === 0 && (
                    <g>
                      <line x1={sx(0)} y1={y0 - 9} x2={sx(p.W)} y2={y0 - 9}
                        stroke="#d1d5db" strokeWidth="0.75"
                        markerEnd="url(#p-up)" markerStart="url(#p-dn)" />
                      <text x={(sx(0) + sx(p.W)) / 2} y={y0 - 15}
                        fontSize="9" fill="#6b7280" textAnchor="middle">
                        L totale = {p.W.toFixed(2)} m
                      </text>
                    </g>
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        <div className="flex gap-5 flex-wrap pt-3 mt-1 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-5 h-3.5 rounded-sm border border-green-500 flex-shrink-0" style={{ background: '#bbf7d0' }} />
            <span className="text-gray-600">Rampe</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-5 h-3.5 rounded-sm border border-gray-300 bg-gray-100 flex-shrink-0" />
            <span className="text-gray-600">Palier de repos</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-5 h-3.5 rounded-sm flex-shrink-0" style={{ background: '#f0fdf4', border: '1px dashed #16a34a' }} />
            <span className="text-gray-600">Approche / départ</span>
          </div>
        </div>
      </div>

      {/* ── VUE 3D ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 pt-3 pb-4">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-2">
          {SCENARIOS.map((s, i) => (
            <button key={s.pente} onClick={() => setTab3D(i)}
              className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${
                tab3D === i ? 'text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
              style={tab3D === i ? { backgroundColor: s.stroke } : {}}>
              {s.label}
              {!profiles[i].p.compliant && <span className="ml-1 opacity-75">⚠</span>}
            </button>
          ))}
        </div>
        <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1">Vue 3D</p>
        <Suspense fallback={<div className="bg-slate-100 rounded-xl border border-gray-200 animate-pulse" style={{ height: 320 }} />}>
          <Ramp3D segments={pmrSegsTo3D(profiles[tab3D].p.segs)} largeur={w} />
        </Suspense>
      </div>

    </div>
  )
}
