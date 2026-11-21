import { useState, useEffect, useRef } from 'react'
import {
  Mic,
  MicOff,
  VideoOff,
  Crown,
  Target,
  Shield,
  Lock,
  Skull,
  Eye,
  WifiOff,
  Clock,
  Sparkles,
} from 'lucide-react'

export function PlayerTile({
  player,
  localPlayer,
  phase,
  roundNumber,
  isSpeaking,
  mafiaTargetSync,
  doctorStatus,
  voteState,
  onTarget,
  isTargetSelected,
  onVote,
  isVoteSelected,
  livekitParticipant,
}) {
  const videoRef = useRef(null)
  const [hasVideoTrack, setHasVideoTrack] = useState(false)

  // Attach LiveKit video track dynamically with event listeners
  useEffect(() => {
    if (!livekitParticipant || !videoRef.current) {
      setHasVideoTrack(false)
      return
    }

    const attachBestTrack = () => {
      let trackToAttach = null
      if (livekitParticipant.videoTrackPublications) {
        for (const pub of livekitParticipant.videoTrackPublications.values()) {
          if (pub.track) {
            trackToAttach = pub.track
            break
          }
        }
      }

      if (trackToAttach && videoRef.current) {
        trackToAttach.attach(videoRef.current)
        setHasVideoTrack(true)
      } else {
        setHasVideoTrack(false)
      }
    }

    // Attach immediately if track is already available
    attachBestTrack()

    // Listen to participant's track publication/subscription events
    livekitParticipant.on('trackSubscribed', attachBestTrack)
    livekitParticipant.on('trackUnsubscribed', attachBestTrack)
    livekitParticipant.on('trackPublished', attachBestTrack)
    livekitParticipant.on('trackUnpublished', attachBestTrack)
    livekitParticipant.on('trackMuted', attachBestTrack)
    livekitParticipant.on('trackUnmuted', attachBestTrack)
    livekitParticipant.on('localTrackPublished', attachBestTrack)
    livekitParticipant.on('localTrackUnpublished', attachBestTrack)

    return () => {
      livekitParticipant.off('trackSubscribed', attachBestTrack)
      livekitParticipant.off('trackUnsubscribed', attachBestTrack)
      livekitParticipant.off('trackPublished', attachBestTrack)
      livekitParticipant.off('trackUnpublished', attachBestTrack)
      livekitParticipant.off('trackMuted', attachBestTrack)
      livekitParticipant.off('trackUnmuted', attachBestTrack)
      livekitParticipant.off('localTrackPublished', attachBestTrack)
      livekitParticipant.off('localTrackUnpublished', attachBestTrack)

      if (videoRef.current && livekitParticipant.videoTrackPublications) {
        for (const pub of livekitParticipant.videoTrackPublications.values()) {
          if (pub.track) {
            pub.track.detach(videoRef.current)
          }
        }
      }
      setHasVideoTrack(false)
    }
  }, [livekitParticipant])

  const isSelf = player.id === localPlayer?.id
  const isAlive = player.isAlive
  const localRole = localPlayer?.role

  // Night targeting state calculations
  const isNight = phase === 'NIGHT'
  const isVoting = phase === 'DAY_VOTING'
  const isExecutionReveal = phase === 'EXECUTION_REVEAL'

  // Mafia targeting logic
  const isLocalMafia = localRole === 'MAFIA'
  const isPlayerMafia = player.role === 'MAFIA'
  const isPartnerTarget =
    isLocalMafia &&
    mafiaTargetSync?.targets &&
    Object.entries(mafiaTargetSync.targets).some(
      ([pId, tId]) => pId !== localPlayer?.id && tId === player.id
    )
  const isConsensusTarget = mafiaTargetSync?.lockedTarget === player.id

  // Doctor targeting logic
  const isLocalDoctor = localRole === 'DOCTOR'
  const isDoctorCooldown =
    isLocalDoctor && doctorStatus?.lastSavedId === player.id
  const isDoctorSelfSaveBlocked =
    isLocalDoctor && isSelf && !doctorStatus?.canSelfSave

  // Day voting calculations
  const voteCount = voteState?.counts?.[player.id] || 0
  const executionVoters = voteState?.tally?.voters?.[player.id] || []
  const wasExecuted = voteState?.executedId === player.id

  // Determine card interactive styling & click handler
  let isClickable = false
  let handleClick = null

  if (isAlive && localPlayer?.isAlive) {
    if (isNight) {
      if (isLocalMafia && !isPlayerMafia) {
        isClickable = true
        handleClick = () => onTarget?.(player.id)
      } else if (isLocalDoctor && !isDoctorCooldown && !isDoctorSelfSaveBlocked) {
        isClickable = true
        handleClick = () => onTarget?.(player.id)
      } else if (localRole === 'VILLAGER' && !isSelf) {
        isClickable = true
        handleClick = () => onTarget?.(player.id)
      }
    } else if (isVoting) {
      isClickable = true
      handleClick = () => onVote?.(player.id)
    }
  }

  // Border & Glow styling
  let borderStyle = 'border-stone-200 dark:border-stone-800'
  if (isSpeaking) {
    borderStyle = 'border-amber-400 ring-2 ring-amber-400/50 shadow-lg shadow-amber-400/20'
  }
  if (isConsensusTarget) {
    borderStyle = 'border-red-600 ring-4 ring-red-600/60 shadow-xl shadow-red-600/40 animate-pulse'
  } else if (isTargetSelected) {
    borderStyle = isLocalDoctor
      ? 'border-emerald-500 ring-4 ring-emerald-500/50 shadow-xl shadow-emerald-500/30'
      : 'border-red-500 ring-2 ring-red-500/50 shadow-xl shadow-red-500/30'
  } else if (isVoteSelected) {
    borderStyle = 'border-purple-600 ring-4 ring-purple-600/50 shadow-xl shadow-purple-600/30'
  }

  // Avatar background colors based on name hash
  const getAvatarGradient = (name) => {
    const charCode = name.charCodeAt(0) || 0
    const gradients = [
      'from-blue-600 to-indigo-800',
      'from-purple-600 to-pink-800',
      'from-emerald-600 to-teal-800',
      'from-amber-600 to-orange-800',
      'from-rose-600 to-red-800',
      'from-violet-600 to-purple-900',
    ]
    return gradients[charCode % gradients.length]
  }

  return (
    <div
      onClick={isClickable ? handleClick : undefined}
      className={`relative rounded-2xl overflow-hidden border ${borderStyle} transition-all duration-300 flex flex-col aspect-[4/3] bg-stone-900 select-none shadow-md ${
        isClickable ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.99]' : ''
      } ${!isAlive ? 'grayscale opacity-70' : ''}`}
    >
      {/* Media: Video Track or Styled Avatar */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center">
        {/* Real LiveKit Video element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isSelf}
          className={`w-full h-full object-cover ${isSelf ? 'transform scale-x-[-1]' : ''} ${
            !hasVideoTrack || !isAlive ? 'hidden' : 'block'
          }`}
        />

        {/* Fallback Styled Avatar */}
        {(!hasVideoTrack || !isAlive) && (
          <div
            className={`w-full h-full bg-gradient-to-br ${getAvatarGradient(
              player.name
            )} flex flex-col items-center justify-center relative overflow-hidden`}
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/30 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white text-xl sm:text-2xl font-black shadow-inner">
              {player.name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>

      {/* Speaking Indicator Pulse Effect */}
      {isSpeaking && isAlive && (
        <div className="absolute inset-0 border-2 border-amber-400 rounded-2xl pointer-events-none animate-pulse" />
      )}

      {/* Top Overlays: Status Pills */}
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none z-10">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Host Crown */}
          {player.isHost && (
            <span className="p-1 rounded-md bg-amber-500/90 text-black text-[10px] font-black flex items-center gap-0.5 shadow">
              <Crown className="w-3 h-3 fill-current" />
            </span>
          )}

          {/* Role Badge (if visible to viewer) */}
          {player.role && (
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white shadow ${
                player.role === 'MAFIA'
                  ? 'bg-red-700/90'
                  : player.role === 'DOCTOR'
                  ? 'bg-emerald-700/90'
                  : 'bg-slate-700/90'
              }`}
            >
              {player.role}
            </span>
          )}

          {/* Away indicator */}
          {player.isAway && isAlive && (
            <span className="px-1.5 py-0.5 rounded-md bg-stone-800/80 text-amber-300 text-[10px] font-semibold flex items-center gap-1 backdrop-blur-sm">
              <Clock className="w-2.5 h-2.5" /> Away
            </span>
          )}

          {/* Disconnected 45s Grace Window */}
          {player.isDisconnected && (
            <span className="px-1.5 py-0.5 rounded-md bg-red-900/90 text-red-200 text-[10px] font-semibold flex items-center gap-1 animate-pulse">
              <WifiOff className="w-2.5 h-2.5" /> Reconnecting...
            </span>
          )}
        </div>

        {/* LiveKit mic/cam indicators */}
        <div className="flex items-center gap-1">
          {isSpeaking && isAlive && (
            <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-black text-[9px] font-black tracking-wide animate-pulse">
              SPEAKING
            </span>
          )}
        </div>
      </div>

      {/* Center Target & Vote Overlays */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
        {/* Ghost ELIMINATED overlay */}
        {!isAlive && (
          <div className="px-3 py-1.5 rounded-xl bg-black/80 border border-white/10 text-stone-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-md shadow-2xl">
            <Skull className="w-4 h-4 text-red-400" />
            <span>Eliminated</span>
          </div>
        )}

        {/* Mafia Target Locked (Consensus) */}
        {isAlive && isConsensusTarget && (
          <div className="px-3 py-1.5 rounded-xl bg-red-600 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-xl animate-bounce">
            <Target className="w-4 h-4" />
            <span>Target Locked</span>
          </div>
        )}

        {/* Mafia Single Target / Partner Target */}
        {isAlive && !isConsensusTarget && (isTargetSelected || isPartnerTarget) && (
          <div className="flex flex-col gap-1 items-center">
            {isTargetSelected && isLocalMafia && (
              <span className="px-2.5 py-1 rounded-lg bg-red-500/90 text-white font-bold text-[11px] flex items-center gap-1 shadow-md">
                <Target className="w-3 h-3" /> My Target
              </span>
            )}
            {isPartnerTarget && (
              <span className="px-2.5 py-1 rounded-lg bg-red-700/90 text-red-200 font-bold text-[11px] flex items-center gap-1 shadow-md">
                <Eye className="w-3 h-3" /> Partner Target
              </span>
            )}
          </div>
        )}

        {/* Doctor Protected Target */}
        {isAlive && isTargetSelected && isLocalDoctor && (
          <div className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-xl">
            <Shield className="w-4 h-4" />
            <span>Protected</span>
          </div>
        )}

        {/* Doctor Cooldown Lock */}
        {isAlive && isDoctorCooldown && (
          <div className="px-2.5 py-1 rounded-lg bg-stone-900/80 text-stone-400 font-semibold text-[10px] flex items-center gap-1 border border-stone-700">
            <Lock className="w-3 h-3" /> Cooldown
          </div>
        )}

        {/* Villager Suspicion Note Marker */}
        {isAlive && isTargetSelected && localRole === 'VILLAGER' && (
          <div className="px-2.5 py-1 rounded-lg bg-indigo-600/90 text-white font-semibold text-[10px] flex items-center gap-1 shadow-md">
            <span>Suspicious</span>
          </div>
        )}

        {/* Day Voting Selected */}
        {isAlive && isVoteSelected && (
          <div className="px-3 py-1.5 rounded-xl bg-purple-600 text-white font-black text-xs uppercase tracking-wider shadow-xl flex items-center gap-1">
            <span>Vote Cast</span>
          </div>
        )}

        {/* Executed reveal badge */}
        {isExecutionReveal && wasExecuted && (
          <div className="px-3 py-1.5 rounded-xl bg-red-700 text-white font-black text-xs uppercase tracking-wider shadow-2xl flex items-center gap-1 animate-bounce">
            <Skull className="w-4 h-4" />
            <span>Executed</span>
          </div>
        )}
      </div>

      {/* Bottom Docked Info Bar */}
      <div className="mt-auto relative z-10 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2 sm:p-2.5 flex items-center justify-between text-white">
        <div className="flex items-center gap-1.5 truncate">
          <span className="font-bold text-xs sm:text-sm truncate drop-shadow">
            {player.name}
          </span>
          {isSelf && (
            <span className="text-[10px] px-1 py-0.2 rounded bg-white/20 text-stone-200">
              You
            </span>
          )}
        </div>

        {/* Vote count badge during Voting / Execution */}
        {(isVoting || isExecutionReveal) && voteCount > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-black text-[11px] shadow">
            {voteCount} {voteCount === 1 ? 'Vote' : 'Votes'}
          </span>
        )}
      </div>

      {/* Execution Reveal Voter Names List */}
      {isExecutionReveal && executionVoters.length > 0 && (
        <div className="absolute bottom-9 left-2 right-2 bg-black/80 backdrop-blur-md rounded-lg p-1.5 text-[9px] text-stone-300 z-20 border border-white/10">
          <span className="font-bold text-stone-400">Voted by: </span>
          {executionVoters.join(', ')}
        </div>
      )}
    </div>
  )
}
