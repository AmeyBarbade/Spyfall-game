import { useState, useCallback, useEffect } from 'react'
import DashboardScreen from './components/DashboardScreen'
import SetupScreen from './components/SetupScreen'
import PlayerEntryScreen from './components/PlayerEntryScreen'
import CategoryScreen from './components/CategoryScreen'
import RevealScreen from './components/RevealScreen'
import SpeakerScreen from './components/SpeakerScreen'
import VotingScreen from './components/VotingScreen'
import ResultScreen from './components/ResultScreen'

/*
  Game Screens:
  0. dashboard   → saved games + create new
  1. setup       → game name + total players + imposters count
  2. playerEntry → enter all player names
  3. category    → pick categories (filters usedWords)
  4. reveal      → pass-and-play word reveal
  5. speaker     → announce who speaks first (weighted random)
  6. voting      → vote for the imposter
  7. result      → show who won → next round or dashboard
*/

// ─── localStorage helpers ───────────────────────────────────────────
const STORAGE_KEY = 'imposter_games'

function loadGames() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function persistGames(games) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games))
}

// ─── Utility helpers ────────────────────────────────────────────────
function shuffleArray(arr) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Weighted random selection for starting speaker.
 * Civilians get weight 2, Imposters get weight 1 —
 * so an Imposter is exactly half as likely to start.
 */
function pickStartingSpeaker(players) {
  const weights = players.map((p) => (p.isImposter ? 1 : 2))
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  let roll = Math.random() * totalWeight

  for (let i = 0; i < players.length; i++) {
    roll -= weights[i]
    if (roll <= 0) return players[i]
  }
  return players[players.length - 1]
}

// ─── App ────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState('dashboard')
  const [games, setGames] = useState(() => loadGames())

  // Active game (full object from localStorage) — null when on dashboard/setup
  const [activeGame, setActiveGame] = useState(null)

  // Temporary state used only during "Create New Game" setup flow
  const [pendingSetup, setPendingSetup] = useState(null)

  // Per-round transient state
  const [players, setPlayers] = useState([])       // players with roles
  const [secretWord, setSecretWord] = useState('')
  const [startingPlayer, setStartingPlayer] = useState(null)
  const [votedPlayer, setVotedPlayer] = useState(null)

  // Persist games to localStorage whenever they change
  useEffect(() => {
    persistGames(games)
  }, [games])

  // ─── Dashboard handlers ─────────────────────────────────────────
  const handleCreateNew = useCallback(() => {
    setScreen('setup')
  }, [])

  const handleContinueGame = useCallback((game) => {
    setActiveGame(game)
    setScreen('category')
  }, [])

  const handleDeleteGame = useCallback((gameId) => {
    setGames((prev) => prev.filter((g) => g.id !== gameId))
  }, [])

  // ─── Setup: game name + player/imposter count ───────────────────
  const handleSetupComplete = useCallback((gameName, total, imposters) => {
    setPendingSetup({ gameName, totalPlayers: total, numImposters: imposters })
    setScreen('playerEntry')
  }, [])

  const handleBackToDashboardFromSetup = useCallback(() => {
    setPendingSetup(null)
    setScreen('dashboard')
  }, [])

  // ─── Player names entered → create & save game ─────────────────
  const handlePlayerNamesComplete = useCallback(
    (names) => {
      const newGame = {
        id: crypto.randomUUID(),
        gameName: pendingSetup.gameName,
        players: names,
        numImposters: pendingSetup.numImposters,
        usedWords: [],
        createdAt: new Date().toISOString(),
      }
      setGames((prev) => [...prev, newGame])
      setActiveGame(newGame)
      setPendingSetup(null)
      setScreen('category')
    },
    [pendingSetup]
  )

  // ─── Category: start game with the chosen secret word ──────────
  const handleStartGame = useCallback(
    (word, selectedCats) => {
      setSecretWord(word)

      // Persist the used word + last selected categories into the active game
      const updatedGame = {
        ...activeGame,
        usedWords: [...activeGame.usedWords, word],
        lastSelectedCategories: selectedCats,
      }
      setActiveGame(updatedGame)
      setGames((prev) =>
        prev.map((g) => (g.id === updatedGame.id ? updatedGame : g))
      )

      // Assign imposter roles randomly
      const names = activeGame.players
      const numImp = activeGame.numImposters
      const indices = Array.from({ length: names.length }, (_, i) => i)
      const shuffled = shuffleArray(indices)
      const imposterIndices = new Set(shuffled.slice(0, numImp))

      const gamePlayers = shuffleArray(
        names.map((name, i) => ({
          name,
          isImposter: imposterIndices.has(i),
        }))
      )

      setPlayers(gamePlayers)
      setScreen('reveal')
    },
    [activeGame]
  )

  // ─── Reveal → Speaker ──────────────────────────────────────────
  const handleAllRevealed = useCallback(() => {
    setStartingPlayer(pickStartingSpeaker(players))
    setScreen('speaker')
  }, [players])

  // ─── Speaker → Voting ──────────────────────────────────────────
  const handleProceedToVoting = useCallback(() => {
    setScreen('voting')
  }, [])

  // ─── Vote cast → Result ────────────────────────────────────────
  const handleVote = useCallback((player) => {
    setVotedPlayer(player)
    setScreen('result')
  }, [])

  // ─── Next Round: keep game + usedWords, go to category ─────────
  const handleNextRound = useCallback(() => {
    setSecretWord('')
    setPlayers([])
    setStartingPlayer(null)
    setVotedPlayer(null)
    setScreen('category')
  }, [])

  // ─── Back to Dashboard: reset everything ───────────────────────
  const handleBackToDashboard = useCallback(() => {
    setActiveGame(null)
    setPendingSetup(null)
    setSecretWord('')
    setPlayers([])
    setStartingPlayer(null)
    setVotedPlayer(null)
    setScreen('dashboard')
  }, [])

  const imposters = players.filter((p) => p.isImposter)

  return (
    <div className="min-h-dvh bg-bg-primary bg-grid">
      {screen === 'dashboard' && (
        <DashboardScreen
          games={games}
          onCreateNew={handleCreateNew}
          onContinueGame={handleContinueGame}
          onDeleteGame={handleDeleteGame}
        />
      )}

      {screen === 'setup' && (
        <SetupScreen
          onNext={handleSetupComplete}
          onBack={handleBackToDashboardFromSetup}
        />
      )}

      {screen === 'playerEntry' && pendingSetup && (
        <PlayerEntryScreen
          totalPlayers={pendingSetup.totalPlayers}
          onNext={handlePlayerNamesComplete}
          initialNames={[]}
        />
      )}

      {screen === 'category' && activeGame && (
        <CategoryScreen
          usedWords={activeGame.usedWords}
          initialSelection={activeGame.lastSelectedCategories || []}
          onStartGame={handleStartGame}
          onBackToDashboard={handleBackToDashboard}
        />
      )}

      {screen === 'reveal' && (
        <RevealScreen
          players={players}
          secretWord={secretWord}
          onAllRevealed={handleAllRevealed}
        />
      )}

      {screen === 'speaker' && startingPlayer && (
        <SpeakerScreen
          startingPlayer={startingPlayer}
          onProceed={handleProceedToVoting}
        />
      )}

      {screen === 'voting' && (
        <VotingScreen players={players} onVote={handleVote} />
      )}

      {screen === 'result' && (
        <ResultScreen
          votedPlayer={votedPlayer}
          secretWord={secretWord}
          imposters={imposters}
          onNextRound={handleNextRound}
          onBackToDashboard={handleBackToDashboard}
        />
      )}
    </div>
  )
}
