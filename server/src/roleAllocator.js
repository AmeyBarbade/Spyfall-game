import crypto from 'crypto'

/**
 * Returns role distribution counts based on player count and host settings
 */
export function getRoleDistribution(playerCount, settings = {}) {
  let mafiaCount = 1
  let doctorCount = 1

  if (playerCount < 5) {
    // Dev mode / small lobby testing: 1 Mafia, 1 Doctor, rest Villagers (or min 1 Villager)
    mafiaCount = 1
    doctorCount = playerCount >= 3 ? 1 : 0
  } else if (playerCount === 5) {
    mafiaCount = 1
    doctorCount = 1
  } else if (playerCount >= 6 && playerCount <= 8) {
    mafiaCount = 2
    doctorCount = 1
  } else if (playerCount === 9) {
    mafiaCount = settings.extraMafiaAt9 ? 3 : 2
    doctorCount = 1
  } else {
    // 10 - 12 players
    mafiaCount = 3
    doctorCount = 1
  }

  const villagerCount = Math.max(0, playerCount - mafiaCount - doctorCount)
  return { mafiaCount, doctorCount, villagerCount }
}

/**
 * Cryptographic Fisher-Yates shuffle using crypto.randomInt
 */
export function shuffleArray(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Allocate roles to a list of player IDs
 * Returns Map<playerId, role> where role is 'MAFIA' | 'DOCTOR' | 'VILLAGER'
 */
export function allocateRoles(players, settings = {}) {
  const count = players.length
  const { mafiaCount, doctorCount, villagerCount } = getRoleDistribution(count, settings)

  const roles = [
    ...Array(mafiaCount).fill('MAFIA'),
    ...Array(doctorCount).fill('DOCTOR'),
    ...Array(villagerCount).fill('VILLAGER'),
  ]

  const shuffledRoles = shuffleArray(roles)
  const shuffledPlayers = shuffleArray(players)

  const playerRoles = new Map()
  for (let i = 0; i < shuffledPlayers.length; i++) {
    playerRoles.set(shuffledPlayers[i].id, shuffledRoles[i])
  }

  return playerRoles
}
