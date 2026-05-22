// Tableau par niveau — Capacitaire ERP / ERT

const CAT_COLORS = { 1:'#ef4444', 2:'#f97316', 3:'#f59e0b', 4:'#3b82f6' }

// ─── Sous-composants ──────────────────────────────────────────────────────────

function LevelBadge({ sortKey }) {
  const label = sortKey === 0 ? 'RdC' : sortKey > 0 ? `R+${sortKey}` : `SS${Math.abs(sortKey)}`
  const cls =
    sortKey < 0   ? 'bg-slate-100 text-slate-700 border-slate-200' :
    sortKey === 0 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                   'bg-blue-100 text-blue-700 border-blue-200'
  return (
    <span className={`inline-block px-2 py-0.5 rounded border text-[11px] font-bold tracking-wide ${cls}`}>
      {label}
    </span>
  )
}

function TypeToggle({ levelTypeReg, globalTypeReg, onToggle }) {
  const effective = levelTypeReg ?? globalTypeReg
  const isERP     = effective === 'ERP'
  const hasOverride = levelTypeReg !== null
  return (
    <button onClick={onToggle}
      title={`Basculer en ${isERP ? 'ERT' : 'ERP'}`}
      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
        isERP
          ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
          : 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100'
      } ${hasOverride ? 'ring-1 ring-offset-1 ring-current' : ''}`}>
      {effective}
    </button>
  )
}

function AddLevelBtn({ onClick, label, direction }) {
  const cls = direction === 'up'
    ? 'border-blue-300 text-blue-500 hover:border-blue-400 hover:bg-blue-50'
    : 'border-slate-300 text-slate-500 hover:border-slate-400 hover:bg-slate-50'
  return (
    <button onClick={onClick}
      className={`w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-2.5 text-sm font-medium transition-colors ${cls}`}>
      {direction === 'up' ? '↑' : '↓'} {label}
    </button>
  )
}

function GlobalRecap({ effectifTotal, categorie, degGlobal, totalSurface, typeReg, ratioNum }) {
  if (effectifTotal === 0) return null
  const catColor = CAT_COLORS[categorie?.num] || '#9ca3af'
  const wcGlobal = Math.max(2, 2 * Math.ceil(effectifTotal / 50))
  return (
    <div className="bg-white rounded-xl border-2 shadow-sm overflow-hidden"
      style={{ borderColor: catColor + '60' }}>
      <div className="px-5 py-4 flex items-center justify-between"
        style={{ backgroundColor: catColor + '0e' }}>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
            Récapitulatif global — {typeReg}
          </p>
          <p className="text-3xl font-bold" style={{ color: catColor }}>{effectifTotal}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            personnes · {totalSurface.toFixed(0)} m²
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
          <p className="text-2xl font-bold text-gray-900">{wcGlobal}</p>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">WC global</p>
          <p className="text-[10px] text-gray-400">R4228-10 CCT</p>
        </div>
      </div>
    </div>
  )
}

// ─── Styles d'en-têtes de groupes ─────────────────────────────────────────────

const GRP_DEG  = 'bg-blue-50/80 text-blue-700'
const GRP_CUM  = 'bg-indigo-50/80 text-indigo-700'
const GRP_SAN  = 'bg-emerald-50/80 text-emerald-700'
const GRP_BASE = 'bg-gray-50 text-gray-500'
const BORDER_DEG = 'border-l border-blue-100'
const BORDER_CUM = 'border-l border-indigo-100'
const BORDER_SAN = 'border-l border-emerald-100'

// ─── Composant principal ──────────────────────────────────────────────────────

export default function CapacitaireViz({
  niveaux, totalSurface, effectifTotal, categorie, degGlobal,
  typeReg, ratioNum,
  onUpdateNiveau, onAddEtage, onAddSousSol, onRemoveNiveau,
}) {
  const hasSS = niveaux.some(n => n.sortKey < 0 && n.effectif > 0)

  return (
    <div className="space-y-3">

      <AddLevelBtn onClick={onAddEtage} label="Ajouter un niveau superstructure" direction="up" />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[820px]">
            <thead>
              {/* ── Rangée 1 : groupes ── */}
              <tr className="text-[10px] font-bold uppercase tracking-wide border-b border-gray-200">
                <th rowSpan={2} className={`${GRP_BASE} px-3 py-2 text-left border-b border-gray-200`}>Niveau</th>
                <th rowSpan={2} className={`${GRP_BASE} px-3 py-2 text-center border-b border-gray-200`}>Cadre</th>
                <th rowSpan={2} className={`${GRP_BASE} px-3 py-2 text-right border-b border-gray-200`}>m²</th>
                <th rowSpan={2} className={`${GRP_BASE} px-3 py-2 text-center border-b border-gray-200`}>Effectif</th>

                <th colSpan={2} className={`${GRP_DEG} ${BORDER_DEG} px-3 py-2 text-center`}>Dégagements niveau</th>
                <th rowSpan={2} className={`${GRP_BASE} px-3 py-2 text-center border-b border-gray-200`}>Acc.</th>

                <th rowSpan={2} className={`${GRP_CUM} ${BORDER_CUM} px-3 py-2 text-center border-b border-indigo-100`}>
                  Eff. cumulé
                </th>
                <th colSpan={2} className={`${GRP_CUM} ${BORDER_CUM} px-3 py-2 text-center`}>Dégag. cumulés</th>

                <th colSpan={2} className={`${GRP_SAN} ${BORDER_SAN} px-3 py-2 text-center`}>Sanitaires (niveau)</th>
                <th rowSpan={2} className={`${GRP_BASE} w-8 px-2 border-b border-gray-200`} />
              </tr>

              {/* ── Rangée 2 : sous-colonnes ── */}
              <tr className="text-[10px] font-semibold uppercase tracking-wide">
                <th className={`${GRP_DEG} ${BORDER_DEG} px-3 py-1.5 text-center`}>Nb</th>
                <th className={`${GRP_DEG} px-3 py-1.5 text-center`}>UP</th>
                <th className={`${GRP_CUM} ${BORDER_CUM} px-3 py-1.5 text-center`}>Nb</th>
                <th className={`${GRP_CUM} px-3 py-1.5 text-center`}>UP</th>
                <th className={`${GRP_SAN} ${BORDER_SAN} px-3 py-1.5 text-center`}>WC</th>
                <th className={`${GRP_SAN} px-3 py-1.5 text-center`}>Uri.</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {niveaux.map(n => {
                const effectiveType = n.typeReg ?? typeReg
                const rowBg = n.sortKey < 0 ? 'bg-slate-50/50' : ''
                return (
                  <tr key={n.id} className={`${rowBg} hover:bg-gray-50/70 transition-colors`}>

                    {/* Niveau */}
                    <td className="px-3 py-2.5"><LevelBadge sortKey={n.sortKey} /></td>

                    {/* Cadre ERP/ERT */}
                    <td className="px-3 py-2.5 text-center">
                      <TypeToggle
                        levelTypeReg={n.typeReg}
                        globalTypeReg={typeReg}
                        onToggle={() => onUpdateNiveau(n.id, 'typeReg',
                          effectiveType === 'ERP' ? 'ERT' : 'ERP')}
                      />
                    </td>

                    {/* Surface input */}
                    <td className="px-3 py-2.5 text-right">
                      <input type="number" min="0" step="1" value={n.surface}
                        onChange={e => onUpdateNiveau(n.id, 'surface', e.target.value)}
                        placeholder="—"
                        className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-xs text-right focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                      />
                    </td>

                    {/* Effectif niveau — éditable, override en ambré */}
                    <td className="px-3 py-2.5 text-center">
                      <div className="inline-flex items-center justify-center gap-1">
                        <input
                          type="number"
                          min="0"
                          value={n.hasOverride ? String(n.effectifOverride) : (n.effectif > 0 ? String(n.effectif) : '')}
                          placeholder="—"
                          onChange={e => {
                            const val = e.target.value
                            if (val === '') {
                              onUpdateNiveau(n.id, 'effectifOverride', null)
                            } else {
                              onUpdateNiveau(n.id, 'effectifOverride', Math.max(0, parseInt(val) || 0))
                            }
                          }}
                          className={`w-16 rounded border px-1.5 py-1 text-xs text-center focus:outline-none focus:ring-1 transition-colors ${
                            n.hasOverride
                              ? 'border-amber-400 bg-amber-50 text-amber-800 font-bold focus:ring-amber-400'
                              : 'border-transparent bg-transparent text-gray-900 font-bold hover:border-gray-300 focus:border-brand-500 focus:ring-brand-500'
                          }`}
                        />
                        <button
                          onClick={() => onUpdateNiveau(n.id, 'effectifOverride', null)}
                          title="Remettre le calcul automatique"
                          aria-label="Réinitialiser l'effectif"
                          style={{ visibility: n.hasOverride ? 'visible' : 'hidden' }}
                          className="text-amber-500 hover:text-amber-700 transition-colors leading-none"
                        >↺</button>
                      </div>
                    </td>

                    {/* ── Dégagements niveau ── */}
                    <td className={`px-3 py-2.5 text-center ${BORDER_DEG}`}>
                      {n.nbSorties > 0
                        ? <span className="font-semibold text-blue-800">
                            {n.nbSorties}
                            {n.sortKey < 0 && <sup className="text-[8px] text-slate-400 ml-0.5">*</sup>}
                          </span>
                        : <span className="text-gray-200">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {n.nbUp > 0
                        ? <span className="font-semibold text-blue-800">
                            {n.nbUp}
                            <span className="text-[9px] font-normal text-blue-400 ml-0.5">UP</span>
                          </span>
                        : <span className="text-gray-200">—</span>}
                    </td>

                    {/* Dégagements accessoires */}
                    <td className="px-3 py-2.5 text-center">
                      {n.acc > 0
                        ? <span className="inline-block font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                            +{n.acc}
                          </span>
                        : <span className="text-gray-200">—</span>}
                    </td>

                    {/* ── Effectif cumulé ── */}
                    <td className={`px-3 py-2.5 text-center ${BORDER_CUM}`}>
                      {n.effectifCumul > 0
                        ? <span className="font-bold text-indigo-800">{n.effectifCumul}</span>
                        : <span className="text-gray-200">—</span>}
                    </td>

                    {/* ── Dégagements cumulés ── */}
                    <td className={`px-3 py-2.5 text-center ${BORDER_CUM}`}>
                      {n.degCumul.nbSorties > 0
                        ? <span className="font-semibold text-indigo-700">{n.degCumul.nbSorties}</span>
                        : <span className="text-gray-200">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {n.degCumul.nbUp > 0
                        ? <span className="font-semibold text-indigo-700">
                            {n.degCumul.nbUp}
                            <span className="text-[9px] font-normal text-indigo-400 ml-0.5">UP</span>
                          </span>
                        : <span className="text-gray-200">—</span>}
                    </td>

                    {/* ── Sanitaires (niveau) ── */}
                    <td className={`px-3 py-2.5 text-center ${BORDER_SAN}`}>
                      {n.wcTotal > 0
                        ? <span className="font-semibold text-emerald-700">{n.wcTotal}</span>
                        : <span className="text-gray-200">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {n.urinoirs > 0
                        ? <span className="font-semibold text-emerald-700">{n.urinoirs}</span>
                        : <span className="text-gray-200">—</span>}
                    </td>

                    {/* Supprimer */}
                    <td className="px-2 py-2.5 text-center">
                      {n.sortKey !== 0 && (
                        <button onClick={() => onRemoveNiveau(n.id)}
                          className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
                          aria-label="Supprimer">×</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>

            {effectifTotal > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={2} className="px-3 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wide">Total</td>
                  <td className="px-3 py-2.5 text-right text-xs text-gray-500">{totalSurface.toFixed(0)} m²</td>
                  <td className="px-3 py-2.5 text-center font-bold text-gray-900">{effectifTotal}</td>
                  <td colSpan={9} className="px-3 py-2.5 text-xs text-gray-400 italic text-center">→ récapitulatif ci-dessous</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {hasSS && (
          <p className="px-4 py-2 text-[10px] text-slate-500 border-t border-gray-100">
            * Sous-sol : minimum 2 dégagements requis — CO 43 §2 (ERP) / R4227-38 (ERT)
          </p>
        )}
      </div>

      <AddLevelBtn onClick={onAddSousSol} label="Ajouter un niveau infrastructure" direction="down" />

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
