import { useState, useEffect } from 'react'
import App from './App.jsx'
import { MafiaApp } from './mafia/MafiaApp.jsx'

export default function RootApp() {
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const gameParam = params.get('game')
      if (gameParam === 'mafia') return 'mafia'
      if (gameParam === 'imposter') return 'imposter'
    } catch {
      // ignore
    }
    return localStorage.getItem('active_party_game') || 'imposter'
  })

  useEffect(() => {
    try {
      localStorage.setItem('active_party_game', activeTab)
      const url = new URL(window.location.href)
      url.searchParams.set('game', activeTab)
      window.history.replaceState({}, '', url.toString())
    } catch {
      // ignore
    }
  }, [activeTab])

  return (
    <div className="relative min-h-screen">
      {/* Middle Top Tab Switcher */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
        <div className="bg-stone-900/80 backdrop-blur-md border border-white/15 p-1 rounded-full shadow-2xl flex items-center gap-1">
          <button
            onClick={() => setActiveTab('imposter')}
            className={`px-4 py-1.5 rounded-full text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === 'imposter'
                ? 'bg-gradient-to-r from-violet-600 to-purple-700 text-white shadow-lg shadow-purple-900/50'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <span>🕵️</span>
            <span>Imposter</span>
          </button>

          <button
            onClick={() => setActiveTab('mafia')}
            className={`px-4 py-1.5 rounded-full text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === 'mafia'
                ? 'bg-gradient-to-r from-red-600 via-rose-600 to-purple-600 text-white shadow-lg shadow-red-900/50'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <span>🎭</span>
            <span>Mafia</span>
            <span className="px-1.5 py-0.2 rounded-full bg-red-500/30 text-[9px] uppercase font-bold text-red-200 ml-0.5">
              New
            </span>
          </button>
        </div>
      </div>

      {/* Render Selected Game */}
      <div className="pt-12">
        {activeTab === 'imposter' ? <App /> : <MafiaApp />}
      </div>
    </div>
  )
}
