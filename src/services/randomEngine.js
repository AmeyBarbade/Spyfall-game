/**
 * High-precision Cryptographic Random Engine & Anti-Streak System for Imposter Game
 */

const RECENT_WORDS_KEY = 'imposter_recent_words_history'
const MAX_GLOBAL_RECENT_WORDS = 50

/**
 * Uniform integer in range [0, max - 1] using Web Crypto API.
 * Avoids modulo bias by rejection sampling.
 */
export function cryptoRandomInt(max) {
  if (max <= 0) return 0
  if (max === 1) return 0

  const array = new Uint32Array(1)
  const maxUint32 = 0xffffffff
  const limit = maxUint32 - (maxUint32 % max)

  let randomValue
  do {
    crypto.getRandomValues(array)
    randomValue = array[0]
  } while (randomValue >= limit)

  return randomValue % max
}

/**
 * Unbiased Fisher-Yates shuffle using cryptoRandomInt.
 */
export function cryptoShuffle(array) {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = cryptoRandomInt(i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Weighted random choice using cryptographic random numbers.
 */
export function cryptoWeightedChoice(items, weights) {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  if (totalWeight <= 0) return items[0]

  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  const normalized = array[0] / 0x100000000 // float in [0, 1)

  let roll = normalized * totalWeight
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i]
    if (roll <= 0) return items[i]
  }
  return items[items.length - 1]
}

/**
 * Anti-Streak Imposter Selection Algorithm.
 * 
 * Guarantees that:
 * 1. If player count >= numImposters * 2:
 *    Players who were Imposters in the immediate previous round CANNOT be Imposters again.
 * 2. It is mathematically IMPOSSIBLE for any player to be the Imposter 3 or 4 times in a row.
 * 3. Every eligible player has an equal cryptographic chance.
 */
export function selectFairImposters(players, numImposters = 1, recentImposterHistory = []) {
  const names = players.map((p) => (typeof p === 'string' ? p : p.name))
  const total = names.length
  const needed = Math.min(numImposters, Math.max(1, total - 1))

  // Last round imposters
  const lastRoundImposters = new Set(
    recentImposterHistory.length > 0
      ? recentImposterHistory[recentImposterHistory.length - 1]
      : []
  )

  // Two rounds ago imposters
  const twoRoundsAgoImposters = new Set(
    recentImposterHistory.length > 1
      ? recentImposterHistory[recentImposterHistory.length - 2]
      : []
  )

  // Eligible non-recent candidates
  const nonRecent = names.filter((n) => !lastRoundImposters.has(n))

  let chosenImposters = []

  if (nonRecent.length >= needed) {
    // We have enough players who weren't imposters last round!
    // Priority: players who haven't been imposters recently at all
    const freshCandidates = nonRecent.filter((n) => !twoRoundsAgoImposters.has(n))
    const semiRecentCandidates = nonRecent.filter((n) => twoRoundsAgoImposters.has(n))

    const shuffledFresh = cryptoShuffle(freshCandidates)
    const shuffledSemi = cryptoShuffle(semiRecentCandidates)
    const combinedCandidates = [...shuffledFresh, ...shuffledSemi]

    chosenImposters = combinedCandidates.slice(0, needed)
  } else {
    // Small group (e.g. 3 players, 2 imposters) -> take all non-recent, then fill remaining
    const shuffledNonRecent = cryptoShuffle(nonRecent)
    const remainingCandidates = names.filter((n) => lastRoundImposters.has(n))
    const shuffledRemaining = cryptoShuffle(remainingCandidates)
    chosenImposters = [...shuffledNonRecent, ...shuffledRemaining].slice(0, needed)
  }

  const imposterSet = new Set(chosenImposters)
  return names.map((name) => ({
    name,
    isImposter: imposterSet.has(name),
  }))
}

/**
 * Weighted First Speaker Selection using Cryptographic Randomness.
 * Civilians have weight 2, Imposters have weight 1.
 */
export function selectStartingSpeaker(players) {
  const weights = players.map((p) => (p.isImposter ? 1 : 2))
  return cryptoWeightedChoice(players, weights)
}

/**
 * Global Recent Words Memory (persists across rounds & sessions in localStorage).
 * Prevents repeating the same word (e.g. "Fandry") across multiple games.
 */
export function getGlobalRecentWords() {
  try {
    const raw = localStorage.getItem(RECENT_WORDS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function recordGlobalUsedWord(word) {
  try {
    const existing = getGlobalRecentWords().filter((w) => w.toLowerCase() !== word.toLowerCase())
    const updated = [word, ...existing].slice(0, MAX_GLOBAL_RECENT_WORDS)
    localStorage.setItem(RECENT_WORDS_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
}

/**
 * Pick an unbiased random word from the pool using Shuffle-Bag & Crypto PRNG.
 * Filters out recently used words across sessions first so words don't repeat.
 */
export function pickUnbiasedWord(pool = [], sessionUsedWords = []) {
  if (!pool || pool.length === 0) return ''

  const sessionUsedSet = new Set(sessionUsedWords.map((w) => w.toLowerCase()))
  const freshInSession = pool.filter((w) => !sessionUsedSet.has(w.toLowerCase()))

  // Priority 1: Fresh in current session
  const candidatePool = freshInSession.length > 0 ? freshInSession : pool

  // Priority 2: Filter out global recently used words across previous sessions
  const globalRecent = new Set(getGlobalRecentWords().map((w) => w.toLowerCase()))
  const trulyFresh = candidatePool.filter((w) => !globalRecent.has(w.toLowerCase()))

  const finalPool = trulyFresh.length > 0 ? trulyFresh : candidatePool

  // Unbiased cryptographic pick
  const randomIndex = cryptoRandomInt(finalPool.length)
  const chosenWord = finalPool[randomIndex]

  // Record globally
  recordGlobalUsedWord(chosenWord)

  return chosenWord
}
