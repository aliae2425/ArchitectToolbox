import { useState, useMemo, useRef } from 'react'
import CapacitaireViz from '../components/CapacitaireViz'
import ToolLayout from '../components/ToolLayout'

// ─── Données réglementaires ───────────────────────────────────────────────────
// Source : Arrêté du 25 juin 1980 modifié (Règlement de sécurité ERP)
// Catégories : Art. R123-19 du CCH

const GROUPES = [
  {
    groupe: 'Type L — Réunion, spectacle, conférence',
    items: [
      { id: 'reunion_assis',    label: 'Réunion — assis (sièges mobiles)',          calc: 'surface', density: 1,   densityLabel: '1 pers/m²',            ref: 'MS 5 — convention sièges mobiles' },
      { id: 'spectacle_places', label: 'Spectacle / conférence (places numérotées)',calc: 'places',  density: null, densityLabel: '1 pers/siège',          ref: 'MS 5 §1 — sièges fixes numérotés' },
      { id: 'salle_debout',     label: 'Debout — standing, hall, foyer',            calc: 'surface', density: 4,   densityLabel: '4 pers/m² (0,25 m²/p)', ref: 'MS 5 §1 — public debout' },
    ],
  },
  {
    groupe: 'Type M — Magasins de vente',
    items: [
      { id: 'vente_rdc',   label: 'Vente — RdC / entresol', calc: 'M_rdc',   density: null, densityLabel: '2 pers/3 m² (≤300 m²) + 1 pers/5 m²', ref: 'Art. M 2 §1' },
      { id: 'vente_ss',    label: 'Vente — sous-sol',        calc: 'surface', density: 1/3,  densityLabel: '1 pers/3 m²',  ref: 'Art. M 2 §1' },
      { id: 'vente_etage', label: 'Vente — étage',           calc: 'surface', density: 0.2,  densityLabel: '1 pers/5 m²',  ref: 'Art. M 2 §1' },
    ],
  },
  {
    groupe: 'Type N — Restauration',
    items: [
      { id: 'restaurant', label: 'Restaurant — assis (couverts)', calc: 'places',  density: null, densityLabel: '1 pers/couvert', ref: 'Art. N 2 §1' },
      { id: 'bar',        label: 'Bar / débit de boissons debout',calc: 'surface', density: 4,    densityLabel: '4 pers/m²',      ref: 'MS 5 §1 — public debout' },
    ],
  },
  {
    groupe: 'Type O — Hôtellerie',
    items: [
      { id: 'hotel_lits', label: 'Hôtel — chambres (lits)', calc: 'places', density: null, densityLabel: '1 pers/lit', ref: 'Art. O 2' },
    ],
  },
  {
    groupe: 'Type P — Danse, jeux',
    items: [
      { id: 'dancing', label: 'Salle de danse / jeux', calc: 'surface', density: 2, densityLabel: '2 pers/m²', ref: 'Art. P 2 — à vérifier' },
    ],
  },
  {
    groupe: 'Type R — Enseignement, formation',
    items: [
      { id: 'classe',       label: 'Salle de classe (places assises)', calc: 'places',  density: null, densityLabel: '1 pers/siège', ref: 'Art. R 2 §1' },
      { id: 'atelier_peda', label: 'Atelier pédagogique',              calc: 'surface', density: 0.2,  densityLabel: '1 pers/5 m²',  ref: 'Art. R 2 §1' },
    ],
  },
  {
    groupe: 'Type S — Bibliothèques, documentation',
    items: [
      { id: 'bibliotheque', label: 'Bibliothèque / médiathèque', calc: 'surface', density: 0.2, densityLabel: '1 pers/5 m²', ref: 'Art. S 2' },
    ],
  },
  {
    groupe: 'Type T — Expositions',
    items: [
      { id: 'exposition', label: "Salle d'exposition", calc: 'surface', density: 0.2, densityLabel: '1 pers/5 m²', ref: 'Art. T 2 §1' },
    ],
  },
  {
    groupe: 'Type V — Culte',
    items: [
      { id: 'culte_assis',  label: 'Lieu de culte — assis',  calc: 'surface', density: 1, densityLabel: '1 pers/m²',             ref: 'Art. V 2 §1' },
      { id: 'culte_debout', label: 'Lieu de culte — debout', calc: 'surface', density: 4, densityLabel: '4 pers/m² (0,25 m²/p)', ref: 'MS 5 §1 — public debout' },
    ],
  },
  {
    groupe: 'Type W — Bureaux, administrations',
    items: [
      { id: 'bureaux', label: 'Bureaux, administration, banques', calc: 'surface', density: 0.1, densityLabel: '1 pers/10 m²', ref: 'Art. W 2 §1' },
    ],
  },
  {
    groupe: 'Type X — Sportif couvert',
    items: [
      { id: 'sport_aire', label: 'Aire sportive', calc: 'surface', density: 0.2,  densityLabel: '1 pers/5 m²',  ref: 'Art. X 2 §1' },
      { id: 'gradins',    label: 'Gradins / tribunes',  calc: 'places',  density: null, densityLabel: '1 pers/place', ref: 'Art. X 2 §1' },
    ],
  },
  {
    groupe: 'Type Y — Musées',
    items: [
      { id: 'musee', label: 'Musée, espace culturel', calc: 'surface', density: 0.2, densityLabel: '1 pers/5 m²', ref: 'Art. Y 2 §1' },
    ],
  },
]

export const TYPE_MAP = Object.fromEntries(
  GROUPES.flatMap(g => g.items.map(it => [it.id, it]))
)

export function calcEffectif({ typeId, surface, places }) {
  const t = TYPE_MAP[typeId]
  if (!t) return 0
  const s = parseFloat(surface) || 0
  const p = parseInt(places) || 0
  if (t.calc === 'surface') return Math.ceil(s * t.density)
  if (t.calc === 'places') return p
  if (t.calc === 'M_rdc') {
    if (s <= 0) return 0
    if (s <= 300) return Math.ceil(s * 2 / 3)
    return Math.ceil(200 + (s - 300) / 5)
  }
  return 0
}

export function getCategorie(eff) {
  if (eff <= 0) return null
  if (eff > 1500) return { num: 1, label: '1ère catégorie', color: 'red',    hint: '> 1 500 personnes' }
  if (eff > 700)  return { num: 2, label: '2ème catégorie', color: 'orange', hint: '701 à 1 500 personnes' }
  if (eff > 300)  return { num: 3, label: '3ème catégorie', color: 'amber',  hint: '301 à 700 personnes' }
  return           { num: 4, label: '4ème cat. (ou 5ème)', color: 'blue',   hint: '≤ 300 personnes' }
}

export function getDegagements(eff) {
  if (eff <= 0) return null
  // CO 37 — 1 UP pour 100 pers, +1 UP par 100 pers au-delà
  const nbUp = eff < 20 ? 1 : Math.max(2, Math.ceil(eff / 100))
  // CO 38 — nombre minimum de sorties (hors sous-sol / configuration spécifique)
  let nbSorties
  if (eff <= 19)        nbSorties = 1
  else if (eff <= 500)  nbSorties = 2
  else if (eff <= 1000) nbSorties = 3
  else                  nbSorties = 3 + Math.ceil((eff - 1000) / 500)
  return { nbUp, largeur: (nbUp * 0.6).toFixed(2), nbSorties }
}

// ─── Composants UI ────────────────────────────────────────────────────────────

function Badge({ color, children }) {
  const cls = {
    red:    'bg-red-100 text-red-800 border-red-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
    amber:  'bg-amber-100 text-amber-800 border-amber-200',
    blue:   'bg-blue-100 text-blue-800 border-blue-200',
  }[color] || 'bg-gray-100 text-gray-700 border-gray-200'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {children}
    </span>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function CapacitaireERP() {
  const counter = useRef(2)
  const [locaux, setLocaux] = useState([
    { id: 1, nom: 'Local 1', typeId: 'bureaux', surface: '100', places: '' },
  ])

  const resultats = useMemo(() => {
    const items = locaux.map(l => ({
      ...l,
      type: TYPE_MAP[l.typeId],
      effectif: calcEffectif(l),
    }))
    const effectifTotal = items.reduce((s, i) => s + i.effectif, 0)
    return { items, effectifTotal, categorie: getCategorie(effectifTotal), degagements: getDegagements(effectifTotal) }
  }, [locaux])

  function updateLocal(id, field, value) {
    setLocaux(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l))
  }

  function addLocal() {
    const id = counter.current++
    setLocaux(prev => [...prev, { id, nom: `Local ${prev.length + 1}`, typeId: 'bureaux', surface: '', places: '' }])
  }

  function removeLocal(id) {
    setLocaux(prev => prev.filter(l => l.id !== id))
  }

  const controls = (
    <>
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Capacitaire ERP</h2>
        <p className="text-sm text-gray-500">Arrêté du 25 juin 1980 modifié — Effectif, catégories et dégagements</p>
      </div>

      {/* Liste des locaux */}
      <div className="space-y-3">
        {locaux.map((local, idx) => {
          const type     = TYPE_MAP[local.typeId]
          const eff      = calcEffectif(local)
          const usePlaces = type?.calc === 'places'
          return (
            <div key={local.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Local {idx + 1}</span>
                <div className="flex items-center gap-2">
                  {eff > 0 && <Badge color="blue">{eff} pers.</Badge>}
                  {locaux.length > 1 && (
                    <button onClick={() => removeLocal(local.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors text-xl leading-none"
                      aria-label="Supprimer">×</button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <input
                  type="text" value={local.nom}
                  onChange={e => updateLocal(local.id, 'nom', e.target.value)}
                  placeholder="Nom du local (optionnel)"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                />

                <select
                  value={local.typeId}
                  onChange={e => updateLocal(local.id, 'typeId', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none bg-white"
                >
                  {GROUPES.map(g => (
                    <optgroup key={g.groupe} label={g.groupe}>
                      {g.items.map(it => (
                        <option key={it.id} value={it.id}>{it.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>

                <div className="flex items-end gap-3">
                  {usePlaces ? (
                    <label className="flex-1">
                      <span className="block text-xs font-medium text-gray-600 mb-1">
                        {local.typeId === 'hotel_lits' ? 'Nombre de lits' : 'Places / sièges'}
                      </span>
                      <input
                        type="number" min="0" step="1" value={local.places}
                        onChange={e => updateLocal(local.id, 'places', e.target.value)}
                        placeholder="ex : 50"
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                      />
                    </label>
                  ) : (
                    <label className="flex-1">
                      <span className="block text-xs font-medium text-gray-600 mb-1">Surface (m²)</span>
                      <input
                        type="number" min="0" step="0.5" value={local.surface}
                        onChange={e => updateLocal(local.id, 'surface', e.target.value)}
                        placeholder="ex : 120"
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                      />
                    </label>
                  )}
                  <p className="text-xs text-gray-400 pb-2.5 flex-shrink-0">{type?.densityLabel}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <button
        onClick={addLocal}
        className="w-full rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 hover:border-brand-400 hover:text-brand-600 transition-colors"
      >
        + Ajouter un local
      </button>

      {/* Résultats */}
      {resultats.effectifTotal > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Résultats</h3>

          <div className="flex items-center justify-between py-2.5 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-700">Effectif total</span>
            <span className="text-xl font-bold text-gray-900">{resultats.effectifTotal} pers.</span>
          </div>

          {resultats.categorie && (
            <div className="flex items-center justify-between py-2.5 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-700">Catégorie ERP</p>
                <p className="text-xs text-gray-400 mt-0.5">{resultats.categorie.hint}</p>
              </div>
              <Badge color={resultats.categorie.color}>{resultats.categorie.label}</Badge>
            </div>
          )}

          {resultats.degagements && (
            <>
              <div className="flex items-center justify-between py-2.5 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-700">Unités de passage (UP)</p>
                  <p className="text-xs text-gray-400 mt-0.5">1 UP = 0,60 m — CO 37</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{resultats.degagements.nbUp} UP</p>
                  <p className="text-xs text-gray-400">{resultats.degagements.largeur} m min.</p>
                </div>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium text-gray-700">Sorties minimum</p>
                  <p className="text-xs text-gray-400 mt-0.5">CO 38 — hors sous-sol / niveaux</p>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {resultats.degagements.nbSorties} dégagement{resultats.degagements.nbSorties > 1 ? 's' : ''}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Références réglementaires */}
      <details className="bg-amber-50 border border-amber-100 rounded-xl">
        <summary className="px-5 py-3 text-sm font-medium text-amber-700 cursor-pointer select-none">
          Références réglementaires
        </summary>
        <ul className="px-5 pb-4 pt-1 text-xs text-amber-800 space-y-1 list-disc list-inside">
          <li><strong>Catégories (1 à 5)</strong> — Art. R123-19 du CCH</li>
          <li><strong>Effectif debout</strong> — MS 5 §1 : 1 pers / 0,25 m²</li>
          <li><strong>Effectif magasins</strong> — Art. M 2 (Arr. 25 juin 1980 modifié)</li>
          <li><strong>Unités de passage</strong> — CO 37 : 1 UP / 100 pers, +1 UP / 100 pers au-delà (min. 2 UP si effectif ≥ 20)</li>
          <li><strong>Nombre de sorties</strong> — CO 38 : varie selon effectif et configuration</li>
          <li className="font-semibold text-amber-900">⚠ Valeurs indicatives. Vérifier sur le texte officiel et auprès de la commission de sécurité.</li>
        </ul>
      </details>
    </>
  )

  return (
    <ToolLayout
      controls={controls}
      preview={<CapacitaireViz resultats={resultats} />}
    />
  )
}
