import { useState } from 'react'

export default function VotingScreen({ players = [], numImposters = 1, onVote }) {
  const [selectedPlayers, setSelectedPlayers] = useState([])
  const [showConfirm, setShowConfirm] = useState(false)

  const numToSelect = Math.min(
    Math.max(1, numImposters),
    Math.max(1, players.length - 1)
  )

  const handleToggle = (player) => {
    setSelectedPlayers((prev) => {
      const exists = prev.some((p) => p.name === player.name)
      if (exists) {
        return prev.filter((p) => p.name !== player.name)
      }
      if (numToSelect === 1) {
        return [player]
      }
      if (prev.length < numToSelect) {
        return [...prev, player]
      }
      // Replace oldest
      return [...prev.slice(1), player]
    })
  }

  const isReady = selectedPlayers.length === numToSelect

  const confirmVote = () => {
    if (!isReady) return
    onVote(numToSelect === 1 ? selectedPlayers[0] : selectedPlayers)
  }

  return (
    <div className="flex flex-col min-h-dvh px-5 py-8 relative">
      <div className="bg-glow-purple top-1/3 left-0 opacity-20" />

      <div className="relative z-10 w-full max-w-md mx-auto flex-1 flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="text-center mb-6 animate-fade-in-up">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/30 to-orange-500/30 border border-amber-500/20 mb-3">
              <span className="text-3xl">🗳️</span>
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-1">Time to Vote!</h2>
            <p className="text-text-secondary text-xs max-w-xs mx-auto">
              {numToSelect > 1 ? (
                <>
                  Group discussion: You are hunting <strong className="text-amber-300">{numToSelect} Imposters</strong>! Select <strong className="text-amber-300">{numToSelect} suspects</strong> below.
                </>
              ) : (
                'Discuss among yourselves, then tap the player you suspect is the imposter.'
              )}
            </p>
          </div>

          {/* Selection indicator if 2 imposters */}
          {numToSelect > 1 && (
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Select {numToSelect} Suspects:
              </span>
              <span
                className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                  isReady
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {selectedPlayers.length} / {numToSelect} Selected
              </span>
            </div>
          )}

          {/* Voting buttons */}
          <div className="space-y-2.5 stagger-children">
            {players.map((player) => {
              const isSelected = selectedPlayers.some((p) => p.name === player.name)
              const selectionIndex = selectedPlayers.findIndex((p) => p.name === player.name) + 1

              return (
                <button
                  key={player.name}
                  onClick={() => handleToggle(player)}
                  className={`
                    w-full p-4 rounded-xl border transition-all duration-200 flex items-center justify-between text-left
                    active:scale-[0.98]
                    ${
                      isSelected
                        ? 'bg-purple-600/25 border-purple-400 ring-2 ring-purple-500/40 shadow-lg scale-[1.01]'
                        : 'glass-card-subtle hover:bg-bg-card-hover hover:border-purple-500/20'
                    }
                  `}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/15 flex items-center justify-center text-lg font-bold text-purple-300 shrink-0">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-text-primary font-bold text-base truncate">{player.name}</p>
                      <p className="text-text-muted text-xs">
                        {isSelected
                          ? numToSelect > 1
                            ? `Selected Suspect #${selectionIndex}`
                            : 'Selected candidate'
                          : 'Tap to select'}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <div
                      className={`w-7 h-7 rounded-full border flex items-center justify-center font-bold text-xs transition-all ${
                        isSelected
                          ? 'bg-purple-500 border-purple-400 text-white shadow-md shadow-purple-950/60'
                          : 'border-border bg-bg-card text-transparent'
                      }`}
                    >
                      {numToSelect > 1 && isSelected ? selectionIndex : '✓'}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-6 pb-2">
          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={!isReady}
              className={`w-full py-4 text-base tracking-wide rounded-xl font-bold transition-all duration-200 ${
                isReady
                  ? 'btn-danger animate-pulse-glow shadow-lg shadow-red-950/50 hover:brightness-110 active:scale-[0.98]'
                  : 'bg-bg-card text-text-muted border border-border cursor-not-allowed'
              }`}
            >
              {isReady
                ? numToSelect > 1
                  ? `Vote to Eliminate ${selectedPlayers.map((p) => p.name).join(' & ')} 🗳️`
                  : `Vote to Eliminate ${selectedPlayers[0].name} 🗳️`
                : numToSelect > 1
                ? `Select ${numToSelect - selectedPlayers.length} more suspect${
                    numToSelect - selectedPlayers.length > 1 ? 's' : ''
                  }`
                : 'Select an imposter above'}
            </button>
          ) : (
            <div className="glass-card p-5 animate-scale-in border border-red-500/30">
              <p className="text-center text-text-secondary text-sm mb-4">
                Are you sure you want to eliminate{' '}
                <span className="text-red-400 font-bold">
                  {selectedPlayers.map((p) => p.name).join(' and ')}
                </span>
                ?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-bg-card-hover border border-border text-text-secondary font-medium hover:bg-bg-card transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmVote}
                  className="flex-1 btn-danger py-3 text-center font-bold shadow-lg shadow-red-950/50"
                >
                  🗳️ Confirm Elimination
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
