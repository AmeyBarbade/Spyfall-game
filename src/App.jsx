import { useState, useCallback, useEffect } from 'react'
import DashboardScreen from './components/DashboardScreen'
import SetupScreen from './components/SetupScreen'
import PlayerEntryScreen from './components/PlayerEntryScreen'
import CategoryScreen from './components/CategoryScreen'
import LobbyScreen from './components/LobbyScreen'
import JoinScreen from './components/JoinScreen'
import OnlineRevealScreen from './components/OnlineRevealScreen'
import RevealScreen from './components/RevealScreen'
import SpeakerScreen from './components/SpeakerScreen'
import VotingScreen from './components/VotingScreen'
import OnlineVotingScreen from './components/OnlineVotingScreen'
import TieBreakerScreen from './components/TieBreakerScreen'
import ResultScreen from './components/ResultScreen'
import {
  subscribeToRoom,
  publishRoomEvent,
  closeRoomConnection,
} from './services/roomSync'

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

  // Active game (full object) — null when on dashboard/setup
  const [activeGame, setActiveGame] = useState(null)

  // Temporary state used only during setup flow
  const [pendingSetup, setPendingSetup] = useState(null)
  const [isOnlineMode, setIsOnlineMode] = useState(false)

  // Client joining state (when friend opens invite link with ?room=CODE)
  const [initialJoinCode, setInitialJoinCode] = useState('')
  const [joinedRoomCode, setJoinedRoomCode] = useState('')
  const [joinedPlayerName, setJoinedPlayerName] = useState('')

  // Player's own secret role card for online game
  const [currentRole, setCurrentRole] = useState(null)

  // Per-round transient state
  const [players, setPlayers] = useState([])       // players with roles
  const [secretWord, setSecretWord] = useState('')
  const [startingPlayer, setStartingPlayer] = useState(null)
  const [votedPlayer, setVotedPlayer] = useState(null)
  const [voteDetails, setVoteDetails] = useState(null)

  // Online Voting & Tie-Breaker state
  const [votesMap, setVotesMap] = useState({})
  const [tiedCandidates, setTiedCandidates] = useState([])
  const [tieVotesMap, setTieVotesMap] = useState({})
  const [tieRoundNumber, setTieRoundNumber] = useState(1)

  const isHost = !joinedPlayerName
  const currentRoomCode = activeGame?.roomCode || joinedRoomCode
  const myPlayerName = joinedPlayerName || activeGame?.players?.[0] || 'Host'

  // Detect URL parameter ?room=CODE or ?join=CODE on mount
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const room = params.get('room') || params.get('join')
      if (room) {
        const cleanRoom = room.trim().toUpperCase()
        setInitialJoinCode(cleanRoom)
        setJoinedRoomCode(cleanRoom)
        setScreen('join')
      }
    } catch {
      // ignore
    }
  }, [])

  // Persist games to localStorage whenever they change
  useEffect(() => {
    persistGames(games)
  }, [games])

  // Helper: Tally votes and determine winner or tie
  const evaluateVotes = useCallback(
    (currentVotes) => {
      const counts = {}
      players.forEach((p) => {
        counts[p.name] = 0
      })
      Object.values(currentVotes).forEach((target) => {
        counts[target] = (counts[target] || 0) + 1
      })

      const maxVotes = Math.max(...Object.values(counts))
      if (maxVotes === 0) return

      const leaders = Object.keys(counts).filter((name) => counts[name] === maxVotes)

      if (leaders.length === 1) {
        // Clear majority winner!
        const winnerName = leaders[0]
        const targetPlayer = players.find((p) => p.name === winnerName)
        const details = { count: maxVotes, isTieBreaker: false }
        publishRoomEvent(currentRoomCode, {
          type: 'SHOW_RESULT',
          votedPlayer: targetPlayer,
          voteDetails: details,
        })
        setVotedPlayer(targetPlayer)
        setVoteDetails(details)
        setScreen('result')
      } else {
        // TIE! Proceed to tie-breaker
        publishRoomEvent(currentRoomCode, {
          type: 'START_TIE_BREAKER',
          tiedCandidates: leaders,
          round: 1,
        })
        setTiedCandidates(leaders)
        setTieVotesMap({})
        setTieRoundNumber(1)
        setScreen('tieBreaker')
      }
    },
    [players, currentRoomCode]
  )

  // In-game global event listener for all connected players
  useEffect(() => {
    if (!currentRoomCode) return

    const unsubscribe = subscribeToRoom(currentRoomCode, (topic, data) => {
      if (topic.endsWith('/events')) {
        if (data.type === 'START_DISCUSSION' && data.startingPlayer) {
          setStartingPlayer(data.startingPlayer)
          setScreen('speaker')
        } else if (data.type === 'START_VOTING') {
          setVotesMap({})
          setTiedCandidates([])
          setTieVotesMap({})
          setTieRoundNumber(1)
          setScreen('voting')
        } else if (data.type === 'VOTE_CAST') {
          if (data.voter && data.target) {
            setVotesMap((prev) => {
              const updated = { ...prev, [data.voter]: data.target }
              // If Host and all players have voted, evaluate majority
              if (isHost && Object.keys(updated).length >= players.length) {
                setTimeout(() => evaluateVotes(updated), 500)
              }
              return updated
            })
          }
        } else if (data.type === 'START_TIE_BREAKER') {
          setTiedCandidates(data.tiedCandidates || [])
          setTieVotesMap({})
          setTieRoundNumber(data.round || 1)
          setScreen('tieBreaker')
        } else if (data.type === 'TIE_VOTE_CAST') {
          if (data.voter && data.target) {
            setTieVotesMap((prev) => ({
              ...prev,
              [data.voter]: data.target,
            }))
          }
        } else if (data.type === 'RESET_TIE_BREAKER') {
          setTiedCandidates(data.tiedCandidates || [])
          setTieVotesMap({})
          setTieRoundNumber(data.round || 1)
        } else if (data.type === 'SHOW_RESULT' && data.votedPlayer) {
          setVotedPlayer(data.votedPlayer)
          setVoteDetails(data.voteDetails || null)
          setScreen('result')
        } else if (data.type === 'NEXT_ROUND') {
          if (!isHost) {
            setScreen('lobby')
          }
        }
      }
    })

    return () => {
      unsubscribe()
    }
  }, [currentRoomCode, isHost, players, evaluateVotes])

  // ─── Dashboard handlers ─────────────────────────────────────────
  const handleCreateNew = useCallback(() => {
    setIsOnlineMode(false)
    setPendingSetup(null)
    setJoinedPlayerName('')
    setScreen('setup')
  }, [])

  const handleCreateOnlineGame = useCallback(() => {
    setIsOnlineMode(true)
    setPendingSetup(null)
    setJoinedPlayerName('')
    setScreen('setup')
  }, [])

  const handleJoinOnlineGame = useCallback((code, name) => {
    setJoinedRoomCode(code)
    setJoinedPlayerName(name)
    setActiveGame({
      roomCode: code,
      isOnline: true,
      players: [],
    })
    setIsOnlineMode(true)
    setScreen('lobby')
  }, [])

  const handleContinueGame = useCallback((game) => {
    setActiveGame(game)
    setIsOnlineMode(!!game.isOnline)
    setJoinedPlayerName('')
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
        roomCode: roomCode || '',
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
          players: names,
          totalPlayers: pendingSetup.totalPlayers,
          numImposters: numImp,
          roomCode: pendingSetup.roomCode || '',
          isOnline: !!pendingSetup.isOnline,
          usedWords: [],
          createdAt: new Date().toISOString(),
        }
        setGames((prev) => [...prev, newGame])
        setActiveGame(newGame)
        setPendingSetup(null)
        setScreen('category')
      } else if (activeGame) {
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

      if (activeGame?.isOnline || isOnlineMode) {
        setScreen('lobby')
        return
      }

      // Offline mode: assign imposter roles randomly & proceed to Reveal
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
    (gamePlayersWithRoles, word, startPayload) => {
      setPlayers(gamePlayersWithRoles)
      setSecretWord(word)

      const hostName = activeGame?.players?.[0] || 'Host'
      const hostAssignment = gamePlayersWithRoles.find(
        (p) => p.name.trim().toLowerCase() === hostName.trim().toLowerCase()
      )
      const hostRole = {
        isImposter: hostAssignment?.isImposter || false,
        secretWord: hostAssignment?.isImposter ? 'IMPOSTER' : word,
        category: activeGame?.selectedCategories?.[0] || startPayload?.category || 'General',
      }
      setCurrentRole(hostRole)
      setScreen('onlineReveal')
    },
    [activeGame]
  )

  // ─── Lobby: Non-host player receives GAME_START from host ──────
  const handleGameStartedByHost = useCallback(
    (data) => {
      if (!data || !data.players) return
      setPlayers(data.players)
      setSecretWord(data.secretWord)
      const myAssignment = data.players.find(
        (p) => p.name.trim().toLowerCase() === joinedPlayerName.trim().toLowerCase()
      )
      if (myAssignment) {
        setCurrentRole({
          isImposter: myAssignment.isImposter,
          secretWord: myAssignment.isImposter ? 'IMPOSTER' : data.secretWord,
          category: data.category || 'General',
        })
        setScreen('onlineReveal')
      }
    },
    [joinedPlayerName]
  )

  // ─── Online Reveal: Host clicks "Start Discussion" ─────────────
  const handleStartDiscussion = useCallback(() => {
    const speaker = pickStartingSpeaker(players)
    setStartingPlayer(speaker)
    publishRoomEvent(currentRoomCode, {
      type: 'START_DISCUSSION',
      startingPlayer: speaker,
    })
    setScreen('speaker')
  }, [players, currentRoomCode])

  // ─── Speaker → Voting ──────────────────────────────────────────
  const handleProceedToVoting = useCallback(() => {
    if (isOnlineMode) {
      publishRoomEvent(currentRoomCode, {
        type: 'START_VOTING',
      })
      setVotesMap({})
      setTiedCandidates([])
      setTieVotesMap({})
      setTieRoundNumber(1)
    }
    setScreen('voting')
  }, [isOnlineMode, currentRoomCode])

  // ─── Online Voting Handlers ────────────────────────────────────
  const handleCastVote = useCallback(
    (candidateName) => {
      setVotesMap((prev) => {
        const updated = { ...prev, [myPlayerName]: candidateName }
        publishRoomEvent(currentRoomCode, {
          type: 'VOTE_CAST',
          voter: myPlayerName,
          target: candidateName,
        })
        if (isHost && Object.keys(updated).length >= players.length) {
          setTimeout(() => evaluateVotes(updated), 500)
        }
        return updated
      })
    },
    [myPlayerName, currentRoomCode, isHost, players.length, evaluateVotes]
  )

  // Host manual tally trigger if someone disconnected
  const handleManualTally = useCallback(() => {
    evaluateVotes(votesMap)
  }, [evaluateVotes, votesMap])

  // ─── Tie-Breaker Handlers ──────────────────────────────────────
  const handleCastTieVote = useCallback(
    (candidateName) => {
      setTieVotesMap((prev) => {
        const updated = { ...prev, [myPlayerName]: candidateName }
        publishRoomEvent(currentRoomCode, {
          type: 'TIE_VOTE_CAST',
          voter: myPlayerName,
          target: candidateName,
        })
        return updated
      })
    },
    [myPlayerName, currentRoomCode]
  )

  const handleResolveTieBreaker = useCallback(
    (targetPlayer, votesWon) => {
      const details = { count: votesWon, isTieBreaker: true }
      publishRoomEvent(currentRoomCode, {
        type: 'SHOW_RESULT',
        votedPlayer: targetPlayer,
        voteDetails: details,
      })
      setVotedPlayer(targetPlayer)
      setVoteDetails(details)
      setScreen('result')
    },
    [currentRoomCode]
  )

  const handleResetTieBreaker = useCallback(
    (topCandidates) => {
      const nextRound = tieRoundNumber + 1
      publishRoomEvent(currentRoomCode, {
        type: 'RESET_TIE_BREAKER',
        tiedCandidates: topCandidates,
        round: nextRound,
      })
      setTiedCandidates(topCandidates)
      setTieVotesMap({})
      setTieRoundNumber(nextRound)
    },
    [currentRoomCode, tieRoundNumber]
  )

  // Offline vote handler
  const handleVoteOffline = useCallback((player) => {
    setVotedPlayer(player)
    setVoteDetails(null)
    setScreen('result')
  }, [])

  // ─── Next Round ────────────────────────────────────────────────
  const handleNextRound = useCallback(() => {
    setSecretWord('')
    setPlayers([])
    setStartingPlayer(null)
    setVotedPlayer(null)
    setVoteDetails(null)
    setCurrentRole(null)
    setVotesMap({})
    setTiedCandidates([])
    setTieVotesMap({})
    setTieRoundNumber(1)

    if (isOnlineMode) {
      publishRoomEvent(currentRoomCode, {
        type: 'NEXT_ROUND',
      })
      if (isHost) {
        setScreen('category')
      } else {
        setScreen('lobby')
      }
    } else {
      setScreen('category')
    }
  }, [isOnlineMode, currentRoomCode, isHost])

  // ─── Back to Dashboard ─────────────────────────────────────────
  const handleBackToDashboard = useCallback(() => {
    if (window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname)
    }
    closeRoomConnection()
    setActiveGame(null)
    setPendingSetup(null)
    setIsOnlineMode(false)
    setJoinedRoomCode('')
    setJoinedPlayerName('')
    setCurrentRole(null)
    setSecretWord('')
    setPlayers([])
    setStartingPlayer(null)
    setVotedPlayer(null)
    setVoteDetails(null)
    setVotesMap({})
    setTiedCandidates([])
    setTieVotesMap({})
    setTieRoundNumber(1)
    setScreen('dashboard')
  }, [])

  const imposters = players.filter((p) => p.isImposter)
  const hostPlayerName = activeGame?.players?.[0] || 'Host'

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
          initialCode={pendingSetup?.roomCode || ''}
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
          roomCode={pendingSetup ? pendingSetup.roomCode : activeGame?.roomCode || ''}
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

      {screen === 'join' && (
        <JoinScreen
          roomCode={joinedRoomCode || initialJoinCode}
          onJoin={handleJoinOnlineGame}
          onBack={handleBackToDashboard}
        />
      )}

      {screen === 'lobby' && activeGame && (
        <LobbyScreen
          activeGame={activeGame}
          isHost={isHost}
          myPlayerName={joinedPlayerName}
          onStartGame={handleLobbyStartGame}
          onGameStartedByHost={handleGameStartedByHost}
          onBackToDashboard={handleBackToDashboard}
        />
      )}

      {/* Online Reveal Screen: Host and Players get the EXACT SAME single-card reveal screen */}
      {screen === 'onlineReveal' && (
        <OnlineRevealScreen
          roomCode={currentRoomCode}
          playerName={isHost ? hostPlayerName : joinedPlayerName}
          isHost={isHost}
          hostName={hostPlayerName}
          role={currentRole}
          onStartDiscussion={handleStartDiscussion}
          onExit={handleBackToDashboard}
        />
      )}

      {/* Local Pass-and-Play Reveal Screen (offline mode only) */}
      {screen === 'reveal' && (
        <RevealScreen
          players={players}
          secretWord={secretWord}
          onAllRevealed={handleStartDiscussion}
        />
      )}

      {screen === 'speaker' && startingPlayer && (
        <SpeakerScreen
          startingPlayer={startingPlayer}
          isOnline={isOnlineMode}
          isHost={isHost}
          hostName={hostPlayerName}
          onProceed={handleProceedToVoting}
        />
      )}

      {/* Voting Screen: Online Voting with live progress or Offline Voting */}
      {screen === 'voting' && (
        isOnlineMode ? (
          <OnlineVotingScreen
            players={players}
            myPlayerName={myPlayerName}
            isHost={isHost}
            roomCode={currentRoomCode}
            votesMap={votesMap}
            onCastVote={handleCastVote}
            onTallyVotes={handleManualTally}
          />
        ) : (
          <VotingScreen players={players} onVote={handleVoteOffline} />
        )
      )}

      {/* Tie-Breaker Screen: Runoff between tied candidates with live voter names on buttons */}
      {screen === 'tieBreaker' && (
        <TieBreakerScreen
          tiedCandidates={tiedCandidates}
          allPlayers={players}
          myPlayerName={myPlayerName}
          roomCode={currentRoomCode}
          tieVotesMap={tieVotesMap}
          isHost={isHost}
          roundNumber={tieRoundNumber}
          onCastTieVote={handleCastTieVote}
          onResolveTieBreaker={handleResolveTieBreaker}
          onResetTieBreaker={handleResetTieBreaker}
        />
      )}

      {screen === 'result' && (
        <ResultScreen
          votedPlayer={votedPlayer}
          secretWord={secretWord}
          imposters={imposters}
          voteDetails={voteDetails}
          isOnline={isOnlineMode}
          isHost={isHost}
          onNextRound={handleNextRound}
          onBackToDashboard={handleBackToDashboard}
        />
      )}
    </div>
  )
}
