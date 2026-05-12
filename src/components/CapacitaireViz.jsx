// Tableau par niveau — Capacitaire ERP / ERT

const CAT_COLORS = { 1: '#ef4444', 2: '#f97316', 3: '#f59e0b', 4: '#3b82f6' }

function LevelBadge({ sortKey }) {
  const label = sortKey === 0 ? 'RdC' : sortKey > 0 ? `R+${sortKey}` : `SS${Math.abs(sortKey)}`
  const cls =
    sortKey < 0  ? 'bg-slate-100 text-slate-700 border-slate-200' :
    sortKey === 0 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                   'bg-blue-100 text-blue-700 border-blue-200'
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded border text-xs font-bold tracking-wide ${cls}`}>
      {label}
    </span>
  )
}

function Cell({ value, sub, highlight }) {
  if (!value && value !== 0) return <span className="text-gray-300">—</span>
  return (
    <span className={highlight ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}>
      {value}
      {sub && <span className="text-[10px] text-gray-400 ml-0.5">{sub}</span>}
    </span>
  )
}

function AddLevelBtn({ onClick, label, direction, color }) {
  const borderColor = color === 'blue' ? 'border-blue-300 text-blue-500 hover:border-blue-400 hover:bg-blue-50' : 'border-slate-300 text-slate-500 hover:border-slate-400 hover:bg-slate-50'
  return (
    <button onClick={onClick}
      className={`w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-2.5 text-sm font-medium transition-colors ${borderColor}`}>
      <span className="text-base">{direction === 'up' ? '↑' : '↓'}</span>
      {label}
    </button>
  )
}

// ─── Récapitulatif global ─────────────────────────────────────────────────────

function GlobalRecap({ effectifTotal, categorie, degGlobal, totalSurface, typeReg, ratioNum }) {
  if (effectifTotal === 0) return null
  const catColor = CAT_COLORS[categorie?.num] || '#9ca3af'

  return (
    <div className="bg-white rounded-xl border-2 shadow-sm overflow-hidden"
      style={{ borderColor: catColor + '60' }}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between"
        style={{ backgroundColor: catColor + '0e' }}>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Récapitulatif global — {typeReg}</p>
          <p className="text-3xl font-bold" style={{ color: catColor }}>{effectifTotal}</p>
          <p className="text-xs text-gray-400 mt-0.5">personnes · {totalSurface.toFixed(0)} m²
            {ratioNum > 0 ? ` · ratio ${ratioNum} m²/p` : ''}
          </p>
        </div>
        {categorie && (
          <div className="text-right">
            <span className="inline-block px-3 py-1.5 rounded-lg text-sm font-bold border"
              style={{ color: catColor, borderColor: catColor, backgroundColor: catColor + '18' }}>
              {categorie.label}
            </span>
            <p className="text-xs text-gray-400 mt-1.5">{categorie.hint}</p>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100">
        <div className="px-4 py-3 text-center">
          <p className="text-2xl font-bold text-gray-900">{degGlobal.nbUp}</p>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">UP global</p>
          <p className="text-[10px] text-gray-400">CO 37 — {degGlobal.largeur} m</p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-2xl font-bold text-gray-900">{degGlobal.nbSorties}</p>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">Sorties globales</p>
          <p className="text-[10px] text-gray-400">CO 38</p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-2xl font-bold text-gray-900">
            {Math.max(2, 2 * Math.ceil(effectifTotal / 50))}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">WC global</p>
          <p className="text-[10px] text-gray-400">R4228-10 CCT</p>
        </div>
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function CapacitaireViz({
  niveaux, totalSurface, effectifTotal, categorie, degGlobal,
  typeReg, ratioNum,
  onUpdateSurface, onAddEtage, onAddSousSol, onRemoveNiveau,
}) {
  const hasSS = niveaux.some(n => n.sortKey < 0 && n.effectif > 0)

  return (
    <div className="space-y-3">

      {/* Bouton ajout superstructure */}
      <AddLevelBtn onClick={onAddEtage} label="Ajouter un niveau superstructure" direction="up" color="blue" />

      {/* Tableau par niveau */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Niveau</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Surface (m²)</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Effectif</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">UP</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Dégag. min.</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">WC cab.</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Urinoirs</th>
                <th className="w-8 px-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {niveaux.map(n => (
                <tr key={n.id}
                  className={`transition-colors hover:bg-gray-50 ${n.sortKey < 0 ? 'bg-slate-50/60' : ''}`}>
                  <td className="px-4 py-3">
                    <LevelBadge sortKey={n.sortKey} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number" min="0" step="1" value={n.surface}
                      onChange={e => onUpdateSurface(n.id, e.target.value)}
                      placeholder="—"
                      className="w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-right focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Cell value={n.effectif > 0 ? n.effectif : null} highlight />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Cell value={n.nbUp > 0 ? n.nbUp : null} sub={n.nbUp > 0 ? ' UP' : ''} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {n.nbSorties > 0 ? (
                      <span className="font-medium text-gray-700">
                        {n.nbSorties}
                        {n.sortKey < 0 && <span className="text-[10px] text-slate-400 ml-0.5">*</span>}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Cell value={n.wcTotal > 0 ? n.wcTotal : null} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Cell value={n.urinoirs > 0 ? n.urinoirs : null} />
                  </td>
                  <td className="px-2 py-3 text-center">
                    {n.sortKey !== 0 && (
                      <button onClick={() => onRemoveNiveau(n.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors text-xl leading-none"
                        aria-label="Supprimer">×</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Ligne totaux */}
            {effectifTotal > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Total</td>
                  <td className="px-4 py-3 text-right text-xs text-gray-400">{totalSurface.toFixed(0)} m²</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">{effectifTotal}</td>
                  <td colSpan="4" className="px-4 py-3 text-right text-xs text-gray-400 italic">→ récapitulatif global ci-dessous</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Note sous-sol */}
        {hasSS && (
          <p className="px-4 py-2 text-xs text-slate-500 border-t border-gray-100">
            * Sous-sol : minimum 2 dégagements requis — CO 43 §2 (ERP) / R4227-38 (ERT)
          </p>
        )}
      </div>

      {/* Bouton ajout infrastructure */}
      <AddLevelBtn onClick={onAddSousSol} label="Ajouter un niveau infrastructure" direction="down" color="slate" />

      {/* Récapitulatif global */}
      <GlobalRecap
        effectifTotal={effectifTotal}
        categorie={categorie}
        degGlobal={degGlobal}
        totalSurface={totalSurface}
        typeReg={typeReg}
        ratioNum={ratioNum}
      />

    </div>
  )
}
