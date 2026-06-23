export default function ResultScreen({
  votedPlayer,
  secretWord,
  imposters,
  onNextRound,
  onBackToDashboard,
}) {
  const isImposterCaught = votedPlayer.isImposter
  const imposterNames = imposters.map((p) => p.name)

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-5 py-8 relative overflow-hidden">
      {/* Background effects */}
      {isImposterCaught ? (
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
              isImposterCaught
                ? 'bg-gradient-to-br from-emerald-600/30 to-teal-600/30 border-2 border-emerald-500/30 shadow-2xl shadow-emerald-900/30'
                : 'bg-gradient-to-br from-red-600/30 to-orange-600/30 border-2 border-red-500/30 shadow-2xl shadow-red-900/30'
            }
          `}
          >
            <span className="text-6xl">
              {isImposterCaught ? '🎉' : '💀'}
            </span>
          </div>
        </div>

        {/* Result Text */}
        <div
          className="animate-fade-in-up space-y-3 mb-8"
          style={{ animationDelay: '0.2s' }}
        >
          {isImposterCaught ? (
            <>
              <h2 className="text-3xl font-black text-emerald-400">
                Civilians Win! 🎊
              </h2>
              <p className="text-text-secondary text-base">
                <span className="text-emerald-300 font-bold">
                  {votedPlayer.name}
                </span>{' '}
                was an Imposter!
              </p>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-black text-red-400">
                Imposters Win! 😈
              </h2>
              <p className="text-text-secondary text-base">
                <span className="text-red-300 font-bold">
                  {votedPlayer.name}
                </span>{' '}
                was a Civilian!
              </p>
            </>
          )}
        </div>

        {/* Game Details Card */}
        <div
          className="glass-card p-6 space-y-4 animate-fade-in-up mb-6"
          style={{ animationDelay: '0.4s' }}
        >
          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-text-muted text-sm">Secret Word</span>
            <span className="text-purple-400 font-bold text-lg">
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
          <button
            onClick={onNextRound}
            className="btn-primary w-full py-4 text-lg"
          >
            🔄 Next Round
          </button>
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
