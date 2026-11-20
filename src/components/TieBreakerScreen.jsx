import { useState } from 'react'

export default function TieBreakerScreen({
  tiedCandidates = [],
  allPlayers = [],
  myPlayerName = '',
  roomCode = '',
  tieVotesMap = {},
  isHost = false,
  roundNumber = 1,
  onCastTieVote,
  onResolveTieBreaker,
  onResetTieBreaker,
}) {
  const [justResetNotice, setJustResetNotice] = useState(false)

  // My current selected vote
  const myCurrentVote = tieVotesMap[myPlayerName]

  const handleVoteCandidate = (candidateName) => {
    onCastTieVote(candidateName)
  }

  // Tally voters per candidate
  const votersPerCandidate = {}
  tiedCandidates.forEach((name) => {
    votersPerCandidate[name] = []
  })

  Object.entries(tieVotesMap).forEach(([voter, target]) => {
    if (votersPerCandidate[target]) {
      votersPerCandidate[target].push(voter)
    }
  })

  const totalPlayersCount = allPlayers.length
  const votesCastCount = Object.keys(tieVotesMap).length
  const allVoted = votesCastCount >= totalPlayersCount

  // Check if Host wants to evaluate winner or reset
  const handleHostEvaluate = () => {
    const counts = {}
    tiedCandidates.forEach((c) => {
      counts[c] = votersPerCandidate[c]?.length || 0
    })

    const maxVotes = Math.max(...Object.values(counts))
    const topCandidates = tiedCandidates.filter((c) => counts[c] === maxVotes)

    if (topCandidates.length === 1 && maxVotes > 0) {
      // We have a clear winner!
      const eliminatedName = topCandidates[0]
      const targetPlayer = allPlayers.find((p) => p.name === eliminatedName)
      onResolveTieBreaker(targetPlayer, maxVotes)
    } else {
      // Still tied! Reset for revote
      setJustResetNotice(true)
      setTimeout(() => setJustResetNotice(false), 3000)
      onResetTieBreaker(topCandidates)
    }
  }

  return (
    <div className="flex flex-col min-h-dvh px-5 py-8 relative">
      <div className="bg-glow-purple top-1/4 left-0 opacity-30" />
      <div className="bg-glow-purple bottom-1/4 right-0 opacity-25" />

      <div className="relative z-10 w-full max-w-md mx-auto flex-1 flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="text-center mb-6 animate-fade-in-up">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/40 mb-3 inline-block animate-pulse">
              ⚠️ TIE DETECTED • RUNOFF #{roundNumber}
            </span>
            <h1 className="text-3xl font-black text-text-primary tracking-tight mb-1">
              Vote Tie-Breaker!
            </h1>
            <p className="text-text-secondary text-xs max-w-xs mx-auto leading-relaxed">
              Equal votes detected! Vote between the tied players below to decide who is eliminated.
            </p>
          </div>

          {/* Reset alert banner */}
          {justResetNotice && (
            <div className="mb-4 p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs text-center font-bold animate-bounce-in">
              ⚠️ Votes were equal again! Votes cleared for a revote.
            </div>
          )}

          {/* Progress Card */}
          <div className="glass-card p-4 mb-5 border border-purple-500/30">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-text-secondary">
                Tie-Breaker Votes: <strong className="text-emerald-400">{votesCastCount}</strong> / {totalPlayersCount}
              </span>
              <span className="text-[11px] text-purple-300 font-mono font-bold">
                {Math.round((votesCastCount / totalPlayersCount) * 100)}%
              </span>
            </div>
            <div className="h-1.5 bg-bg-card-hover rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-purple-500 to-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${(votesCastCount / totalPlayersCount) * 100}%` }}
              />
            </div>
          </div>

          {/* Candidates Buttons with LIVE VOTER NAMES */}
          <div className="space-y-4">
            {tiedCandidates.map((candidateName) => {
              const voters = votersPerCandidate[candidateName] || []
              const isMyVote = myCurrentVote === candidateName
              const voteCount = voters.length

              return (
                <div
                  key={candidateName}
                  onClick={() => handleVoteCandidate(candidateName)}
                  className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden ${
                    isMyVote
                      ? 'bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-purple-400 shadow-xl shadow-purple-950/60 ring-2 ring-purple-500/40'
                      : 'glass-card hover:bg-bg-card-hover hover:border-purple-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600/30 to-blue-600/30 border border-purple-500/30 flex items-center justify-center text-xl font-bold text-purple-200">
                        {candidateName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-white flex items-center gap-2">
                          {candidateName}
                          {candidateName.trim().toLowerCase() === myPlayerName.trim().toLowerCase() && (
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                              You
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-text-muted">
                          {isMyVote ? 'Your current vote ✓ (Tap other to change)' : 'Tap to vote for this player'}
                        </p>
                      </div>
                    </div>

                    {/* Vote Count Badge */}
                    <div className="text-right">
                      <span className="text-2xl font-black text-amber-400 font-mono">
                        {voteCount}
                      </span>
                      <span className="text-[10px] text-text-muted block uppercase font-bold tracking-wider">
                        {voteCount === 1 ? 'Vote' : 'Votes'}
                      </span>
                    </div>
                  </div>

                  {/* LIVE VOTER NAMES ON THIS BUTTON */}
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-text-muted font-semibold mr-1">
                        Voted by:
                      </span>
                      {voters.length === 0 ? (
                        <span className="text-[11px] text-text-muted/60 italic">
                          No votes yet...
                        </span>
                      ) : (
                        voters.map((voterName) => (
                          <span
                            key={voterName}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all animate-scale-in ${
                              voterName.trim().toLowerCase() === myPlayerName.trim().toLowerCase()
                                ? 'bg-purple-500 text-white shadow-purple-900/50'
                                : 'bg-purple-500/20 text-purple-200 border border-purple-500/30'
                            }`}
                          >
                            <span>👤</span>
                            <span>{voterName}</span>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-6 pb-2 space-y-3">
          {/* Status message */}
          {myCurrentVote ? (
            <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/25 text-center text-xs text-purple-300 font-medium animate-fade-in">
              You voted for <strong className="text-white">{myCurrentVote}</strong>. You can change your vote anytime before the round finishes.
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-center text-xs text-amber-300 font-medium animate-pulse">
              👆 Tap on one of the tied players above to cast your vote!
            </div>
          )}

          {/* Host evaluation / finish button */}
          {isHost && (
            <button
              onClick={handleHostEvaluate}
              disabled={votesCastCount === 0}
              className={`w-full py-4 text-base tracking-wide rounded-xl font-bold transition-all duration-200 ${
                allVoted
                  ? 'btn-success animate-pulse-glow shadow-lg shadow-emerald-950/50 hover:brightness-110 active:scale-[0.98]'
                  : votesCastCount > 0
                  ? 'btn-primary'
                  : 'bg-bg-card text-text-muted border border-border cursor-not-allowed'
              }`}
            >
              {allVoted
                ? 'Check Majority & Finalize Result 🎯'
                : `Host: Finalize Votes (${votesCastCount}/${totalPlayersCount}) →`}
            </button>
          )}

          <p className="text-center text-[11px] text-text-muted">
            Tie-Breaker • The Imposter Party Game
          </p>
        </div>
      </div>
    </div>
  )
}
