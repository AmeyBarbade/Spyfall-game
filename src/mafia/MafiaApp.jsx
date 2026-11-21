import { useState, useEffect } from 'react'
import { useGameSocket } from './hooks/useGameSocket'
import { useLiveKitRoom } from './hooks/useLiveKitRoom'
import { GreenRoom } from './components/GreenRoom'
import { LobbyControls } from './components/LobbyControls'
import { PhaseBanner } from './components/PhaseBanner'
import { VideoGrid } from './components/VideoGrid'
import { RoleRevealModal } from './components/RoleRevealModal'
import { NightActionBar } from './components/NightActionBar'
import { GameOverSummary } from './components/GameOverSummary'
import { DemoBanner } from './components/DemoBanner'
import { MediaControls } from './components/MediaControls'
import { Users, Plus, LogIn, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react'

export function MafiaApp() {
  const {
    isConnected,
    roomState,
    playerId,
    roomCode,
    livekitAuth,
    error,
    setError,
    createRoom,
    joinRoom,
    leaveRoom,
    toggleReady,
    updateSettings,
    startGame,
    targetMafia,
    saveDoctor,
    noteVillager,
    readyToVote,
    castVote,
    playAgain,
  } = useGameSocket()

  const {
    isMock,
    isSpeaking,
    participantsMap,
    isMicMuted,
    isCamMuted,
    toggleMic,
    toggleCam,
    unlockAudio,
    enableLocalMedia,
    toggleSimulateSpeaking,
  } = useLiveKitRoom(livekitAuth, playerId)

  // Local UI state
  const [playerNameInput, setPlayerNameInput] = useState(() => localStorage.getItem('mafia_player_name') || '')
  const [joinCodeInput, setJoinCodeInput] = useState('')
  const [hasPassedGreenRoom, setHasPassedGreenRoom] = useState(false)
  const [selectedTargetId, setSelectedTargetId] = useState(null)
  const [selectedVoteId, setSelectedVoteId] = useState(null)
  const [showRoleOptions, setShowRoleOptions] = useState(false)
  const [customMafiaCount, setCustomMafiaCount] = useState('auto')
  const [customDoctorCount, setCustomDoctorCount] = useState('auto')

  // Auto-fill join code from URL params ?room=CODE
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('room')
      if (code) {
        setJoinCodeInput(code.toUpperCase())
      }
    } catch {
      // ignore
    }
  }, [])

  // Reset target selection across phases
  useEffect(() => {
    setSelectedTargetId(null)
    setSelectedVoteId(null)
  }, [roomState?.phase, roomState?.roundNumber])

  // Save player name
  const handleSaveName = (name) => {
    setPlayerNameInput(name)
    localStorage.setItem('mafia_player_name', name)
  }

  const handleCreate = async () => {
    if (!playerNameInput.trim()) {
      setError('Please enter your name.')
      return
    }
    handleSaveName(playerNameInput.trim())
    try {
      await createRoom(playerNameInput.trim(), {
        mafiaCount: customMafiaCount,
        doctorCount: customDoctorCount,
      })
    } catch (err) {
      console.error(err)
    }
  }

  const handleJoin = async () => {
    if (!playerNameInput.trim()) {
      setError('Please enter your name.')
      return
    }
    if (!joinCodeInput.trim()) {
      setError('Please enter the 4-character room code.')
      return
    }
    handleSaveName(playerNameInput.trim())
    try {
      await joinRoom(joinCodeInput.trim().toUpperCase(), playerNameInput.trim())
    } catch (err) {
      console.error(err)
    }
  }

  // Handle Night targeting action
  const handleNightTarget = (targetId) => {
    setSelectedTargetId(targetId)
    const localPlayer = roomState?.players?.find((p) => p.id === playerId)
    if (!localPlayer) return

    if (localPlayer.role === 'MAFIA') {
      targetMafia(targetId)
    } else if (localPlayer.role === 'DOCTOR') {
      saveDoctor(targetId)
    } else if (localPlayer.role === 'VILLAGER') {
      noteVillager(targetId)
    }
  }

  // Handle Day voting action
  const handleDayVote = (targetId) => {
    setSelectedVoteId(targetId)
    castVote(targetId)
  }

  const localPlayer = roomState?.players?.find((p) => p.id === playerId)
  const partnerPlayer =
    localPlayer?.role === 'MAFIA'
      ? roomState?.players?.find((p) => p.id !== playerId && p.role === 'MAFIA')
      : null

  // Atmospheric background: Light Editorial canvas (#FAF9F6) during Day & Lobby,
  // transitioning to calm Matte Twilight Slate (#1E242B) during Night & Dawn Cooldown!
  const isNightTime =
    roomState?.phase === 'NIGHT' || roomState?.phase === 'DAWN_COOLDOWN'

  const containerBg = isNightTime
    ? 'bg-[#181E26] text-stone-100'
    : 'bg-[#FAF9F6] dark:bg-[#12161A] text-stone-900 dark:text-stone-100'

  return (
    <div
      className={`min-h-[92vh] flex flex-col transition-colors duration-700 ${containerBg}`}
    >
      {/* Mock Video Mode Banner */}
      {isMock && (
        <DemoBanner
          onToggleSimulateSpeaking={() => toggleSimulateSpeaking(playerId)}
          isLocalSpeaking={isSpeaking(playerId)}
        />
      )}

      {/* Global Error Banner */}
      {error && (
        <div className="bg-red-500/10 border-b border-red-500/30 px-4 py-2 text-xs text-red-600 dark:text-red-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </span>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-400 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. HOME SCREEN: No active room */}
      {!roomState && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 max-w-md mx-auto w-full">
          {/* Hero */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-red-600 to-rose-700 mb-4 shadow-xl shadow-red-900/30">
              <span className="text-4xl">🎭</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-stone-900 dark:text-white">
              MAFIA VIDEO
            </h1>
            <p className="text-xs uppercase tracking-widest text-stone-400 font-bold mt-1">
              Automated Moderator • LiveKit WebRTC
            </p>
          </div>

          {/* Form Card */}
          <div className="w-full bg-white dark:bg-[#1E242B] border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                Your Display Name
              </label>
              <input
                type="text"
                maxLength={16}
                value={playerNameInput}
                onChange={(e) => setPlayerNameInput(e.target.value)}
                placeholder="e.g. Vito, Tony, Mia..."
                className="w-full px-4 py-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Role Customization Options */}
            <div className="bg-stone-50 dark:bg-stone-900/60 rounded-xl p-3 border border-stone-200 dark:border-stone-800 flex flex-col gap-2.5">
              <div
                onClick={() => setShowRoleOptions(!showRoleOptions)}
                className="flex items-center justify-between cursor-pointer select-none"
              >
                <span className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <span>⚙️</span> Room Role Settings {showRoleOptions ? '▲' : '▼'}
                </span>
                <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
                  {customMafiaCount === 'auto' ? 'Auto Mafia' : `${customMafiaCount} Mafia`} •{' '}
                  {customDoctorCount === 'auto' ? 'Auto Doc' : `${customDoctorCount} Doc`}
                </span>
              </div>

              {showRoleOptions && (
                <div className="flex flex-col gap-3 pt-2 border-t border-stone-200 dark:border-stone-800 animate-fade-in text-xs">
                  {/* Mafia Selection */}
                  <div>
                    <label className="font-semibold text-stone-600 dark:text-stone-400 block mb-1">
                      🎭 Mafia Count:
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {['auto', 1, 2, 3].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setCustomMafiaCount(val)}
                          className={`py-1.5 rounded-lg font-bold text-xs border transition-all ${
                            customMafiaCount === val
                              ? 'bg-red-600 text-white border-red-500 shadow-sm'
                              : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                          }`}
                        >
                          {val === 'auto' ? 'Auto' : val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Doctor Selection */}
                  <div>
                    <label className="font-semibold text-stone-600 dark:text-stone-400 block mb-1">
                      🛡️ Doctor Count:
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {['auto', 0, 1, 2].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setCustomDoctorCount(val)}
                          className={`py-1.5 rounded-lg font-bold text-xs border transition-all ${
                            customDoctorCount === val
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                              : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                          }`}
                        >
                          {val === 'auto' ? 'Auto' : val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Create Room Button */}
            <button
              onClick={handleCreate}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-red-600 via-rose-600 to-purple-600 hover:from-red-500 hover:to-purple-500 shadow-lg shadow-red-900/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Mafia Room</span>
            </button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200 dark:border-stone-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-[#1E242B] px-2 text-stone-400 font-semibold">
                  Or Join Existing
                </span>
              </div>
            </div>

            {/* Join Room Input & Button */}
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={4}
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                placeholder="ROOM CODE"
                className="w-36 text-center font-mono font-black uppercase tracking-widest px-3 py-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={handleJoin}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-stone-800 hover:bg-stone-700 dark:bg-stone-700 dark:hover:bg-stone-600 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm"
              >
                <span>Join</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. GREEN ROOM CHECK (Before entering the table) */}
      {roomState && !hasPassedGreenRoom && (
        <GreenRoom
          playerName={localPlayer?.name || playerNameInput}
          roomCode={roomState.code}
          isMock={isMock}
          unlockAudio={unlockAudio}
          onJoinTable={async ({ micEnabled, camEnabled }) => {
            setHasPassedGreenRoom(true)
            await enableLocalMedia({ mic: micEnabled, cam: camEnabled })
          }}
        />
      )}

      {/* 3. IN-GAME / LOBBY TABLE */}
      {roomState && hasPassedGreenRoom && (
        <div className="flex-1 flex flex-col py-3">
          {/* Top Phase Editorial Banner */}
          <PhaseBanner
            roomState={roomState}
            localPlayerId={playerId}
            onReadyToVote={readyToVote}
          />

          {/* Lobby Controls & Settings (in LOBBY phase) */}
          {roomState.phase === 'LOBBY' && (
            <LobbyControls
              roomState={roomState}
              localPlayerId={playerId}
              onToggleReady={toggleReady}
              onUpdateSettings={updateSettings}
              onStartGame={startGame}
              onLeaveRoom={() => {
                leaveRoom()
                setHasPassedGreenRoom(false)
              }}
            />
          )}

          {/* Interactive Player Video Tile Grid */}
          <VideoGrid
            roomState={roomState}
            localPlayerId={playerId}
            isSpeaking={isSpeaking}
            onTarget={handleNightTarget}
            onVote={handleDayVote}
            selectedTargetId={selectedTargetId}
            selectedVoteId={selectedVoteId}
            participantsMap={participantsMap}
          />

          {/* Night Bottom Action Bar */}
          <NightActionBar
            localPlayer={localPlayer}
            roomState={roomState}
            selectedTargetId={selectedTargetId}
          />

          {/* 6-Second Role Reveal Dramatic Modal */}
          {roomState.phase === 'ROLE_REVEAL' && (
            <RoleRevealModal
              role={localPlayer?.role}
              partnerPlayer={partnerPlayer}
              phaseEndsAt={roomState.phaseEndsAt}
            />
          )}

          {/* Game Over Full Reveal & Rematch Summary */}
          {roomState.phase === 'GAME_OVER' && (
            <GameOverSummary
              roomState={roomState}
              localPlayerId={playerId}
              onPlayAgain={playAgain}
            />
          )}

          {/* Quick Floating Media Controls (Mute / Cam Switch) */}
          <MediaControls
            isMicMuted={isMicMuted}
            isCamMuted={isCamMuted}
            onToggleMic={toggleMic}
            onToggleCam={toggleCam}
            phase={roomState.phase}
            isAlive={localPlayer?.isAlive ?? true}
          />
        </div>
      )}
    </div>
  )
}
