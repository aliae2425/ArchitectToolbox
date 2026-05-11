import { useMemo } from 'react'

const PALIER_L = 1.40
const LEAD    = 1.40
const Y_EXAG  = 6

const SCENARIOS = [
  { pente: 5,  stroke: '#16a34a', fill: '#bbf7d0', label: '5 %',  note: 'optimal' },
  { pente: 8,  stroke: '#d97706', fill: '#fde68a', label: '8 %',  note: 'toléré ≤ 2 m' },
  { pente: 12, stroke: '#dc2626', fill: '#fecaca', label: '12 %', note: 'ERP exist. ≤ 0,5 m' },
]

function computeProfile(denivelee, pente) {
  const lr = denivelee / (pente / 100)
  const n  = Math.ceil(lr / 10)
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

  return { segs, pts, W: x, lr, n, np: n - 1 }
}

function boundaryXs(segs) {
  const set = new Set()
  segs.forEach(s => { set.add(s.x1); set.add(s.x2) })
  return [...set].sort((a, b) => a - b)
}

export default function RampeViz({ denivelee, largeur = 1.40 }) {
  const d = parseFloat(denivelee)
  const w = parseFloat(largeur) || 1.40

  const profiles = useMemo(() => {
    if (!d || d <= 0) return null
    return SCENARIOS.map(s => ({ ...s, p: computeProfile(d, s.pente) }))
  }, [d, w])

  if (!profiles) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
        <span className="block text-4xl mb-3">📐</span>
        <p className="text-sm">Saisissez une dénivelée pour voir la prévisualisation.</p>
      </div>
    )
  }

  // SVG rendered at fixed pixel width — font sizes are literal CSS-equivalent pixels
  const SVG_W = 560
  const ML = 48, MR = 90, MT = 22, MB = 28
  const UW = SVG_W - ML - MR

  const refW = profiles[0].p.W
  const xs   = UW / refW
  const ysRaw = xs * Y_EXAG
  const UH   = Math.max(d * ysRaw, 55)
  const ys   = UH / d

  const sx = rx => ML + rx * xs
  const sy = ry => MT + UH + 10 - ry * ys

  const COUPE_H = MT + UH + 10 + MB

  const ROW_H      = 28
  const LEGEND_H   = 24
  const COTE_H     = 22
  const ROW_GAP    = 8
  const ROW_STRIDE = ROW_H + COTE_H + ROW_GAP
  const ROWS_TOP   = MT + LEGEND_H + 6
  const PLAN_H     = ROWS_TOP + SCENARIOS.length * ROW_STRIDE - ROW_GAP + MB

  const coteLineY = y0 => y0 + ROW_H + 6
  const coteTextY = y0 => y0 + ROW_H + 18

  const interPaliers = segs =>
    segs.filter((s, i) => s.type === 'palier' && i > 0 && i < segs.length - 1)

  const svgStyle = { width: SVG_W, maxWidth: '100%', height: 'auto', display: 'block' }

  return (
    <div className="space-y-3">

      {/* Légende scénarios */}
      <div className="flex gap-4 flex-wrap px-1">
        {SCENARIOS.map(s => (
          <div key={s.pente} className="flex items-center gap-1.5 text-xs">
            <div className="w-7 h-1.5 rounded-full flex-shrink-0" style={{ background: s.stroke }} />
            <span className="font-bold" style={{ color: s.stroke }}>{s.label}</span>
            <span className="text-gray-400">{s.note}</span>
          </div>
        ))}
      </div>

      {/* COUPE */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 pt-3 pb-1">
        <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1">Coupe</p>
        <svg viewBox={`0 0 ${SVG_W} ${COUPE_H}`} style={svgStyle}>
          <defs>
            <marker id="c-up" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="5" markerHeight="5" orient="auto">
              <polygon points="0,0 6,3 0,6" fill="#9ca3af" />
            </marker>
            <marker id="c-dn" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <polygon points="0,0 6,3 0,6" fill="#9ca3af" />
            </marker>
          </defs>

          <line x1={ML - 6} y1={sy(0)} x2={SVG_W - MR + 80} y2={sy(0)} stroke="#e5e7eb" strokeWidth="1" />
          <line x1={ML - 6} y1={sy(d)} x2={SVG_W - MR + 80} y2={sy(d)} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="5 4" />

          <line x1={ML - 28} y1={sy(0)} x2={ML - 28} y2={sy(d)}
            stroke="#9ca3af" strokeWidth="1.5" markerEnd="url(#c-up)" markerStart="url(#c-dn)" />
          <text x={ML - 32} y={(sy(0) + sy(d)) / 2} fontSize="10" fill="#6b7280"
            textAnchor="middle" dominantBaseline="middle"
            transform={`rotate(-90,${ML - 32},${(sy(0) + sy(d)) / 2})`}>
            Δh = {d.toFixed(2)} m
          </text>

          <text x={ML - 4} y={sy(0) + 13} fontSize="9" fill="#9ca3af">N.F. ±0</text>
          <text x={ML - 4} y={sy(d) - 5}  fontSize="9" fill="#9ca3af">+{d.toFixed(2)} m</text>

          {profiles.map(({ pente, stroke, p }, i) => {
            const ptsStr = p.pts.map(pt => `${sx(pt.x).toFixed(1)},${sy(pt.y).toFixed(1)}`).join(' ')
            const last   = p.pts[p.pts.length - 1]
            return (
              <g key={pente}>
                <polyline points={ptsStr} fill="none" stroke={stroke}
                  strokeWidth={i === 0 ? 2.5 : 2}
                  strokeDasharray={pente === 12 ? '7 4' : ''}
                  strokeLinejoin="round" strokeLinecap="round" />
                <text x={sx(last.x) + 6} y={sy(last.y)} fontSize="12" fill={stroke}
                  fontWeight="700" dominantBaseline="middle">{pente} %</text>
                <text x={sx(last.x) + 6} y={sy(last.y) + 14} fontSize="10" fill={stroke} opacity="0.75">
                  {p.W.toFixed(2)} m
                </text>
              </g>
            )
          })}

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

      {/* PLAN */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 pt-3 pb-2">
        <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1">Plan</p>
        <svg viewBox={`0 0 ${SVG_W} ${PLAN_H}`} style={svgStyle}>
          <defs>
            <marker id="p-up" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="5" markerHeight="5" orient="auto">
              <polygon points="0,0 6,3 0,6" fill="#9ca3af" />
            </marker>
            <marker id="p-dn" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <polygon points="0,0 6,3 0,6" fill="#9ca3af" />
            </marker>
          </defs>

          {/* Légende types */}
          <rect x={ML} y={MT} width={12} height={11} rx="2"
            fill="#bbf7d0" stroke="#16a34a" strokeWidth="1" />
          <text x={ML + 17} y={MT + 5.5} fontSize="10" fill="#374151" dominantBaseline="middle">
            Rampe
          </text>
          <rect x={ML + 80} y={MT} width={12} height={11} rx="2"
            fill="#f3f4f6" stroke="#9ca3af" strokeWidth="1" />
          <text x={ML + 97} y={MT + 5.5} fontSize="10" fill="#374151" dominantBaseline="middle">
            Palier de repos
          </text>
          <rect x={ML + 218} y={MT} width={12} height={11} rx="2"
            fill="#f0fdf4" stroke="#16a34a" strokeWidth="1" strokeDasharray="3 2" />
          <text x={ML + 235} y={MT + 5.5} fontSize="10" fill="#374151" dominantBaseline="middle">
            Approche / départ
          </text>

          {/* Largeur dimension */}
          <line x1={ML - 28} y1={ROWS_TOP} x2={ML - 28} y2={ROWS_TOP + ROW_H}
            stroke="#9ca3af" strokeWidth="1" markerEnd="url(#p-up)" markerStart="url(#p-dn)" />
          <text x={ML - 32} y={ROWS_TOP + ROW_H / 2} fontSize="10" fill="#6b7280"
            textAnchor="middle" dominantBaseline="middle"
            transform={`rotate(-90,${ML - 32},${ROWS_TOP + ROW_H / 2})`}>
            l = {w.toFixed(2)} m
          </text>

          {/* Rangées */}
          {profiles.map(({ stroke, fill, label, p }, idx) => {
            const y0  = ROWS_TOP + idx * ROW_STRIDE
            const clY = coteLineY(y0)
            const ctY = coteTextY(y0)
            const bxs = boundaryXs(p.segs)

            return (
              <g key={label}>
                {p.segs.map((seg, si) => {
                  const isApprDep = si === 0 || si === p.segs.length - 1
                  return (
                    <rect key={si}
                      x={sx(seg.x1)} y={y0}
                      width={Math.max(sx(seg.x2) - sx(seg.x1), 0.5)}
                      height={ROW_H}
                      fill={seg.type === 'ramp' ? fill : isApprDep ? '#f0fdf4' : '#f3f4f6'}
                      stroke={stroke}
                      strokeWidth="1"
                      strokeDasharray={seg.type === 'palier' && isApprDep ? '3 2' : ''}
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

                {/* Continuous dimension line */}
                <line x1={sx(0)} y1={clY} x2={sx(p.W)} y2={clY}
                  stroke="#d1d5db" strokeWidth="0.75" />

                {bxs.map(bx => (
                  <line key={bx}
                    x1={sx(bx)} y1={clY - 4} x2={sx(bx)} y2={clY + 4}
                    stroke="#9ca3af" strokeWidth="0.75" />
                ))}

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
    </div>
  )
}
