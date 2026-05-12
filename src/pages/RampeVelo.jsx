import { useState, useMemo, useRef } from 'react'
import RampeVeloViz from '../components/RampeVeloViz'
import ToolLayout from '../components/ToolLayout'

function slopeStatut(pente) {
  if (pente <= 10) return { niveau: 'ok',      label: '≤ 10 % — confort vélo' }
  if (pente <= 12) return { niveau: 'warning', label: '≤ 12 % — acceptable' }
  if (pente <= 15) return { niveau: 'warning', label: '≤ 15 % — difficile' }
  return { niveau: 'error', label: 'Non recommandé (> 15 %)' }
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

function computeSegments(rawSegs, inputMode, largeurNum) {
  const segs = rawSegs.flatMap(s => {
    if (s.type === 'palier') {
      const rawL   = parseFloat(s.longueur) || 0
      const minL   = largeurNum > 0 ? largeurNum : 0
      const longueur = Math.max(rawL, minL)
      if (longueur <= 0) return []
      return [{ ...s, pente: 0, hauteur: 0, longueur }]
    }
    const pente = parseFloat(s.pente) || 0
    if (pente <= 0) return []
    if (inputMode === 'hauteur') {
      const hauteur = parseFloat(s.hauteur) || 0
      if (hauteur <= 0) return []
      return [{ ...s, pente, hauteur, longueur: hauteur / (pente / 100) }]
    } else {
      const longueur = parseFloat(s.longueur) || 0
      if (longueur <= 0) return []
      return [{ ...s, pente, longueur, hauteur: longueur * (pente / 100) }]
    }
  })
  return withPositions(segs)
}

// Returns { vals: {[id]: {field: val}}, impossible: bool, errorMsg: string }
function computeAideVals(rawSegs, H, inputMode) {
  const ramps = rawSegs.filter(s => s.type === 'ramp' && (parseFloat(s.pente) || 0) > 0)
  if (!ramps.length) return { vals: {}, impossible: false }

  const vals = {}

  if (inputMode === 'hauteur') {
    const locked   = ramps.filter(s => s.hauteur !== '')
    const unlocked = ramps.filter(s => s.hauteur === '')
    if (!unlocked.length) {
      const total = locked.reduce((sum, s) => sum + (parseFloat(s.hauteur) || 0), 0)
      return { vals: {}, impossible: true,
        errorMsg: `Tous les segments ont une hauteur saisie (total ${total.toFixed(2)} m). Videz un champ ou ajoutez un segment.` }
    }
    const H_locked = locked.reduce((sum, s) => sum + (parseFloat(s.hauteur) || 0), 0)
    const H_rem    = H - H_locked
    if (H_rem <= 0) {
      return { vals: {}, impossible: true,
        errorMsg: `Les hauteurs saisies (${H_locked.toFixed(2)} m) dépassent la hauteur à franchir (${H.toFixed(2)} m).` }
    }
    const h_each = H_rem / unlocked.length
    for (const s of unlocked) vals[s.id] = { hauteur: h_each.toFixed(4) }
    return { vals, impossible: false }
  }

  // inputMode === 'longueur'
  const withLon = ramps.filter(s => s.longueur !== '')
  if (!withLon.length) {
    // fallback: equal H → fill longueur from pente
    const h_each = H / ramps.length
    for (const s of ramps) {
      const p = parseFloat(s.pente) || 0
      if (p > 0) vals[s.id] = { longueur: (h_each / (p / 100)).toFixed(4) }
    }
    return { vals, impossible: false }
  }
  const total_L = withLon.reduce((sum, s) => sum + (parseFloat(s.longueur) || 0), 0)
  if (total_L <= 0) {
    return { vals: {}, impossible: true, errorMsg: 'Longueur totale nulle — vérifiez les valeurs saisies.' }
  }
  const pente_unif = (H / total_L) * 100
  for (const s of withLon) vals[s.id] = { pente: pente_unif.toFixed(2) }
  return { vals, impossible: false }
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

function Derived({ label, value, unit = 'm' }) {
  if (!value || isNaN(value) || value <= 0) return null
  const formatted = unit === '%' ? value.toFixed(1) : value.toFixed(2)
  return (
    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
      <span className="text-gray-400">→</span>
      <span className="font-medium text-gray-700">{label} : {formatted} {unit}</span>
    </div>
  )
}

let nextId = 3
const INIT_SEGS = [
  { id: 1, type: 'ramp',   pente: '10', hauteur: '', longueur: '' },
  { id: 2, type: 'palier', pente: '',   hauteur: '', longueur: '' },
]

export default function RampeVelo() {
  const [segs, setSegs]               = useState(INIT_SEGS)
  const [largeur, setLargeur]         = useState('1.50')
  const [inputMode, setInputMode]     = useState('hauteur')
  const [hauteurTotale, setHauteurTotale] = useState('')

  const largeurNum  = parseFloat(largeur) || 0
  const H_aide      = parseFloat(hauteurTotale) || 0
  const dragIdx     = useRef(null)
  const [dragOver, setDragOver] = useState(null)

  const aideResult = useMemo(() => {
    if (H_aide <= 0) return { vals: {}, impossible: false }
    return computeAideVals(segs, H_aide, inputMode)
  }, [segs, H_aide, inputMode])

  const derivedSegs = useMemo(() => {
    if (H_aide <= 0) return segs
    const { vals } = aideResult
    return segs.map(s => {
      const av = vals[s.id]
      if (!av) return s
      const next = { ...s }
      if (av.pente   !== undefined)                    next.pente   = av.pente
      if (av.hauteur !== undefined && s.hauteur === '') next.hauteur = av.hauteur
      if (av.longueur !== undefined && s.longueur === '') next.longueur = av.longueur
      return next
    })
  }, [segs, H_aide, aideResult])

  const segments = useMemo(
    () => computeSegments(derivedSegs, inputMode, largeurNum),
    [derivedSegs, inputMode, largeurNum],
  )

  function updateSeg(id, field, value) {
    setSegs(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  function addSeg(type) {
    setSegs(prev => [...prev, { id: nextId++, type, pente: type === 'ramp' ? '10' : '', hauteur: '', longueur: '' }])
  }

  function removeSeg(id) {
    setSegs(prev => prev.filter(s => s.id !== id))
  }

  function onDragStart(idx) {
    dragIdx.current = idx
  }

  function onDragOver(e, idx) {
    e.preventDefault()
    setDragOver(idx)
  }

  function onDrop(idx) {
    const from = dragIdx.current
    if (from === null || from === idx) return
    setSegs(prev => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(idx, 0, moved)
      return next
    })
    dragIdx.current = null
    setDragOver(null)
  }

  function onDragEnd() {
    dragIdx.current = null
    setDragOver(null)
  }

  const totalL = segments.at(-1)?.xEnd   ?? 0
  const totalH = segments.at(-1)?.elevArr ?? 0

  const header = (
    <>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Calcul de rampe vélo</h2>
      <p className="text-sm text-gray-500">Parcs à vélos — recommandations EuroVelo / CEREMA</p>
    </>
  )

  const controls = (
    <>
      {/* Aide au calcul — Hauteur totale */}
      <div className={`rounded-xl border shadow-sm px-5 py-4 transition-colors ${
        aideResult.impossible
          ? 'bg-red-50 border-red-300'
          : H_aide > 0 ? 'bg-brand-50 border-brand-200' : 'bg-white border-gray-200'
      }`}>
        <h3 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${
          aideResult.impossible ? 'text-red-600' : 'text-gray-500'
        }`}>
          Aide au calcul
        </h3>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Hauteur totale à franchir (m)</span>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="number" min="0" step="0.05"
              value={hauteurTotale}
              onChange={e => setHauteurTotale(e.target.value)}
              placeholder="ex. 1.20"
              className={`w-28 rounded-lg border px-3 py-2 text-sm text-right outline-none focus:ring-1 ${
                aideResult.impossible
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-400 bg-white'
                  : H_aide > 0
                    ? 'border-brand-400 focus:border-brand-500 focus:ring-brand-500 bg-white'
                    : 'border-gray-300 focus:border-brand-500 focus:ring-brand-500'
              }`}
            />
            <span className="text-sm text-gray-400">m</span>
            {H_aide > 0 && !aideResult.impossible && (
              <span className="text-xs font-semibold text-brand-600 bg-brand-100 px-2 py-0.5 rounded-full">
                Aide active
              </span>
            )}
          </div>
          {aideResult.impossible ? (
            <p className="mt-2 text-xs text-red-600 font-medium">⚠ {aideResult.errorMsg}</p>
          ) : (
            <p className="mt-1.5 text-[10px] text-gray-400">
              Distribue la hauteur entre les rampes · met à jour les pentes si les longueurs sont saisies.
            </p>
          )}
        </label>
      </div>

      {/* Segments */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header + tabs */}
        <div className="flex items-center justify-between px-5 pt-4 pb-0 mb-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Segments</h3>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            {[['hauteur', 'Hauteur'], ['longueur', 'Longueur']].map(([m, label]) => (
              <button key={m} onClick={() => setInputMode(m)}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  inputMode === m
                    ? 'bg-brand-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 pb-5 space-y-3">
          {segs.map((seg, idx) => {
            const isPalier     = seg.type === 'palier'
            const pente        = parseFloat(seg.pente)   || 0
            const hauteur      = parseFloat(seg.hauteur) || 0
            const lon          = parseFloat(seg.longueur) || 0
            const derivedHaut  = pente > 0 && lon > 0 ? lon * (pente / 100) : null
            const palierLon    = parseFloat(seg.longueur) || 0
            const palierTooShort = isPalier && largeurNum > 0 && palierLon > 0 && palierLon < largeurNum

            // aide values for this segment
            const av        = aideResult.vals[seg.id] ?? {}
            const showAideP = H_aide > 0 && av.pente    !== undefined
            const showAideH = H_aide > 0 && av.hauteur  !== undefined && seg.hauteur === ''
            const showAideL = H_aide > 0 && av.longueur !== undefined && seg.longueur === ''
            const penteDisp = showAideP ? parseFloat(av.pente) : pente
            const hauteurDisp = showAideH ? parseFloat(av.hauteur) : hauteur

            return (
              <div key={seg.id}
                draggable
                onDragStart={() => onDragStart(idx)}
                onDragOver={e => onDragOver(e, idx)}
                onDrop={() => onDrop(idx)}
                onDragEnd={onDragEnd}
                className={`rounded-lg p-3 border transition-opacity ${
                  isPalier ? 'border-gray-300 bg-gray-100' : 'border-blue-200 bg-blue-50'
                } ${dragIdx.current === idx ? 'opacity-40' : ''}
                  ${dragOver === idx && dragIdx.current !== idx ? 'ring-2 ring-brand-400' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300 cursor-grab active:cursor-grabbing select-none text-base leading-none">⠿</span>
                    <span className={`text-xs font-semibold ${isPalier ? 'text-gray-500' : 'text-blue-700'}`}>
                      {idx + 1}.
                    </span>
                    <select
                      value={seg.type}
                      onChange={e => updateSeg(seg.id, 'type', e.target.value)}
                      className="text-xs font-semibold border-0 bg-transparent outline-none cursor-pointer text-gray-700 pr-1">
                      <option value="ramp">Rampe</option>
                      <option value="palier">Palier</option>
                    </select>
                  </div>
                  {segs.length > 1 && (
                    <button onClick={() => removeSeg(seg.id)}
                      className="text-gray-400 hover:text-red-500 text-lg leading-none">
                      ×
                    </button>
                  )}
                </div>

                {isPalier ? (
                  <div>
                    <label className="block">
                      <span className="text-xs text-gray-600">
                        Longueur (m)
                        {largeurNum > 0 && (
                          <span className="ml-1 text-gray-400">· min {largeurNum.toFixed(2)} m</span>
                        )}
                      </span>
                      <input type="number" min={largeurNum || 0} step="0.10" value={seg.longueur}
                        onChange={e => updateSeg(seg.id, 'longueur', e.target.value)}
                        className={`mt-1 block w-full rounded border px-2 py-1.5 text-sm outline-none focus:border-brand-500 ${
                          palierTooShort ? 'border-amber-400 bg-amber-50' : 'border-gray-300'
                        }`} />
                    </label>
                    {palierTooShort && (
                      <p className="mt-1 text-xs text-amber-600">
                        ⚠ Inférieur à la largeur ({largeurNum.toFixed(2)} m) — longueur forcée
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs text-gray-600">Pente (%)</span>
                      <input type="number" min="0" max="25" step="0.5"
                        value={showAideP ? av.pente : seg.pente}
                        readOnly={showAideP}
                        onFocus={e => { if (showAideP) e.target.select() }}
                        onChange={e => { if (!showAideP) updateSeg(seg.id, 'pente', e.target.value) }}
                        title={showAideP ? "Pente calculée — modifiez la longueur pour ajuster" : ''}
                        className={`mt-1 block w-full rounded border px-2 py-1.5 text-sm outline-none focus:border-brand-500 ${
                          showAideP ? 'border-amber-300 bg-amber-50 text-amber-700 cursor-not-allowed' : 'border-gray-300'
                        }`} />
                    </label>

                    {inputMode === 'hauteur' ? (
                      <label className="block">
                        <span className="text-xs text-gray-600">Hauteur (m)</span>
                        <input type="number" min="0" step="0.01"
                          value={showAideH ? av.hauteur : seg.hauteur}
                          onFocus={e => { if (showAideH) e.target.select() }}
                          onChange={e => updateSeg(seg.id, 'hauteur', e.target.value)}
                          className={`mt-1 block w-full rounded border px-2 py-1.5 text-sm outline-none focus:border-brand-500 ${
                            showAideH ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-gray-300'
                          }`} />
                        <Derived label="Longueur"
                          value={penteDisp > 0 && hauteurDisp > 0 ? hauteurDisp / (penteDisp / 100) : null} />
                      </label>
                    ) : (
                      <label className="block">
                        <span className="text-xs text-gray-600">Longueur (m)</span>
                        <input type="number" min="0" step="0.01"
                          value={showAideL ? av.longueur : seg.longueur}
                          onFocus={e => { if (showAideL) e.target.select() }}
                          onChange={e => updateSeg(seg.id, 'longueur', e.target.value)}
                          className={`mt-1 block w-full rounded border px-2 py-1.5 text-sm outline-none focus:border-brand-500 ${
                            showAideL ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-gray-300'
                          }`} />
                        <Derived label="Hauteur" value={derivedHaut} />
                      </label>
                    )}

                    {penteDisp > 0 && (
                      <div className="col-span-2">
                        <Badge {...slopeStatut(penteDisp)} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          <div className="flex gap-2">
            <button onClick={() => addSeg('ramp')}
              className="flex-1 py-2 text-sm font-medium rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors">
              + Rampe
            </button>
            <button onClick={() => addSeg('palier')}
              className="flex-1 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
              + Palier
            </button>
          </div>
        </div>
      </div>

      {/* Largeur */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Gabarit</h3>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Largeur (m)</span>
          <input type="number" min="0" step="0.05" value={largeur}
            onChange={e => setLargeur(e.target.value)} placeholder="1.50"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
          <p className="mt-1 text-xs text-gray-400">Min. 1,50 m (1 sens) · 2,50 m (2 sens)</p>
        </label>
      </div>

      {/* Rappel réglementaire */}
      <details className="bg-blue-50 border border-blue-100 rounded-xl">
        <summary className="px-5 py-3 text-sm font-medium text-blue-700 cursor-pointer select-none">
          Rappel réglementaire
        </summary>
        <ul className="px-5 pb-4 pt-1 text-xs text-blue-800 space-y-1 list-disc list-inside">
          <li>Pente recommandée (confort) : <strong>≤ 10 %</strong></li>
          <li>Pente acceptable : <strong>≤ 12 %</strong></li>
          <li>Pente maximale (courte distance) : <strong>≤ 15 %</strong></li>
          <li>Palier de repos recommandé tous les <strong>6 m</strong> de dénivelée</li>
          <li>Longueur min. d'un palier : <strong>= largeur de la rampe</strong></li>
          <li>Largeur min. 1 sens : <strong>1,50 m</strong> / 2 sens : <strong>2,50 m</strong></li>
        </ul>
      </details>

      {/* Tableau récapitulatif */}
      {segments.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Récapitulatif</h3>
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
                {segments.map((seg, idx) => (
                  <tr key={seg.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-700">
                      {idx + 1}. {seg.type === 'palier' ? 'Palier' : 'Rampe'}
                    </td>
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
          <p className="text-4xl mb-2">🚲</p>
          <p className="text-sm">Saisissez les paramètres pour calculer.</p>
        </div>
      )}
    </>
  )

  return (
    <ToolLayout
      header={header}
      controls={controls}
      preview={<RampeVeloViz segments={segments} largeur={largeurNum} />}
    />
  )
}
