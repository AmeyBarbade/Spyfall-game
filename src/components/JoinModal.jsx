import { useState, useEffect } from 'react'

export default function JoinModal({
  isOpen,
  onClose,
  onJoin,
  initialRoomCode = '',
}) {
  const [roomCode, setRoomCode] = useState(initialRoomCode)
  const [playerName, setPlayerName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (initialRoomCode) {
      setRoomCode(initialRoomCode.toUpperCase())
    }
  }, [initialRoomCode])

  if (!isOpen) return null

  const handleJoin = (e) => {
    e?.preventDefault()
    const cleanCode = roomCode.trim().toUpperCase()
    const cleanName = playerName.trim()

    if (!cleanCode) {
      setError('Please enter a room code')
      return
    }
    if (cleanCode.length < 6) {
      setError('Room code must be at least 6 characters (e.g. BARBADE)')
      return
    }
    if (!cleanName) {
      setError('Please enter your name')
      return
    }

    setError('')
    onJoin(cleanCode, cleanName)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md glass-card p-6 border border-purple-500/30 shadow-2xl shadow-purple-950/60 animate-scale-in">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-bg-card-hover border border-border flex items-center justify-center text-text-muted hover:text-white transition-colors"
        >
          ✕
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 mx-auto mb-3 flex items-center justify-center text-2xl shadow-lg shadow-blue-900/40">
            🔑
          </div>
          <h2 className="text-xl font-bold text-text-primary">Join Online Lobby</h2>
          <p className="text-text-secondary text-xs mt-1">
            Enter the host's room code to join their game
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          {/* Room Code */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Room Code (Min 6 Letters)
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => {
                setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))
                setError('')
              }}
              placeholder="e.g. BARBADE"
              maxLength={12}
              className="input-field text-center font-mono text-lg font-bold tracking-widest uppercase"
              autoFocus={!initialRoomCode}
            />
          </div>

          {/* Player Name */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => {
                setPlayerName(e.target.value)
                setError('')
              }}
              placeholder="Enter your name..."
              className="input-field text-base"
              autoFocus={!!initialRoomCode}
              autoComplete="name"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-bg-card-hover border border-border text-text-secondary hover:text-white font-medium text-sm transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-900/40 active:scale-[0.98] transition-all"
            >
              Join Lobby 🚀
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
