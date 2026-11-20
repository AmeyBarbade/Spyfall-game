import { useState } from 'react'
import JoinModal from './JoinModal'

export default function DashboardScreen({
  games,
  onCreateNew,
  onCreateOnlineGame,
  onJoinOnlineGame,
  onContinueGame,
  onDeleteGame,
  initialJoinCode = '',
}) {
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [showJoinModal, setShowJoinModal] = useState(!!initialJoinCode)

  const sortedGames = [...games].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  )

  const formatDate = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="flex flex-col min-h-dvh px-5 py-8 relative">
      {/* Background glows */}
      <div className="bg-glow-purple -top-48 -left-32 opacity-40" />
      <div className="bg-glow-purple -bottom-32 -right-32 opacity-20" />

      <div className="relative z-10 w-full max-w-md mx-auto flex-1 flex flex-col">
        {/* Hero */}
        <div className="text-center pt-8 pb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 mb-5 shadow-lg shadow-purple-900/40">
            <span className="text-4xl">🕵️</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-1">
            <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-blue-400 bg-clip-text text-transparent">
              IMPOSTER
            </span>
          </h1>
          <p className="text-text-secondary text-sm tracking-widest uppercase font-medium">
            The Party Game
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-purple-500/15 border border-purple-500/30 shadow-md">
            <span className="text-xs text-text-secondary">Created by</span>
            <span className="text-sm font-black tracking-wide text-white drop-shadow">
              Amey Barbade
            </span>
          </div>
        </div>

        {/* Game Mode Selection Buttons */}
        <div className="space-y-3 mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {/* Create Local Game */}
          <button
            onClick={onCreateNew}
            className="w-full py-4 px-5 rounded-2xl font-semibold text-base tracking-wide bg-gradient-to-r from-purple-600 via-violet-600 to-purple-700 text-white shadow-lg shadow-purple-900/30 hover:shadow-purple-900/50 hover:from-purple-500 hover:to-violet-500 transition-all duration-200 active:scale-[0.98] flex items-center justify-between group border border-purple-500/30"
          >
            <div className="flex items-center gap-3.5 text-left">
              <span className="text-2xl">📱</span>
              <div>
                <div className="font-bold text-white text-base leading-tight">
                  ✨ Create New Game
                </div>
                <div className="text-purple-200/70 text-xs font-normal">
                  Pass & play locally on this device
                </div>
              </div>
            </div>
            <span className="text-purple-300 text-lg group-hover:translate-x-1 transition-transform">
              →
            </span>
          </button>

          {/* Create Online Multiplayer Game */}
          <button
            onClick={onCreateOnlineGame}
            className="w-full py-4 px-5 rounded-2xl font-semibold text-base tracking-wide bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-lg shadow-blue-900/40 hover:shadow-cyan-900/50 hover:from-blue-500 hover:to-cyan-500 transition-all duration-200 active:scale-[0.98] flex items-center justify-between group relative overflow-hidden border border-cyan-400/40"
          >
            <div className="flex items-center gap-3.5 text-left">
              <span className="text-2xl">🌐</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-base leading-tight">
                    Create Online Multiplayer Game
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-400/20 text-cyan-200 border border-cyan-400/40">
                    Online
                  </span>
                </div>
                <div className="text-cyan-100/70 text-xs font-normal">
                  Host room with custom code & play on separate phones
                </div>
              </div>
            </div>
            <span className="text-cyan-200 text-lg group-hover:translate-x-1 transition-transform">
              →
            </span>
          </button>

          {/* Join Online Lobby with Code */}
          <button
            onClick={() => setShowJoinModal(true)}
            className="w-full py-3 px-4 rounded-xl font-medium text-xs text-text-secondary hover:text-white bg-bg-card/60 hover:bg-bg-card-hover border border-border hover:border-purple-500/40 transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <span>🔑</span>
            <span>Have a room code? <strong className="text-purple-300">Join Game Lobby</strong></span>
          </button>
        </div>

        {/* Saved Games */}
        <div className="flex-1">
          <div
            className="flex items-center justify-between mb-4 animate-fade-in"
            style={{ animationDelay: '0.2s' }}
          >
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
              Your Games
            </h2>
            {sortedGames.length > 0 && (
              <span className="text-xs text-text-muted">
                {sortedGames.length} saved
              </span>
            )}
          </div>

          {sortedGames.length === 0 ? (
            <div
              className="glass-card-subtle p-8 text-center animate-fade-in"
              style={{ animationDelay: '0.3s' }}
            >
              <span className="text-4xl mb-3 block">🎮</span>
              <p className="text-text-secondary text-sm">
                No games yet. Create your first game to get started!
              </p>
            </div>
          ) : (
            <div className="space-y-3 stagger-children">
              {sortedGames.map((game) => (
                <div key={game.id} className="glass-card p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-text-primary truncate">
                          🎮 {game.gameName}
                        </h3>
                        {game.isOnline && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            {game.roomCode || 'Online'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        Created {formatDate(game.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-2 mb-3 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium">
                      👥 {game.players.length} players
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
                      🎭 {game.numImposters}{' '}
                      {game.numImposters === 1 ? 'imposter' : 'imposters'}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
                      🔄 {game.usedWords.length}{' '}
                      {game.usedWords.length === 1 ? 'round' : 'rounds'} played
                    </span>
                  </div>

                  {/* Player names preview */}
                  <p className="text-xs text-text-muted mb-4 truncate">
                    {game.players.join(', ')}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => onContinueGame(game)}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600/80 to-violet-600/80 text-white text-sm font-semibold hover:from-purple-500 hover:to-violet-500 transition-all active:scale-[0.97]"
                    >
                      ▶ Continue
                    </button>

                    {confirmDelete === game.id ? (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            onDeleteGame(game.id)
                            setConfirmDelete(null)
                          }}
                          className="px-3 py-2.5 rounded-xl bg-red-600/80 text-white text-xs font-semibold hover:bg-red-500 transition-all"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-3 py-2.5 rounded-xl bg-bg-card-hover border border-border text-text-muted text-xs font-medium hover:text-text-secondary transition-all"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(game.id)}
                        className="px-3 py-2.5 rounded-xl bg-bg-card-hover border border-border text-text-muted text-sm hover:text-red-400 hover:border-red-500/30 transition-all"
                        title="Delete game"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Join Online Game Modal */}
      <JoinModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        initialRoomCode={initialJoinCode}
        onJoin={(code, name) => {
          setShowJoinModal(false)
          onJoinOnlineGame(code, name)
        }}
      />
    </div>
  )
}
