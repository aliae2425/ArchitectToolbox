import { NavLink } from 'react-router-dom'

const tools = [
  {
    category: 'Accessibilité',
    items: [
      { label: 'Rampes PMR', path: '/rampe-pmr', icon: '♿' },
    ],
  },
  {
    category: 'Sécurité incendie',
    items: [
      { label: 'Capacitaire ERP', path: '/capacitaire-erp', icon: '🏢' },
    ],
  },
]

export default function Sidebar({ onClose }) {
  return (
    <div className="w-64 flex-shrink-0 bg-brand-900 text-white flex flex-col h-full">
      <div className="px-6 py-5 border-b border-brand-700 flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-wide uppercase leading-tight">
          Architect<br />
          <span className="text-brand-100 font-light">Toolbox</span>
        </h1>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden text-brand-100/60 hover:text-white p-1 -mr-1"
            aria-label="Fermer le menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
            </svg>
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {tools.map((group) => (
          <div key={group.category} className="mb-4">
            <p className="px-6 mb-1 text-xs font-semibold uppercase tracking-widest text-brand-100/60">
              {group.category}
            </p>
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-6 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-brand-500 text-white font-medium'
                      : 'text-brand-100 hover:bg-brand-700'
                  }`
                }
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="px-6 py-4 border-t border-brand-700 text-xs text-brand-100/40">
        v0.1.0
      </div>
    </div>
  )
}
