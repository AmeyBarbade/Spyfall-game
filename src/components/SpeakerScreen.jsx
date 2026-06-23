export default function SpeakerScreen({ startingPlayer, onProceed }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-5 py-8 relative overflow-hidden">
      {/* Animated background glows */}
      <div
        className="bg-glow-purple top-[-10%] left-1/2 -translate-x-1/2 opacity-50"
        style={{
          background:
            'radial-gradient(circle, rgba(245, 158, 11, 0.18) 0%, transparent 70%)',
          width: '600px',
          height: '600px',
        }}
      />
      <div
        className="bg-glow-purple bottom-[-15%] left-[-10%] opacity-30"
        style={{
          background:
            'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full max-w-md text-center">
        {/* Mic / megaphone icon */}
        <div className="animate-bounce-in mb-6">
          <div className="w-28 h-28 mx-auto rounded-3xl bg-gradient-to-br from-amber-500/25 to-orange-500/25 border-2 border-amber-500/30 shadow-2xl shadow-amber-900/30 flex items-center justify-center">
            <span className="text-6xl">🎤</span>
          </div>
        </div>

        {/* Label */}
        <p
          className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400/80 mb-3 animate-fade-in"
          style={{ animationDelay: '0.15s' }}
        >
          First Speaker
        </p>

        {/* Player name — hero text */}
        <h2
          className="text-4xl sm:text-5xl font-black animate-fade-in-up"
          style={{ animationDelay: '0.25s' }}
        >
          <span className="bg-gradient-to-r from-amber-300 via-yellow-300 to-orange-400 bg-clip-text text-transparent drop-shadow-lg">
            {startingPlayer.name}
          </span>
        </h2>

        <p
          className="text-lg text-text-primary font-semibold mt-2 animate-fade-in-up"
          style={{ animationDelay: '0.35s' }}
        >
          will start the round!
        </p>

        {/* Explanation card */}
        <div
          className="glass-card p-5 mt-8 animate-fade-in-up"
          style={{ animationDelay: '0.5s' }}
        >
          <p className="text-text-secondary text-sm leading-relaxed">
            Everyone will say{' '}
            <span className="text-amber-400 font-semibold">one word</span>{' '}
            related to their secret word.{' '}
            <span className="text-text-primary font-semibold">
              {startingPlayer.name}
            </span>{' '}
            goes first.
          </p>
        </div>

        {/* Tip */}
        <div
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/15 animate-fade-in"
          style={{ animationDelay: '0.65s' }}
        >
          <span className="text-base">💡</span>
          <span className="text-xs text-purple-300">
            Imposters — blend in! Civilians — be subtle!
          </span>
        </div>

        {/* Proceed button */}
        <button
          onClick={onProceed}
          className="btn-primary w-full py-4 text-lg tracking-wide mt-8 animate-fade-in-up"
          style={{ animationDelay: '0.8s' }}
        >
          🗳️ Proceed to Voting
        </button>
      </div>
    </div>
  )
}
