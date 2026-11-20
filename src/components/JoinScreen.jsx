import { useState, useRef, useEffect } from 'react'

export default function JoinScreen({
  roomCode = '',
  onJoin,
  onBack,
}) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e) => {
    e?.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Please enter your name to join')
      return
    }
    setError('')
    onJoin(roomCode.trim().toUpperCase(), trimmed)
  }

  return (
    <div className="flex flex-col min-h-dvh px-5 py-8 relative">
      <div className="bg-glow-purple -top-32 right-0 opacity-30" />
      <div className="bg-glow-purple -bottom-32 left-0 opacity-20" />

      <div className="relative z-10 w-full max-w-md mx-auto flex-1 flex flex-col justify-between">
        <div>
          {/* Back button */}
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-text-muted hover:text-purple-400 transition-colors mb-6 self-start"
            >
              <span>←</span> Home
            </button>
          )}

          {/* Header */}
          <div className="text-center mb-8 animate-fade-in-up">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 mb-3 shadow-lg shadow-indigo-900/40">
              <span className="text-3xl">🎮</span>
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-1">
              Join Game Lobby
            </h1>
            <p className="text-text-secondary text-sm">
              You are joining room:{' '}
              <strong className="text-transparent bg-gradient-to-r from-purple-400 to-cyan-300 bg-clip-text font-mono text-base tracking-widest uppercase">
                {roomCode}
              </strong>
            </p>
          </div>

          {/* Player Name Input Card */}
          <div className="glass-card p-6 space-y-5 animate-fade-in">
            <div className="p-3.5 flex items-center gap-3 rounded-xl bg-gradient-to-r from-purple-900/25 to-indigo-900/20 border border-purple-500/30 shadow-md">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600/30 to-blue-600/30 border border-purple-500/20 flex items-center justify-center text-lg shrink-0">
                🤠
              </div>
              <div className="flex-1 min-w-0">
                <label className="text-[11px] font-semibold text-purple-300 mb-0.5 block tracking-wide">
                  Enter Your Name
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setError('')
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                  placeholder="Enter your name..."
                  className="w-full bg-transparent border-none outline-none text-text-primary text-base font-semibold placeholder:text-text-muted/50"
                  autoComplete="name"
                />
              </div>

              {name.trim() && (
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center animate-scale-in">
                  <span className="text-emerald-400 text-xs font-bold">✓</span>
                </div>
              )}
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20 animate-scale-in">
                ⚠️ {error}
              </p>
            )}

            <div className="text-xs text-text-muted leading-relaxed">
              💡 Once you click <strong>Join Lobby</strong>, you will enter the room as the next player and wait for the host to start the round.
            </div>
          </div>
        </div>

        {/* Green Bar Button: Join Lobby */}
        <div className="pt-6 pb-4">
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className={`w-full py-4 text-lg tracking-wide rounded-xl font-bold transition-all duration-200 ${
              name.trim()
                ? 'btn-success animate-pulse-glow shadow-lg shadow-emerald-950/50 hover:brightness-110 active:scale-[0.98]'
                : 'bg-bg-card text-text-muted border border-border cursor-not-allowed'
            }`}
          >
            {name.trim() ? 'Join Lobby 🚀' : 'Enter your name to join'}
          </button>
        </div>
      </div>
    </div>
  )
}
