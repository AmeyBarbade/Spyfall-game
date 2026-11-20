import { useState } from 'react'

export default function OnlineRevealScreen({
  roomCode,
  playerName,
  isHost = false,
  hostName = 'Host',
  role,
  onStartDiscussion,
  onExit,
}) {
  const [revealed, setRevealed] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  const isImposter = role?.isImposter
  const secretWord = role?.secretWord || 'Unknown'
  const category = role?.category || 'General'

  return (
    <div className="flex flex-col min-h-dvh px-5 py-8 relative">
      <div className="bg-glow-purple -top-32 -left-32 opacity-40" />
      <div className="bg-glow-purple -bottom-32 -right-32 opacity-20" />

      <div className="relative z-10 w-full max-w-md mx-auto flex-1 flex flex-col justify-between">
        {/* Top Header */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setShowExitConfirm(true)}
              className="text-xs text-text-muted hover:text-white transition-colors flex items-center gap-1.5"
            >
              <span>←</span> Exit Game
            </button>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Connected • {roomCode}
            </div>
          </div>

          {/* Title Area */}
          <div className="text-center mb-6 animate-fade-in-up">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-purple-500/20 text-purple-300 border border-purple-500/40 mb-3 inline-block">
              Round Active 🎮
            </span>
            <h1 className="text-2xl font-black text-text-primary">
              Game in Progress!
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              Player:{' '}
              <strong className="text-white">
                {playerName} {isHost ? '(Host)' : ''}
              </strong>{' '}
              • Tap below to reveal role
            </p>
          </div>

          {/* Tap to Reveal Card */}
          <div
            onClick={() => setRevealed(!revealed)}
            className={`cursor-pointer rounded-2xl p-8 text-center transition-all duration-300 border shadow-2xl relative overflow-hidden select-none animate-scale-in ${
              revealed
                ? isImposter
                  ? 'bg-gradient-to-b from-red-950/90 to-bg-card border-red-500/50 shadow-red-950/60'
                  : 'bg-gradient-to-b from-emerald-950/90 to-bg-card border-emerald-500/50 shadow-emerald-950/60'
                : 'glass-card border-purple-500/30 hover:border-purple-400 active:scale-[0.98]'
            }`}
          >
            {!revealed ? (
              <div className="py-8 space-y-4">
                <div className="w-20 h-20 rounded-full bg-purple-500/20 border border-purple-500/30 mx-auto flex items-center justify-center text-4xl animate-bounce">
                  🔒
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    Tap to Reveal Role
                  </h3>
                  <p className="text-xs text-text-muted">
                    Make sure no one is looking at your screen!
                  </p>
                </div>
              </div>
            ) : isImposter ? (
              <div className="py-6 space-y-3 animate-fade-in">
                <span className="text-5xl block animate-bounce-in">🎭</span>
                <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-black uppercase tracking-widest border border-red-500/30">
                  Imposter
                </span>
                <h2 className="text-3xl font-black text-red-400 tracking-wider">
                  YOU ARE THE IMPOSTER!
                </h2>
                <p className="text-xs text-text-secondary max-w-xs mx-auto leading-relaxed pt-2">
                  You do NOT know the secret word. Listen carefully to other players' clues and blend in without getting voted out!
                </p>
                <div className="pt-4 text-[11px] text-text-muted">
                  Tap again to hide 🙈
                </div>
              </div>
            ) : (
              <div className="py-6 space-y-3 animate-fade-in">
                <span className="text-5xl block animate-bounce-in">🤫</span>
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-widest border border-emerald-500/30">
                  Civilian
                </span>
                <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">
                  Your Secret Word ({category})
                </p>
                <h2 className="text-3xl font-black text-emerald-400 tracking-wide drop-shadow">
                  {secretWord}
                </h2>
                <p className="text-xs text-text-secondary max-w-xs mx-auto leading-relaxed pt-2">
                  Give a subtle one-word clue that signals you know the word without giving it away to the imposter!
                </p>
                <div className="pt-4 text-[11px] text-text-muted">
                  Tap again to hide 🙈
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions: ONLY the host gets the option to start discussion! */}
        <div className="pt-6 pb-2 space-y-3">
          {isHost ? (
            <button
              onClick={onStartDiscussion}
              className="w-full py-4 text-lg tracking-wide rounded-xl font-bold btn-primary animate-pulse-glow shadow-lg shadow-purple-950/50 hover:brightness-110 active:scale-[0.98] transition-all"
            >
              🗣️ Start Discussion →
            </button>
          ) : (
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 text-center animate-pulse">
              <span className="text-purple-300 font-semibold text-sm flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                Waiting for Host ({hostName}) to start discussion...
              </span>
            </div>
          )}

          <p className="text-center text-[11px] text-text-muted">
            The Imposter Party Game • Created by Amey Barbade
          </p>
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card p-6 max-w-xs w-full text-center space-y-4 border border-purple-500/30">
            <span className="text-3xl">⚠️</span>
            <h3 className="text-lg font-bold text-white">Exit Game?</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Are you sure you want to exit the current round?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-bg-card-hover border border-border text-xs font-semibold text-text-secondary hover:text-white"
              >
                Stay
              </button>
              <button
                onClick={onExit}
                className="flex-1 py-2.5 rounded-xl bg-red-600/80 hover:bg-red-500 text-xs font-semibold text-white"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
