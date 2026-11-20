import mqtt from 'mqtt'

const BROKERS = [
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://broker.emqx.io:8084/mqtt',
]

let activeClient = null
let currentRoomCode = null
const messageListeners = new Set()

/**
 * Connect to a room (or reuse existing connection) and listen for messages.
 */
export function subscribeToRoom(roomCode, listener) {
  const code = (roomCode || '').trim().toUpperCase()
  if (!code) return () => {}

  if (listener) {
    messageListeners.add(listener)
  }

  // Also listen on local BroadcastChannel as backup for tabs on same device
  let localChannel = null
  try {
    localChannel = new BroadcastChannel(`imposter_room_${code}`)
    localChannel.onmessage = (e) => {
      if (listener && e.data) {
        listener(`local/${code}/events`, e.data)
      }
    }
  } catch {
    // ignore
  }

  // If already connected to this room, reuse
  if (activeClient && currentRoomCode === code) {
    return () => {
      if (listener) messageListeners.delete(listener)
      if (localChannel) localChannel.close()
    }
  }

  // Disconnect previous client if switching rooms
  if (activeClient) {
    try {
      activeClient.end(true)
    } catch {
      // ignore
    }
    activeClient = null
  }

  currentRoomCode = code
  const stateTopic = `imposter-game-v1/${code}/state`
  const eventsTopic = `imposter-game-v1/${code}/events`

  let brokerIdx = 0

  function connectBroker() {
    const url = BROKERS[brokerIdx % BROKERS.length]
    const clientId = `imposter_${Math.random().toString(16).slice(2, 10)}`

    try {
      const client = mqtt.connect(url, {
        clientId,
        clean: true,
        connectTimeout: 6000,
        reconnectPeriod: 2500,
      })

      activeClient = client

      client.on('connect', () => {
        client.subscribe([stateTopic, eventsTopic], { qos: 1 })
      })

      client.on('message', (topic, payload) => {
        try {
          const data = JSON.parse(payload.toString())
          messageListeners.forEach((fn) => {
            try {
              fn(topic, data)
            } catch {
              // ignore
            }
          })
        } catch {
          // ignore non-json
        }
      })

      client.on('error', () => {
        brokerIdx++
      })
    } catch {
      // fallback
    }
  }

  connectBroker()

  return () => {
    if (listener) messageListeners.delete(listener)
    if (localChannel) localChannel.close()
  }
}

/**
 * Publish an event to the room across MQTT and BroadcastChannel.
 */
export function publishRoomEvent(roomCode, event) {
  const code = (roomCode || currentRoomCode || '').trim().toUpperCase()
  if (!code) return

  const eventsTopic = `imposter-game-v1/${code}/events`

  if (activeClient && activeClient.connected) {
    activeClient.publish(eventsTopic, JSON.stringify(event), { qos: 1 })
  }

  // Also broadcast locally
  try {
    const local = new BroadcastChannel(`imposter_room_${code}`)
    local.postMessage(event)
    setTimeout(() => local.close(), 100)
  } catch {
    // ignore
  }
}

/**
 * Publish state to the room (retained in MQTT).
 */
export function publishRoomState(roomCode, state) {
  const code = (roomCode || currentRoomCode || '').trim().toUpperCase()
  if (!code) return

  const stateTopic = `imposter-game-v1/${code}/state`

  if (activeClient && activeClient.connected) {
    activeClient.publish(stateTopic, JSON.stringify(state), { qos: 1, retain: true })
  }

  try {
    localStorage.setItem(`imposter_lobby_${code}`, JSON.stringify(state))
  } catch {
    // ignore
  }
}

/**
 * Close connection when returning to dashboard.
 */
export function closeRoomConnection() {
  messageListeners.clear()
  currentRoomCode = null
  if (activeClient) {
    try {
      activeClient.end(true)
    } catch {
      // ignore
    }
    activeClient = null
  }
}
