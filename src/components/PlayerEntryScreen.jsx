import { useState, useRef, useEffect } from 'react'

export default function PlayerEntryScreen({
  totalPlayers = 4,
  onNext,
  onBack,
  initialNames = [],
  isEditing = false,
  isOnline = false,
  roomCode = '',
}) {
  const [names, setNames] = useState(() => {
    if (isOnline) {
      return [initialNames?.[0] || '']
    }
    if (initialNames && initialNames.length >= 3) {
      return [...initialNames]
    }
    const count = Math.max(3, totalPlayers || 4)
    return Array.from({ length: count }, (_, i) => initialNames?.[i] || '')
  })

  const inputRefs = useRef([])

  useEffect(() => {
    // Focus the first empty input or the first input
    const firstEmptyIndex = names.findIndex((n) => !n.trim())
    const targetIndex = firstEmptyIndex !== -1 ? firstEmptyIndex : 0
    if (inputRefs.current[targetIndex]) {
      inputRefs.current[targetIndex].focus()
    }
  }, [])

  const updateName = (index, value) => {
    const updated = [...names]
    updated[index] = value
    setNames(updated)
  }

  const handleAddPlayer = () => {
    if (isOnline) return
    setNames((prev) => [...prev, ''])
    setTimeout(() => {
      const nextIndex = names.length
      inputRefs.current[nextIndex]?.focus()
    }, 60)
  }

  const handleRemovePlayer = (index) => {
    if (isOnline || names.length <= 3) return
    setNames((prev) => prev.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      if (!isOnline && index < names.length - 1) {
        inputRefs.current[index + 1]?.focus()
      } else if (allFilled) {
        handleNext()
      }
    }
  }

  // In online mode: only Player 1 (You) needs to be filled!
  const allFilled = isOnline
    ? names[0]?.trim().length > 0
    : names.length >= 3 && names.every((n) => n.trim().length > 0)

  const handleNext = () => {
    if (allFilled) {
      onNext(names.map((n) => n.trim()))
    }
  }

  const playerEmojis = ['👑', '🤠', '🧐', '😈', '🥸', '🤖', '👻', '🦊', '🐺', '🎭', '🃏', '🕵️']

  return (
    <div className="flex flex-col min-h-dvh px-5 py-8 relative">
      <div className="bg-glow-purple -top-32 right-0 opacity-30" />

      <div className="relative z-10 w-full max-w-md mx-auto flex-1 flex flex-col">
        {/* Back button */}
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-purple-400 transition-colors mb-4 self-start"
          >
            <span>←</span> {isEditing ? 'Cancel & Return' : 'Back'}
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-6 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 mb-3 shadow-lg shadow-purple-900/40">
            <span className="text-2xl">{isOnline ? '👑' : '👥'}</span>
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-1">
            {isOnline
              ? 'Host Player Setup'
              : isEditing
              ? 'Edit Players'
              : 'Enter Player Names'}
          </h2>
          <p className="text-text-secondary text-sm">
            {isOnline ? (
              <span>
                Room: <strong className="text-purple-400 font-mono tracking-wider">{roomCode}</strong> • {totalPlayers} total players
              </span>
            ) : (
              <>
                {names.length} {names.length === 1 ? 'player' : 'players'} in this game
                {names.length <= 3 && (
                  <span className="text-amber-400/80 block text-xs mt-0.5">
                    (Minimum 3 players required)
                  </span>
                )}
              </>
            )}
          </p>
        </div>

        {/* Online Mode Info Card */}
        {isOnline && (
          <div className="mb-4 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 leading-relaxed flex items-start gap-2.5 animate-fade-in">
            <span className="text-lg">💡</span>
            <div>
              <p className="font-bold text-purple-100">You are the Room Host</p>
              <p className="text-text-muted text-[11px] mt-0.5">
                Enter your name below. The remaining {totalPlayers - 1} players will join this room from their own devices using code <strong className="text-white font-mono">{roomCode}</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Player Inputs List */}
        <div className="flex-1 space-y-2.5 overflow-y-auto pb-3 pr-0.5">
          {names.map((name, i) => (
            <div
              key={i}
              className={`p-3.5 flex items-center gap-3 transition-all duration-150 rounded-xl border ${
                isOnline
                  ? 'bg-gradient-to-r from-purple-900/25 to-indigo-900/20 border-purple-500/30 shadow-md'
                  : 'glass-card-subtle'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600/30 to-blue-600/30 border border-purple-500/20 flex items-center justify-center text-lg shrink-0">
                {isOnline ? '👑' : playerEmojis[i % playerEmojis.length]}
              </div>
              <div className="flex-1 min-w-0">
                <label className="text-[11px] font-semibold text-purple-300 mb-0.5 block tracking-wide">
                  {isOnline ? 'Player 1 (You)' : `Player ${i + 1}`}
                </label>
                <input
                  ref={(el) => (inputRefs.current[i] = el)}
                  type="text"
                  value={name}
                  onChange={(e) => updateName(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, i)}
                  placeholder={isOnline ? 'Enter your name...' : 'Enter name...'}
                  className="w-full bg-transparent border-none outline-none text-text-primary text-base font-semibold placeholder:text-text-muted/50"
                  autoComplete="off"
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {name.trim() && (
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center animate-scale-in">
                    <span className="text-emerald-400 text-xs font-bold">✓</span>
                  </div>
                )}

                {/* Remove Player button - only in offline/local mode */}
                {!isOnline && (
                  <button
                    type="button"
                    onClick={() => handleRemovePlayer(i)}
                    disabled={names.length <= 3}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors ${
                      names.length > 3
                        ? 'bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400'
                        : 'bg-bg-card/40 border border-border/30 text-text-muted/30 cursor-not-allowed'
                    }`}
                    title={names.length > 3 ? 'Remove player' : 'Minimum 3 players required'}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add Another Player Button - ONLY in local mode! In online mode, "no other options ok!" */}
          {!isOnline && (
            <button
              type="button"
              onClick={handleAddPlayer}
              className="w-full py-3 rounded-xl border border-dashed border-purple-500/40 hover:border-purple-400 bg-purple-500/5 hover:bg-purple-500/15 text-purple-300 font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] mt-2"
            >
              <span className="text-base font-bold leading-none">+</span>
              <span>Add Player</span>
            </button>
          )}
        </div>

        {/* Progress bar - only for local game */}
        {!isOnline && (
          <div className="mt-2 mb-3">
            <div className="flex justify-between text-xs text-text-muted mb-1.5">
              <span>
                {names.filter((n) => n.trim()).length} / {names.length} names filled
              </span>
              <span>{Math.round((names.filter((n) => n.trim()).length / names.length) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-bg-card rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${(names.filter((n) => n.trim()).length / names.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Next / Save Button */}
        <button
          onClick={handleNext}
          disabled={!allFilled}
          className={`w-full py-4 text-lg tracking-wide rounded-xl font-semibold transition-all duration-200 shrink-0 ${
            allFilled
              ? 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white shadow-lg shadow-purple-900/40 active:scale-[0.98]'
              : 'bg-bg-card text-text-muted border border-border cursor-not-allowed'
          }`}
        >
          {allFilled
            ? isOnline
              ? 'Continue to Categories →'
              : isEditing
              ? 'Save & Return to Categories ✓'
              : 'Continue →'
            : isOnline
            ? 'Enter your name to continue'
            : names.length < 3
            ? 'Minimum 3 players required'
            : `Enter all ${names.length} player names`}
        </button>
      </div>
    </div>
  )
}
