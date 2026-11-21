import { v4 as uuidv4 } from 'uuid'
import { GameStateMachine } from './stateMachine.js'
import { sanitizeStateForPlayer } from './sanitizer.js'
import { createParticipantToken, deleteLiveKitRoom } from './livekitService.js'

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export class Room {
  constructor(code, hostPlayerName, io, initialSettings = {}) {
    this.code = code
    this.io = io
    this.hostId = null
    this.createdAt = Date.now()
    this.lastActivityAt = Date.now()

    this.phase = 'LOBBY'
    this.phaseId = 1
    this.roundNumber = 1
    this.phaseEndsAt = null

    // Default configurable settings
    this.settings = {
      discussionTimer: 120, // 60, 90, 120, 180
      nightTimer: 25, // 25, 30, 40
      doctorSelfSaveRule: 'once', // 'once', 'never', 'unlimited'
      doctorConsecutiveSave: false, // false = disallowed, true = allowed
      cameraRequired: false,
      allowDevMode: false, // allows 3 players for local testing
      mafiaCount: 'auto', // 'auto', 1, 2, 3
      doctorCount: 'auto', // 'auto', 0, 1, 2
      ...initialSettings,
    }

    // Players: Map<playerId, PlayerObject>
    this.players = new Map()
    // Session token to player ID lookup: Map<sessionToken, playerId>
    this.sessions = new Map()
    // Sockets: Map<playerId, socketId>
    this.playerSockets = new Map()
    // Disconnect timers: Map<playerId, timeoutId>
    this.disconnectTimers = new Map()

    // State initialization
    this.readyToVote = new Set()
    this.votes = new Map()
    this.nightActions = {
      mafiaTargets: new Map(),
      mafiaConsensusTarget: null,
      doctorTarget: null,
      villagerNotes: new Map(),
    }
    this.doctorState = {
      lastSavedId: null,
      selfSaveUsed: false,
    }
    this.lastNightResult = null
    this.lastExecutionTally = null
    this.lastExecutedId = null
    this.mostSuspectedPlayerId = null
    this.mostSuspectedCount = 0
    this.winner = null
    this.winReason = null
    this.timeline = []
    this.gameLog = []

    this.fsm = new GameStateMachine(this, io)
  }

  addPlayer(name, isHost = false) {
    const id = uuidv4()
    const sessionToken = uuidv4()

    const player = {
      id,
      name,
      sessionToken,
      isReady: false,
      isAlive: true,
      role: null,
      eliminatedReason: null,
      isAway: false,
      isDisconnected: false,
      disconnectExpiresAt: null,
      joinedAt: Date.now(),
    }

    this.players.set(id, player)
    this.sessions.set(sessionToken, id)

    if (isHost || !this.hostId) {
      this.hostId = id
    }

    this.lastActivityAt = Date.now()
    return player
  }

  getPlayerBySession(sessionToken) {
    const playerId = this.sessions.get(sessionToken)
    return playerId ? this.players.get(playerId) : null
  }

  bindSocket(playerId, socketId) {
    this.playerSockets.set(playerId, socketId)
    this.lastActivityAt = Date.now()

    // Clear any disconnect timer if reconnecting
    if (this.disconnectTimers.has(playerId)) {
      clearTimeout(this.disconnectTimers.get(playerId))
      this.disconnectTimers.delete(playerId)
    }

    const player = this.players.get(playerId)
    if (player) {
      player.isDisconnected = false
      player.disconnectExpiresAt = null
    }
  }

  handleSocketDisconnect(playerId) {
    const player = this.players.get(playerId)
    if (!player) return

    player.isDisconnected = true
    player.disconnectExpiresAt = Date.now() + 45000 // 45-second grace window

    console.log(`[Room ${this.code}] Player ${player.name} disconnected. Starting 45s grace timer.`)
    this.broadcastSanitizedState()

    const timer = setTimeout(() => {
      this.disconnectTimers.delete(playerId)
      this.fsm.handlePlayerPermanentDisconnect(playerId)
    }, 45000)

    this.disconnectTimers.set(playerId, timer)
  }

  autoPromoteHost() {
    const connectedPlayers = Array.from(this.players.values())
      .filter((p) => !p.isDisconnected)
      .sort((a, b) => a.joinedAt - b.joinedAt)

    if (connectedPlayers.length > 0) {
      this.hostId = connectedPlayers[0].id
      console.log(`[Room ${this.code}] Host migrated to ${connectedPlayers[0].name}`)
      this.broadcastSanitizedState()
    }
  }

  broadcastSanitizedState() {
    this.lastActivityAt = Date.now()
    for (const [playerId, socketId] of this.playerSockets.entries()) {
      const sanitized = sanitizeStateForPlayer(this, playerId)
      if (sanitized && socketId) {
        this.io.to(socketId).emit('state:sync', sanitized)
      }
    }
  }

  async getLiveKitTokenForPlayer(playerId) {
    const player = this.players.get(playerId)
    if (!player) return null

    const canPublish = this.phase === 'LOBBY' || this.phase === 'GAME_OVER' ? true : player.isAlive
    return await createParticipantToken({
      roomName: this.code,
      identity: player.id,
      name: player.name,
      canPublish,
      canSubscribe: true,
    })
  }
}

export class RoomManager {
  constructor(io) {
    this.io = io
    this.rooms = new Map()

    // Automatic idle GC every 60 seconds
    setInterval(() => this.cleanupIdleRooms(), 60000)
  }

  createRoom(hostPlayerName, initialSettings = {}) {
    let code = generateRoomCode()
    let attempts = 0
    while (this.rooms.has(code) && attempts < 10) {
      code = generateRoomCode()
      attempts++
    }

    const room = new Room(code, hostPlayerName, this.io, initialSettings)
    const hostPlayer = room.addPlayer(hostPlayerName, true)
    this.rooms.set(code, room)

    console.log(`[RoomManager] Room created: ${code} by ${hostPlayerName} (${hostPlayer.id})`)
    return { room, hostPlayer }
  }

  getRoom(code) {
    if (!code) return null
    return this.rooms.get(code.toUpperCase()) || null
  }

  cleanupIdleRooms() {
    const now = Date.now()
    for (const [code, room] of this.rooms.entries()) {
      const allDisconnected = Array.from(room.players.values()).every((p) => p.isDisconnected)
      const isExpired = now - room.lastActivityAt > 15 * 60 * 1000 // 15 mins inactive
      const isEmpty = room.players.size === 0

      if (isEmpty || (allDisconnected && isExpired)) {
        console.log(`[RoomManager] Cleaning up idle room: ${code}`)
        deleteLiveKitRoom(code)
        // Clear all timers
        if (room.fsm && room.fsm.timer) clearTimeout(room.fsm.timer)
        for (const timer of room.disconnectTimers.values()) clearTimeout(timer)
        this.rooms.delete(code)
      }
    }
  }
}
