import { useState } from 'react'

export default function RevealScreen({ players, secretWord, onAllRevealed }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [wordRevealed, setWordRevealed] = useState(false)

  const currentPlayer = players[currentIndex]
  const isLast = currentIndex === players.length - 1

  const handleReveal = () => {
    setWordRevealed(true)
  }

  const handleNext = () => {
    if (isLast) {
      onAllRevealed()
    } else {
      setWordRevealed(false)
      setCurrentIndex(currentIndex + 1)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-5 py-8 relative">
      <div className="bg-glow-purple -top-32 left-1/2 -translate-x-1/2 opacity-30" />

      <div className="relative z-10 w-full max-w-md">
        {/* Progress */}
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <span className="text-xs text-text-muted">Player {currentIndex + 1} of {players.length}</span>
          <div className="flex gap-1">
            {players.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i < currentIndex ? 'bg-purple-500' :
                  i === currentIndex ? 'bg-purple-400 w-6' :
                  'bg-bg-card-hover'
                }`}
              />
            ))}
          </div>
        </div>

        {!wordRevealed ? (
          /* Pass Phone Screen */
          <div className="text-center animate-fade-in-up" key={`pass-${currentIndex}`}>
            <div className="glass-card p-8 mb-6">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-purple-600/30 to-blue-600/30 border border-purple-500/20 flex items-center justify-center mb-5">
                <span className="text-4xl">📱</span>
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">
                {currentPlayer.name}'s Turn
              </h2>
              <p className="text-text-secondary text-sm">
                Pass the phone to <span className="text-purple-400 font-semibold">{currentPlayer.name}</span>
              </p>
              <div className="mt-4 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 inline-block">
                <p className="text-amber-400 text-xs">
                  ⚠️ Only {currentPlayer.name} should see the next screen
                </p>
              </div>
            </div>

            <button
              onClick={handleReveal}
              className="btn-primary w-full py-4 text-lg animate-pulse-glow"
            >
              👁️ Reveal My Word
            </button>
          </div>
        ) : (
          /* Word Revealed Screen */
          <div className="text-center animate-scale-in" key={`reveal-${currentIndex}`}>
            <div className={`glass-card p-8 mb-6 border-2 ${
              currentPlayer.isImposter
                ? 'border-red-500/30 shadow-lg shadow-red-900/20'
                : 'border-emerald-500/30 shadow-lg shadow-emerald-900/20'
            }`}>
              {currentPlayer.isImposter ? (
                <>
                  <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-red-600/30 to-orange-600/30 border border-red-500/30 flex items-center justify-center mb-5 animate-bounce-in">
                    <span className="text-5xl">🎭</span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-red-400/80 font-medium uppercase tracking-widest">Your Role</p>
                    <h2 className="text-3xl font-black text-red-400">
                      IMPOSTER
                    </h2>
                    <p className="text-text-secondary text-sm mt-3">
                      Blend in! Don't let others find you.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-emerald-600/30 to-teal-600/30 border border-emerald-500/30 flex items-center justify-center mb-5 animate-bounce-in">
                    <span className="text-5xl">✅</span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-emerald-400/80 font-medium uppercase tracking-widest">Your Word</p>
                    <h2 className="text-3xl font-black text-emerald-300">
                      {secretWord}
                    </h2>
                    <p className="text-text-secondary text-sm mt-3">
                      Describe it subtly — the imposter is watching!
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Remember warning */}
            <p className="text-text-muted text-xs mb-4">
              Memorize your role, then pass the phone
            </p>

            <button
              onClick={handleNext}
              className="btn-primary w-full py-4 text-lg"
            >
              {isLast ? '🗳️ Start Discussion' : `Next Player →`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
