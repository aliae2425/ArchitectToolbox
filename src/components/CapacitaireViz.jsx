import { getCategorie } from '../pages/CapacitaireERP'

const CAT_COLORS = {
  1: '#ef4444', // red
  2: '#f97316', // orange
  3: '#f59e0b', // amber
  4: '#3b82f6', // blue
}

const ZONES = [
  { num: 4, from: 0,    to: 300,  fill: '#dbeafe', stroke: '#3b82f6', label: '4ème' },
  { num: 3, from: 300,  to: 700,  fill: '#fef3c7', stroke: '#f59e0b', label: '3ème' },
  { num: 2, from: 700,  to: 1500, fill: '#fed7aa', stroke: '#f97316', label: '2ème' },
  { num: 1, from: 1500, to: null, fill: '#fecaca', stroke: '#ef4444', label: '1ère' },
]

const ROOM_COLORS = ['#3b82f6','#8b5cf6','#10b981','#f97316','#ef4444','#06b6d4','#f59e0b','#6366f1','#14b8a6','#ec4899']

// ─── Effectif meter ───────────────────────────────────────────────────────────

function EffectifMeter({ effectif }) {
  const W = 520, H = 60, PL = 24, PR = 20, PT = 16, BAR_H = 18
  const iW = W - PL - PR
  const scaleMax =
    effectif <= 300  ? 500  :
    effectif <= 700  ? 1000 :
    effectif <= 1500 ? 2000 :
    Math.ceil(effectif * 1.1 / 500) * 500
  const xOf = v => PL + (Math.min(v, scaleMax) / scaleMax) * iW
  const zones = ZONES.map(z => ({ ...z, to: Math.min(z.to ?? scaleMax, scaleMax) }))
  const ticks = [0, 300, 700, 1500].filter(v => v < scaleMax)
  ticks.push(scaleMax)
  const needleX = xOf(effectif)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {zones.map(z => {
        const x1 = xOf(z.from), x2 = xOf(z.to)
        if (x2 <= x1) return null
        return (
          <g key={z.num}>
            <rect x={x1} y={PT} width={x2 - x1} height={BAR_H}
              fill={z.fill} stroke={z.stroke} strokeWidth="0.5" />
            {(x2 - x1) > 32 && (
              <text x={(x1 + x2) / 2} y={PT + BAR_H / 2}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="9" fill={z.stroke} fontWeight="600">{z.label}</text>
            )}
          </g>
        )
      })}

      {ticks.map(v => (
        <g key={v}>
          <line x1={xOf(v)} y1={PT + BAR_H} x2={xOf(v)} y2={PT + BAR_H + 4} stroke="#9ca3af" strokeWidth="0.75" />
          <text x={xOf(v)} y={PT + BAR_H + 13} textAnchor="middle" fontSize="8" fill="#9ca3af">
            {v >= 1000 ? `${v / 1000}k` : v}
          </text>
        </g>
      ))}

      {effectif > 0 && (
        <g>
          <polygon points={`${needleX - 5},${PT - 4} ${needleX + 5},${PT - 4} ${needleX},${PT + 3}`}
            fill="#1e293b" />
          <line x1={needleX} y1={PT - 4} x2={needleX} y2={PT + BAR_H + 4}
            stroke="#1e293b" strokeWidth="1.5" />
          <rect x={needleX - 24} y={PT - 18} width={48} height={14} rx="3" fill="#1e293b" />
          <text x={needleX} y={PT - 11} textAnchor="middle" dominantBaseline="middle"
            fontSize="9" fill="white" fontWeight="700">{effectif} pers.</text>
        </g>
      )}
    </svg>
  )
}

// ─── Barres par local ─────────────────────────────────────────────────────────

function RoomBars({ items, effectifTotal }) {
  const visible = items.filter(i => i.effectif > 0)
  if (!visible.length) return null
  const maxEff = Math.max(...visible.map(i => i.effectif))
  return (
    <div className="space-y-2">
      {visible.map((item, idx) => {
        const pct   = (item.effectif / maxEff) * 100
        const share = effectifTotal > 0 ? Math.round(item.effectif / effectifTotal * 100) : 0
        const color = ROOM_COLORS[idx % ROOM_COLORS.length]
        const label = item.nom || item.type?.label || '—'
        return (
          <div key={item.id} className="flex items-center gap-2 text-xs">
            <div className="w-32 flex-shrink-0 text-gray-600 truncate text-right leading-tight" title={label}>
              {label}
            </div>
            <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
              <div
                className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-300"
                style={{ width: `${Math.max(pct, 8)}%`, backgroundColor: color }}
              >
                <span className="text-white font-semibold" style={{ fontSize: '10px' }}>{item.effectif}</span>
              </div>
            </div>
            <div className="w-8 flex-shrink-0 text-gray-400 text-right">{share}%</div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Schéma dégagements ───────────────────────────────────────────────────────

function DegagementsViz({ degagements }) {
  const { nbUp, largeur, nbSorties } = degagements
  const displaySorties = Math.min(nbSorties, 6)
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: displaySorties }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <svg width="36" height="32" viewBox="0 0 36 32">
              <rect x="3" y="3" width="30" height="26" rx="2" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1.5" />
              <rect x="7" y="6" width="16" height="22" rx="1" fill="#bbf7d0" stroke="#16a34a" strokeWidth="1" />
              <line x1="17" y1="17" x2="26" y2="17" stroke="#16a34a" strokeWidth="1.5" />
              <polygon points="23,13.5 27,17 23,20.5" fill="#16a34a" />
            </svg>
            <span className="text-[9px] text-gray-400">{i + 1}</span>
          </div>
        ))}
        {nbSorties > 6 && (
          <div className="self-center text-xs text-gray-400 font-medium">+{nbSorties - 6}</div>
        )}
      </div>
      <div className="text-sm">
        <p className="font-semibold text-gray-800">{nbUp} UP — {largeur} m</p>
        <p className="text-xs text-gray-400">largeur totale minimum</p>
        <p className="text-xs text-gray-500 mt-1">{nbSorties} sortie{nbSorties > 1 ? 's' : ''} minimum</p>
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function CapacitaireViz({ resultats }) {
  const { items, effectifTotal, categorie, degagements } = resultats

  if (effectifTotal === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
        <span className="block text-5xl mb-3">🏢</span>
        <p className="text-sm">Saisissez vos locaux pour calculer le capacitaire.</p>
      </div>
    )
  }

  const catColor = CAT_COLORS[categorie?.num] || '#9ca3af'

  return (
    <div className="space-y-3">

      {/* Effectif total + catégorie */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Effectif total</p>
            <p className="text-4xl font-bold leading-none" style={{ color: catColor }}>
              {effectifTotal}
            </p>
            <p className="text-xs text-gray-400 mt-1">personnes</p>
          </div>
          {categorie && (
            <div className="text-right">
              <span
                className="inline-block px-3 py-1.5 rounded-lg text-sm font-bold border"
                style={{ color: catColor, borderColor: catColor, backgroundColor: catColor + '1a' }}
              >
                {categorie.label}
              </span>
              <p className="text-xs text-gray-400 mt-1.5">{categorie.hint}</p>
            </div>
          )}
        </div>
        <EffectifMeter effectif={effectifTotal} />
      </div>

      {/* Répartition par local */}
      {items.some(i => i.effectif > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Répartition par local</p>
          <RoomBars items={items} effectifTotal={effectifTotal} />
        </div>
      )}

      {/* Dégagements */}
      {degagements && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Dégagements requis — CO 37 / CO 38</p>
          <DegagementsViz degagements={degagements} />
        </div>
      )}

    </div>
  )
}
