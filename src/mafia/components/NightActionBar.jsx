import { useState, useEffect } from 'react'
import { Target, Shield, Eye, Lock, Clock, AlertTriangle, BellRing, Sparkles } from 'lucide-react'

export function NightActionBar({
  localPlayer,
  roomState,
  selectedTargetId,
}) {
  const [initialTimeLeft, setInitialTimeLeft] = useState(10)
  const [finalTimeLeft, setFinalTimeLeft] = useState(10)

  const phaseEndsAt = roomState?.phaseEndsAt
  const warningEndsAt = roomState?.nightWarningEndsAt || (phaseEndsAt ? phaseEndsAt - 10000 : null)
  const isServerWarning = roomState?.nightWarning

  useEffect(() => {
    if (!phaseEndsAt) return

    const updateTimers = () => {
      const now = Date.now()
      if (warningEndsAt) {
        setInitialTimeLeft(Math.max(0, Math.ceil((warningEndsAt - now) / 1000)))
      }
      setFinalTimeLeft(Math.max(0, Math.ceil((phaseEndsAt - now) / 1000)))
    }

    updateTimers()
    const interval = setInterval(updateTimers, 300)
    return () => clearInterval(interval)
  }, [phaseEndsAt, warningEndsAt])

  const role = localPlayer?.role
  const isActionRole = role === 'MAFIA' || role === 'DOCTOR'
  const isWarningActive = isServerWarning || initialTimeLeft === 0

  if (!roomState || roomState.phase !== 'NIGHT') return null

  if (!localPlayer?.isAlive) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-[#161B22]/95 border-t border-stone-800 p-3 backdrop-blur-md z-30 flex justify-center text-xs text-stone-400">
        You are spectating silently. Night actions are underway...
      </div>
    )
  }

  const selectedPlayer = roomState.players.find((p) => p.id === selectedTargetId)
  const mafiaTargetSync = roomState.mafiaTargetSync
  const doctorStatus = roomState.doctorStatus

  return (
    <>
      {/* Ambient Flashy Screen Edge Glow: noticeable red pulsing vignette that never blocks clicks/touches */}
      {isActionRole && !selectedTargetId && isWarningActive && finalTimeLeft > 0 && (
        <div className="fixed inset-0 pointer-events-none z-20 border-[6px] sm:border-8 border-red-500/80 shadow-[inset_0_0_80px_rgba(239,68,68,0.4)] animate-pulse" />
      )}

      <div className="fixed bottom-0 left-0 right-0 z-30 flex flex-col">
        {/* Flashing 10s Final Warning Banner for Mafia & Doctor */}
        {isActionRole && !selectedTargetId && isWarningActive && finalTimeLeft > 0 && (
          <div className="bg-red-600 text-white font-black px-4 py-2 text-center text-xs sm:text-sm flex items-center justify-center gap-2 animate-bounce shadow-2xl border-t-2 border-red-400">
            <BellRing className="w-5 h-5 animate-pulse text-amber-300" />
            <span>
              ⚠️ 10s FINAL WARNING! Choose your target now ({finalTimeLeft}s) or an innocent will be chosen randomly!
            </span>
          </div>
        )}

        {/* Main Night Action Bar */}
        <div
          className={`px-4 py-3 backdrop-blur-md shadow-2xl border-t transition-colors ${
            isActionRole && !selectedTargetId && isWarningActive
              ? 'bg-red-950/95 border-red-700/80'
              : 'bg-[#161B22]/95 border-stone-800/80'
          }`}
        >
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3 text-white">
          {/* Role Specific Instructions */}
          {role === 'MAFIA' && (
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-600/20 border border-red-500/30 text-red-400 shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs sm:text-sm text-red-200">
                    {selectedPlayer
                      ? `Targeting: ${selectedPlayer.name}`
                      : 'Tap a civilian to target for assassination'}
                  </span>
                  {!selectedTargetId && (
                    <span
                      className={`font-mono text-xs font-black px-2 py-0.5 rounded-full ${
                        isWarningActive
                          ? 'bg-red-600 text-white animate-ping'
                          : 'bg-stone-800 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {isWarningActive ? `${finalTimeLeft}s FINAL` : `${initialTimeLeft}s`}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-stone-400">
                  {selectedTargetId
                    ? '✓ Target selection confirmed.'
                    : isWarningActive
                    ? '⚠️ Warning active: Strike will be random if not chosen!'
                    : mafiaTargetSync?.lockedTarget
                    ? '🎯 Consensus achieved! Target locked solid.'
                    : '10s window to choose before final warning alarm.'}
                </span>
              </div>
            </div>
          )}

          {role === 'DOCTOR' && (
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs sm:text-sm text-emerald-200">
                    {selectedPlayer
                      ? `Protecting: ${selectedPlayer.name}`
                      : 'Tap any living player to shield tonight'}
                  </span>
                  {!selectedTargetId && (
                    <span
                      className={`font-mono text-xs font-black px-2 py-0.5 rounded-full ${
                        isWarningActive
                          ? 'bg-red-600 text-white animate-ping'
                          : 'bg-stone-800 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {isWarningActive ? `${finalTimeLeft}s FINAL` : `${initialTimeLeft}s`}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-stone-400 flex items-center gap-1.5 flex-wrap">
                  {doctorStatus?.lastSavedId && (
                    <span className="flex items-center gap-0.5">
                      <Lock className="w-3 h-3 text-amber-400" />
                      Last night: {roomState.players.find((p) => p.id === doctorStatus.lastSavedId)?.name}
                    </span>
                  )}
                  <span>• Self-save: {doctorStatus?.canSelfSave ? 'Available' : 'Used'}</span>
                </span>
              </div>
            </div>
          )}

          {role === 'VILLAGER' && (
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 shrink-0">
                <Eye className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xs sm:text-sm text-indigo-200">
                  {selectedPlayer ? `Marked suspicious: ${selectedPlayer.name}` : 'Night Watch: Tap who feels suspicious'}
                </span>
                <span className="text-[11px] text-stone-400">
                  Private note for your eyes only. Keeps your camera activity natural!
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </>
  )
}
