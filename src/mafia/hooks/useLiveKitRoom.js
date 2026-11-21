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
  const mediaRequestedRef = useRef(null)
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
    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (track.kind === 'audio') {
        const audioEl = track.attach()
        audioEl.style.display = 'none'
      }
      updateParticipants()
    })
    room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      if (track.kind === 'audio') {
        track.detach()
      }
      updateParticipants()
    })
    room.on(RoomEvent.LocalTrackPublished, updateParticipants)
    room.on(RoomEvent.LocalTrackUnpublished, updateParticipants)
    room.on(RoomEvent.TrackMuted, updateParticipants)
    room.on(RoomEvent.TrackUnmuted, updateParticipants)

    room
      .connect(livekitAuth.url, livekitAuth.token)
      .then(async () => {
        console.log('[LiveKit] Connected to SFU.')
        updateParticipants()

        // If media was requested before connect completed
        if (mediaRequestedRef.current) {
          const { mic, cam } = mediaRequestedRef.current
          try {
            if (cam) await room.localParticipant.setCameraEnabled(true)
            if (mic) await room.localParticipant.setMicrophoneEnabled(true)
            updateParticipants()
          } catch (e) {
            console.warn('[LiveKit] Auto-enable media warning:', e)
          }
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

  // Explicitly enable camera & mic when entering table (or toggled)
  const enableLocalMedia = useCallback(async ({ mic = true, cam = true } = {}) => {
    mediaRequestedRef.current = { mic, cam }
    const local = roomRef.current?.localParticipant
    if (!local) {
      console.log('[LiveKit] Room not connected yet. Saved media request for onConnect.')
      return
    }

    try {
      console.log('[LiveKit] Enabling local media: mic =', mic, 'cam =', cam)
      if (cam) {
        await local.setCameraEnabled(true)
        setIsCamMuted(false)
      }
      if (mic) {
        await local.setMicrophoneEnabled(true)
        setIsMicMuted(false)
      }
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

    const local = roomRef.current?.localParticipant
    if (local) {
      const nextMuted = !isMicMuted
      setIsMicMuted(nextMuted) // Instant UI feedback

      try {
        if (local.audioTrackPublications) {
          const pubs = typeof local.audioTrackPublications.values === 'function'
            ? Array.from(local.audioTrackPublications.values())
            : Object.values(local.audioTrackPublications)
          for (const pub of pubs) {
            if (pub?.track) {
              if (nextMuted) {
                pub.track.mute()
              } else {
                pub.track.unmute()
              }
            }
          }
        }
        await local.setMicrophoneEnabled(!nextMuted)
      } catch (err) {
        console.warn('[LiveKit] toggleMic warning:', err)
      }
    } else {
      setIsMicMuted((prev) => !prev)
    }
  }, [isMock, isMicMuted])

  // Toggle local cam
  const toggleCam = useCallback(async () => {
    if (isMock) {
      setIsCamMuted((prev) => !prev)
      return
    }

    const local = roomRef.current?.localParticipant
    if (local) {
      const nextMuted = !isCamMuted
      setIsCamMuted(nextMuted) // Instant UI feedback

      try {
        if (local.videoTrackPublications) {
          const pubs = typeof local.videoTrackPublications.values === 'function'
            ? Array.from(local.videoTrackPublications.values())
            : Object.values(local.videoTrackPublications)
          for (const pub of pubs) {
            if (pub?.track) {
              if (nextMuted) {
                pub.track.mute()
              } else {
                pub.track.unmute()
              }
            }
          }
        }
        await local.setCameraEnabled(!nextMuted)
      } catch (err) {
        console.warn('[LiveKit] toggleCam warning:', err)
      }
    } else {
      setIsCamMuted((prev) => !prev)
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
