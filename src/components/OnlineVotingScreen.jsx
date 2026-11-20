import { useState, useEffect } from 'react'

export default function OnlineVotingScreen({
  players = [],
  myPlayerName = '',
  numImposters = 1,
  isHost = false,
  roomCode = '',
  votesMap = {},
  onCastVote,
  onTallyVotes,
}) {
  const [selectedCandidates, setSelectedCandidates] = useState([])
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [showForceConfirm, setShowForceConfirm] = useState(false)

  // Filter out the player themselves so players CANNOT vote for themselves
  const votingCandidates = players.filter(
    (p) => p.name.trim().toLowerCase() !== myPlayerName.trim().toLowerCase()
  )

  const numToSelect = Math.min(
    Math.max(1, numImposters),
    Math.max(1, votingCandidates.length)
  )

  const myVote = votesMap[myPlayerName]

  useEffect(() => {
    if (myVote) {
      setHasSubmitted(true)
      const normalized = Array.isArray(myVote) ? myVote : [myVote]
      setSelectedCandidates(normalized)
    }
  }, [myVote])

  const handleToggleCandidate = (candidateName) => {
    if (hasSubmitted) return

    setSelectedCandidates((prev) => {
      if (prev.includes(candidateName)) {
        return prev.filter((name) => name !== candidateName)
      }
      if (numToSelect === 1) {
        return [candidateName]
      }
      if (prev.length < numToSelect) {
        return [...prev, candidateName]
      }
      // Replace oldest selection
      return [...prev.slice(1), candidateName]
    })
  }

  const handleSubmitVote = () => {
    if (selectedCandidates.length !== numToSelect || hasSubmitted) return
    setHasSubmitted(true)
    onCastVote(numToSelect === 1 ? selectedCandidates[0] : selectedCandidates)
  }

  const totalPlayers = players.length
  const votesSubmittedCount = Object.keys(votesMap).length
  const allVoted = totalPlayers > 1 && votesSubmittedCount >= totalPlayers
  const isReadyToSubmit = selectedCandidates.length === numToSelect

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
              {numToSelect > 1 ? (
                <>
                  There are <strong className="text-amber-300 font-bold">{numToSelect} imposters</strong>! Select <strong className="text-amber-300 font-bold">{numToSelect} different players</strong> to eliminate.
                </>
              ) : (
                'Discuss with other players, then cast your secret vote to eliminate the imposter.'
              )}
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

            {/* Voter statuses chips for all room members */}
            <div className="mt-3 pt-3 border-t border-border/40 flex flex-wrap gap-1.5">
              {players.map((p) => {
                const voted = !!votesMap[p.name]
                const isMe = p.name.trim().toLowerCase() === myPlayerName.trim().toLowerCase()
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
                    {isMe && <span className="text-[10px] opacity-75 font-mono">(You)</span>}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Selection counter badge if selecting multiple */}
          {numToSelect > 1 && (
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Select {numToSelect} Suspects:
              </span>
              <span
                className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                  isReadyToSubmit
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {selectedCandidates.length} / {numToSelect} Selected
              </span>
            </div>
          )}

          {/* Voting candidates list (EXCLUDES SELF) */}
          <div className="space-y-2.5">
            {votingCandidates.map((player, i) => {
              const isSelected = selectedCandidates.includes(player.name)
              const selectionIndex = selectedCandidates.indexOf(player.name) + 1

              return (
                <button
                  key={player.name}
                  type="button"
                  onClick={() => handleToggleCandidate(player.name)}
                  disabled={hasSubmitted}
                  className={`w-full p-4 rounded-xl border transition-all duration-200 flex items-center justify-between text-left ${
                    hasSubmitted
                      ? isSelected
                        ? 'bg-gradient-to-r from-purple-900/40 to-indigo-900/30 border-purple-500/50 shadow-md ring-1 ring-purple-500/40'
                        : 'glass-card-subtle opacity-50 cursor-not-allowed'
                      : isSelected
                      ? 'bg-purple-600/25 border-purple-400 ring-2 ring-purple-500/40 shadow-lg scale-[1.01]'
                      : 'glass-card-subtle hover:bg-bg-card-hover hover:border-purple-500/30 active:scale-[0.99]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-600/30 to-blue-600/30 border border-purple-500/20 flex items-center justify-center text-lg font-bold text-purple-300 shrink-0">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-text-primary font-bold text-base truncate">{player.name}</p>
                      <p className="text-text-muted text-xs">
                        {hasSubmitted && isSelected
                          ? 'Your Vote Submitted ✓'
                          : isSelected
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

        {/* Submit or Waiting Footer */}
        <div className="pt-6 pb-2 space-y-3">
          {!hasSubmitted ? (
            <button
              onClick={handleSubmitVote}
              disabled={!isReadyToSubmit}
              className={`w-full py-4 text-base tracking-wide rounded-xl font-bold transition-all duration-200 ${
                isReadyToSubmit
                  ? 'btn-success animate-pulse-glow shadow-lg shadow-emerald-950/50 hover:brightness-110 active:scale-[0.98]'
                  : 'bg-bg-card text-text-muted border border-border cursor-not-allowed'
              }`}
            >
              {isReadyToSubmit
                ? numToSelect > 1
                  ? `Confirm Vote for ${selectedCandidates.join(' & ')} 🗳️`
                  : `Confirm Vote to Eliminate ${selectedCandidates[0]} 🗳️`
                : numToSelect > 1
                ? `Select ${numToSelect - selectedCandidates.length} more suspect${
                    numToSelect - selectedCandidates.length > 1 ? 's' : ''
                  }`
                : 'Tap a player above to vote'}
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
