import { useState, useMemo } from 'react'
import RampeViz from '../components/RampeViz'
import ToolLayout from '../components/ToolLayout'

const REG = {
  penteMax: 5,
  penteMaxCourte: 8,
  penteMaxTresCourte: 12,
  longueurMaxSansPalier: 10,
  largeurMin: 1.40,
  largeurMinExistant: 1.20,
  palierLongueur: 1.40,
  palierLargeur: 1.40,
  deversMax: 2,
}

function getPenteStatut(pente, longueur) {
  if (pente <= REG.penteMax)
    return { niveau: 'ok', label: 'Conforme (≤ 5 %)' }
  if (pente <= REG.penteMaxCourte && longueur <= 2)
    return { niveau: 'warning', label: 'Toléré : ≤ 8 % sur ≤ 2 m' }
  if (pente <= REG.penteMaxTresCourte && longueur <= 0.5)
    return { niveau: 'warning', label: 'Toléré ERP exist. : ≤ 12 % sur ≤ 0,5 m' }
  return { niveau: 'error', label: 'Non conforme' }
}

function calculerRampe({ denivelee, longueurDispo, largeur, erpExistant }) {
  if (!denivelee || denivelee <= 0) return null
  const largeurMin = erpExistant ? REG.largeurMinExistant : REG.largeurMin
  const longueurMin5 = denivelee / (REG.penteMax / 100)
  const longueurMin8 = denivelee / (REG.penteMaxCourte / 100)
  const longueurMin12 = denivelee / (REG.penteMaxTresCourte / 100)
  const longueurEffective = longueurDispo > 0 ? longueurDispo : longueurMin5
  const penteReelle = (denivelee / longueurEffective) * 100
  const penteStatut = getPenteStatut(penteReelle, longueurEffective)
  const nbTroncons = Math.ceil(longueurEffective / REG.longueurMaxSansPalier)
  const nbPaliers = nbTroncons - 1
  const longueurTotale = longueurEffective + nbPaliers * REG.palierLongueur
  return {
    penteReelle, penteStatut,
    longueurRampe: longueurEffective,
    longueurTotale,
    nbTroncons, nbPaliers,
    largeurOk: largeur >= largeurMin,
    largeurMin,
    longueurMin5, longueurMin8, longueurMin12,
    mainCourante: penteReelle > 5 || longueurEffective > 0.5,
  }
}

function Badge({ niveau, label }) {
  const styles = {
    ok:      'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
    error:   'bg-red-100 text-red-800 border-red-200',
  }
  const icons = { ok: '✓', warning: '⚠', error: '✗' }
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[niveau]}`}>
      {icons[niveau]} {label}
    </span>
  )
}

function ResultRow({ label, value, badge, sub }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-gray-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <div className="text-right ml-4 flex-shrink-0">
        {value && <p className="text-sm font-semibold text-gray-900">{value}</p>}
        {badge && <div className="mt-0.5">{badge}</div>}
      </div>
    </div>
  )
}

export default function RampePMR() {
  const [denivelee, setDenivelee] = useState('')
  const [longueurDispo, setLongueurDispo] = useState('')
  const [largeur, setLargeur] = useState('1.40')
  const [erpExistant, setErpExistant] = useState(false)

  const result = useMemo(
    () => calculerRampe({
      denivelee: parseFloat(denivelee),
      longueurDispo: parseFloat(longueurDispo) || 0,
      largeur: parseFloat(largeur) || 0,
      erpExistant,
    }),
    [denivelee, longueurDispo, largeur, erpExistant],
  )

  const header = (
    <>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Calcul de rampe PMR</h2>
      <p className="text-sm text-gray-500">Arrêté du 8 décembre 2014 — ERP neufs et existants</p>
    </>
  )

  const controls = (
    <>
      {/* Formulaire */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Paramètres</h3>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Dénivelée (m)</span>
            <input type="number" min="0" step="0.01" value={denivelee}
              onChange={e => setDenivelee(e.target.value)}
              placeholder="ex : 0.18"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none" />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Longueur dispo (m){' '}
              <span className="font-normal text-gray-400 text-xs">optionnel</span>
            </span>
            <input type="number" min="0" step="0.01" value={longueurDispo}
              onChange={e => setLongueurDispo(e.target.value)}
              placeholder="auto si vide"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none" />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Largeur (m)</span>
            <input type="number" min="0" step="0.01" value={largeur}
              onChange={e => setLargeur(e.target.value)}
              placeholder="1.40"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none" />
          </label>

          <label className="flex items-center gap-3 cursor-pointer pt-6">
            <input type="checkbox" checked={erpExistant}
              onChange={e => setErpExistant(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
            <span className="text-sm font-medium text-gray-700">ERP existant</span>
          </label>
        </div>
      </div>

      {/* Rappel réglementaire */}
      <details className="bg-blue-50 border border-blue-100 rounded-xl" open>
        <summary className="px-5 py-3 text-sm font-medium text-blue-700 cursor-pointer select-none">
          Rappel réglementaire
        </summary>
        <ul className="px-5 pb-4 pt-1 text-xs text-blue-800 space-y-1 list-disc list-inside">
          <li>Pente maximale standard : <strong>5 %</strong></li>
          <li>Tolérance : jusqu'à <strong>8 %</strong> si longueur ≤ 2 m</li>
          <li>Tolérance ERP existants : jusqu'à <strong>12 %</strong> si longueur ≤ 0,5 m</li>
          <li>Palier de repos tous les <strong>10 m</strong> (1,40 m × 1,40 m min.)</li>
          <li>Largeur minimale : <strong>1,40 m</strong> (ERP neufs) / <strong>1,20 m</strong> (ERP existants)</li>
          <li>Dévers transversal : <strong>≤ 2 %</strong></li>
          <li>Main courante des deux côtés si pente &gt; 5 % ou longueur &gt; 0,5 m</li>
          <li>Réf. : Arrêté du 8 déc. 2014, annexe 2 (neufs) et 3 (existants)</li>
        </ul>
      </details>

      {/* Longueurs de référence */}
      {result && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Longueurs de référence — Δh = {denivelee} m
          </h3>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {[
              { pente: '5 %',  l: result.longueurMin5,  cls: 'bg-green-50 text-green-800 border border-green-200' },
              { pente: '8 %',  l: result.longueurMin8,  cls: 'bg-amber-50 text-amber-800 border border-amber-200' },
              { pente: '12 %', l: result.longueurMin12, cls: 'bg-red-50 text-red-800 border border-red-200' },
            ].map(({ pente, l, cls }) => (
              <div key={pente} className={`rounded-lg p-2.5 ${cls}`}>
                <p className="font-bold text-sm">{l.toFixed(2)} m</p>
                <p className="opacity-70 mt-0.5">à {pente}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Résultats */}
      {result ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Résultats</h3>

          <ResultRow
            label="Pente"
            value={`${result.penteReelle.toFixed(2)} %`}
            badge={<Badge {...result.penteStatut} />}
            sub={longueurDispo ? `Pour ${longueurDispo} m de longueur` : 'Longueur calculée à 5 %'}
          />
          <ResultRow
            label="Longueur de la rampe"
            value={`${result.longueurRampe.toFixed(2)} m`}
            sub={longueurDispo ? undefined : 'Pour pente ≤ 5 %'}
          />
          <ResultRow
            label="Paliers de repos"
            value={result.nbPaliers === 0
              ? 'Aucun requis'
              : `${result.nbPaliers} palier${result.nbPaliers > 1 ? 's' : ''} — ${REG.palierLongueur} m × ${REG.palierLargeur} m`}
            sub={`Tous les ${REG.longueurMaxSansPalier} m · ${result.nbTroncons} tronçon${result.nbTroncons > 1 ? 's' : ''}`}
            badge={result.nbPaliers > 0
              ? <Badge niveau="warning" label={`${result.nbPaliers} palier${result.nbPaliers > 1 ? 's' : ''} obligatoire${result.nbPaliers > 1 ? 's' : ''}`} />
              : undefined}
          />
          <ResultRow
            label="Longueur totale (avec paliers)"
            value={`${result.longueurTotale.toFixed(2)} m`}
          />
          <ResultRow
            label="Largeur"
            value={`${largeur} m`}
            badge={
              <Badge
                niveau={result.largeurOk ? 'ok' : 'error'}
                label={result.largeurOk
                  ? `Conforme (min ${result.largeurMin} m)`
                  : `Non conforme — min ${result.largeurMin} m`}
              />
            }
          />
          <ResultRow
            label="Main courante"
            badge={
              <Badge
                niveau={result.mainCourante ? 'warning' : 'ok'}
                label={result.mainCourante ? 'Obligatoire de chaque côté' : 'Non obligatoire'}
              />
            }
            sub="Requise si pente > 5 % ou longueur > 0,5 m"
          />
          <ResultRow
            label="Dévers transversal"
            value={`≤ ${REG.deversMax} %`}
            badge={<Badge niveau="ok" label="À vérifier in situ" />}
          />
        </div>
      ) : (
        <div className="text-center py-10 text-gray-400">
          <p className="text-4xl mb-2">♿</p>
          <p className="text-sm">Saisissez une dénivelée pour calculer.</p>
        </div>
      )}
    </>
  )

  return (
    <ToolLayout
      header={header}
      controls={controls}
      preview={<RampeViz denivelee={denivelee} largeur={largeur} />}
    />
  )
}
