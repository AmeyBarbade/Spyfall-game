import { useState, useRef, useEffect } from 'react'

export default function PlayerEntryScreen({ totalPlayers, onNext, initialNames }) {
  const [names, setNames] = useState(
    initialNames && initialNames.length === totalPlayers
      ? initialNames
      : Array.from({ length: totalPlayers }, (_, i) => initialNames?.[i] || '')
  )
  const inputRefs = useRef([])

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [])

  const updateName = (index, value) => {
    const updated = [...names]
    updated[index] = value
    setNames(updated)
  }

  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter' && index < totalPlayers - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const allFilled = names.every((n) => n.trim().length > 0)

  const handleNext = () => {
    if (allFilled) {
      onNext(names.map((n) => n.trim()))
    }
  }

  const playerEmojis = ['😎', '🤠', '🧐', '😈', '🥸', '🤖', '👻', '🦊', '🐺', '🎭', '🃏', '🕵️']

  return (
    <div className="flex flex-col min-h-dvh px-5 py-8 relative">
      <div className="bg-glow-purple -top-32 right-0 opacity-30" />

      <div className="relative z-10 w-full max-w-md mx-auto flex-1 flex flex-col">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in-up">
          <h2 className="text-2xl font-bold text-text-primary mb-1">Enter Player Names</h2>
          <p className="text-text-secondary text-sm">{totalPlayers} players joining the game</p>
        </div>

        {/* Player Inputs */}
        <div className="flex-1 space-y-3 stagger-children overflow-y-auto pb-4">
          {names.map((name, i) => (
            <div key={i} className="glass-card-subtle p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600/30 to-blue-600/30 border border-purple-500/20 flex items-center justify-center text-lg shrink-0">
                {playerEmojis[i % playerEmojis.length]}
              </div>
              <div className="flex-1">
                <label className="text-xs text-text-muted font-medium mb-0.5 block">
                  Player {i + 1}
                </label>
                <input
                  ref={(el) => (inputRefs.current[i] = el)}
                  type="text"
                  value={name}
                  onChange={(e) => updateName(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, i)}
                  placeholder={`Enter name...`}
                  className="w-full bg-transparent border-none outline-none text-text-primary text-base font-medium placeholder:text-text-muted/50"
                  autoComplete="off"
                />
              </div>
              {name.trim() && (
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center animate-scale-in">
                  <span className="text-emerald-400 text-xs">✓</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mt-4 mb-3">
          <div className="flex justify-between text-xs text-text-muted mb-1.5">
            <span>{names.filter((n) => n.trim()).length} / {totalPlayers} players</span>
            <span>{Math.round((names.filter((n) => n.trim()).length / totalPlayers) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-bg-card rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${(names.filter((n) => n.trim()).length / totalPlayers) * 100}%` }}
            />
          </div>
        </div>

        {/* Next Button */}
        <button
          onClick={handleNext}
          disabled={!allFilled}
          className="btn-primary w-full py-4 text-lg tracking-wide shrink-0"
        >
          {allFilled ? 'Continue →' : `Enter all ${totalPlayers} names`}
        </button>
      </div>
    </div>
  )
}
