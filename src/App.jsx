import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import RampePMR from './pages/RampePMR'
import Home from './pages/Home'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 transition-transform duration-200
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-4 px-4 py-3 border-b border-gray-200 bg-white">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500 hover:text-gray-800 p-1 -ml-1"
            aria-label="Ouvrir le menu"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor">
              <rect x="2" y="5" width="18" height="2" rx="1" />
              <rect x="2" y="10" width="18" height="2" rx="1" />
              <rect x="2" y="15" width="18" height="2" rx="1" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Architect Toolbox</span>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/rampe-pmr" element={<RampePMR />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

    </div>
  )
}
