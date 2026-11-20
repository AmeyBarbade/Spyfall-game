import mqtt from 'mqtt'

const BROKERS = [
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://broker.emqx.io:8084/mqtt',
]

/**
 * Creates an MQTT client connected to a public WebSocket broker.
 */
export function createRoomConnection(roomCode, onMessage, onConnect) {
  const code = (roomCode || 'BARBADE').trim().toUpperCase()
  const stateTopic = `imposter-game-v1/${code}/state`
  const eventsTopic = `imposter-game-v1/${code}/events`

  let client = null
  let brokerIdx = 0

  function tryConnect() {
    const url = BROKERS[brokerIdx % BROKERS.length]
    const clientId = `imposter_${Math.random().toString(16).slice(2, 10)}`

    try {
      client = mqtt.connect(url, {
        clientId,
        clean: true,
        connectTimeout: 5000,
        reconnectPeriod: 2000,
      })

      client.on('connect', () => {
        client.subscribe([stateTopic, eventsTopic], { qos: 1 }, () => {
          if (onConnect) onConnect()
        })
      })

      client.on('message', (topic, payload) => {
        try {
          const data = JSON.parse(payload.toString())
          if (onMessage) {
            onMessage(topic, data)
          }
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

  tryConnect()

  return {
    publishState: (state) => {
      if (client && client.connected) {
        client.publish(stateTopic, JSON.stringify(state), { qos: 1, retain: true })
      }
    },
    publishEvent: (event) => {
      if (client && client.connected) {
        client.publish(eventsTopic, JSON.stringify(event), { qos: 1 })
      }
    },
    disconnect: () => {
      if (client) {
        try {
          client.end(true)
        } catch {
          // ignore
        }
      }
    },
  }
}
