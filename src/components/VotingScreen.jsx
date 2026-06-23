import { useState } from 'react'

export default function VotingScreen({ players, onVote }) {
  const [showConfirm, setShowConfirm] = useState(null)

  const handleVote = (player) => {
    setShowConfirm(player)
  }

  const confirmVote = () => {
    if (showConfirm) {
      onVote(showConfirm)
    }
  }

  return (
    <div className="flex flex-col min-h-dvh px-5 py-8 relative">
      <div className="bg-glow-purple top-1/3 left-0 opacity-20" />

      <div className="relative z-10 w-full max-w-md mx-auto flex-1 flex flex-col">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/30 to-orange-500/30 border border-amber-500/20 mb-4">
            <span className="text-3xl">🗳️</span>
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Time to Vote!</h2>
          <p className="text-text-secondary text-sm max-w-xs mx-auto">
            Discuss among yourselves, then vote for who you think is the imposter
          </p>
        </div>

        {/* Voting buttons */}
        <div className="flex-1 space-y-2.5 stagger-children">
          {players.map((player, i) => (
            <button
              key={i}
              onClick={() => handleVote(player)}
              className={`
                w-full p-4 rounded-xl border transition-all duration-200 flex items-center gap-4 text-left
                active:scale-[0.98]
                ${showConfirm?.name === player.name
                  ? 'bg-purple-600/20 border-purple-500/40'
                  : 'glass-card-subtle hover:bg-bg-card-hover hover:border-purple-500/20'
                }
              `}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/15 flex items-center justify-center text-lg font-bold text-purple-300 shrink-0">
                {player.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-text-primary font-semibold">{player.name}</p>
                <p className="text-text-muted text-xs">Tap to vote</p>
              </div>
              <div className="text-text-muted text-xl">
                {showConfirm?.name === player.name ? '🎯' : '👆'}
              </div>
            </button>
          ))}
        </div>

        {/* Confirm Modal */}
        {showConfirm && (
          <div className="mt-6 glass-card p-5 animate-scale-in shrink-0">
            <p className="text-center text-text-secondary text-sm mb-4">
              Vote to eliminate <span className="text-purple-400 font-bold">{showConfirm.name}</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(null)}
                className="flex-1 py-3 rounded-xl bg-bg-card-hover border border-border text-text-secondary font-medium hover:bg-bg-card transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmVote}
                className="flex-1 btn-danger py-3 text-center"
              >
                🗳️ Confirm Vote
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
