import { useState, useEffect, useRef, useCallback } from 'react'
import { Room, RoomEvent, VideoPresets } from 'livekit-client'

export function useLiveKitRoom(livekitAuth, localPlayerId) {
  const [isLiveKitActive, setIsLiveKitActive] = useState(false)
  const [activeSpeakers, setActiveSpeakers] = useState([])
  const [simulatedSpeakers, setSimulatedSpeakers] = useState(new Set())
  const [isMicMuted, setIsMicMuted] = useState(false)
  const [isCamMuted, setIsCamMuted] = useState(false)
  const [participantsMap, setParticipantsMap] = useState({})
  const [error, setError] = useState(null)

  const roomRef = useRef(null)
  const isMock = !livekitAuth?.livekitEnabled || !livekitAuth?.token

  useEffect(() => {
    if (isMock) {
      console.log('[useLiveKitRoom] Running in Mock Video Mode.')
      setIsLiveKitActive(false)
      return
    }

    console.log('[useLiveKitRoom] Connecting to LiveKit Room:', livekitAuth.roomName)
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: {
        autoGainControl: true,
        echoCancellation: true,
        noiseSuppression: true,
      },
      videoCaptureDefaults: {
        resolution: VideoPresets.h360.resolution,
      },
    })

    roomRef.current = room

    function updateParticipants() {
      if (!room) return
      const map = {}
      if (room.localParticipant) {
        map[room.localParticipant.identity] = room.localParticipant
      }
      for (const p of room.remoteParticipants.values()) {
        map[p.identity] = p
      }
      setParticipantsMap({ ...map })
    }

    room.on(RoomEvent.Connected, () => {
      console.log('[LiveKit] Successfully connected to room')
      setIsLiveKitActive(true)
      updateParticipants()
    })

    room.on(RoomEvent.Disconnected, () => {
      console.log('[LiveKit] Disconnected from room')
      setIsLiveKitActive(false)
    })

    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      setActiveSpeakers(speakers.map((s) => s.identity))
    })

    room.on(RoomEvent.ParticipantConnected, updateParticipants)
    room.on(RoomEvent.ParticipantDisconnected, updateParticipants)
    room.on(RoomEvent.TrackSubscribed, updateParticipants)
    room.on(RoomEvent.TrackUnsubscribed, updateParticipants)
    room.on(RoomEvent.LocalTrackPublished, updateParticipants)
    room.on(RoomEvent.LocalTrackUnpublished, updateParticipants)
    room.on(RoomEvent.TrackMuted, updateParticipants)
    room.on(RoomEvent.TrackUnmuted, updateParticipants)

    room
      .connect(livekitAuth.url, livekitAuth.token)
      .then(() => {
        console.log('[LiveKit] Connected. Waiting for table entry to start camera/mic.')
        updateParticipants()
      })
      .catch((err) => {
        console.error('[LiveKit] Connection error:', err)
        setError(err.message)
      })

    return () => {
      room.disconnect()
      roomRef.current = null
    }
  }, [livekitAuth, isMock])

  // Explicitly enable camera & mic when entering table (or toggled)
  const enableLocalMedia = useCallback(async ({ mic = true, cam = true } = {}) => {
    if (!roomRef.current?.localParticipant) return
    try {
      console.log('[LiveKit] Enabling local media: mic =', mic, 'cam =', cam)
      if (cam) {
        await roomRef.current.localParticipant.setCameraEnabled(true)
        setIsCamMuted(false)
      }
      if (mic) {
        await roomRef.current.localParticipant.setMicrophoneEnabled(true)
        setIsMicMuted(false)
      }
      // Trigger participant update so UI attaches local track
      if (roomRef.current) {
        const map = {}
        if (roomRef.current.localParticipant) {
          map[roomRef.current.localParticipant.identity] = roomRef.current.localParticipant
        }
        for (const p of roomRef.current.remoteParticipants.values()) {
          map[p.identity] = p
        }
        setParticipantsMap({ ...map })
      }
    } catch (err) {
      console.warn('[LiveKit] Error enabling camera/mic:', err.message)
    }
  }, [])

  // Explicit user-gesture audio unlock for mobile autoplay
  const unlockAudio = useCallback(async () => {
    if (roomRef.current) {
      try {
        await roomRef.current.startAudio()
        console.log('[LiveKit] Audio context started successfully')
      } catch (err) {
        console.warn('[LiveKit] Audio unlock warning:', err)
      }
    }
  }, [])

  // Toggle local mic
  const toggleMic = useCallback(async () => {
    if (isMock) {
      setIsMicMuted((prev) => !prev)
      return
    }

    if (roomRef.current?.localParticipant) {
      const next = !isMicMuted
      await roomRef.current.localParticipant.setMicrophoneEnabled(!next)
      setIsMicMuted(next)
    }
  }, [isMock, isMicMuted])

  // Toggle local cam
  const toggleCam = useCallback(async () => {
    if (isMock) {
      setIsCamMuted((prev) => !prev)
      return
    }

    if (roomRef.current?.localParticipant) {
      const next = !isCamMuted
      await roomRef.current.localParticipant.setCameraEnabled(!next)
      setIsCamMuted(next)
    }
  }, [isMock, isCamMuted])

  // Mock Mode: toggle simulated speaking for testing active speaker ring
  const toggleSimulateSpeaking = useCallback((id) => {
    setSimulatedSpeakers((prev) => {
      const copy = new Set(prev)
      if (copy.has(id)) {
        copy.delete(id)
      } else {
        copy.add(id)
      }
      return copy
    })
  }, [])

  const isSpeaking = useCallback(
    (id) => {
      if (isMock) {
        return simulatedSpeakers.has(id)
      }
      return activeSpeakers.includes(id)
    },
    [isMock, simulatedSpeakers, activeSpeakers]
  )

  return {
    isMock,
    isLiveKitActive,
    room: roomRef.current,
    participantsMap,
    isMicMuted,
    isCamMuted,
    isSpeaking,
    toggleMic,
    toggleCam,
    unlockAudio,
    enableLocalMedia,
    toggleSimulateSpeaking,
    error,
  }
}
