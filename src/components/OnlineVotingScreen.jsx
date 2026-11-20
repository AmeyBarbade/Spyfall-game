import { useState, useEffect } from 'react'

export default function OnlineVotingScreen({
  players = [],
  myPlayerName = '',
  isHost = false,
  roomCode = '',
  votesMap = {},
  onCastVote,
  onTallyVotes,
}) {
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [showForceConfirm, setShowForceConfirm] = useState(false)

  const myVote = votesMap[myPlayerName]

  useEffect(() => {
    if (myVote) {
      setHasSubmitted(true)
      setSelectedCandidate(myVote)
    }
  }, [myVote])

  const handleSelect = (player) => {
    if (hasSubmitted) return
    setSelectedCandidate(player.name)
  }

  const handleSubmitVote = () => {
    if (!selectedCandidate || hasSubmitted) return
    setHasSubmitted(true)
    onCastVote(selectedCandidate)
  }

  const totalPlayers = players.length
  const votesSubmittedCount = Object.keys(votesMap).length
  const allVoted = totalPlayers > 1 && votesSubmittedCount >= totalPlayers

  return (
    <div className="flex flex-col min-h-dvh px-5 py-8 relative">
      <div className="bg-glow-purple top-1/4 left-0 opacity-25" />
      <div className="bg-glow-purple bottom-1/4 right-0 opacity-20" />

      <div className="relative z-10 w-full max-w-md mx-auto flex-1 flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="text-center mb-6 animate-fade-in-up">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/30 to-orange-500/30 border border-amber-500/30 mb-3 shadow-lg shadow-amber-950/40">
              <span className="text-3xl">🗳️</span>
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-1">Time to Vote!</h2>
            <p className="text-text-secondary text-xs max-w-xs mx-auto">
              Discuss with other players, then cast your vote. When all players have voted, the majority vote will decide who gets eliminated!
            </p>
          </div>

          {/* Live Progress Bar */}
          <div className="glass-card p-4 mb-5 border border-purple-500/30 animate-fade-in">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-text-secondary">
                Votes Submitted:{' '}
                <strong className="text-emerald-400 font-extrabold text-sm">
                  {votesSubmittedCount}
                </strong>{' '}
                / {totalPlayers}
              </span>
              <span className="text-xs text-purple-300 font-mono font-bold">
                {totalPlayers > 0 ? Math.round((votesSubmittedCount / totalPlayers) * 100) : 0}%
              </span>
            </div>
            <div className="h-2 bg-bg-card-hover rounded-full overflow-hidden border border-border/40">
              <div
                className="h-full bg-gradient-to-r from-purple-500 via-teal-400 to-emerald-400 rounded-full transition-all duration-300"
                style={{
                  width: `${totalPlayers > 0 ? (votesSubmittedCount / totalPlayers) * 100 : 0}%`,
                }}
              />
            </div>

            {/* Voter statuses chips */}
            <div className="mt-3 pt-3 border-t border-border/40 flex flex-wrap gap-1.5">
              {players.map((p) => {
                const voted = !!votesMap[p.name]
                return (
                  <span
                    key={p.name}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                      voted
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-sm'
                        : 'bg-bg-card/50 border-border/40 text-text-muted/60'
                    }`}
                  >
                    <span>{voted ? '✓' : '⏳'}</span>
                    <span>{p.name}</span>
                  </span>
                )
              })}
            </div>
          </div>

          {/* Voting candidates list */}
          <div className="space-y-2.5">
            {players.map((player, i) => {
              const isSelected = selectedCandidate === player.name
              const isMySelf = player.name.trim().toLowerCase() === myPlayerName.trim().toLowerCase()

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(player)}
                  disabled={hasSubmitted}
                  className={`w-full p-4 rounded-xl border transition-all duration-200 flex items-center justify-between text-left ${
                    hasSubmitted
                      ? isSelected
                        ? 'bg-gradient-to-r from-purple-900/40 to-indigo-900/30 border-purple-500/50 shadow-md ring-1 ring-purple-500/40'
                        : 'glass-card-subtle opacity-50 cursor-not-allowed'
                      : isSelected
                      ? 'bg-purple-600/25 border-purple-400 ring-2 ring-purple-500/40 shadow-lg'
                      : 'glass-card-subtle hover:bg-bg-card-hover hover:border-purple-500/30 active:scale-[0.99]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-600/30 to-blue-600/30 border border-purple-500/20 flex items-center justify-center text-lg font-bold text-purple-300 shrink-0">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-text-primary font-bold text-base truncate">{player.name}</p>
                        {isMySelf && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-text-muted text-xs">
                        {hasSubmitted && isSelected ? 'Your Vote Submitted ✓' : isSelected ? 'Selected candidate' : 'Tap to select'}
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
                      ✓
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Submit or Waiting Footer */}
        <div className="pt-6 pb-2 space-y-3">
          {!hasSubmitted ? (
            <button
              onClick={handleSubmitVote}
              disabled={!selectedCandidate}
              className={`w-full py-4 text-base tracking-wide rounded-xl font-bold transition-all duration-200 ${
                selectedCandidate
                  ? 'btn-success animate-pulse-glow shadow-lg shadow-emerald-950/50 hover:brightness-110 active:scale-[0.98]'
                  : 'bg-bg-card text-text-muted border border-border cursor-not-allowed'
              }`}
            >
              {selectedCandidate ? `Confirm Vote to Eliminate ${selectedCandidate} 🗳️` : 'Tap a player above to vote'}
            </button>
          ) : (
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 text-center animate-pulse">
              <span className="text-purple-300 font-semibold text-sm flex items-center justify-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                Vote submitted! Waiting for other players ({votesSubmittedCount}/{totalPlayers})...
              </span>
            </div>
          )}

          {/* Host Fallback Tally button - only if someone left or phone disconnected */}
          {isHost && votesSubmittedCount > 1 && !allVoted && (
            <div className="pt-1">
              {!showForceConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowForceConfirm(true)}
                  className="w-full py-2.5 rounded-xl bg-bg-card-hover border border-border/80 text-xs text-text-muted hover:text-amber-300 transition-all flex items-center justify-center gap-1.5"
                >
                  <span>⚡</span>
                  <span>Player disconnected? Force tally current {votesSubmittedCount} votes</span>
                </button>
              ) : (
                <div className="glass-card p-3 text-center space-y-2 border border-amber-500/30 animate-scale-in">
                  <p className="text-xs text-amber-300 font-semibold">
                    Tally now with {votesSubmittedCount} out of {totalPlayers} votes?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowForceConfirm(false)}
                      className="flex-1 py-1.5 rounded-lg bg-bg-card-hover border border-border text-xs text-text-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForceConfirm(false)
                        onTallyVotes()
                      }}
                      className="flex-1 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
                    >
                      Yes, Tally Now
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <p className="text-center text-[11px] text-text-muted">
            Room: {roomCode} • The Imposter Party Game
          </p>
        </div>
      </div>
    </div>
  )
}
