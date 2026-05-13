import { useState, useMemo, useRef } from 'react'
import RampeParkingViz from '../components/RampeParkingViz'
import ToolLayout from '../components/ToolLayout'

const RACC_PENTE   = 5
const RACC_MAX_LON = 5                                  // m
const RACC_MAX_H   = RACC_MAX_LON * (RACC_PENTE / 100) // 0.25 m

function slopeStatut(pente) {
  if (pente <= 15) return { niveau: 'ok',      label: '≤ 15 % — NF P91-100' }
  if (pente <= 17) return { niveau: 'warning', label: '≤ 17 % — toléré' }
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

function computeSegments(rawSegs, inputMode) {
  const useHauteur = inputMode === 'reglementaire'
  const segs = rawSegs.flatMap(s => {
    const pente = parseFloat(s.pente) || 0
    if (pente <= 0) return []
    if (useHauteur) {
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

function computeAideVals(rawSegs, H, inputMode) {
  const segs = rawSegs.filter(s => (parseFloat(s.pente) || 0) > 0)
  if (!segs.length) return { vals: {}, impossible: false }
  const vals = {}

  if (inputMode === 'reglementaire') {
    const locked   = segs.filter(s => s.hauteur !== '')
    const unlocked = segs.filter(s => s.hauteur === '')
    if (!unlocked.length) {
      const tot = locked.reduce((a, s) => a + (parseFloat(s.hauteur) || 0), 0)
      return { vals: {}, impossible: true,
        errorMsg: `Tous les segments sont saisis (total ${tot.toFixed(2)} m). Videz un champ.` }
    }
    const H_locked = locked.reduce((a, s) => a + (parseFloat(s.hauteur) || 0), 0)
    const H_rem    = H - H_locked
    if (H_rem <= 0) {
      return { vals: {}, impossible: true,
        errorMsg: `Hauteurs saisies (${H_locked.toFixed(2)} m) dépassent la hauteur totale (${H.toFixed(2)} m).` }
    }
    const unlRaccs = unlocked.filter(s => s.type === 'racc')
    const unlRamps = unlocked.filter(s => s.type === 'ramp')
    const h_equal  = H_rem / unlocked.length

    if (unlRaccs.length === 0 || h_equal <= RACC_MAX_H) {
      // Equal distribution — raccs within cap
      for (const s of unlocked) vals[s.id] = { hauteur: h_equal.toFixed(4) }
    } else {
      // Raccs capped at max, ramps absorb the surplus
      if (unlRamps.length === 0) {
        return { vals: {}, impossible: true,
          errorMsg: `Hauteur restante ${H_rem.toFixed(2)} m > capacité raccordements (max ${(unlRaccs.length * RACC_MAX_H).toFixed(2)} m). Ajoutez une rampe.` }
      }
      const raccAlloc = unlRaccs.length * RACC_MAX_H
      const h_ramp    = (H_rem - raccAlloc) / unlRamps.length
      for (const s of unlRaccs) vals[s.id] = { hauteur: RACC_MAX_H.toFixed(4) }
      for (const s of unlRamps)  vals[s.id] = { hauteur: h_ramp.toFixed(4) }
    }
    return { vals, impossible: false }
  }

  // longueur mode
  const withLon = segs.filter(s => s.longueur !== '')
  if (!withLon.length) {
    const h_each = H / segs.length
    for (const s of segs) {
      const p = parseFloat(s.pente) || 0
      if (p > 0) vals[s.id] = { longueur: (h_each / (p / 100)).toFixed(4) }
    }
    return { vals, impossible: false }
  }
  const total_L = withLon.reduce((a, s) => a + (parseFloat(s.longueur) || 0), 0)
  if (total_L <= 0) return { vals: {}, impossible: true, errorMsg: 'Longueur totale nulle.' }
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

function Derived({ label, value }) {
  if (!value || isNaN(value) || value <= 0) return null
  return (
    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
      <span className="text-gray-400">→</span>
      <span className="font-medium text-gray-700">{label} : {value.toFixed(2)} m</span>
    </div>
  )
}

let nextId = 4
const INIT_SEGS = [
  { id: 1, type: 'racc', pente: String(RACC_PENTE), hauteur: '', longueur: '' },
  { id: 2, type: 'ramp', pente: '15',               hauteur: '', longueur: '' },
  { id: 3, type: 'racc', pente: String(RACC_PENTE), hauteur: '', longueur: '' },
]

export default function RampeParking() {
  const [segs, setSegs]                   = useState(INIT_SEGS)
  const [largeur, setLargeur]             = useState('3.00')
  const [inputMode, setInputMode]         = useState('reglementaire')
  const [hauteurTotale, setHauteurTotale] = useState('')

  const largeurNum = parseFloat(largeur) || 0
  const H_aide     = parseFloat(hauteurTotale) || 0
  const dragIdx    = useRef(null)
  const [dragOver, setDragOver] = useState(null)

  const isRegl = inputMode === 'reglementaire'

  function switchMode(m) {
    if (m === 'reglementaire') {
      setSegs(prev => prev.map(s => s.type === 'racc' ? { ...s, pente: String(RACC_PENTE) } : s))
    }
    setInputMode(m)
  }

  function changeType(id, newType) {
    setSegs(prev => prev.map(s => {
      if (s.id !== id) return s
      const updated = { ...s, type: newType }
      if (newType === 'racc' && isRegl) updated.pente = String(RACC_PENTE)
      return updated
    }))
  }

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
      if (av.pente    !== undefined)                     next.pente    = av.pente
      if (av.hauteur  !== undefined && s.hauteur === '')  next.hauteur  = av.hauteur
      if (av.longueur !== undefined && s.longueur === '') next.longueur = av.longueur
      return next
    })
  }, [segs, H_aide, aideResult])

  const segments = useMemo(
    () => computeSegments(derivedSegs, inputMode),
    [derivedSegs, inputMode],
  )

  function updateSeg(id, field, value) {
    setSegs(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  // Editing longueur in réglementaire converts to hauteur (canonical field)
  function updateLongueur(seg, rawVal) {
    const l = parseFloat(rawVal)
    const p = seg.type === 'racc' ? RACC_PENTE : (parseFloat(seg.pente) || 0)
    if (!isNaN(l) && l > 0 && p > 0) {
      updateSeg(seg.id, 'hauteur', (l * (p / 100)).toFixed(4))
    } else {
      updateSeg(seg.id, 'hauteur', '')
    }
  }

  function addSeg(type) {
    const defaultPente = type === 'racc' ? String(RACC_PENTE) : '15'
    setSegs(prev => [...prev, { id: nextId++, type, pente: defaultPente, hauteur: '', longueur: '' }])
  }

  function removeSeg(id) {
    setSegs(prev => prev.filter(s => s.id !== id))
  }

  function onDragStart(idx) { dragIdx.current = idx }
  function onDragOver(e, idx) { e.preventDefault(); setDragOver(idx) }
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
  function onDragEnd() { dragIdx.current = null; setDragOver(null) }

  const totalL = segments.at(-1)?.xEnd   ?? 0
  const totalH = segments.at(-1)?.elevArr ?? 0

  const header = (
    <>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Calcul de rampe de parking</h2>
      <p className="text-sm text-gray-500">NF P91-100 — Parcs de stationnement</p>
    </>
  )

  const controls = (
    <>
      {/* Aide au calcul */}
      <div className={`rounded-xl border shadow-sm px-5 py-4 transition-colors ${
        aideResult.impossible
          ? 'bg-red-50 border-red-300'
          : H_aide > 0 ? 'bg-brand-50 border-brand-200' : 'bg-white border-gray-200'
      }`}>
        <h3 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${
          aideResult.impossible ? 'text-red-600' : 'text-gray-500'
        }`}>Aide au calcul</h3>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Hauteur totale à franchir (m)</span>
          <div className="flex items-center gap-2 mt-1">
            <input type="number" min="0" step="0.05" value={hauteurTotale}
              onChange={e => setHauteurTotale(e.target.value)} placeholder="ex. 3.00"
              className={`w-28 rounded-lg border px-3 py-2 text-sm text-right outline-none focus:ring-1 ${
                aideResult.impossible
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-400 bg-white'
                  : H_aide > 0
                    ? 'border-brand-400 focus:border-brand-500 focus:ring-brand-500 bg-white'
                    : 'border-gray-300 focus:border-brand-500 focus:ring-brand-500'
              }`} />
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
              {isRegl
                ? `Mode réglementaire : raccordements optimisés à max ${RACC_MAX_LON} m · surplus sur la rampe.`
                : 'Distribue la hauteur entre les segments · met à jour les pentes.'}
            </p>
          )}
        </label>
      </div>

      {/* Segments */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-0 mb-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Segments</h3>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            {[['reglementaire', 'Réglementaire'], ['longueur', 'Longueur']].map(([m, label]) => (
              <button key={m} onClick={() => switchMode(m)}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  inputMode === m ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 pb-5 space-y-3">
          {segs.map((seg, idx) => {
            const isRacc     = seg.type === 'racc'
            const raccLocked = isRacc && isRegl

            const av        = aideResult.vals[seg.id] ?? {}
            const showAideP = !raccLocked && H_aide > 0 && av.pente    !== undefined
            const showAideH = H_aide > 0  && av.hauteur  !== undefined && seg.hauteur  === ''
            const showAideL = H_aide > 0  && av.longueur !== undefined && seg.longueur === ''

            const penteDisp   = raccLocked ? RACC_PENTE
              : showAideP ? parseFloat(av.pente) : (parseFloat(seg.pente) || 0)
            const hauteurDisp = showAideH ? parseFloat(av.hauteur) : (parseFloat(seg.hauteur) || 0)

            // In réglementaire mode longueur is always derived from hauteur + pente
            const longueurDisp = penteDisp > 0 && hauteurDisp > 0
              ? hauteurDisp / (penteDisp / 100) : 0

            const raccTooLong = isRacc && longueurDisp > RACC_MAX_LON
            const derivedHaut = !isRegl
              ? (() => { const p = parseFloat(seg.pente)||0; const l = parseFloat(seg.longueur)||0; return p>0&&l>0?l*(p/100):null })()
              : null

            return (
              <div key={seg.id} draggable
                onDragStart={() => onDragStart(idx)}
                onDragOver={e => onDragOver(e, idx)}
                onDrop={() => onDrop(idx)}
                onDragEnd={onDragEnd}
                className={`rounded-lg p-3 border transition-opacity ${
                  isRacc ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'
                } ${dragIdx.current === idx ? 'opacity-40' : ''}
                  ${dragOver === idx && dragIdx.current !== idx ? 'ring-2 ring-brand-400' : ''}`}>

                {/* Header row */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300 cursor-grab active:cursor-grabbing select-none text-base leading-none">⠿</span>
                    <span className={`text-xs font-semibold ${isRacc ? 'text-amber-600' : 'text-green-700'}`}>
                      {idx + 1}.
                    </span>
                    <select value={seg.type} onChange={e => changeType(seg.id, e.target.value)}
                      className="text-xs font-semibold border-0 bg-transparent outline-none cursor-pointer text-gray-700 pr-1">
                      <option value="ramp">Rampe</option>
                      <option value="racc">Raccordement</option>
                    </select>
                  </div>
                  {segs.length > 1 && (
                    <button onClick={() => removeSeg(seg.id)}
                      className="text-gray-400 hover:text-red-500 text-lg leading-none">×</button>
                  )}
                </div>

                {isRegl ? (
                  /* ── Mode réglementaire : pente + hauteur + longueur ── */
                  <div className="space-y-2">
                    {/* Pente — full width */}
                    <label className="block">
                      <span className="text-xs text-gray-600">
                        Pente (%)
                        {raccLocked && <span className="ml-1 text-amber-600 font-semibold">· NF P91-100</span>}
                      </span>
                      <input type="number" min="0" max="30" step="0.5"
                        value={raccLocked ? String(RACC_PENTE) : (showAideP ? av.pente : seg.pente)}
                        readOnly={raccLocked || showAideP}
                        onChange={e => { if (!raccLocked && !showAideP) updateSeg(seg.id, 'pente', e.target.value) }}
                        title={raccLocked ? `Raccordement fixé à ${RACC_PENTE} % (NF P91-100)` : ''}
                        className={`mt-1 block w-full rounded border px-2 py-1.5 text-sm outline-none ${
                          raccLocked
                            ? 'border-amber-300 bg-amber-100 text-amber-700 cursor-not-allowed font-semibold'
                            : showAideP
                              ? 'border-amber-300 bg-amber-50 text-amber-700 cursor-not-allowed'
                              : 'border-gray-300 focus:border-brand-500'
                        }`} />
                    </label>

                    {/* Hauteur + Longueur — 2 cols, bidirectionnel */}
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="text-xs text-gray-600">Hauteur (m)</span>
                        <input type="number" min="0" step="0.01"
                          value={showAideH ? av.hauteur : seg.hauteur}
                          onChange={e => updateSeg(seg.id, 'hauteur', e.target.value)}
                          className={`mt-1 block w-full rounded border px-2 py-1.5 text-sm outline-none focus:border-brand-500 ${
                            showAideH ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-gray-300'
                          }`} />
                      </label>
                      <label className="block">
                        <span className="text-xs text-gray-600">Longueur (m)</span>
                        <input type="number" min="0" step="0.01"
                          value={longueurDisp > 0 ? longueurDisp.toFixed(3) : ''}
                          onChange={e => updateLongueur(seg, e.target.value)}
                          className={`mt-1 block w-full rounded border px-2 py-1.5 text-sm outline-none focus:border-brand-500 ${
                            raccTooLong
                              ? 'border-red-300 bg-red-50 text-red-700'
                              : showAideH ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-gray-300'
                          }`} />
                      </label>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {raccLocked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200">
                          ✓ {RACC_PENTE} % — raccordement réglementaire
                        </span>
                      ) : penteDisp > 0 ? (
                        <Badge {...slopeStatut(penteDisp)} />
                      ) : null}
                      {raccTooLong && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-red-50 text-red-700 border-red-200">
                          ✗ {longueurDisp.toFixed(2)} m &gt; {RACC_MAX_LON} m max
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  /* ── Mode longueur : pente + longueur ── */
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="text-xs text-gray-600">Pente (%)</span>
                        <input type="number" min="0" max="30" step="0.5"
                          value={showAideP ? av.pente : seg.pente}
                          readOnly={showAideP}
                          onChange={e => { if (!showAideP) updateSeg(seg.id, 'pente', e.target.value) }}
                          className={`mt-1 block w-full rounded border px-2 py-1.5 text-sm outline-none focus:border-brand-500 ${
                            showAideP ? 'border-amber-300 bg-amber-50 text-amber-700 cursor-not-allowed' : 'border-gray-300'
                          }`} />
                      </label>
                      <label className="block">
                        <span className="text-xs text-gray-600">Longueur (m)</span>
                        <input type="number" min="0" step="0.01"
                          value={showAideL ? av.longueur : seg.longueur}
                          onChange={e => updateSeg(seg.id, 'longueur', e.target.value)}
                          className={`mt-1 block w-full rounded border px-2 py-1.5 text-sm outline-none focus:border-brand-500 ${
                            showAideL ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-gray-300'
                          }`} />
                        <Derived label="Hauteur" value={derivedHaut} />
                      </label>
                    </div>
                    {penteDisp > 0 && (
                      <div><Badge {...slopeStatut(penteDisp)} /></div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          <div className="flex gap-2">
            <button onClick={() => addSeg('ramp')}
              className="flex-1 py-2 text-sm font-medium rounded-lg border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 transition-colors">
              + Rampe
            </button>
            <button onClick={() => addSeg('racc')}
              className="flex-1 py-2 text-sm font-medium rounded-lg border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors">
              + Raccordement
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
            onChange={e => setLargeur(e.target.value)} placeholder="3.00"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
          <p className="mt-1 text-xs text-gray-400">Min. 2,50 m (1 sens) · 5,50 m (2 sens)</p>
        </label>
      </div>

      {/* Rappel réglementaire */}
      <details className="bg-blue-50 border border-blue-100 rounded-xl">
        <summary className="px-5 py-3 text-sm font-medium text-blue-700 cursor-pointer select-none">
          Rappel réglementaire — NF P91-100
        </summary>
        <ul className="px-5 pb-4 pt-1 text-xs text-blue-800 space-y-1 list-disc list-inside">
          <li>Pente rampe recommandée : <strong>≤ 15 %</strong></li>
          <li>Pente maximale tolérée : <strong>≤ 17 %</strong></li>
          <li>Pente maximale absolue : <strong>≤ 20 %</strong> (cas particulier justifié)</li>
          <li>Raccordement : <strong>{RACC_PENTE} %</strong> · longueur max <strong>{RACC_MAX_LON} m</strong></li>
          <li>Largeur min. 1 sens : <strong>2,50 m</strong> / 2 sens : <strong>5,50 m</strong></li>
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
                      {idx + 1}. {seg.type === 'racc' ? 'Raccordement' : 'Rampe'}
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
          <p className="text-4xl mb-2">🚗</p>
          <p className="text-sm">Saisissez les paramètres pour calculer.</p>
        </div>
      )}
    </>
  )

  return (
    <ToolLayout
      header={header}
      controls={controls}
      preview={<RampeParkingViz segments={segments} largeur={largeurNum} />}
    />
  )
}
