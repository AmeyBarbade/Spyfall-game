/**
 * Anti-Cheat State Sanitizer
 * Strips sensitive hidden roles and actions before sending room state to a specific player
 */
export function sanitizeStateForPlayer(room, recipientPlayerId) {
  if (!room) return null

  const isGameOver = room.phase === 'GAME_OVER'
  const recipient = room.players.get(recipientPlayerId)
  const isRecipientMafia = recipient && recipient.role === 'MAFIA'

  // Map players with anti-cheat role isolation
  const sanitizedPlayers = Array.from(room.players.values()).map((p) => {
    let visibleRole = null

    if (isGameOver) {
      // In GAME_OVER, all roles are revealed to everyone
      visibleRole = p.role
    } else if (p.id === recipientPlayerId) {
      // Player always knows their own assigned role (once past LOBBY)
      visibleRole = room.phase === 'LOBBY' ? null : p.role
    } else if (isRecipientMafia && p.role === 'MAFIA') {
      // Mafias know their fellow Mafia partner
      visibleRole = 'MAFIA'
    } else {
      // Stripped for all others (even dead players do not see Mafias until GAME_OVER)
      visibleRole = null
    }

    return {
      id: p.id,
      name: p.name,
      isHost: p.id === room.hostId,
      isReady: p.isReady,
      isAlive: p.isAlive,
      eliminatedReason: p.eliminatedReason || null,
      isAway: !!p.isAway,
      isDisconnected: !!p.isDisconnected,
      disconnectExpiresAt: p.disconnectExpiresAt || null,
      role: visibleRole,
      hasVoted: room.phase === 'DAY_VOTING' ? (room.votes ? room.votes.has(p.id) : false) : false,
    }
  })

  // Mafia live target sync: visible ONLY to Mafia members during NIGHT
  let mafiaTargetSync = null
  if (isRecipientMafia && (room.phase === 'NIGHT' || room.phase === 'DAWN_COOLDOWN')) {
    mafiaTargetSync = {
      targets: Object.fromEntries(room.nightActions.mafiaTargets || new Map()),
      lockedTarget: room.nightActions.mafiaConsensusTarget || null,
    }
  }

  // Doctor self-save status: visible ONLY to Doctor
  let doctorStatus = null
  if (recipient && recipient.role === 'DOCTOR') {
    doctorStatus = {
      lastSavedId: room.doctorState?.lastSavedId || null,
      selfSaveUsed: !!room.doctorState?.selfSaveUsed,
      canSelfSave: room.settings?.doctorSelfSaveRule === 'unlimited' || 
        (room.settings?.doctorSelfSaveRule === 'once' && !room.doctorState?.selfSaveUsed),
    }
  }

  // Day voting tallies: in DAY_VOTING, reveal count of votes or live badges; in EXECUTION_REVEAL, reveal full who-voted-for-whom
  let voteState = null
  if (room.phase === 'DAY_VOTING') {
    const counts = {}
    if (room.votes) {
      for (const [voterId, targetId] of room.votes.entries()) {
        counts[targetId] = (counts[targetId] || 0) + 1
      }
    }
    voteState = {
      counts,
      myVote: room.votes ? room.votes.get(recipientPlayerId) || null : null,
      readyToVoteCount: room.readyToVote ? room.readyToVote.size : 0,
    }
  } else if (room.phase === 'EXECUTION_REVEAL' || isGameOver) {
    voteState = {
      tally: room.lastExecutionTally || null,
      executedId: room.lastExecutedId || null,
    }
  }

  // Day discussion: ready to vote count
  let discussionState = null
  if (room.phase === 'DAY_DISCUSSION') {
    discussionState = {
      readyToVoteCount: room.readyToVote ? room.readyToVote.size : 0,
      myReadyToVote: room.readyToVote ? room.readyToVote.has(recipientPlayerId) : false,
      livingCount: sanitizedPlayers.filter((p) => p.isAlive).length,
    }
  }

  return {
    code: room.code,
    hostId: room.hostId,
    phase: room.phase,
    phaseId: room.phaseId,
    roundNumber: room.roundNumber,
    phaseEndsAt: room.phaseEndsAt,
    nightWarning: !!room.nightWarning,
    nightWarningEndsAt: room.nightWarningEndsAt || null,
    settings: room.settings,
    players: sanitizedPlayers,
    winner: room.winner || null,
    winReason: room.winReason || null,
    lastNightResult: room.lastNightResult || null,
    gameLog: isGameOver ? room.gameLog : undefined,
    timeline: isGameOver ? room.timeline : undefined,
    mafiaTargetSync,
    doctorStatus,
    voteState,
    discussionState,
  }
}
