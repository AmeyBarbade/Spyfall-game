export default function ResultScreen({
  votedPlayer,
  secretWord,
  imposters = [],
  voteDetails = null,
  isOnline = false,
  isHost = true,
  onNextRound,
  onBackToDashboard,
}) {
  const eliminatedList = Array.isArray(votedPlayer)
    ? votedPlayer
    : votedPlayer
    ? [votedPlayer]
    : []

  const caughtImposters = eliminatedList.filter((p) => p.isImposter)
  const caughtCount = caughtImposters.length
  const totalImposters = imposters.length
  const imposterNames = imposters.map((p) => p.name)

  const isFullVictory = totalImposters > 0 && caughtCount === totalImposters
  const isPartialVictory = caughtCount > 0 && caughtCount < totalImposters
  const isImpostersWin = caughtCount === 0

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-5 py-8 relative overflow-hidden">
      {/* Background effects */}
      {isFullVictory || isPartialVictory ? (
        <div
          className="bg-glow-purple -top-32 left-1/2 -translate-x-1/2 opacity-40"
          style={{
            background:
              'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
          }}
        />
      ) : (
        <div
          className="bg-glow-purple -top-32 left-1/2 -translate-x-1/2 opacity-40"
          style={{
            background:
              'radial-gradient(circle, rgba(239, 68, 68, 0.15) 0%, transparent 70%)',
          }}
        />
      )}

      <div className="relative z-10 w-full max-w-md text-center">
        {/* Result Icon */}
        <div className="animate-bounce-in mb-6">
          <div
            className={`
            w-28 h-28 mx-auto rounded-3xl flex items-center justify-center
            ${
              isFullVictory
                ? 'bg-gradient-to-br from-emerald-600/30 to-teal-600/30 border-2 border-emerald-500/30 shadow-2xl shadow-emerald-900/30'
                : isPartialVictory
                ? 'bg-gradient-to-br from-amber-600/30 to-purple-600/30 border-2 border-amber-500/30 shadow-2xl shadow-amber-900/30'
                : 'bg-gradient-to-br from-red-600/30 to-orange-600/30 border-2 border-red-500/30 shadow-2xl shadow-red-900/30'
            }
          `}
          >
            <span className="text-6xl">
              {isFullVictory ? '🎉' : isPartialVictory ? '⚖️' : '😈'}
            </span>
          </div>
        </div>

        {/* Result Text */}
        <div
          className="animate-fade-in-up space-y-3 mb-6"
          style={{ animationDelay: '0.2s' }}
        >
          {isFullVictory ? (
            <>
              <h2 className="text-3xl font-black text-emerald-400">
                Civilians Win! 🎊
              </h2>
              <p className="text-text-secondary text-sm">
                {eliminatedList.length > 1
                  ? 'All imposters were identified and successfully eliminated!'
                  : `By majority vote${voteDetails?.isTieBreaker ? ' in tie-breaker' : ''}, ${eliminatedList[0]?.name} was eliminated and was an Imposter!`}
              </p>
            </>
          ) : isPartialVictory ? (
            <>
              <h2 className="text-3xl font-black text-amber-400">
                Split Verdict! 🎭
              </h2>
              <p className="text-text-secondary text-sm">
                Civilians caught {caughtCount} of {totalImposters} imposters!
              </p>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-black text-red-400">
                Imposters Win! 😈
              </h2>
              <p className="text-text-secondary text-sm">
                {eliminatedList.length > 1
                  ? 'The eliminated players were innocent Civilians!'
                  : `By majority vote${voteDetails?.isTieBreaker ? ' in tie-breaker' : ''}, ${eliminatedList[0]?.name} was eliminated, but was an innocent Civilian!`}
              </p>
            </>
          )}
        </div>

        {/* Eliminated Players breakdown cards */}
        {eliminatedList.length > 0 && (
          <div className="glass-card p-4 mb-4 border border-purple-500/25 space-y-2 text-left">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
              Eliminated by Vote:
            </span>
            <div className="space-y-2">
              {eliminatedList.map((p) => (
                <div
                  key={p.name}
                  className={`p-3 rounded-xl flex items-center justify-between border transition-all ${
                    p.isImposter
                      ? 'bg-red-500/15 border-red-500/30 text-red-300'
                      : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{p.isImposter ? '🎭' : '😇'}</span>
                    <span className="font-extrabold text-base text-white">{p.name}</span>
                  </div>
                  <span
                    className={`text-[11px] uppercase font-black px-2.5 py-1 rounded-md border ${
                      p.isImposter
                        ? 'bg-red-500/20 border-red-500/40 text-red-300'
                        : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    }`}
                  >
                    {p.isImposter ? 'Imposter' : 'Civilian'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Game Details Card */}
        <div
          className="glass-card p-6 space-y-4 animate-fade-in-up mb-6 border border-purple-500/30"
          style={{ animationDelay: '0.4s' }}
        >
          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-text-muted text-sm">Secret Word</span>
            <span className="text-purple-400 font-bold text-lg font-mono">
              {secretWord}
            </span>
          </div>
          <div>
            <p className="text-text-muted text-sm mb-2">
              {imposters.length === 1
                ? 'The Imposter was'
                : 'The Imposters were'}
              :
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {imposterNames.map((name) => (
                <span
                  key={name}
                  className="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/25 text-red-400 text-sm font-semibold"
                >
                  🎭 {name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div
          className="space-y-3 animate-fade-in-up"
          style={{ animationDelay: '0.6s' }}
        >
          {!isOnline || isHost ? (
            <button
              onClick={onNextRound}
              className="btn-primary w-full py-4 text-lg font-bold shadow-lg shadow-purple-950/40"
            >
              🔄 Next Round
            </button>
          ) : (
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 text-center animate-pulse">
              <span className="text-purple-300 font-semibold text-sm flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                Waiting for Host to start the next round...
              </span>
            </div>
          )}

          <button
            onClick={onBackToDashboard}
            className="w-full py-3 rounded-xl text-sm font-medium text-text-muted hover:text-purple-400 border border-border hover:border-purple-500/30 transition-all"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
