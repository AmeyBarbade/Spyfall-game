import { useState } from 'react'

export default function SetupScreen({ onNext, onBack }) {
  const [gameName, setGameName] = useState('')
  const [totalPlayers, setTotalPlayers] = useState(4)
  const [numImposters, setNumImposters] = useState(1)
  const [error, setError] = useState('')

  const handleNext = () => {
    if (!gameName.trim()) {
      setError('Give your game a name')
      return
    }
    if (totalPlayers < 3) {
      setError('Minimum 3 players required')
      return
    }
    if (numImposters >= totalPlayers) {
      setError('Imposters must be less than total players')
      return
    }
    if (numImposters < 1) {
      setError('At least 1 imposter is required')
      return
    }
    setError('')
    onNext(gameName.trim(), totalPlayers, numImposters)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-5 py-8 relative">
      {/* Background decoration */}
      <div className="bg-glow-purple -top-48 -left-48 opacity-50" />
      <div className="bg-glow-purple -bottom-48 -right-48 opacity-30" />

      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        {/* Back button */}
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-purple-400 transition-colors mb-6"
          >
            <span>←</span> Back to Dashboard
          </button>
        )}

        {/* Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 mb-4 shadow-lg shadow-purple-900/40">
            <span className="text-3xl">🎮</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">Create New Game</h1>
          <p className="text-text-secondary text-sm">Set up your game session</p>
        </div>

        {/* Setup Card */}
        <div className="glass-card p-6 space-y-6">
          {/* Game Name */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2 tracking-wide">
              🏷️ Game Name
            </label>
            <input
              type="text"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              placeholder="e.g. Saturday Night Session"
              className="input-field text-base"
              autoComplete="off"
              autoFocus
            />
          </div>

          {/* Total Players */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2 tracking-wide">
              👥 Total Players
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setTotalPlayers(Math.max(3, totalPlayers - 1))}
                className="w-11 h-11 rounded-xl bg-bg-card-hover border border-border flex items-center justify-center text-lg font-bold text-text-primary hover:bg-accent-purple/20 hover:border-accent-purple/40 transition-all active:scale-95"
              >
                −
              </button>
              <input
                type="number"
                value={totalPlayers}
                onChange={(e) => setTotalPlayers(Math.max(3, parseInt(e.target.value) || 3))}
                className="input-field text-center text-xl font-bold flex-1"
                min={3}
              />
              <button
                onClick={() => setTotalPlayers(totalPlayers + 1)}
                className="w-11 h-11 rounded-xl bg-bg-card-hover border border-border flex items-center justify-center text-lg font-bold text-text-primary hover:bg-accent-purple/20 hover:border-accent-purple/40 transition-all active:scale-95"
              >
                +
              </button>
            </div>
          </div>

          {/* Number of Imposters */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2 tracking-wide">
              🎭 Number of Imposters
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setNumImposters(Math.max(1, numImposters - 1))}
                className="w-11 h-11 rounded-xl bg-bg-card-hover border border-border flex items-center justify-center text-lg font-bold text-text-primary hover:bg-accent-purple/20 hover:border-accent-purple/40 transition-all active:scale-95"
              >
                −
              </button>
              <input
                type="number"
                value={numImposters}
                onChange={(e) => setNumImposters(Math.max(1, parseInt(e.target.value) || 1))}
                className="input-field text-center text-xl font-bold flex-1"
                min={1}
                max={totalPlayers - 1}
              />
              <button
                onClick={() => setNumImposters(Math.min(totalPlayers - 1, numImposters + 1))}
                className="w-11 h-11 rounded-xl bg-bg-card-hover border border-border flex items-center justify-center text-lg font-bold text-text-primary hover:bg-accent-purple/20 hover:border-accent-purple/40 transition-all active:scale-95"
              >
                +
              </button>
            </div>
          </div>

          {/* Info badges */}
          <div className="flex gap-2 flex-wrap">
            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              {totalPlayers - numImposters} Civilians
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
              {numImposters} {numImposters === 1 ? 'Imposter' : 'Imposters'}
            </span>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20 animate-scale-in">
              ⚠️ {error}
            </p>
          )}
        </div>

        {/* Next Button */}
        <button
          onClick={handleNext}
          className="btn-primary w-full mt-6 py-4 text-lg tracking-wide animate-pulse-glow"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
