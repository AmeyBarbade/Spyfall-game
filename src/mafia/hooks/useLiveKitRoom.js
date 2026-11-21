import { useState, useEffect, useRef, useCallback } from 'react'
import { Room, RoomEvent, VideoPresets } from 'livekit-client'

export function useLiveKitRoom(livekitAuth, localPlayerId) {
  const [isLiveKitActive, setIsLiveKitActive] = useState(false)
  const [activeSpeakers, setActiveSpeakers] = useState([])
  const [simulatedSpeakers, setSimulatedSpeakers] = useState(new Set())
  const [isMicMuted, setIsMicMuted] = useState(false)
  const [isCamMuted, setIsCamMuted] = useState(false)
  const [participants, setParticipants] = useState([])
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

    room.on(RoomEvent.ParticipantConnected, () => updateParticipants())
    room.on(RoomEvent.ParticipantDisconnected, () => updateParticipants())
    room.on(RoomEvent.TrackSubscribed, () => updateParticipants())
    room.on(RoomEvent.TrackUnsubscribed, () => updateParticipants())

    function updateParticipants() {
      if (!room) return
      const list = Array.from(room.remoteParticipants.values())
      if (room.localParticipant) {
        list.push(room.localParticipant)
      }
      setParticipants(list)
    }

    room
      .connect(livekitAuth.url, livekitAuth.token)
      .then(async () => {
        // Enable cam and mic by default
        try {
          await room.localParticipant.enableCameraAndMicrophone()
        } catch (mediaErr) {
          console.warn('[LiveKit] Failed to enable camera/mic (fallback to audio-only or denied):', mediaErr)
        }
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
    participants,
    isMicMuted,
    isCamMuted,
    isSpeaking,
    toggleMic,
    toggleCam,
    unlockAudio,
    toggleSimulateSpeaking,
    error,
  }
}
