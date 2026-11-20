import { useState, useEffect, useRef } from 'react'
import { createRoomConnection } from '../services/roomSync'

export default function LobbyScreen({
  activeGame,
  isHost = true,
  myPlayerName = '',
  onStartGame,
  onGameStartedByHost,
  onBackToDashboard,
}) {
  const {
    gameName = 'Imposter Game',
    roomCode = 'BARBADE',
    totalPlayers = 4,
    numImposters = 1,
    players: initialPlayers = [],
    selectedCategories = [],
    secretWord = '',
  } = activeGame || {}

  const hostName = initialPlayers[0] || 'Host'
  const effectiveMyName = myPlayerName || hostName

  // Players list in the lobby
  const [players, setPlayers] = useState([
    { id: 'host', name: hostName, isHost: true },
  ])
  const [copied, setCopied] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  const connRef = useRef(null)
  const myIdRef = useRef(`user_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`)

  // Setup real-time MQTT synchronization
  useEffect(() => {
    const code = (roomCode || 'BARBADE').toUpperCase()

    const conn = createRoomConnection(
      code,
      (topic, data) => {
        // Handle incoming messages
        if (topic.endsWith('/state')) {
          if (data && data.players && Array.isArray(data.players)) {
            setPlayers(data.players)
          }
        } else if (topic.endsWith('/events')) {
          if (data.type === 'PLAYER_JOIN' && data.player?.name) {
            if (isHost) {
              setPlayers((prev) => {
                if (prev.some((p) => p.name.trim().toLowerCase() === data.player.name.trim().toLowerCase())) {
                  return prev
                }
                const updated = [
                  ...prev,
                  {
                    id: data.player.id || Date.now(),
                    name: data.player.name.trim(),
                    isHost: false,
                  },
                ]
                // Immediately publish the updated state to everyone
                conn.publishState({
                  gameName,
                  roomCode: code,
                  totalPlayers,
                  numImposters,
                  hostName,
                  players: updated,
                  status: 'WAITING',
                  updatedAt: Date.now(),
                })
                return updated
              })
            }
          } else if (data.type === 'GAME_START') {
            if (!isHost && onGameStartedByHost) {
              onGameStartedByHost(data)
            }
          }
        }
      },
      () => {
        // On connection open
        if (!isHost) {
          // Tell the host we want to join
          conn.publishEvent({
            type: 'PLAYER_JOIN',
            player: {
              id: myIdRef.current,
              name: effectiveMyName,
            },
          })
        } else {
          // Host publishes initial lobby state
          conn.publishState({
            gameName,
            roomCode: code,
            totalPlayers,
            numImposters,
            hostName,
            players: [{ id: 'host', name: hostName, isHost: true }],
            status: 'WAITING',
            updatedAt: Date.now(),
          })
        }
      }
    )

    connRef.current = conn

    // Also support local BroadcastChannel as instant backup
    let localChannel = null
    try {
      localChannel = new BroadcastChannel(`imposter_room_${code}`)
      localChannel.onmessage = (event) => {
        const data = event.data
        if (data.type === 'PLAYER_JOIN' && data.player?.name && isHost) {
          setPlayers((prev) => {
            if (prev.some((p) => p.name.trim().toLowerCase() === data.player.name.trim().toLowerCase())) {
              return prev
            }
            return [
              ...prev,
              {
                id: data.player.id || Date.now(),
                name: data.player.name.trim(),
                isHost: false,
              },
            ]
          })
        } else if (data.type === 'GAME_START' && !isHost && onGameStartedByHost) {
          onGameStartedByHost(data)
        }
      }
    } catch {
      // ignore
    }

    return () => {
      conn.disconnect()
      if (localChannel) localChannel.close()
    }
  }, [roomCode, isHost, hostName, effectiveMyName, gameName, totalPlayers, numImposters, onGameStartedByHost])

  // Periodic state heartbeat from host so newly arriving players catch the state quickly
  useEffect(() => {
    if (!isHost) return
    const code = (roomCode || 'BARBADE').toUpperCase()
    const interval = setInterval(() => {
      if (connRef.current) {
        connRef.current.publishState({
          gameName,
          roomCode: code,
          totalPlayers,
          numImposters,
          hostName,
          players,
          status: 'WAITING',
          updatedAt: Date.now(),
        })
      }
    }, 2500)
    return () => clearInterval(interval)
  }, [isHost, roomCode, gameName, totalPlayers, numImposters, hostName, players])

  // Copy Room Code
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Copy Share Link
  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`
      await navigator.clipboard.writeText(url)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  // Host starts game
  const handleStart = () => {
    if (!isHost || players.length < 3) return

    const playerNames = players.map((p) => p.name)
    const code = (roomCode || 'BARBADE').toUpperCase()

    // Assign roles randomly
    const indices = Array.from({ length: playerNames.length }, (_, i) => i)
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[indices[i], indices[j]] = [indices[j], indices[i]]
    }
    const imposterIndices = new Set(indices.slice(0, numImposters))

    const gamePlayersWithRoles = playerNames.map((name, i) => ({
      name,
      isImposter: imposterIndices.has(i),
    }))

    const startPayload = {
      type: 'GAME_START',
      roomCode: code,
      gameName,
      secretWord,
      category: selectedCategories[0] || 'General',
      players: gamePlayersWithRoles,
    }

    if (connRef.current) {
      connRef.current.publishEvent(startPayload)
      connRef.current.publishState({
        status: 'IN_PROGRESS',
        gameData: startPayload,
      })
    }

    onStartGame(gamePlayersWithRoles, secretWord)
  }

  const canStart = players.length >= 3

  return (
    <div className="flex flex-col min-h-dvh px-5 py-8 relative">
      {/* Background glow effects */}
      <div className="bg-glow-purple -top-48 -left-32 opacity-40" />
      <div className="bg-glow-purple -bottom-32 -right-32 opacity-25" />

      <div className="relative z-10 w-full max-w-md mx-auto flex-1 flex flex-col justify-between">
        {/* Top Header & Status */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => setShowExitConfirm(true)}
              className="text-xs text-text-muted hover:text-white transition-colors flex items-center gap-1.5"
            >
              <span>←</span> Exit Lobby
            </button>

            {/* Pulsing Lobby Status Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-lg shadow-emerald-950/40">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Lobby Active
            </div>
          </div>

          {/* Lobby Created Title */}
          <div className="text-center mb-6 animate-fade-in-up">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-indigo-700 mb-3 shadow-lg shadow-emerald-900/40">
              <span className="text-3xl">🎉</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight mb-1">
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
                Lobby Created!
              </span>
            </h1>
            <p className="text-text-secondary text-sm font-medium">
              Waiting for other players to join...
            </p>
          </div>

          {/* Room Code Showcase Card */}
          <div className="glass-card p-5 mb-5 border border-purple-500/30 shadow-xl shadow-purple-950/40 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
              <span className="font-semibold uppercase tracking-wider text-purple-300">
                🏷️ {gameName || 'Imposter Game'}
              </span>
              <span className="text-[11px] text-text-muted">Host: <strong>{hostName}</strong></span>
            </div>

            <div className="my-3 py-3 px-4 rounded-xl bg-bg-primary/70 border border-purple-500/20 text-center relative group">
              <div className="text-[11px] text-text-muted uppercase tracking-widest font-bold mb-0.5">
                Room Code
              </div>
              <div className="text-3xl sm:text-4xl font-black font-mono tracking-widest text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-300 bg-clip-text">
                {roomCode}
              </div>
            </div>

            {/* Share / Copy buttons */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                onClick={handleCopyCode}
                className="py-2.5 px-3 rounded-xl bg-bg-card-hover border border-border hover:border-purple-500/40 text-xs font-semibold text-text-primary hover:text-white transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span>{copied ? '✓' : '📋'}</span>
                <span>{copied ? 'Copied Code!' : 'Copy Code'}</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="py-2.5 px-3 rounded-xl bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 text-xs font-semibold text-purple-300 hover:text-white transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span>{copiedLink ? '✓' : '🔗'}</span>
                <span>{copiedLink ? 'Link Copied!' : 'Invite Link'}</span>
              </button>
            </div>
          </div>

          {/* Players Joined Counter Header */}
          <div className="glass-card p-5 mb-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">👥</span>
                <span className="text-sm font-bold text-text-primary">
                  Players joined :{' '}
                  <span className="text-emerald-400 font-extrabold text-base">
                    {players.length}
                  </span>{' '}
                  / {totalPlayers}
                </span>
              </div>
              <span className="text-xs font-semibold text-purple-400">
                {Math.round((players.length / totalPlayers) * 100)}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-bg-card-hover rounded-full overflow-hidden mb-4 border border-border/40">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-300 shadow-sm"
                style={{ width: `${(players.length / totalPlayers) * 100}%` }}
              />
            </div>

            {/* Players Roster Slots */}
            <div className="space-y-2">
              {Array.from({ length: totalPlayers }).map((_, index) => {
                const player = players[index]
                const isPlayerHost = index === 0
                const isMe = player && player.name.trim().toLowerCase() === effectiveMyName.trim().toLowerCase()

                return (
                  <div
                    key={index}
                    className={`p-3 rounded-xl flex items-center justify-between transition-all duration-200 border ${
                      player
                        ? isPlayerHost
                          ? 'bg-gradient-to-r from-purple-900/30 to-indigo-900/20 border-purple-500/30 shadow-sm'
                          : isMe
                          ? 'bg-purple-600/20 border-purple-500/40 shadow-sm'
                          : 'bg-bg-card-hover/50 border-border/60'
                        : 'border-dashed border-border/40 bg-bg-card/20 opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${
                          player
                            ? isPlayerHost
                              ? 'bg-purple-600/30 border border-purple-500/40 text-purple-300'
                              : 'bg-cyan-600/20 border border-cyan-500/30 text-cyan-300'
                            : 'bg-bg-card border border-border/40 text-text-muted/40'
                        }`}
                      >
                        {player ? (isPlayerHost ? '👑' : '🤠') : `${index + 1}`}
                      </div>

                      <div className="min-w-0">
                        {player ? (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-text-primary truncate">
                              {player.name}
                            </span>
                            {isPlayerHost && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                {isMe ? 'Host / You' : 'Host'}
                              </span>
                            )}
                            {!isPlayerHost && isMe && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                You
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-text-muted flex items-center gap-1.5 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60 animate-ping" />
                            Waiting for player {index + 1} to join...
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {player ? (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                          Ready ✓
                        </span>
                      ) : (
                        <span className="text-[11px] text-text-muted/60 font-mono">
                          Slot #{index + 1}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="pt-2 pb-4 space-y-3">
          {/* Game settings pills */}
          <div className="flex items-center justify-center gap-2 flex-wrap text-xs text-text-secondary">
            <span className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 font-medium">
              🎭 {numImposters} {numImposters === 1 ? 'Imposter' : 'Imposters'}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
              👥 {totalPlayers - numImposters} Civilians
            </span>
            {selectedCategories.length > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium truncate max-w-[180px]">
                📚 {selectedCategories.join(', ')}
              </span>
            )}
          </div>

          {/* Action button: Host has Start Game, Player has waiting status */}
          {isHost ? (
            <button
              onClick={handleStart}
              disabled={!canStart}
              className={`w-full py-4 text-lg tracking-wide rounded-xl font-bold transition-all duration-200 ${
                canStart
                  ? 'btn-success animate-pulse-glow shadow-lg shadow-emerald-950/50 hover:brightness-110 active:scale-[0.98]'
                  : 'bg-bg-card text-text-muted border border-border cursor-not-allowed'
              }`}
            >
              {canStart
                ? `🎮 Start Round (${players.length}/${totalPlayers} Players) →`
                : `Waiting for at least 3 players (${players.length}/${totalPlayers})`}
            </button>
          ) : (
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 text-center animate-pulse">
              <span className="text-purple-300 font-semibold text-sm flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                Waiting for Host ({hostName}) to start the game...
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card p-6 max-w-xs w-full text-center space-y-4 border border-purple-500/30">
            <span className="text-3xl">⚠️</span>
            <h3 className="text-lg font-bold text-white">Exit Lobby?</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              {isHost
                ? 'Exiting will close the lobby for connected players.'
                : 'Are you sure you want to leave this lobby?'}
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-bg-card-hover border border-border text-xs font-semibold text-text-secondary hover:text-white"
              >
                Stay
              </button>
              <button
                onClick={onBackToDashboard}
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
