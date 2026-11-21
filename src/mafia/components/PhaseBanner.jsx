import { useState, useEffect } from 'react'
import {
  Moon,
  Sun,
  Vote,
  Skull,
  Eye,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
} from 'lucide-react'

export function PhaseBanner({ roomState, localPlayerId, onReadyToVote }) {
  const [timeLeft, setTimeLeft] = useState(0)

  const phase = roomState?.phase || 'LOBBY'
  const phaseEndsAt = roomState?.phaseEndsAt
  const round = roomState?.roundNumber || 1
  const discussionState = roomState?.discussionState

  useEffect(() => {
    if (!phaseEndsAt) {
      setTimeLeft(0)
      return
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((phaseEndsAt - Date.now()) / 1000))
      setTimeLeft(remaining)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 500)
    return () => clearInterval(interval)
  }, [phaseEndsAt])

  if (phase === 'LOBBY') return null

  const getPhaseConfig = () => {
    switch (phase) {
      case 'ROLE_REVEAL':
        return {
          icon: <Eye className="w-5 h-5 text-purple-400" />,
          title: 'Role Assignment',
          subtitle: 'Mics server-muted. Look at your secret card!',
          bg: 'bg-purple-950/40 border-purple-800/40 text-purple-200',
        }
      case 'NIGHT':
        return {
          icon: <Moon className="w-5 h-5 text-indigo-400" />,
          title: `Night ${round}`,
          subtitle: 'The city sleeps. Night actions in progress...',
          bg: 'bg-[#181E26] border-indigo-900/40 text-indigo-200',
        }
      case 'DAWN_COOLDOWN':
        return {
          icon: <Clock className="w-5 h-5 text-amber-400" />,
          title: 'Dawn Approaches',
          subtitle: 'Moderator is resolving night events...',
          bg: 'bg-[#1B2028] border-amber-900/40 text-amber-200',
        }
      case 'MORNING_REVEAL':
        return {
          icon: <Sun className="w-5 h-5 text-amber-400" />,
          title: `Morning ${round}`,
          subtitle: roomState?.lastNightResult?.saved
            ? 'Clutch Doctor Save! No one died last night.'
            : roomState?.lastNightResult?.victimName
            ? `${roomState.lastNightResult.victimName} was eliminated in the night.`
            : 'The city slept peacefully.',
          bg: 'bg-amber-950/40 border-amber-800/40 text-amber-200',
        }
      case 'DAY_DISCUSSION':
        return {
          icon: <Sun className="w-5 h-5 text-amber-500" />,
          title: `Day ${round}: Town Discussion`,
          subtitle: 'Open debate. Unmuted. Discuss who is suspicious!',
          bg: 'bg-white dark:bg-[#1E242B] border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100',
        }
      case 'DAY_VOTING':
        return {
          icon: <Vote className="w-5 h-5 text-red-500" />,
          title: 'Day Voting',
          subtitle: 'Tap any player tile to cast vote or skip.',
          bg: 'bg-red-950/30 border-red-800/40 text-red-200',
        }
      case 'EXECUTION_REVEAL':
        return {
          icon: <Skull className="w-5 h-5 text-red-400" />,
          title: 'Vote Execution',
          subtitle: roomState?.lastExecutedId
            ? `${roomState.players.find((p) => p.id === roomState.lastExecutedId)?.name || 'Player'} was executed!`
            : 'No consensus reached. Nobody was executed.',
          bg: 'bg-red-950/40 border-red-800/50 text-red-200',
        }
      case 'GAME_OVER':
        return {
          icon: <Award className="w-5 h-5 text-emerald-400" />,
          title: `Game Over — ${roomState?.winner === 'MAFIA' ? 'Mafia Victory!' : 'Town Victory!'}`,
          subtitle: roomState?.winReason || '',
          bg: 'bg-emerald-950/40 border-emerald-800/40 text-emerald-200',
        }
      default:
        return {
          icon: null,
          title: phase,
          subtitle: '',
          bg: 'bg-stone-900 border-stone-800 text-white',
        }
    }
  }

  const config = getPhaseConfig()

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-2">
      <div
        className={`rounded-2xl border px-4 py-3 shadow-md backdrop-blur-md flex flex-wrap items-center justify-between gap-3 transition-colors duration-500 ${config.bg}`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-black/20 shrink-0">{config.icon}</div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-black text-base tracking-tight">{config.title}</span>
              {phaseEndsAt && timeLeft > 0 && (
                <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-full bg-black/30 border border-white/10 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {timeLeft}s
                </span>
              )}
            </div>
            <span className="text-xs opacity-80">{config.subtitle}</span>
          </div>
        </div>

        {/* Action Controls for Discussion */}
        {phase === 'DAY_DISCUSSION' && onReadyToVote && (
          <div className="flex items-center gap-2">
            <button
              onClick={onReadyToVote}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                discussionState?.myReadyToVote
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                  : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {discussionState?.myReadyToVote ? 'Ready to Vote' : 'Skip to Vote'} (
                {discussionState?.readyToVoteCount || 0}/
                {Math.floor((discussionState?.livingCount || 1) / 2) + 1})
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
