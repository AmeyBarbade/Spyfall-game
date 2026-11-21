import { useState, useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

export function useGameSocket() {
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [roomState, setRoomState] = useState(null)
  const [playerId, setPlayerId] = useState(() => localStorage.getItem('mafia_player_id') || null)
  const [roomCode, setRoomCode] = useState(() => localStorage.getItem('mafia_room_code') || null)
  const [livekitAuth, setLivekitAuth] = useState(null)
  const [error, setError] = useState(null)

  const socketRef = useRef(null)

  useEffect(() => {
    const s = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })

    socketRef.current = s
    setSocket(s)

    s.on('connect', () => {
      console.log('[Socket] Connected to server:', s.id)
      setIsConnected(true)
      setError(null)

      // Auto-reconnect if sessionToken exists in localStorage
      const savedCode = localStorage.getItem('mafia_room_code')
      const savedToken = localStorage.getItem('mafia_session_token')
      if (savedCode && savedToken) {
        s.emit('room:reconnect', { roomCode: savedCode, sessionToken: savedToken }, (res) => {
          if (res?.success) {
            setRoomCode(res.roomCode)
            setPlayerId(res.playerId)
            if (res.livekitAuth) setLivekitAuth(res.livekitAuth)
          } else {
            // Expired or invalid session
            localStorage.removeItem('mafia_room_code')
            localStorage.removeItem('mafia_session_token')
            localStorage.removeItem('mafia_player_id')
          }
        })
      }
    })

    s.on('disconnect', () => {
      console.log('[Socket] Disconnected from server')
      setIsConnected(false)
    })

    s.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message)
      setError('Cannot connect to game server. Ensure server is running on ' + SERVER_URL)
    })

    s.on('state:sync', (sanitizedState) => {
      setRoomState(sanitizedState)
    })

    // Listen to tab visibility changes (Edge Case #17: App switch away status)
    const handleVisibilityChange = () => {
      const activeCode = localStorage.getItem('mafia_room_code')
      if (activeCode && s.connected) {
        s.emit('player:visibility', { roomCode: activeCode, isAway: document.hidden })
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      s.disconnect()
    }
  }, [])

  // Create room
  const createRoom = useCallback((playerName) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject(new Error('Socket not connected'))
      socketRef.current.emit('room:create', { playerName }, (res) => {
        if (res?.success) {
          setRoomCode(res.roomCode)
          setPlayerId(res.playerId)
          if (res.livekitAuth) setLivekitAuth(res.livekitAuth)
          localStorage.setItem('mafia_room_code', res.roomCode)
          localStorage.setItem('mafia_player_id', res.playerId)
          localStorage.setItem('mafia_session_token', res.sessionToken)
          resolve(res)
        } else {
          setError(res?.error || 'Failed to create room')
          reject(new Error(res?.error || 'Failed to create room'))
        }
      })
    })
  }, [])

  // Join room
  const joinRoom = useCallback((code, playerName) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject(new Error('Socket not connected'))
      socketRef.current.emit('room:join', { roomCode: code.toUpperCase(), playerName }, (res) => {
        if (res?.success) {
          setRoomCode(res.roomCode)
          setPlayerId(res.playerId)
          if (res.livekitAuth) setLivekitAuth(res.livekitAuth)
          localStorage.setItem('mafia_room_code', res.roomCode)
          localStorage.setItem('mafia_player_id', res.playerId)
          localStorage.setItem('mafia_session_token', res.sessionToken)
          resolve(res)
        } else {
          setError(res?.error || 'Failed to join room')
          reject(new Error(res?.error || 'Failed to join room'))
        }
      })
    })
  }, [])

  // Leave / Reset local session
  const leaveRoom = useCallback(() => {
    localStorage.removeItem('mafia_room_code')
    localStorage.removeItem('mafia_player_id')
    localStorage.removeItem('mafia_session_token')
    setRoomCode(null)
    setPlayerId(null)
    setRoomState(null)
    setLivekitAuth(null)
  }, [])

  // Lobby actions
  const toggleReady = useCallback(() => {
    if (!socketRef.current || !roomCode) return
    socketRef.current.emit('lobby:toggleReady', { roomCode })
  }, [roomCode])

  const updateSettings = useCallback((newSettings) => {
    if (!socketRef.current || !roomCode) return
    socketRef.current.emit('lobby:updateSettings', { roomCode, settings: newSettings })
  }, [roomCode])

  const startGame = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current || !roomCode) return reject(new Error('Invalid state'))
      socketRef.current.emit('game:start', { roomCode }, (res) => {
        if (res?.success) resolve(res)
        else reject(new Error(res?.error || 'Cannot start game'))
      })
    })
  }, [roomCode])

  // In-Game actions
  const targetMafia = useCallback((targetId) => {
    if (!socketRef.current || !roomCode || !roomState) return
    socketRef.current.emit('night:mafiaTarget', {
      roomCode,
      phaseId: roomState.phaseId,
      targetId,
    })
  }, [roomCode, roomState])

  const saveDoctor = useCallback((targetId) => {
    if (!socketRef.current || !roomCode || !roomState) return
    socketRef.current.emit('night:doctorSave', {
      roomCode,
      phaseId: roomState.phaseId,
      targetId,
    })
  }, [roomCode, roomState])

  const noteVillager = useCallback((targetId) => {
    if (!socketRef.current || !roomCode || !roomState) return
    socketRef.current.emit('night:villagerNote', {
      roomCode,
      phaseId: roomState.phaseId,
      targetId,
    })
  }, [roomCode, roomState])

  const readyToVote = useCallback(() => {
    if (!socketRef.current || !roomCode || !roomState) return
    socketRef.current.emit('day:readyToVote', {
      roomCode,
      phaseId: roomState.phaseId,
    })
  }, [roomCode, roomState])

  const castVote = useCallback((targetId) => {
    if (!socketRef.current || !roomCode || !roomState) return
    socketRef.current.emit('day:castVote', {
      roomCode,
      phaseId: roomState.phaseId,
      targetId,
    })
  }, [roomCode, roomState])

  const playAgain = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current || !roomCode) return reject(new Error('Invalid state'))
      socketRef.current.emit('game:playAgain', { roomCode }, (res) => {
        if (res?.success) resolve(res)
        else reject(new Error(res?.error || 'Cannot reset game'))
      })
    })
  }, [roomCode])

  return {
    socket,
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
  }
}
