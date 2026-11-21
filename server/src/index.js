import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'
import { RoomManager } from './roomManager.js'
import { isLiveKitConfigured } from './livekitService.js'

dotenv.config()

const PORT = process.env.PORT || 3001
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'

const app = express()
app.use(cors())
app.use(express.json())

// Health and LiveKit status check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    livekitConfigured: isLiveKitConfigured(),
    timestamp: new Date().toISOString(),
  })
})

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})

const roomManager = new RoomManager(io)

io.on('connection', (socket) => {
  let boundRoomCode = null
  let boundPlayerId = null

  // 1. Create room
  socket.on('room:create', async ({ playerName }, callback) => {
    try {
      if (!playerName || !playerName.trim()) {
        return callback?.({ error: 'Player name is required.' })
      }

      const cleanName = playerName.trim().slice(0, 16)
      const { room, hostPlayer } = roomManager.createRoom(cleanName)

      boundRoomCode = room.code
      boundPlayerId = hostPlayer.id
      room.bindSocket(hostPlayer.id, socket.id)
      socket.join(room.code)

      const livekitAuth = await room.getLiveKitTokenForPlayer(hostPlayer.id)

      callback?.({
        success: true,
        roomCode: room.code,
        playerId: hostPlayer.id,
        sessionToken: hostPlayer.sessionToken,
        livekitAuth,
      })

      room.broadcastSanitizedState()
    } catch (err) {
      console.error('[Socket] room:create error:', err)
      callback?.({ error: 'Failed to create room.' })
    }
  })

  // 2. Join room
  socket.on('room:join', async ({ roomCode, playerName }, callback) => {
    try {
      if (!roomCode || !playerName || !playerName.trim()) {
        return callback?.({ error: 'Room code and player name are required.' })
      }

      const room = roomManager.getRoom(roomCode)
      if (!room) {
        return callback?.({ error: 'Room not found. Check the code.' })
      }

      if (room.phase !== 'LOBBY') {
        return callback?.({ error: 'Game is already in progress.' })
      }

      if (room.players.size >= 12) {
        return callback?.({ error: 'Room is full (max 12 players).' })
      }

      const cleanName = playerName.trim().slice(0, 16)
      // Enforce unique name in room
      const nameExists = Array.from(room.players.values()).some(
        (p) => p.name.toLowerCase() === cleanName.toLowerCase()
      )
      if (nameExists) {
        return callback?.({ error: 'Display name is already taken in this room.' })
      }

      const player = room.addPlayer(cleanName, false)
      boundRoomCode = room.code
      boundPlayerId = player.id
      room.bindSocket(player.id, socket.id)
      socket.join(room.code)

      const livekitAuth = await room.getLiveKitTokenForPlayer(player.id)

      callback?.({
        success: true,
        roomCode: room.code,
        playerId: player.id,
        sessionToken: player.sessionToken,
        livekitAuth,
      })

      room.broadcastSanitizedState()
    } catch (err) {
      console.error('[Socket] room:join error:', err)
      callback?.({ error: 'Failed to join room.' })
    }
  })

  // 3. Reconnect via sessionToken
  socket.on('room:reconnect', async ({ roomCode, sessionToken }, callback) => {
    try {
      const room = roomManager.getRoom(roomCode)
      if (!room) {
        return callback?.({ error: 'Room not found or expired.' })
      }

      const player = room.getPlayerBySession(sessionToken)
      if (!player) {
        return callback?.({ error: 'Invalid session token.' })
      }

      boundRoomCode = room.code
      boundPlayerId = player.id
      room.bindSocket(player.id, socket.id)
      socket.join(room.code)

      const livekitAuth = await room.getLiveKitTokenForPlayer(player.id)

      callback?.({
        success: true,
        roomCode: room.code,
        playerId: player.id,
        livekitAuth,
      })

      room.broadcastSanitizedState()
    } catch (err) {
      console.error('[Socket] room:reconnect error:', err)
      callback?.({ error: 'Failed to reconnect.' })
    }
  })

  // 4. Update Lobby Settings
  socket.on('lobby:updateSettings', ({ roomCode, settings }, callback) => {
    const room = roomManager.getRoom(roomCode)
    if (!room || room.phase !== 'LOBBY' || room.hostId !== boundPlayerId) {
      return callback?.({ error: 'Unauthorized or not in lobby.' })
    }

    if (settings) {
      room.settings = { ...room.settings, ...settings }
      room.broadcastSanitizedState()
      callback?.({ success: true })
    }
  })

  // 5. Toggle Ready in Lobby
  socket.on('lobby:toggleReady', ({ roomCode }, callback) => {
    const room = roomManager.getRoom(roomCode)
    if (!room || room.phase !== 'LOBBY') return

    const player = room.players.get(boundPlayerId)
    if (player) {
      player.isReady = !player.isReady
      room.broadcastSanitizedState()
      callback?.({ success: true, isReady: player.isReady })
    }
  })

  // 6. Start Game
  socket.on('game:start', ({ roomCode }, callback) => {
    const room = roomManager.getRoom(roomCode)
    if (!room || room.phase !== 'LOBBY') {
      return callback?.({ error: 'Not in lobby phase.' })
    }

    if (room.hostId !== boundPlayerId) {
      return callback?.({ error: 'Only the host can start the game.' })
    }

    const minPlayers = room.settings.allowDevMode ? 3 : 5
    if (room.players.size < minPlayers) {
      return callback?.({ error: `Need at least ${minPlayers} players to start.` })
    }

    // Check all ready
    const allReady = Array.from(room.players.values()).every(
      (p) => p.isReady || p.id === room.hostId
    )
    if (!allReady) {
      return callback?.({ error: 'All players must be ready before starting.' })
    }

    callback?.({ success: true })
    room.fsm.transitionTo('ROLE_REVEAL', 6)
  })

  // 7. Night: Mafia Target
  socket.on('night:mafiaTarget', ({ roomCode, phaseId, targetId }) => {
    const room = roomManager.getRoom(roomCode)
    if (!room) return
    room.fsm.handleMafiaTarget(boundPlayerId, targetId, phaseId)
  })

  // 8. Night: Doctor Save
  socket.on('night:doctorSave', ({ roomCode, phaseId, targetId }) => {
    const room = roomManager.getRoom(roomCode)
    if (!room) return
    room.fsm.handleDoctorSave(boundPlayerId, targetId, phaseId)
  })

  // 9. Night: Villager Dummy Note
  socket.on('night:villagerNote', ({ roomCode, phaseId, targetId }) => {
    const room = roomManager.getRoom(roomCode)
    if (!room) return
    room.fsm.handleVillagerNote(boundPlayerId, targetId, phaseId)
  })

  // 10. Day: Ready to Vote in Discussion
  socket.on('day:readyToVote', ({ roomCode, phaseId }) => {
    const room = roomManager.getRoom(roomCode)
    if (!room) return
    room.fsm.handleReadyToVote(boundPlayerId, phaseId)
  })

  // 11. Day: Cast Vote
  socket.on('day:castVote', ({ roomCode, phaseId, targetId }) => {
    const room = roomManager.getRoom(roomCode)
    if (!room) return
    room.fsm.handleCastVote(boundPlayerId, targetId, phaseId)
  })

  // 12. Game Over: Play Again
  socket.on('game:playAgain', ({ roomCode }, callback) => {
    const room = roomManager.getRoom(roomCode)
    if (!room || room.phase !== 'GAME_OVER') {
      return callback?.({ error: 'Game is not over.' })
    }

    if (room.hostId !== boundPlayerId) {
      return callback?.({ error: 'Only the host can start a rematch.' })
    }

    callback?.({ success: true })
    room.fsm.transitionTo('LOBBY')
  })

  // 13. Visibility Change (Away Indicator)
  socket.on('player:visibility', ({ roomCode, isAway }) => {
    const room = roomManager.getRoom(roomCode)
    if (!room) return
    const player = room.players.get(boundPlayerId)
    if (player) {
      player.isAway = !!isAway
      room.broadcastSanitizedState()
    }
  })

  // Disconnect handler
  socket.on('disconnect', () => {
    if (boundRoomCode && boundPlayerId) {
      const room = roomManager.getRoom(boundRoomCode)
      if (room) {
        room.handleSocketDisconnect(boundPlayerId)
      }
    }
  })
})

httpServer.listen(PORT, () => {
  console.log(`========================================`)
  console.log(` Mafia LiveKit Server running on port ${PORT}`)
  console.log(` LiveKit Configured: ${isLiveKitConfigured()}`)
  console.log(` Client URL: ${CLIENT_URL}`)
  console.log(`========================================`)
})
