import { useState, useEffect } from 'react'

export default function PlayerWaitingScreen({
  roomCode,
  playerName,
  onLeave,
}) {
  const [lobbyState, setLobbyState] = useState(null)
  const [gameStarted, setGameStarted] = useState(false)
  const [playerRole, setPlayerRole] = useState(null)
  const [revealed, setRevealed] = useState(false)

  // Listen for lobby updates and game start from host
  useEffect(() => {
    // 1. BroadcastChannel
    let channel = null
    try {
      channel = new BroadcastChannel(`imposter_room_${roomCode.toUpperCase()}`)
      channel.onmessage = (event) => {
        const data = event.data
        if (data.type === 'LOBBY_UPDATE') {
          setLobbyState(data.lobby)
        } else if (data.type === 'GAME_START') {
          // Check role for this player
          const myAssignment = data.players?.find(
            (p) => p.name.trim().toLowerCase() === playerName.trim().toLowerCase()
          )
          if (myAssignment) {
            setPlayerRole({
              isImposter: myAssignment.isImposter,
              secretWord: myAssignment.isImposter ? 'IMPOSTER' : data.secretWord,
              category: data.category || 'General',
            })
            setGameStarted(true)
          }
        }
      }

      // Announce presence to host
      channel.postMessage({
        type: 'PLAYER_PING',
        player: { name: playerName, id: `client_${Date.now()}` },
      })
    } catch {
      // BroadcastChannel fallback
    }

    // 2. LocalStorage poll/sync fallback
    const interval = setInterval(() => {
      try {
        const raw = localStorage.getItem(`imposter_lobby_${roomCode.toUpperCase()}`)
        if (raw) {
          const parsed = JSON.parse(raw)
          setLobbyState(parsed)
          if (parsed.status === 'IN_PROGRESS' && parsed.gameData) {
            const myAssignment = parsed.gameData.players?.find(
              (p) => p.name.trim().toLowerCase() === playerName.trim().toLowerCase()
            )
            if (myAssignment && !gameStarted) {
              setPlayerRole({
                isImposter: myAssignment.isImposter,
                secretWord: myAssignment.isImposter ? 'IMPOSTER' : parsed.gameData.secretWord,
                category: parsed.gameData.category || 'General',
              })
              setGameStarted(true)
            }
          }
        }
      } catch {
        // ignore
      }
    }, 1000)

    return () => {
      if (channel) channel.close()
      clearInterval(interval)
    }
  }, [roomCode, playerName, gameStarted])

  const players = lobbyState?.players || [{ name: playerName, isHost: false }]
  const totalPlayers = lobbyState?.totalPlayers || 4

  return (
    <div className="flex flex-col min-h-dvh px-5 py-8 relative">
      <div className="bg-glow-purple -top-32 -left-32 opacity-40" />
      <div className="bg-glow-purple -bottom-32 -right-32 opacity-20" />

      <div className="relative z-10 w-full max-w-md mx-auto flex-1 flex flex-col justify-between">
        {/* Top Header */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={onLeave}
              className="text-xs text-text-muted hover:text-white transition-colors flex items-center gap-1.5"
            >
              <span>←</span> Leave Room
            </button>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Connected
            </div>
          </div>

          {/* If Game Has NOT Started Yet: Waiting Room */}
          {!gameStarted ? (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 mb-3 shadow-lg shadow-indigo-900/40 animate-pulse">
                  <span className="text-3xl">📡</span>
                </div>
                <h1 className="text-2xl font-black text-text-primary mb-1">
                  You are in the Lobby!
                </h1>
                <p className="text-text-secondary text-sm">
                  Waiting for host to start the game...
                </p>
              </div>

              {/* Room Code Card */}
              <div className="glass-card p-5 text-center border border-purple-500/30">
                <p className="text-xs text-text-muted uppercase tracking-widest font-bold mb-1">
                  Room Code
                </p>
                <div className="text-3xl font-black font-mono tracking-widest text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text">
                  {roomCode}
                </div>
                <div className="mt-3 pt-3 border-t border-border flex justify-around text-xs text-text-secondary">
                  <div>
                    <span className="text-text-muted block">You</span>
                    <span className="font-bold text-white">{playerName}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block">Game</span>
                    <span className="font-bold text-white">{lobbyState?.gameName || 'Imposter Game'}</span>
                  </div>
                </div>
              </div>

              {/* Players in Lobby */}
              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                    Players Joined ({players.length} / {totalPlayers})
                  </h3>
                  <span className="text-xs text-purple-400 font-semibold animate-pulse">
                    Waiting for host...
                  </span>
                </div>

                <div className="space-y-2">
                  {players.map((p, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl flex items-center justify-between border ${
                        p.name.trim().toLowerCase() === playerName.trim().toLowerCase()
                          ? 'bg-purple-600/20 border-purple-500/40'
                          : 'bg-bg-card-hover/40 border-border/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{p.isHost ? '👑' : '🤠'}</span>
                        <span className="font-bold text-sm text-text-primary">
                          {p.name} {p.name.trim().toLowerCase() === playerName.trim().toLowerCase() ? '(You)' : ''}
                        </span>
                      </div>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Ready ✓
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* If Game Has Started: Reveal Card */
            <div className="space-y-6 animate-scale-in">
              <div className="text-center">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-purple-500/20 text-purple-300 border border-purple-500/40 mb-3 inline-block">
                  Round Active 🎮
                </span>
                <h1 className="text-2xl font-black text-text-primary">
                  Game in Progress!
                </h1>
                <p className="text-text-secondary text-sm">
                  Tap below to reveal your secret identity
                </p>
              </div>

              {/* Reveal Card */}
              <div
                onClick={() => setRevealed(!revealed)}
                className={`cursor-pointer rounded-2xl p-8 text-center transition-all duration-300 border shadow-2xl relative overflow-hidden ${
                  revealed
                    ? playerRole?.isImposter
                      ? 'bg-gradient-to-b from-red-950/80 to-bg-card border-red-500/50 shadow-red-950/60'
                      : 'bg-gradient-to-b from-emerald-950/80 to-bg-card border-emerald-500/50 shadow-emerald-950/60'
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
                ) : playerRole?.isImposter ? (
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
                    <p className="text-xs text-text-muted uppercase tracking-wider">
                      Your Secret Word
                    </p>
                    <h2 className="text-3xl font-black text-emerald-400 tracking-wide drop-shadow">
                      {playerRole?.secretWord}
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
          )}
        </div>

        {/* Bottom footer */}
        <div className="pt-6 text-center">
          <p className="text-xs text-text-muted">
            The Imposter Party Game • Created by Amey Barbade
          </p>
        </div>
      </div>
    </div>
  )
}
