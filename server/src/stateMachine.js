import { allocateRoles } from './roleAllocator.js'
import {
  updateParticipantPermissions,
  muteParticipantAudio,
} from './livekitService.js'

/**
 * 9-Phase Finite State Machine for Mafia Game
 */
export class GameStateMachine {
  constructor(room, io) {
    this.room = room
    this.io = io
    this.timer = null
  }

  /**
   * Transition to a new phase
   */
  transitionTo(nextPhase, durationSeconds = null) {
    // Clear any existing active phase timer
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    this.room.phase = nextPhase
    this.room.phaseId = (this.room.phaseId || 0) + 1
    const phaseEndsAt = durationSeconds ? Date.now() + durationSeconds * 1000 : null
    this.room.phaseEndsAt = phaseEndsAt

    console.log(`[Room ${this.room.code}] Phase -> ${nextPhase} (phaseId: ${this.room.phaseId}, duration: ${durationSeconds || 'none'})`)

    switch (nextPhase) {
      case 'LOBBY':
        this.handleLobbyPhase()
        break
      case 'ROLE_REVEAL':
        this.handleRoleRevealPhase(durationSeconds || 6)
        break
      case 'NIGHT':
        this.handleNightPhase(durationSeconds || this.room.settings.nightTimer)
        break
      case 'DAWN_COOLDOWN':
        this.handleDawnCooldownPhase(durationSeconds || 3)
        break
      case 'MORNING_REVEAL':
        this.handleMorningRevealPhase(durationSeconds || 5)
        break
      case 'DAY_DISCUSSION':
        this.handleDayDiscussionPhase(durationSeconds || this.room.settings.discussionTimer)
        break
      case 'DAY_VOTING':
        this.handleDayVotingPhase(durationSeconds || 25)
        break
      case 'EXECUTION_REVEAL':
        this.handleExecutionRevealPhase(durationSeconds || 5)
        break
      case 'GAME_OVER':
        this.handleGameOverPhase()
        break
    }

    this.broadcastState()
  }

  /**
   * Broadcast state to all connected players (each sanitized individually)
   */
  broadcastState() {
    this.room.broadcastSanitizedState()
  }

  /**
   * Phase 1: LOBBY
   */
  handleLobbyPhase() {
    this.room.readyToVote = new Set()
    this.room.votes = new Map()
    this.room.nightActions = {
      mafiaTargets: new Map(),
      mafiaConsensusTarget: null,
      doctorTarget: null,
      villagerNotes: new Map(),
    }
    this.room.doctorState = {
      lastSavedId: null,
      selfSaveUsed: false,
    }
    this.room.lastNightResult = null
    this.room.lastExecutionTally = null
    this.room.lastExecutedId = null
    this.room.winner = null
    this.room.winReason = null
    this.room.timeline = []
    this.room.gameLog = []

    // Reset player statuses
    for (const player of this.room.players.values()) {
      player.isReady = false
      player.isAlive = true
      player.role = null
      player.eliminatedReason = null
      // Restore LiveKit publish permissions
      updateParticipantPermissions(this.room.code, player.id, {
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      })
    }
  }

  /**
   * Phase 2: ROLE_REVEAL (6s)
   */
  handleRoleRevealPhase(duration) {
    this.room.roundNumber = 1
    this.room.timeline = []
    this.room.gameLog = []

    // 1. Allocate roles
    const playerList = Array.from(this.room.players.values())
    const roleMap = allocateRoles(playerList, this.room.settings)
    for (const [playerId, role] of roleMap.entries()) {
      const player = this.room.players.get(playerId)
      if (player) {
        player.role = role
        player.isAlive = true
      }
    }

    // 2. Mute all mics for role reveal (Gasp Mute)
    for (const player of this.room.players.values()) {
      muteParticipantAudio(this.room.code, player.id, true)
    }

    this.room.gameLog.push({
      round: 1,
      phase: 'ROLE_REVEAL',
      message: 'Game started. Roles assigned.',
      timestamp: Date.now(),
    })

    const currentPhaseId = this.room.phaseId
    this.timer = setTimeout(() => {
      if (this.room.phaseId === currentPhaseId) {
        this.transitionTo('NIGHT')
      }
    }, duration * 1000)
  }

  /**
   * Phase 3: NIGHT (25s - 40s)
   */
  handleNightPhase(duration) {
    this.room.nightActions = {
      mafiaTargets: new Map(),
      mafiaConsensusTarget: null,
      doctorTarget: null,
      villagerNotes: new Map(),
    }

    // Keep mics muted during Night
    for (const player of this.room.players.values()) {
      muteParticipantAudio(this.room.code, player.id, true)
    }

    const currentPhaseId = this.room.phaseId
    this.timer = setTimeout(() => {
      if (this.room.phaseId === currentPhaseId) {
        this.transitionTo('DAWN_COOLDOWN')
      }
    }, duration * 1000)
  }

  /**
   * Phase 4: DAWN_COOLDOWN (3s)
   * Resolves Mafia consensus and Doctor save
   */
  handleDawnCooldownPhase(duration) {
    this.room.timeline = this.room.timeline || []
    this.room.gameLog = this.room.gameLog || []

    // 1. Resolve Mafia target
    const mafiaTargets = Array.from(this.room.nightActions.mafiaTargets.values())
    let resolvedMafiaTarget = null

    if (mafiaTargets.length > 0) {
      const counts = {}
      for (const t of mafiaTargets) {
        counts[t] = (counts[t] || 0) + 1
      }

      // Check consensus
      const uniqueTargets = Object.keys(counts)
      if (uniqueTargets.length === 1) {
        resolvedMafiaTarget = uniqueTargets[0]
      } else if (uniqueTargets.length === 2 && counts[uniqueTargets[0]] === counts[uniqueTargets[1]]) {
        // 50/50 random tie-breaker between split targets
        resolvedMafiaTarget = Math.random() < 0.5 ? uniqueTargets[0] : uniqueTargets[1]
      } else {
        // Target with highest votes
        resolvedMafiaTarget = uniqueTargets.reduce((a, b) => counts[a] > counts[b] ? a : b)
      }
    }

    // 2. Resolve Doctor save
    const doctorTarget = this.room.nightActions.doctorTarget
    let victimDied = false
    let killedPlayerId = null
    let wasSaved = false

    if (resolvedMafiaTarget) {
      if (doctorTarget && doctorTarget === resolvedMafiaTarget) {
        // Clutch save!
        wasSaved = true
        this.room.timeline.push({
          round: this.room.roundNumber,
          type: 'DOCTOR_SAVE',
          targetId: doctorTarget,
          targetName: this.room.players.get(doctorTarget)?.name || 'Unknown',
          description: `Doctor protected ${this.room.players.get(doctorTarget)?.name || 'a player'} from Mafia attack!`,
        })
      } else {
        victimDied = true
        killedPlayerId = resolvedMafiaTarget
        const victim = this.room.players.get(killedPlayerId)
        if (victim) {
          victim.isAlive = false
          victim.eliminatedReason = 'KILLED_BY_MAFIA'
          // Revoke publishing on LiveKit immediately
          updateParticipantPermissions(this.room.code, victim.id, {
            canPublish: false,
            canSubscribe: true,
            canPublishData: false,
          })
        }
        this.room.timeline.push({
          round: this.room.roundNumber,
          type: 'NIGHT_KILL',
          targetId: killedPlayerId,
          targetName: victim?.name || 'Unknown',
          description: `${victim?.name || 'A player'} was killed in the night.`,
        })
      }
    } else {
      // AFK Mafia - no one died
      this.room.timeline.push({
        round: this.room.roundNumber,
        type: 'PEACEFUL_NIGHT',
        description: 'The city slept peacefully without incident.',
      })
    }

    // Update Doctor state for next night
    if (doctorTarget) {
      this.room.doctorState.lastSavedId = doctorTarget
      const doctorPlayer = Array.from(this.room.players.values()).find((p) => p.role === 'DOCTOR')
      if (doctorPlayer && doctorTarget === doctorPlayer.id) {
        this.room.doctorState.selfSaveUsed = true
      }
    } else {
      this.room.doctorState.lastSavedId = null
    }

    this.room.lastNightResult = {
      victimId: killedPlayerId,
      victimName: killedPlayerId ? this.room.players.get(killedPlayerId)?.name : null,
      saved: wasSaved,
    }

    const currentPhaseId = this.room.phaseId
    this.timer = setTimeout(() => {
      if (this.room.phaseId === currentPhaseId) {
        this.transitionTo('MORNING_REVEAL')
      }
    }, duration * 1000)
  }

  /**
   * Phase 5: MORNING_REVEAL (5s)
   */
  handleMorningRevealPhase(duration) {
    // Check win condition #1
    const winResult = this.checkWinCondition()
    if (winResult.gameOver) {
      this.room.winner = winResult.winner
      this.room.winReason = winResult.reason
      const currentPhaseId = this.room.phaseId
      this.timer = setTimeout(() => {
        if (this.room.phaseId === currentPhaseId) {
          this.transitionTo('GAME_OVER')
        }
      }, duration * 1000)
      return
    }

    const currentPhaseId = this.room.phaseId
    this.timer = setTimeout(() => {
      if (this.room.phaseId === currentPhaseId) {
        this.transitionTo('DAY_DISCUSSION')
      }
    }, duration * 1000)
  }

  /**
   * Phase 6: DAY_DISCUSSION (60s - 180s)
   */
  handleDayDiscussionPhase(duration) {
    this.room.readyToVote = new Set()

    // Unmute living players, keep eliminated ghosts muted & video revoked
    for (const player of this.room.players.values()) {
      if (player.isAlive) {
        muteParticipantAudio(this.room.code, player.id, false)
      } else {
        updateParticipantPermissions(this.room.code, player.id, {
          canPublish: false,
          canSubscribe: true,
          canPublishData: false,
        })
      }
    }

    const currentPhaseId = this.room.phaseId
    this.timer = setTimeout(() => {
      if (this.room.phaseId === currentPhaseId) {
        this.transitionTo('DAY_VOTING')
      }
    }, duration * 1000)
  }

  /**
   * Phase 7: DAY_VOTING (25s)
   */
  handleDayVotingPhase(duration) {
    this.room.votes = new Map()

    const currentPhaseId = this.room.phaseId
    this.timer = setTimeout(() => {
      if (this.room.phaseId === currentPhaseId) {
        this.transitionTo('EXECUTION_REVEAL')
      }
    }, duration * 1000)
  }

  /**
   * Phase 8: EXECUTION_REVEAL (5s)
   */
  handleExecutionRevealPhase(duration) {
    this.room.timeline = this.room.timeline || []
    this.room.gameLog = this.room.gameLog || []

    const alivePlayers = Array.from(this.room.players.values()).filter((p) => p.isAlive)
    const votes = this.room.votes || new Map()

    // Tally votes
    const tally = {}
    const voterMap = {}
    for (const [voterId, targetId] of votes.entries()) {
      tally[targetId] = (tally[targetId] || 0) + 1
      if (!voterMap[targetId]) voterMap[targetId] = []
      const voter = this.room.players.get(voterId)
      if (voter) voterMap[targetId].push(voter.name)
    }

    this.room.lastExecutionTally = {
      counts: tally,
      voters: voterMap,
    }

    // Strict plurality calculation
    let maxVotes = 0
    let leader = null
    let isTie = false

    for (const [targetId, count] of Object.entries(tally)) {
      if (count > maxVotes) {
        maxVotes = count
        leader = targetId
        isTie = false
      } else if (count === maxVotes) {
        isTie = true
      }
    }

    let executedId = null
    if (!isTie && leader && leader !== 'SKIP' && maxVotes > 0) {
      executedId = leader
      const executed = this.room.players.get(executedId)
      if (executed) {
        executed.isAlive = false
        executed.eliminatedReason = 'EXECUTED_BY_VOTE'
        // Revoke LiveKit publish permissions
        updateParticipantPermissions(this.room.code, executed.id, {
          canPublish: false,
          canSubscribe: true,
          canPublishData: false,
        })
        this.room.timeline.push({
          round: this.room.roundNumber,
          type: 'DAY_EXECUTION',
          targetId: executed.id,
          targetName: executed.name,
          votes: maxVotes,
          description: `${executed.name} was executed by the town with ${maxVotes} votes.`,
        })
      }
    } else {
      this.room.timeline.push({
        round: this.room.roundNumber,
        type: 'DAY_NO_EXECUTION',
        description: isTie ? 'Voting ended in a tie. No one was executed.' : 'Town chose to skip execution.',
      })
    }

    this.room.lastExecutedId = executedId

    // Check win condition #2
    const winResult = this.checkWinCondition()
    if (winResult.gameOver) {
      this.room.winner = winResult.winner
      this.room.winReason = winResult.reason
      const currentPhaseId = this.room.phaseId
      this.timer = setTimeout(() => {
        if (this.room.phaseId === currentPhaseId) {
          this.transitionTo('GAME_OVER')
        }
      }, duration * 1000)
      return
    }

    const currentPhaseId = this.room.phaseId
    this.timer = setTimeout(() => {
      if (this.room.phaseId === currentPhaseId) {
        this.room.roundNumber += 1
        this.transitionTo('NIGHT')
      }
    }, duration * 1000)
  }

  /**
   * Phase 9: GAME_OVER
   */
  handleGameOverPhase() {
    console.log(`[Room ${this.room.code}] GAME_OVER: Winner is ${this.room.winner} (${this.room.winReason})`)

    // Restore full publish permissions for all players (everyone can talk and show video again)
    for (const player of this.room.players.values()) {
      updateParticipantPermissions(this.room.code, player.id, {
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      })
      muteParticipantAudio(this.room.code, player.id, false)
    }
  }

  /**
   * Exact Win Condition Check
   * Town Wins: aliveMafia === 0
   * Mafia Wins: aliveMafia >= aliveNonMafia (Parity)
   */
  checkWinCondition() {
    let aliveMafia = 0
    let aliveNonMafia = 0

    for (const player of this.room.players.values()) {
      if (player.isAlive) {
        if (player.role === 'MAFIA') {
          aliveMafia++
        } else {
          aliveNonMafia++
        }
      }
    }

    if (aliveMafia === 0) {
      return {
        gameOver: true,
        winner: 'VILLAGERS',
        reason: 'All Mafia have been eliminated! The town is safe.',
      }
    }

    if (aliveMafia >= aliveNonMafia) {
      return {
        gameOver: true,
        winner: 'MAFIA',
        reason: 'Mafia has achieved parity with the town! Mafia wins.',
      }
    }

    return { gameOver: false }
  }

  /**
   * Action: Mafia Target Pick
   */
  handleMafiaTarget(playerId, targetId, phaseId) {
    if (this.room.phase !== 'NIGHT') return false
    if (this.room.phaseId !== phaseId) return false

    const player = this.room.players.get(playerId)
    if (!player || !player.isAlive || player.role !== 'MAFIA') return false

    const target = this.room.players.get(targetId)
    if (!target || !target.isAlive || target.role === 'MAFIA') return false

    this.room.nightActions.mafiaTargets.set(playerId, targetId)

    // Check if all living Mafias agree
    const livingMafias = Array.from(this.room.players.values()).filter((p) => p.isAlive && p.role === 'MAFIA')
    const picks = livingMafias.map((m) => this.room.nightActions.mafiaTargets.get(m.id)).filter(Boolean)

    if (picks.length === livingMafias.length && picks.every((id) => id === targetId)) {
      this.room.nightActions.mafiaConsensusTarget = targetId
    } else {
      this.room.nightActions.mafiaConsensusTarget = null
    }

    this.broadcastState()
    return true
  }

  /**
   * Action: Doctor Save Pick
   */
  handleDoctorSave(playerId, targetId, phaseId) {
    if (this.room.phase !== 'NIGHT') return false
    if (this.room.phaseId !== phaseId) return false

    const player = this.room.players.get(playerId)
    if (!player || !player.isAlive || player.role !== 'DOCTOR') return false

    const target = this.room.players.get(targetId)
    if (!target || !target.isAlive) return false

    // Consecutive save rule
    if (!this.room.settings.doctorConsecutiveSave && this.room.doctorState.lastSavedId === targetId) {
      return false
    }

    // Self-save rule
    if (targetId === playerId) {
      if (this.room.settings.doctorSelfSaveRule === 'never') return false
      if (this.room.settings.doctorSelfSaveRule === 'once' && this.room.doctorState.selfSaveUsed) return false
    }

    this.room.nightActions.doctorTarget = targetId
    this.broadcastState()
    return true
  }

  /**
   * Action: Villager Dummy Note
   */
  handleVillagerNote(playerId, targetId, phaseId) {
    if (this.room.phase !== 'NIGHT') return false
    if (this.room.phaseId !== phaseId) return false

    const player = this.room.players.get(playerId)
    if (!player || !player.isAlive || player.role !== 'VILLAGER') return false

    this.room.nightActions.villagerNotes.set(playerId, targetId)
    return true
  }

  /**
   * Action: Ready to Vote in Discussion
   */
  handleReadyToVote(playerId, phaseId) {
    if (this.room.phase !== 'DAY_DISCUSSION') return false
    if (this.room.phaseId !== phaseId) return false

    const player = this.room.players.get(playerId)
    if (!player || !player.isAlive) return false

    if (this.room.readyToVote.has(playerId)) {
      this.room.readyToVote.delete(playerId)
    } else {
      this.room.readyToVote.add(playerId)
    }

    const aliveCount = Array.from(this.room.players.values()).filter((p) => p.isAlive).length
    if (this.room.readyToVote.size > aliveCount / 2) {
      // Majority ready -> fast-forward to voting
      this.transitionTo('DAY_VOTING')
      return true
    }

    this.broadcastState()
    return true
  }

  /**
   * Action: Cast Day Vote
   */
  handleCastVote(playerId, targetId, phaseId) {
    if (this.room.phase !== 'DAY_VOTING') return false
    if (this.room.phaseId !== phaseId) return false

    const player = this.room.players.get(playerId)
    if (!player || !player.isAlive) return false

    if (targetId !== 'SKIP') {
      const target = this.room.players.get(targetId)
      if (!target || !target.isAlive) return false
    }

    this.room.votes.set(playerId, targetId)
    this.broadcastState()

    // Auto-advance if all living players have voted
    const alivePlayers = Array.from(this.room.players.values()).filter((p) => p.isAlive)
    if (this.room.votes.size >= alivePlayers.length) {
      // Small 2-3s delay before resolving
      if (this.timer) clearTimeout(this.timer)
      const currentPhaseId = this.room.phaseId
      this.timer = setTimeout(() => {
        if (this.room.phaseId === currentPhaseId) {
          this.transitionTo('EXECUTION_REVEAL')
        }
      }, 2500)
    }

    return true
  }

  /**
   * Handle permanent disconnect of a player
   */
  handlePlayerPermanentDisconnect(playerId) {
    const player = this.room.players.get(playerId)
    if (!player) return

    console.log(`[Room ${this.room.code}] Player ${player.name} (${playerId}) permanently disconnected.`)
    updateParticipantPermissions(this.room.code, playerId, {
      canPublish: false,
      canSubscribe: false,
      canPublishData: false,
    })

    if (this.room.phase === 'LOBBY') {
      this.room.players.delete(playerId)
      if (this.room.hostId === playerId) {
        this.room.autoPromoteHost()
      }
    } else if (this.room.phase !== 'GAME_OVER') {
      if (player.isAlive) {
        player.isAlive = false
        player.eliminatedReason = 'DISCONNECTED'
        this.room.timeline.push({
          round: this.room.roundNumber,
          type: 'DISCONNECT_ELIMINATION',
          targetId: player.id,
          targetName: player.name,
          description: `${player.name} was disconnected and eliminated.`,
        })

        // Immediate win check if alive player disconnected
        const winResult = this.checkWinCondition()
        if (winResult.gameOver) {
          this.room.winner = winResult.winner
          this.room.winReason = winResult.reason
          this.transitionTo('GAME_OVER')
          return
        }
      }
    }

    this.broadcastState()
  }
}
