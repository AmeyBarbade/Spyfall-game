import { Target, Shield, Eye, Lock, Clock, Sparkles } from 'lucide-react'

export function NightActionBar({
  localPlayer,
  roomState,
  selectedTargetId,
}) {
  if (!roomState || roomState.phase !== 'NIGHT') return null
  if (!localPlayer?.isAlive) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-[#161B22]/95 border-t border-stone-800 p-3 backdrop-blur-md z-30 flex justify-center text-xs text-stone-400">
        You are spectating silently. Night actions are underway...
      </div>
    )
  }

  const role = localPlayer.role
  const selectedPlayer = roomState.players.find((p) => p.id === selectedTargetId)
  const mafiaTargetSync = roomState.mafiaTargetSync
  const doctorStatus = roomState.doctorStatus

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#161B22]/95 border-t border-stone-800/80 px-4 py-3 backdrop-blur-md z-30 shadow-2xl">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-3 text-white">
        {/* Role Specific Instructions */}
        {role === 'MAFIA' && (
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-600/20 border border-red-500/30 text-red-400 shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xs sm:text-sm text-red-200">
                {selectedPlayer ? `Targeting: ${selectedPlayer.name}` : 'Tap a civilian to target for assassination'}
              </span>
              <span className="text-[11px] text-stone-400">
                {mafiaTargetSync?.lockedTarget
                  ? '🎯 Consensus achieved! Target locked solid.'
                  : 'Split targets will be decided by 50/50 coin flip at dawn.'}
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
              <span className="font-bold text-xs sm:text-sm text-emerald-200">
                {selectedPlayer ? `Protecting: ${selectedPlayer.name}` : 'Tap any living player to shield tonight'}
              </span>
              <span className="text-[11px] text-stone-400 flex items-center gap-1.5">
                {doctorStatus?.lastSavedId && (
                  <span className="flex items-center gap-0.5">
                    <Lock className="w-3 h-3 text-amber-400" />
                    Last night saved: {roomState.players.find((p) => p.id === doctorStatus.lastSavedId)?.name}
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
  )
}
