import { useState, useMemo } from 'react'
import RampeParkingViz from '../components/RampeParkingViz'
import ToolLayout from '../components/ToolLayout'

// empattement² / (8 × garde_au_sol) = 3² / (8 × 0.10) = 11.25
const K_RACC = 11.25

function slopeStatut(pente) {
  if (pente <= 15) return { niveau: 'ok',      label: '≤ 15 % — confort' }
  if (pente <= 17) return { niveau: 'warning', label: '≤ 17 % — NF P91-100' }
  if (pente <= 20) return { niveau: 'warning', label: '≤ 20 % — cas particulier' }
  return { niveau: 'error', label: 'Non conforme (> 20 %)' }
}

function withPositions(segs) {
  let elev = 0, x = 0
  return segs.map(s => {
    const elevDep = elev, xStart = x
    elev += s.hauteur
    x    += s.longueur
    return { ...s, elevDep, elevArr: elev, xStart, xEnd: x }
  })
}

function computeFixe(denivelee, penteMain) {
  const d = parseFloat(denivelee), p = parseFloat(penteMain)
  if (!d || d <= 0 || !p || p <= 0) return []
  const lRacc = K_RACC * (p / 100)
  const hRacc = lRacc * ((p / 2) / 100)
  const hRamp = d - 2 * hRacc
  if (hRamp <= 0) return []
  return withPositions([
    { id: 'racc_bas',  label: 'Raccordement bas',  type: 'racc', pente: p / 2, hauteur: hRacc, longueur: lRacc },
    { id: 'ramp',      label: 'Rampe principale',  type: 'ramp', pente: p,     hauteur: hRamp, longueur: hRamp / (p / 100) },
    { id: 'racc_haut', label: 'Raccordement haut', type: 'racc', pente: p / 2, hauteur: hRacc, longueur: lRacc },
  ])
}

function computeLibre(rawSegs) {
  const segs = rawSegs.flatMap(s => {
    const pente   = parseFloat(s.pente)   || 0
    const hauteur = parseFloat(s.hauteur) || 0
    if (pente <= 0 || hauteur <= 0) return []
    return [{ ...s, pente, hauteur, longueur: hauteur / (pente / 100) }]
  })
  return withPositions(segs)
}

function Badge({ niveau, label }) {
  const styles = {
    ok:      'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
    error:   'bg-red-100 text-red-800 border-red-200',
  }
  const icons = { ok: '✓', warning: '⚠', error: '✗' }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${styles[niveau]}`}>
      {icons[niveau]} {label}
    </span>
  )
}

const INIT_LIBRE = [
  { id: 'racc_bas',  label: 'Raccordement bas',  type: 'racc', pente: '7.5', hauteur: '' },
  { id: 'ramp',      label: 'Rampe principale',  type: 'ramp', pente: '15',  hauteur: '' },
  { id: 'racc_haut', label: 'Raccordement haut', type: 'racc', pente: '7.5', hauteur: '' },
]

export default function RampeParking() {
  const [mode, setMode]         = useState('fixe')
  const [denivelee, setDen]     = useState('')
  const [penteMain, setPente]   = useState('15')
  const [largeur, setLargeur]   = useState('3.00')
  const [libreSegs, setLibre]   = useState(INIT_LIBRE)

  const segments = useMemo(
    () => mode === 'fixe'
      ? computeFixe(denivelee, penteMain)
      : computeLibre(libreSegs),
    [mode, denivelee, penteMain, libreSegs],
  )

  function setLibreSeg(id, field, value) {
    setLibre(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  const totalL = segments.at(-1)?.xEnd   ?? 0
  const totalH = segments.at(-1)?.elevArr ?? 0

  const controls = (
    <>
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Calcul de rampe de parking</h2>
        <p className="text-sm text-gray-500">NF P91-100 — Parcs de stationnement</p>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        {[['fixe', 'Réglementaire'], ['libre', 'Libre']].map(([m, label]) => (
          <button key={m} onClick={() => setMode(m)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === m
                ? 'bg-brand-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Fixe mode ── */}
      {mode === 'fixe' && (
        <>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Paramètres</h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Dénivelée totale (m)</span>
                <input type="number" min="0" step="0.01" value={denivelee}
                  onChange={e => setDen(e.target.value)} placeholder="ex : 3.00"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Pente rampe (%)</span>
                <input type="number" min="0" max="25" step="0.5" value={penteMain}
                  onChange={e => setPente(e.target.value)} placeholder="15"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
              </label>
              <label className="block col-span-2">
                <span className="text-sm font-medium text-gray-700">Largeur (m)</span>
                <input type="number" min="0" step="0.05" value={largeur}
                  onChange={e => setLargeur(e.target.value)} placeholder="3.00"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
              </label>
            </div>
            {penteMain && (
              <div className="mt-3">
                <Badge {...slopeStatut(parseFloat(penteMain))} />
              </div>
            )}
          </div>

          <details className="bg-blue-50 border border-blue-100 rounded-xl">
            <summary className="px-5 py-3 text-sm font-medium text-blue-700 cursor-pointer select-none">
              Rappel réglementaire
            </summary>
            <ul className="px-5 pb-4 pt-1 text-xs text-blue-800 space-y-1 list-disc list-inside">
              <li>Pente recommandée (confort) : <strong>≤ 15 %</strong></li>
              <li>Pente maximale NF P91-100 : <strong>≤ 17 %</strong></li>
              <li>Pente maximale absolue : <strong>≤ 20 %</strong> (cas particuliers)</li>
              <li>Raccordement : empattement 3 m, garde au sol 10 cm → L = 11,25 × pente</li>
              <li>Largeur min. 1 sens : <strong>2,50 m</strong> / 2 sens : <strong>5,50 m</strong></li>
            </ul>
          </details>
        </>
      )}

      {/* ── Libre mode ── */}
      {mode === 'libre' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Segments</h3>
          <div className="space-y-3">
            {libreSegs.map(seg => {
              const p = parseFloat(seg.pente)
              const borderCls = seg.type === 'racc'
                ? 'border-amber-200 bg-amber-50'
                : 'border-green-200 bg-green-50'
              const labelCls = seg.type === 'racc' ? 'text-amber-700' : 'text-green-700'
              return (
                <div key={seg.id} className={`rounded-lg p-3 border ${borderCls}`}>
                  <p className={`text-xs font-semibold mb-2 ${labelCls}`}>{seg.label}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs text-gray-600">Pente (%)</span>
                      <input type="number" min="0" max="30" step="0.5" value={seg.pente}
                        onChange={e => setLibreSeg(seg.id, 'pente', e.target.value)}
                        className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500" />
                    </label>
                    <label className="block">
                      <span className="text-xs text-gray-600">Hauteur (m)</span>
                      <input type="number" min="0" step="0.01" value={seg.hauteur}
                        onChange={e => setLibreSeg(seg.id, 'hauteur', e.target.value)}
                        className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500" />
                    </label>
                  </div>
                  {p > 0 && <div className="mt-2"><Badge {...slopeStatut(p)} /></div>}
                </div>
              )
            })}
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Largeur (m)</span>
              <input type="number" min="0" step="0.05" value={largeur}
                onChange={e => setLargeur(e.target.value)} placeholder="3.00"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </label>
          </div>
        </div>
      )}

      {/* ── Tableau récapitulatif ── */}
      {segments.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Récapitulatif des segments</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {['Segment', 'Longueur', 'Pente', 'Hauteur', 'Élév. départ', 'Élév. arrivée'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {segments.map(seg => (
                  <tr key={seg.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-700">{seg.label}</td>
                    <td className="px-3 py-2 tabular-nums text-gray-900">{seg.longueur.toFixed(2)} m</td>
                    <td className="px-3 py-2 tabular-nums text-gray-900">{seg.pente.toFixed(1)} %</td>
                    <td className="px-3 py-2 tabular-nums text-gray-900">{seg.hauteur.toFixed(3)} m</td>
                    <td className="px-3 py-2 tabular-nums text-gray-900">+{seg.elevDep.toFixed(3)} m</td>
                    <td className="px-3 py-2 tabular-nums text-gray-900">+{seg.elevArr.toFixed(3)} m</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                  <td className="px-3 py-2 text-gray-700">Total</td>
                  <td className="px-3 py-2 tabular-nums">{totalL.toFixed(2)} m</td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2 tabular-nums">{totalH.toFixed(3)} m</td>
                  <td className="px-3 py-2 tabular-nums">±0.000 m</td>
                  <td className="px-3 py-2 tabular-nums">+{totalH.toFixed(3)} m</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 text-gray-400">
          <p className="text-4xl mb-2">🚗</p>
          <p className="text-sm">Saisissez les paramètres pour calculer.</p>
        </div>
      )}
    </>
  )

  return (
    <ToolLayout
      controls={controls}
      preview={<RampeParkingViz segments={segments} largeur={parseFloat(largeur) || 3.0} />}
    />
  )
}
