import { useState, useCallback, useEffect } from 'react'
import DashboardScreen from './components/DashboardScreen'
import SetupScreen from './components/SetupScreen'
import PlayerEntryScreen from './components/PlayerEntryScreen'
import CategoryScreen from './components/CategoryScreen'
import LobbyScreen from './components/LobbyScreen'
import PlayerWaitingScreen from './components/PlayerWaitingScreen'
import RevealScreen from './components/RevealScreen'
import SpeakerScreen from './components/SpeakerScreen'
import VotingScreen from './components/VotingScreen'
import ResultScreen from './components/ResultScreen'

/*
  Game Screens:
  0. dashboard   → saved games + create new (local & online)
  1. setup       → game name + room code (if online) + total players + imposters count
  2. playerEntry → enter names (in online mode: only Player 1 (You))
  3. category    → pick categories (filters usedWords)
  4. lobby       → online lobby (waiting for players, live player counter, code showcase)
  5. waiting     → client waiting screen for joined players
  6. reveal      → pass-and-play or individual word reveal
  7. speaker     → announce who speaks first (weighted random)
  8. voting      → vote for the imposter
  9. result      → show who won → next round or dashboard
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

  // Temporary state used only during setup flow
  const [pendingSetup, setPendingSetup] = useState(null)
  const [isOnlineMode, setIsOnlineMode] = useState(false)

  // Client joining state (when another player joins with a room code)
  const [initialJoinCode, setInitialJoinCode] = useState('')
  const [joinedRoomCode, setJoinedRoomCode] = useState('')
  const [joinedPlayerName, setJoinedPlayerName] = useState('')

  // Per-round transient state
  const [players, setPlayers] = useState([])       // players with roles
  const [secretWord, setSecretWord] = useState('')
  const [startingPlayer, setStartingPlayer] = useState(null)
  const [votedPlayer, setVotedPlayer] = useState(null)

  // Detect URL parameter ?room=CODE or ?join=CODE on mount
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const room = params.get('room') || params.get('join')
      if (room) {
        setInitialJoinCode(room.toUpperCase())
      }
    } catch {
      // ignore
    }
  }, [])

  // Persist games to localStorage whenever they change
  useEffect(() => {
    persistGames(games)
  }, [games])

  // ─── Dashboard handlers ─────────────────────────────────────────
  const handleCreateNew = useCallback(() => {
    setIsOnlineMode(false)
    setPendingSetup(null)
    setScreen('setup')
  }, [])

  const handleCreateOnlineGame = useCallback(() => {
    setIsOnlineMode(true)
    setPendingSetup(null)
    setScreen('setup')
  }, [])

  const handleJoinOnlineGame = useCallback((code, name) => {
    setJoinedRoomCode(code)
    setJoinedPlayerName(name)
    setScreen('waiting')
  }, [])

  const handleContinueGame = useCallback((game) => {
    setActiveGame(game)
    setIsOnlineMode(!!game.isOnline)
    setScreen('category')
  }, [])

  const handleDeleteGame = useCallback((gameId) => {
    setGames((prev) => prev.filter((g) => g.id !== gameId))
  }, [])

  // ─── Setup: game name + player/imposter count + room code ─────────
  const handleSetupComplete = useCallback(
    (gameName, total, imposters, roomCode, isOnline) => {
      setPendingSetup({
        gameName,
        totalPlayers: total,
        numImposters: imposters,
        roomCode: roomCode || 'BARBADE',
        isOnline: !!isOnline,
      })
      setIsOnlineMode(!!isOnline)
      setScreen('playerEntry')
    },
    []
  )

  const handleBackToDashboardFromSetup = useCallback(() => {
    setPendingSetup(null)
    setIsOnlineMode(false)
    setScreen('dashboard')
  }, [])

  // ─── Player names entered → create new or update active game ──
  const handlePlayerNamesComplete = useCallback(
    (names) => {
      if (pendingSetup) {
        // Creating a new game
        const numImp = Math.min(
          pendingSetup.numImposters,
          Math.max(1, (pendingSetup.isOnline ? pendingSetup.totalPlayers : names.length) - 1)
        )
        const newGame = {
          id: crypto.randomUUID(),
          gameName: pendingSetup.gameName,
          players: names, // In online mode, names is [hostName]
          totalPlayers: pendingSetup.totalPlayers,
          numImposters: numImp,
          roomCode: pendingSetup.roomCode || 'BARBADE',
          isOnline: !!pendingSetup.isOnline,
          usedWords: [],
          createdAt: new Date().toISOString(),
        }
        setGames((prev) => [...prev, newGame])
        setActiveGame(newGame)
        setPendingSetup(null)
        setScreen('category')
      } else if (activeGame) {
        // Editing players for active game
        const numImp = Math.min(
          activeGame.numImposters,
          Math.max(1, names.length - 1)
        )
        const updatedGame = {
          ...activeGame,
          players: names,
          numImposters: numImp,
        }
        setActiveGame(updatedGame)
        setGames((prev) =>
          prev.map((g) => (g.id === updatedGame.id ? updatedGame : g))
        )
        setScreen('category')
      }
    },
    [pendingSetup, activeGame]
  )

  const handleEditPlayers = useCallback(() => {
    setScreen('playerEntry')
  }, [])

  const handleBackFromPlayerEntry = useCallback(() => {
    if (pendingSetup) {
      setScreen('setup')
    } else if (activeGame) {
      setScreen('category')
    } else {
      setScreen('dashboard')
    }
  }, [pendingSetup, activeGame])

  // ─── Category: start game or create lobby ─────────────────────
  const handleStartGame = useCallback(
    (word, selectedCats) => {
      setSecretWord(word)

      // Persist the used word + last selected categories into the active game
      const updatedGame = {
        ...activeGame,
        usedWords: [...(activeGame?.usedWords || []), word],
        lastSelectedCategories: selectedCats,
        selectedCategories: selectedCats,
        secretWord: word,
      }
      setActiveGame(updatedGame)
      setGames((prev) =>
        prev.map((g) => (g.id === updatedGame.id ? updatedGame : g))
      )

      // If online mode, transition to the Lobby screen as requested!
      if (activeGame?.isOnline || isOnlineMode) {
        setScreen('lobby')
        return
      }

      // If local mode, assign imposter roles randomly & proceed to Reveal
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
    [activeGame, isOnlineMode]
  )

  // ─── Lobby: Host starts the game once players join ─────────────
  const handleLobbyStartGame = useCallback(
    (gamePlayersWithRoles, word) => {
      setPlayers(gamePlayersWithRoles)
      setSecretWord(word)
      setScreen('reveal')
    },
    []
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
    setIsOnlineMode(false)
    setJoinedRoomCode('')
    setJoinedPlayerName('')
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
          onCreateOnlineGame={handleCreateOnlineGame}
          onJoinOnlineGame={handleJoinOnlineGame}
          onContinueGame={handleContinueGame}
          onDeleteGame={handleDeleteGame}
          initialJoinCode={initialJoinCode}
        />
      )}

      {screen === 'setup' && (
        <SetupScreen
          onNext={handleSetupComplete}
          onBack={handleBackToDashboardFromSetup}
          isOnline={isOnlineMode}
          initialCode={pendingSetup?.roomCode || 'BARBADE'}
        />
      )}

      {screen === 'playerEntry' && (pendingSetup || activeGame) && (
        <PlayerEntryScreen
          totalPlayers={
            pendingSetup ? pendingSetup.totalPlayers : activeGame.totalPlayers || activeGame.players.length
          }
          initialNames={!pendingSetup && activeGame ? activeGame.players : []}
          isEditing={!pendingSetup && !!activeGame}
          isOnline={pendingSetup ? pendingSetup.isOnline : !!activeGame?.isOnline}
          roomCode={pendingSetup ? pendingSetup.roomCode : activeGame?.roomCode || 'BARBADE'}
          onNext={handlePlayerNamesComplete}
          onBack={handleBackFromPlayerEntry}
        />
      )}

      {screen === 'category' && activeGame && (
        <CategoryScreen
          usedWords={activeGame.usedWords}
          initialSelection={activeGame.lastSelectedCategories || []}
          playerCount={activeGame.totalPlayers || activeGame.players.length}
          isOnline={!!activeGame.isOnline}
          onStartGame={handleStartGame}
          onBackToDashboard={handleBackToDashboard}
          onEditPlayers={handleEditPlayers}
        />
      )}

      {screen === 'lobby' && activeGame && (
        <LobbyScreen
          activeGame={activeGame}
          onStartGame={handleLobbyStartGame}
          onBackToDashboard={handleBackToDashboard}
        />
      )}

      {screen === 'waiting' && (
        <PlayerWaitingScreen
          roomCode={joinedRoomCode}
          playerName={joinedPlayerName}
          onLeave={handleBackToDashboard}
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
