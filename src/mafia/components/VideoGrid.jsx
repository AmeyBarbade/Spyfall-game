import { useState } from 'react'
import { PlayerTile } from './PlayerTile'
import { SkipForward } from 'lucide-react'

export function VideoGrid({
  roomState,
  localPlayerId,
  isSpeaking,
  onTarget,
  onVote,
  selectedTargetId,
  selectedVoteId,
  participantsMap = {},
}) {
  if (!roomState) return null

  const players = roomState.players || []
  const localPlayer = players.find((p) => p.id === localPlayerId)
  const phase = roomState.phase
  const isVoting = phase === 'DAY_VOTING'

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-2 flex flex-col gap-4">
      {/* Video Tile Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-4">
        {players.map((player) => (
          <PlayerTile
            key={player.id}
            player={player}
            localPlayer={localPlayer}
            phase={phase}
            roundNumber={roomState.roundNumber}
            isSpeaking={isSpeaking(player.id)}
            mafiaTargetSync={roomState.mafiaTargetSync}
            doctorStatus={roomState.doctorStatus}
            voteState={roomState.voteState}
            onTarget={onTarget}
            isTargetSelected={selectedTargetId === player.id}
            onVote={onVote}
            isVoteSelected={selectedVoteId === player.id}
            livekitParticipant={participantsMap[player.id]}
          />
        ))}
      </div>

      {/* Skip Vote option during DAY_VOTING */}
      {isVoting && localPlayer?.isAlive && (
        <div className="flex justify-center mt-2">
          <button
            onClick={() => onVote('SKIP')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 border transition-all ${
              selectedVoteId === 'SKIP'
                ? 'bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-900/30'
                : 'bg-white dark:bg-[#1E242B] border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
            }`}
          >
            <SkipForward className="w-4 h-4" />
            <span>Skip Vote (Abstain)</span>
            {roomState.voteState?.counts?.['SKIP'] > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-stone-800 text-white text-xs">
                {roomState.voteState.counts['SKIP']}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
