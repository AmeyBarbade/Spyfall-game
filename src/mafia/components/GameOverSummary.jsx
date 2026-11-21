import { Trophy, RotateCcw, Skull, Shield, Heart, Award } from 'lucide-react'

export function GameOverSummary({
  roomState,
  localPlayerId,
  onPlayAgain,
}) {
  if (!roomState || roomState.phase !== 'GAME_OVER') return null

  const isHost = roomState.hostId === localPlayerId
  const winner = roomState.winner
  const winReason = roomState.winReason
  const players = roomState.players || []
  const timeline = roomState.timeline || []

  const isTownWin = winner === 'VILLAGERS'

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 flex flex-col gap-6 animate-fade-in">
      {/* Big Winner Banner */}
      <div
        className={`rounded-3xl p-6 sm:p-8 text-center border-2 flex flex-col items-center shadow-2xl relative overflow-hidden ${
          isTownWin
            ? 'bg-gradient-to-b from-emerald-900/60 to-teal-950/80 border-emerald-500 text-emerald-100'
            : 'bg-gradient-to-b from-red-950/60 to-rose-950/80 border-red-600 text-red-100'
        }`}
      >
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 mb-4 shadow-inner">
          <Trophy
            className={`w-12 h-12 ${
              isTownWin ? 'text-emerald-400' : 'text-red-400'
            }`}
          />
        </div>

        <span className="text-xs uppercase tracking-widest font-black px-3 py-1 rounded-full bg-black/40 border border-white/10 mb-2">
          Game Concluded
        </span>

        <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">
          {isTownWin ? 'TOWN VICTORY!' : 'MAFIA VICTORY!'}
        </h2>

        <p className="text-sm opacity-90 max-w-md">{winReason}</p>

        {isHost && (
          <button
            onClick={onPlayAgain}
            className="mt-6 px-6 py-3 rounded-2xl bg-white text-stone-900 hover:bg-stone-100 font-black text-sm flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again (Instant Rematch)</span>
          </button>
        )}
      </div>

      {/* Full Transparent Role Reveal */}
      <div className="bg-white dark:bg-[#1E242B] border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm">
        <h3 className="text-base font-black text-stone-900 dark:text-white mb-3 flex items-center gap-2">
          <Award className="w-5 h-5 text-purple-600" /> All Player Roles
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {players.map((p) => (
            <div
              key={p.id}
              className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                p.role === 'MAFIA'
                  ? 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
                  : p.role === 'DOCTOR'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200'
              }`}
            >
              <div className="flex flex-col truncate">
                <span className="font-bold text-sm truncate">{p.name}</span>
                <span className="text-[10px] opacity-70">
                  {p.isAlive ? 'Survived' : `Eliminated (${p.eliminatedReason || 'died'})`}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase shrink-0 bg-black/20">
                {p.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Round-by-Round Timeline */}
      {timeline.length > 0 && (
        <div className="bg-white dark:bg-[#1E242B] border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm">
          <h3 className="text-base font-black text-stone-900 dark:text-white mb-3">
            📜 Round-by-Round Match Timeline
          </h3>

          <div className="flex flex-col gap-2.5">
            {timeline.map((event, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 text-xs flex items-center gap-3"
              >
                <div className="p-2 rounded-lg bg-black/20 shrink-0">
                  {event.type === 'DOCTOR_SAVE' ? (
                    <Shield className="w-4 h-4 text-emerald-500" />
                  ) : event.type === 'NIGHT_KILL' ? (
                    <Skull className="w-4 h-4 text-red-500" />
                  ) : (
                    <Award className="w-4 h-4 text-purple-500" />
                  )}
                </div>

                <div className="flex flex-col">
                  <span className="font-semibold text-stone-800 dark:text-stone-200">
                    {event.description}
                  </span>
                  <span className="text-[10px] text-stone-400">Round {event.round}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
