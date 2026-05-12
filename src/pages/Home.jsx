import { Link } from 'react-router-dom'

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
    label: 'Capacitaire ERP',
    path: '/capacitaire-erp',
    icon: '🏢',
    description: 'Calcul de l\'effectif, de la catégorie ERP et des dégagements requis (CO 37-38).',
  },
]

export default function Home() {
  return (
    <div className="max-w-3xl">
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
    </div>
  )
}
