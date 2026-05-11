import { useMemo } from 'react'

const SEG_STYLE = {
  racc: { stroke: '#d97706', fill: '#fef3c7', dash: '5 3' },
  ramp: { stroke: '#16a34a', fill: '#dcfce7', dash: '' },
}

const Y_EXAG    = 5
const SVG_W     = 580
const ML        = 58   // left margin (room for Δh label)
const MR        = 25   // right margin
const MT        = 52   // top margin (room for elevation labels above profile)
const DIM_BELOW = 48   // space below baseline for x-coord labels
const PLAN_ROW  = 30
const PLAN_MT   = 38
const PLAN_MB   = 36

export default function RampeParkingViz({ segments, largeur = 3.0 }) {
  const valid = segments?.length > 0 && segments.every(s => s.longueur > 0)

  const { nodes, totalW, totalH } = useMemo(() => {
    if (!valid) return {}
    const ns = [{ x: 0, elev: 0 }]
    segments.forEach(s => ns.push({ x: s.xEnd, elev: s.elevArr }))
    return {
      nodes:  ns,
      totalW: segments.at(-1).xEnd,
      totalH: segments.at(-1).elevArr,
    }
  }, [segments, valid])

  if (!valid) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
        <span className="block text-4xl mb-3">📐</span>
        <p className="text-sm">Saisissez les paramètres pour voir la prévisualisation.</p>
      </div>
    )
  }

  const UW   = SVG_W - ML - MR
  const xs   = UW / totalW
  const UH   = Math.max(totalH > 0 ? totalH * xs * Y_EXAG : 80, 80)
  const ys   = totalH > 0 ? UH / totalH : 1
  const BASE = MT + UH                           // y of baseline in SVG
  const COUPE_H = BASE + DIM_BELOW
  const PLAN_H  = PLAN_MT + PLAN_ROW + PLAN_MB

  const sx = rx => ML + rx * xs
  const sy = ry => MT + UH - ry * ys            // higher elev → smaller y (up)

  const svgStyle = { width: SVG_W, maxWidth: '100%', height: 'auto', display: 'block' }

  return (
    <div className="space-y-3">

      {/* Légende */}
      <div className="flex gap-4 flex-wrap px-1">
        {Object.entries(SEG_STYLE).map(([type, s]) => (
          <div key={type} className="flex items-center gap-1.5 text-xs">
            <div className="w-7 h-1.5 rounded-full" style={{ background: s.stroke }} />
            <span className="font-medium" style={{ color: s.stroke }}>
              {type === 'racc' ? 'Raccordement' : 'Rampe'}
            </span>
          </div>
        ))}
      </div>

      {/* ── COUPE ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 pt-3 pb-2">
        <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1">Coupe</p>
        <svg viewBox={`0 0 ${SVG_W} ${COUPE_H}`} style={svgStyle}>
          <defs>
            <marker id="dh-up" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="5" markerHeight="5" orient="auto">
              <polygon points="0,0 6,3 0,6" fill="#9ca3af" />
            </marker>
            <marker id="dh-dn" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <polygon points="0,0 6,3 0,6" fill="#9ca3af" />
            </marker>
          </defs>

          {/* Reference grid lines */}
          <line x1={ML - 8} y1={BASE}     x2={SVG_W - MR + 18} y2={BASE}
            stroke="#e5e7eb" strokeWidth="1" />
          <line x1={ML - 8} y1={sy(totalH)} x2={SVG_W - MR + 18} y2={sy(totalH)}
            stroke="#e5e7eb" strokeWidth="1" strokeDasharray="5 4" />

          {/* Δh double arrow */}
          <line x1={ML - 34} y1={BASE} x2={ML - 34} y2={sy(totalH)}
            stroke="#9ca3af" strokeWidth="1"
            markerEnd="url(#dh-up)" markerStart="url(#dh-dn)" />
          <text
            x={ML - 38} y={(BASE + sy(totalH)) / 2}
            fontSize="9" fill="#6b7280" textAnchor="middle" dominantBaseline="middle"
            transform={`rotate(-90,${ML - 38},${(BASE + sy(totalH)) / 2})`}>
            Δh = {totalH.toFixed(2)} m
          </text>
          <text x={ML - 6} y={BASE + 11}    fontSize="8" fill="#9ca3af" textAnchor="end">±0.00</text>
          <text x={ML - 6} y={sy(totalH) - 4} fontSize="8" fill="#9ca3af" textAnchor="end">
            +{totalH.toFixed(2)} m
          </text>

          {/* Segment lines */}
          {segments.map(seg => {
            const st   = SEG_STYLE[seg.type]
            const midX = (sx(seg.xStart) + sx(seg.xEnd))   / 2
            const midY = (sy(seg.elevDep) + sy(seg.elevArr)) / 2
            return (
              <g key={seg.id}>
                <line
                  x1={sx(seg.xStart).toFixed(1)} y1={sy(seg.elevDep).toFixed(1)}
                  x2={sx(seg.xEnd).toFixed(1)}   y2={sy(seg.elevArr).toFixed(1)}
                  stroke={st.stroke} strokeWidth="2.5"
                  strokeDasharray={st.dash} strokeLinecap="round"
                />
                {/* slope % label centred on segment, clear of the line */}
                <text x={midX} y={midY - 9} fontSize="9" fill={st.stroke}
                  textAnchor="middle" fontWeight="700">
                  {seg.pente.toFixed(1)} %
                </text>
                <text x={midX} y={midY - 1} fontSize="8" fill={st.stroke}
                  textAnchor="middle" opacity="0.7">
                  {seg.longueur.toFixed(2)} m
                </text>
              </g>
            )
          })}

          {/* Node annotations */}
          {nodes.map((node, ni) => {
            const px = sx(node.x)
            const py = sy(node.elev)
            // Alternate elevation labels above the node to reduce overlap
            const elevLabelY = py - (ni % 2 === 0 ? 14 : 27)
            const segForNode = ni > 0 ? segments[ni - 1] : segments[0]
            const dotColor = SEG_STYLE[segForNode?.type]?.stroke ?? '#6b7280'

            return (
              <g key={ni}>
                {/* Vertical dashed guide line node → baseline */}
                <line x1={px} y1={py + 6} x2={px} y2={BASE}
                  stroke="#cbd5e1" strokeWidth="0.75" strokeDasharray="3 2" />

                {/* Baseline tick */}
                <line x1={px} y1={BASE - 5} x2={px} y2={BASE + 5}
                  stroke="#9ca3af" strokeWidth="1" />

                {/* Node circle */}
                <circle cx={px} cy={py} r="4.5"
                  fill="white" stroke={dotColor} strokeWidth="2" />

                {/* Elevation label — staggered vertically */}
                <text x={px + 4} y={elevLabelY} fontSize="9" fill="#1e293b"
                  textAnchor="start" fontWeight="600">
                  +{node.elev.toFixed(2)} m
                </text>

                {/* x-coordinate label below baseline */}
                <text x={px} y={BASE + 20} fontSize="9" fill="#64748b" textAnchor="middle">
                  {node.x.toFixed(2)} m
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* ── PLAN ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 pt-3 pb-2">
        <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1">Plan</p>
        <svg viewBox={`0 0 ${SVG_W} ${PLAN_H}`} style={svgStyle}>
          <defs>
            <marker id="pl-r" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto">
              <polygon points="0,0 6,3 0,6" fill="#9ca3af" />
            </marker>
            <marker id="pl-l" viewBox="0 0 6 6" refX="1" refY="3" markerWidth="5" markerHeight="5" orient="auto">
              <polygon points="6,0 0,3 6,6" fill="#9ca3af" />
            </marker>
            <marker id="pl-w-r" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto">
              <polygon points="0,0 6,3 0,6" fill="#9ca3af" />
            </marker>
            <marker id="pl-w-l" viewBox="0 0 6 6" refX="1" refY="3" markerWidth="5" markerHeight="5" orient="auto">
              <polygon points="6,0 0,3 6,6" fill="#9ca3af" />
            </marker>
          </defs>

          {/* Width annotation */}
          <line x1={ML - 32} y1={PLAN_MT} x2={ML - 32} y2={PLAN_MT + PLAN_ROW}
            stroke="#9ca3af" strokeWidth="1"
            markerStart="url(#pl-w-l)" markerEnd="url(#pl-w-r)" />
          <text x={ML - 36} y={PLAN_MT + PLAN_ROW / 2}
            fontSize="9" fill="#6b7280" textAnchor="middle" dominantBaseline="middle"
            transform={`rotate(-90,${ML - 36},${PLAN_MT + PLAN_ROW / 2})`}>
            l = {largeur.toFixed(2)} m
          </text>

          {/* Total length annotation above row */}
          <line x1={sx(0)} y1={PLAN_MT - 14} x2={sx(totalW)} y2={PLAN_MT - 14}
            stroke="#d1d5db" strokeWidth="0.75"
            markerStart="url(#pl-l)" markerEnd="url(#pl-r)" />
          <text x={(sx(0) + sx(totalW)) / 2} y={PLAN_MT - 20}
            fontSize="9" fill="#6b7280" textAnchor="middle">
            L = {totalW.toFixed(2)} m
          </text>

          {/* Segment rectangles */}
          {segments.map(seg => {
            const st  = SEG_STYLE[seg.type]
            const x1  = sx(seg.xStart)
            const w   = Math.max(sx(seg.xEnd) - x1, 0.5)
            const midX = x1 + w / 2
            const showLabel = w > 30
            return (
              <g key={seg.id}>
                <rect x={x1} y={PLAN_MT} width={w} height={PLAN_ROW}
                  fill={st.fill} stroke={st.stroke} strokeWidth="1"
                  strokeDasharray={st.dash} />
                {showLabel && (
                  <text x={midX} y={PLAN_MT + PLAN_ROW / 2}
                    fontSize="9" fill={st.stroke} textAnchor="middle"
                    dominantBaseline="middle" fontWeight="600">
                    {seg.longueur.toFixed(2)} m
                  </text>
                )}
              </g>
            )
          })}

          {/* Node tick marks + x labels below row */}
          {nodes.map((node, ni) => {
            const px = sx(node.x)
            return (
              <g key={ni}>
                <line x1={px} y1={PLAN_MT + PLAN_ROW} x2={px} y2={PLAN_MT + PLAN_ROW + 6}
                  stroke="#9ca3af" strokeWidth="0.75" />
                <text x={px} y={PLAN_MT + PLAN_ROW + 18}
                  fontSize="8" fill="#94a3b8" textAnchor="middle">
                  {node.x.toFixed(2)} m
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
