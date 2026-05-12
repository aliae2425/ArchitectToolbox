import { useState, useMemo, useRef } from 'react'
import CapacitaireViz from '../components/CapacitaireViz'
import ToolLayout from '../components/ToolLayout'

// ─── Présets ──────────────────────────────────────────────────────────────────

const RATIO_PRESETS = [
  { label: '— Sélectionner un usage —', value: '' },
  { label: 'Bureaux / Type W — ERP / ERT  (10 m²/p)', value: '10' },
  { label: 'Open space ERT — industrie légère (15 m²/p)', value: '15' },
  { label: 'Atelier ERT — industrie lourde (20 m²/p)', value: '20' },
  { label: 'Salle de réunion assis (1 m²/p)', value: '1' },
  { label: 'Salle debout / hall / foyer (0,25 m²/p)', value: '0.25' },
  { label: 'Magasin — RdC / entresol (1,5 m²/p)', value: '1.5' },
  { label: 'Restaurant — couverts (1,5 m²/p)', value: '1.5' },
  { label: 'Bibliothèque / expo / musée (5 m²/p)', value: '5' },
  { label: 'Salle de sport — aire sportive (5 m²/p)', value: '5' },
]

// ─── Fonctions de calcul ──────────────────────────────────────────────────────

function getLevelLabel(sortKey) {
  if (sortKey === 0) return 'RdC'
  return sortKey > 0 ? `R+${sortKey}` : `SS${Math.abs(sortKey)}`
}

function getDegagementsNiveau(effectif, isSS) {
  if (effectif <= 0) return { nbUp: 0, largeur: '—', nbSorties: 0 }
  const nbUp = effectif < 20 ? 1 : Math.max(2, Math.ceil(effectif / 100))
  let nbSorties
  if (effectif <= 19)        nbSorties = isSS ? 2 : 1
  else if (effectif <= 500)  nbSorties = 2
  else if (effectif <= 1000) nbSorties = 3
  else                       nbSorties = 3 + Math.ceil((effectif - 1000) / 500)
  return { nbUp, largeur: (nbUp * 0.6).toFixed(2), nbSorties }
}

// R4228-10 CCT : 1 WC / 25 personnes par sexe (hypothèse 50/50)
function calcSanitaires(effectif) {
  if (effectif <= 0) return { wcTotal: 0, urinoirs: 0 }
  const men  = Math.ceil(effectif / 2)
  const wom  = effectif - men
  const wcH  = Math.ceil(men / 25)
  const wcF  = wom > 0 ? Math.ceil(wom / 25) : 0
  return { wcTotal: Math.max(2, wcH + wcF), urinoirs: wcH }
}

export function getCategorie(eff) {
  if (eff <= 0) return null
  if (eff > 1500) return { num: 1, label: '1ère catégorie', color: 'red',    hint: '> 1 500 personnes' }
  if (eff > 700)  return { num: 2, label: '2ème catégorie', color: 'orange', hint: '701 à 1 500 personnes' }
  if (eff > 300)  return { num: 3, label: '3ème catégorie', color: 'amber',  hint: '301 à 700 personnes' }
  return           { num: 4, label: '4ème / 5ème cat.',  color: 'blue',   hint: '≤ 300 personnes' }
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function CapacitaireERP() {
  const counter = useRef(2)
  const [typeReg, setTypeReg] = useState('ERP')
  const [ratio, setRatio]     = useState('10')
  // Each level: { id, sortKey, surface, typeReg: null|'ERP'|'ERT' }
  const [niveaux, setNiveaux] = useState([{ id: 1, sortKey: 0, surface: '', typeReg: null }])

  const ratioNum = parseFloat(ratio) || 0

  const niveauxCalc = useMemo(() => {
    // Step 1: base per-level computation
    const sorted = [...niveaux]
      .sort((a, b) => b.sortKey - a.sortKey)
      .map(n => {
        const surf     = parseFloat(n.surface) || 0
        const effectif = ratioNum > 0 && surf > 0 ? Math.ceil(surf / ratioNum) : 0
        const isSS     = n.sortKey < 0
        const deg      = getDegagementsNiveau(effectif, isSS)
        const san      = calcSanitaires(effectif)
        return { ...n, label: getLevelLabel(n.sortKey), effectif, ...deg, ...san }
      })

    // Step 2: cumulative effectif
    // Above-ground (sortKey >= 0): cumulate R+N → RdC (display order = top first)
    const cumulMap = {}
    let cumAbove = 0
    for (const n of sorted) {
      if (n.sortKey >= 0) { cumAbove += n.effectif; cumulMap[n.id] = cumAbove }
    }
    // Below-ground (sortKey < 0): cumulate deepest → SS1 (reverse of display order)
    let cumBelow = 0
    for (const n of [...sorted].filter(n => n.sortKey < 0).reverse()) {
      cumBelow += n.effectif; cumulMap[n.id] = cumBelow
    }

    return sorted.map(n => {
      const ec       = cumulMap[n.id] ?? 0
      const isSS     = n.sortKey < 0
      const degCumul = getDegagementsNiveau(ec, isSS)
      return { ...n, effectifCumul: ec, degCumul, acc: Math.max(0, n.nbSorties - 2) }
    })
  }, [niveaux, ratioNum])

  const effectifTotal = niveauxCalc.reduce((s, n) => s + n.effectif, 0)
  const totalSurface  = niveauxCalc.reduce((s, n) => s + (parseFloat(n.surface) || 0), 0)
  const categorie     = getCategorie(effectifTotal)
  const degGlobal     = getDegagementsNiveau(effectifTotal, false)

  function updateNiveau(id, field, value) {
    setNiveaux(prev => prev.map(n => n.id === id ? { ...n, [field]: value } : n))
  }

  function addEtage() {
    const maxKey = Math.max(...niveaux.map(n => n.sortKey), 0)
    setNiveaux(prev => [...prev, { id: counter.current++, sortKey: maxKey + 1, surface: '', typeReg: null }])
  }

  function addSousSol() {
    const minKey = Math.min(...niveaux.map(n => n.sortKey), 0)
    setNiveaux(prev => [...prev, { id: counter.current++, sortKey: minKey - 1, surface: '', typeReg: null }])
  }

  function removeNiveau(id) {
    setNiveaux(prev => prev.filter(n => n.id !== id))
  }

  const controls = (
    <>
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Capacitaire ERP / ERT</h2>
        <p className="text-sm text-gray-500">Effectif, dégagements et sanitaires par niveau</p>
      </div>

      {/* Cadre réglementaire global (défaut) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Cadre réglementaire (défaut)</h3>
        <p className="text-xs text-gray-400 mb-3">Modifiable niveau par niveau dans le tableau.</p>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {['ERP', 'ERT'].map(t => (
            <button key={t} onClick={() => setTypeReg(t)}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                typeReg === t ? 'bg-brand-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}>{t}</button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {typeReg === 'ERP'
            ? 'Arrêté du 25 juin 1980 modifié — CO 37 / CO 38'
            : 'Code du travail — R4227-34 à -40 / R4228-8 à -11'}
        </p>
      </div>

      {/* Ratio global */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Ratio d'occupation global</h3>
        <label className="block mb-3">
          <span className="text-sm font-medium text-gray-700">m² / personne</span>
          <input type="number" min="0.1" step="0.1" value={ratio}
            onChange={e => setRatio(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-500 mb-1 block">Préset d'usage</span>
          <select defaultValue="" onChange={e => { if (e.target.value) setRatio(e.target.value) }}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none bg-white">
            {RATIO_PRESETS.map(p => <option key={p.label} value={p.value}>{p.label}</option>)}
          </select>
        </label>
        {ratioNum > 0 && (
          <p className="text-xs text-gray-400 mt-2 text-right">≈ {(1 / ratioNum).toFixed(2)} pers/m²</p>
        )}
      </div>

      {/* Références */}
      <details className="bg-amber-50 border border-amber-100 rounded-xl">
        <summary className="px-5 py-3 text-sm font-medium text-amber-700 cursor-pointer select-none">
          Références réglementaires
        </summary>
        <ul className="px-5 pb-4 pt-1 text-xs text-amber-800 space-y-1 list-disc list-inside">
          <li><strong>Catégories ERP</strong> — Art. R123-19 CCH</li>
          <li><strong>UP / dégagements ERP</strong> — CO 37 et CO 38 (Arr. 25 juin 1980)</li>
          <li><strong>Dégag. accessoires ERP</strong> — CO 36 §3 : au-delà de 2 sorties principales</li>
          <li><strong>Sous-sol ERP</strong> — CO 43 §2 : min. 2 dégagements</li>
          <li><strong>Sanitaires ERT</strong> — R4228-10 CCT : 1 WC / 25 pers par sexe</li>
          <li><strong>Dégagements ERT</strong> — R4227-34 à R4227-40 CCT</li>
          <li className="font-semibold text-amber-900">⚠ Valeurs indicatives — vérifier le texte officiel.</li>
        </ul>
      </details>
    </>
  )

  return (
    <ToolLayout
      controls={controls}
      preview={
        <CapacitaireViz
          niveaux={niveauxCalc}
          totalSurface={totalSurface}
          effectifTotal={effectifTotal}
          categorie={categorie}
          degGlobal={degGlobal}
          typeReg={typeReg}
          ratioNum={ratioNum}
          onUpdateNiveau={updateNiveau}
          onAddEtage={addEtage}
          onAddSousSol={addSousSol}
          onRemoveNiveau={removeNiveau}
        />
      }
    />
  )
}
