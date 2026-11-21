import { AccessToken, RoomServiceClient } from 'livekit-server-sdk'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const LIVEKIT_URL = process.env.LIVEKIT_URL || ''
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || ''
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || ''

export function isLiveKitConfigured() {
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) return false
  if (
    LIVEKIT_URL.includes('your-project-name') ||
    LIVEKIT_API_KEY.includes('your_livekit_api_key_here') ||
    LIVEKIT_API_SECRET.includes('your_livekit_api_secret_here')
  ) {
    return false
  }
  return true
}

let roomServiceClient = null

if (isLiveKitConfigured()) {
  try {
    // livekit-server-sdk expects http/https url for RoomServiceClient
    const httpUrl = LIVEKIT_URL.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://')
    roomServiceClient = new RoomServiceClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
    console.log('[LiveKit] Client initialized with URL:', httpUrl)
  } catch (err) {
    console.error('[LiveKit] Error initializing RoomServiceClient:', err.message)
    roomServiceClient = null
  }
} else {
  console.log('[LiveKit] Missing or placeholder credentials. Running in Mock Video Mode.')
}

/**
 * Generate a participant access token for a player
 */
export async function createParticipantToken({ roomName, identity, name, canPublish = true, canSubscribe = true }) {
  if (!isLiveKitConfigured()) {
    return {
      livekitEnabled: false,
      url: null,
      token: null,
      roomName,
    }
  }

  try {
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity,
      name,
      ttl: '2h',
    })

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish,
      canSubscribe,
      canPublishData: true,
    })

    const token = await at.toJwt()

    return {
      livekitEnabled: true,
      url: LIVEKIT_URL,
      token,
      roomName,
    }
  } catch (err) {
    console.error('[LiveKit] Error generating token:', err.message)
    return {
      livekitEnabled: false,
      url: null,
      token: null,
      roomName,
    }
  }
}

/**
 * Update participant permissions (e.g. revoking publish for ghosts, or muting mics)
 */
export async function updateParticipantPermissions(roomName, identity, { canPublish, canSubscribe = true, canPublishData = false }) {
  if (!isLiveKitConfigured() || !roomServiceClient) {
    console.log(`[Mock LiveKit] updateParticipant: room=${roomName}, identity=${identity}, canPublish=${canPublish}, canSubscribe=${canSubscribe}`)
    return
  }

  try {
    await roomServiceClient.updateParticipant(roomName, identity, undefined, {
      canPublish,
      canSubscribe,
      canPublishData,
    })
  } catch (err) {
    console.warn(`[LiveKit] updateParticipant failed for ${identity}:`, err.message)
  }
}

/**
 * Mute or unmute all tracks of a participant or specific participant tracks
 */
export async function muteParticipantAudio(roomName, identity, muted = true) {
  if (!isLiveKitConfigured() || !roomServiceClient) {
    console.log(`[Mock LiveKit] muteParticipantAudio: room=${roomName}, identity=${identity}, muted=${muted}`)
    return
  }

  try {
    const participant = await roomServiceClient.getParticipant(roomName, identity)
    if (!participant || !participant.tracks) return

    for (const track of participant.tracks) {
      if (track.type === 0 /* Audio */ || track.source === 'microphone') {
        await roomServiceClient.mutePublishedTrack(roomName, identity, track.sid, muted)
      }
    }
  } catch (err) {
    console.warn(`[LiveKit] muteParticipantAudio failed for ${identity}:`, err.message)
  }
}

/**
 * Delete room on server cleanup to prevent burning minutes
 */
export async function deleteLiveKitRoom(roomName) {
  if (!isLiveKitConfigured() || !roomServiceClient) {
    console.log(`[Mock LiveKit] deleteRoom: ${roomName}`)
    return
  }

  try {
    await roomServiceClient.deleteRoom(roomName)
  } catch (err) {
    console.warn(`[LiveKit] deleteRoom failed for ${roomName}:`, err.message)
  }
}
