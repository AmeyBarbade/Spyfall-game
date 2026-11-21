import { useState, useEffect } from 'react'
import { Target, Shield, Eye, Users, VolumeX } from 'lucide-react'

export function RoleRevealModal({ role, partnerPlayer, phaseEndsAt }) {
  const [secondsLeft, setSecondsLeft] = useState(6)

  useEffect(() => {
    if (!phaseEndsAt) return
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((phaseEndsAt - Date.now()) / 1000))
      setSecondsLeft(remaining)
    }, 300)
    return () => clearInterval(interval)
  }, [phaseEndsAt])

  const getRoleCard = () => {
    switch (role) {
      case 'MAFIA':
        return {
          title: 'MAFIA',
          color: 'from-red-900 to-rose-950 border-red-600',
          textColor: 'text-red-400',
          badgeBg: 'bg-red-500/20 text-red-300 border-red-500/30',
          icon: <Target className="w-12 h-12 text-red-500 animate-pulse" />,
          description:
            'You are part of the secret syndicate. Eliminate the villagers without being discovered.',
          special: partnerPlayer ? (
            <div className="mt-4 p-3 rounded-xl bg-black/40 border border-red-500/30 text-xs text-red-200">
              <span className="font-bold text-red-400">Partner in Crime: </span>
              <span className="font-black text-white text-sm">{partnerPlayer.name}</span>
              <p className="text-[11px] text-red-300/80 mt-1">
                You will see each other's target selection live on camera during the night.
              </p>
            </div>
          ) : (
            <div className="mt-4 p-3 rounded-xl bg-black/40 border border-red-500/30 text-xs text-red-300">
              You are the sole Mafia operative in this game. Strike silently!
            </div>
          ),
        }

      case 'DOCTOR':
        return {
          title: 'DOCTOR',
          color: 'from-emerald-900 to-teal-950 border-emerald-600',
          textColor: 'text-emerald-400',
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          icon: <Shield className="w-12 h-12 text-emerald-400" />,
          description:
            'You possess life-saving medical skills. Each night, choose one player to protect from the Mafia attack.',
          special: (
            <div className="mt-4 p-3 rounded-xl bg-black/40 border border-emerald-500/30 text-xs text-emerald-200">
              <span className="font-bold text-emerald-400">Healer Rules: </span>
              <p className="text-[11px] text-emerald-300/80 mt-1">
                If the Mafia attacks the person you protect, they survive! You cannot protect the same person two nights in a row.
              </p>
            </div>
          ),
        }

      case 'VILLAGER':
      default:
        return {
          title: 'VILLAGER',
          color: 'from-slate-900 to-indigo-950 border-indigo-600',
          textColor: 'text-indigo-400',
          badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
          icon: <Eye className="w-12 h-12 text-indigo-400" />,
          description:
            'You are an innocent citizen of the city. Uncover who the Mafias are through debate, observation, and voting.',
          special: (
            <div className="mt-4 p-3 rounded-xl bg-black/40 border border-indigo-500/30 text-xs text-indigo-200">
              <span className="font-bold text-indigo-400">Town Directive: </span>
              <p className="text-[11px] text-indigo-300/80 mt-1">
                Listen closely during day discussions, watch eye movements on camera, and vote out suspicious suspects.
              </p>
            </div>
          ),
        }
    }
  }

  const card = getRoleCard()

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in select-none">
      <div
        className={`w-full max-w-sm rounded-3xl bg-gradient-to-b ${card.color} border-2 p-6 shadow-2xl flex flex-col items-center text-center relative overflow-hidden`}
      >
        {/* Gasp Mute Notice */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-xs text-stone-400">
          <span className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-full border border-white/10">
            <VolumeX className="w-3 h-3 text-red-400" /> Mics Muted
          </span>
          <span className="font-mono font-bold bg-white/10 px-2 py-0.5 rounded-full text-white">
            {secondsLeft}s
          </span>
        </div>

        {/* Icon */}
        <div className="mt-8 mb-4 p-4 rounded-2xl bg-black/30 border border-white/10 shadow-inner">
          {card.icon}
        </div>

        {/* Role Title */}
        <span className={`text-xs uppercase tracking-widest font-bold px-3 py-1 rounded-full border ${card.badgeBg} mb-2`}>
          Your Secret Role
        </span>
        <h2 className="text-3xl font-black text-white tracking-wider mb-2">
          {card.title}
        </h2>

        {/* Description */}
        <p className="text-xs text-stone-300 leading-relaxed px-2">
          {card.description}
        </p>

        {/* Special Instructions / Partner */}
        {card.special}

        <div className="mt-6 text-[10px] text-stone-400">
          Night 1 begins automatically when timer ends...
        </div>
      </div>
    </div>
  )
}
