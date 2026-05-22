import { Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'

const tools = [
  {
    label: 'Rampes PMR',
    path: '/rampe-pmr',
    icon: '♿',
    description: 'Calcul de pente, longueur et paliers selon la réglementation ERP.',
  },
  {
    label: 'Rampes parking',
    path: '/rampe-parking',
    icon: '🚗',
    description: 'Calcul de rampe de stationnement selon la norme NF P91-100.',
  },
  {
    label: 'Rampes vélo',
    path: '/rampe-velo',
    icon: '🚲',
    description: 'Calcul de rampe vélo avec modélisation 3D et aide au dimensionnement.',
  },
  {
    label: 'Capacitaire ERP',
    path: '/capacitaire-erp',
    icon: '🏢',
    description: 'Calcul de l\'effectif, de la catégorie ERP et des dégagements requis (CO 37-38).',
  },
]

function IssueModal({ onClose }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const titleRef = useRef(null)

  useEffect(() => {
    titleRef.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleSubmit(e) {
    e.preventDefault()
    const url = `https://github.com/aliae2425/ArchitectToolbox/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`
    window.open(url, '_blank', 'noopener,noreferrer')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-800">Signaler un problème</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1 -mr-1 rounded"
            aria-label="Fermer"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="issue-title">
              Titre <span className="text-red-500">*</span>
            </label>
            <input
              ref={titleRef}
              id="issue-title"
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex : Erreur de calcul sur la pente PMR"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="issue-body">
              Description
            </label>
            <textarea
              id="issue-body"
              rows={5}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Décrivez le problème rencontré, les valeurs utilisées, le résultat attendu…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <p className="text-xs text-gray-400">
            Le formulaire s'ouvrira sur GitHub — vous devrez être connecté pour soumettre.
          </p>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-4 py-2 text-sm rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Ouvrir sur GitHub
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="max-w-3xl">

      {/* Banner avertissement */}
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-800 mb-1">
            Outils personnels — à utiliser avec précaution
          </p>
          <p className="text-sm text-amber-700 leading-relaxed">
            Ces outils sont développés à titre personnel et ne constituent pas un avis professionnel certifié.
            Les résultats peuvent contenir des erreurs — vérifiez toujours les calculs avant tout usage en projet.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex-shrink-0 self-start sm:self-center inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-300 bg-white text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors whitespace-nowrap"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" className="text-amber-600">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          Signaler un problème
        </button>
      </div>

      <h2 className="text-2xl font-bold text-gray-800 mb-1">Bienvenue</h2>
      <p className="text-gray-500 mb-8">
        Sélectionnez un outil dans le menu ou ci-dessous.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tools.map((tool) => (
          <Link
            key={tool.path}
            to={tool.path}
            className="block p-5 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-brand-500 transition-all group"
          >
            <div className="text-3xl mb-3">{tool.icon}</div>
            <h3 className="font-semibold text-gray-800 group-hover:text-brand-600 mb-1">
              {tool.label}
            </h3>
            <p className="text-sm text-gray-500">{tool.description}</p>
          </Link>
        ))}
      </div>

      {modalOpen && <IssueModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}
