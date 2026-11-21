import { useState } from 'react'
import {
  Copy,
  Check,
  Play,
  Settings,
  Share2,
  Clock,
  Moon,
  Shield,
  Video,
  LogOut,
  Sparkles,
} from 'lucide-react'

export function LobbyControls({
  roomState,
  localPlayerId,
  onToggleReady,
  onUpdateSettings,
  onStartGame,
  onLeaveRoom,
}) {
  const [copied, setCopied] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  if (!roomState) return null

  const localPlayer = roomState.players.find((p) => p.id === localPlayerId)
  const isHost = localPlayer?.isHost
  const players = roomState.players || []
  const settings = roomState.settings || {}

  const minPlayers = settings.allowDevMode ? 3 : 5
  const canStart =
    isHost &&
    players.length >= minPlayers &&
    players.every((p) => p.isReady || p.isHost)

  const readyCount = players.filter((p) => p.isReady || p.isHost).length

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?game=mafia&room=${roomState.code}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-4 flex flex-col gap-4">
      {/* Top Banner: Room Code & Quick Actions */}
      <div className="bg-white dark:bg-[#1E242B] border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wider text-stone-400 font-semibold">
              Room Code
            </span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black font-mono tracking-widest text-purple-600 dark:text-purple-400">
                {roomState.code}
              </span>
              <button
                onClick={handleCopyLink}
                className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 transition-colors"
                title="Copy share link"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Player Counter */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold">
            👥 {players.length} / 12 Players
          </div>
          <div className="px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold">
            {readyCount} / {players.length} Ready
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {isHost && (
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 transition-colors"
              title="Host Game Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}

          {!isHost && (
            <button
              onClick={onToggleReady}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                localPlayer?.isReady
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-900/30'
                  : 'bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-900/30'
              }`}
            >
              {localPlayer?.isReady ? '✓ Ready' : 'Ready Up'}
            </button>
          )}

          {isHost && (
            <button
              onClick={onStartGame}
              disabled={!canStart}
              className={`px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                canStart
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-900/30 cursor-pointer active:scale-95'
                  : 'bg-stone-200 dark:bg-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Game</span>
            </button>
          )}

          <button
            onClick={onLeaveRoom}
            className="p-2 rounded-xl hover:bg-red-500/10 text-stone-400 hover:text-red-500 transition-colors"
            title="Leave Room"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Minimum players notice */}
      {players.length < minPlayers && (
        <div className="text-center text-xs text-stone-500 dark:text-stone-400">
          Need at least {minPlayers} players to begin.{' '}
          {isHost && !settings.allowDevMode && (
            <span
              onClick={() => onUpdateSettings({ allowDevMode: true })}
              className="text-purple-500 underline cursor-pointer hover:text-purple-400 ml-1"
            >
              (Click here to enable 3-player Dev Mode for quick testing)
            </span>
          )}
        </div>
      )}

      {/* Host Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#1E242B] border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800">
              <h3 className="text-lg font-black text-stone-900 dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-600" />
                Game Rules & Timers
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-4 text-sm">
              {/* Day Discussion Timer */}
              <div>
                <label className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5 mb-1.5">
                  <Clock className="w-4 h-4 text-purple-500" /> Day Discussion Time
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[60, 90, 120, 180].map((t) => (
                    <button
                      key={t}
                      onClick={() => onUpdateSettings({ discussionTimer: t })}
                      className={`py-1.5 rounded-lg font-medium text-xs border transition-all ${
                        settings.discussionTimer === t
                          ? 'border-purple-600 bg-purple-500/15 text-purple-600 dark:text-purple-400 font-bold'
                          : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300'
                      }`}
                    >
                      {t}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Night Timer */}
              <div>
                <label className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5 mb-1.5">
                  <Moon className="w-4 h-4 text-indigo-500" /> Night Action Time
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[25, 30, 40].map((t) => (
                    <button
                      key={t}
                      onClick={() => onUpdateSettings({ nightTimer: t })}
                      className={`py-1.5 rounded-lg font-medium text-xs border transition-all ${
                        settings.nightTimer === t
                          ? 'border-indigo-600 bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold'
                          : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300'
                      }`}
                    >
                      {t}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Doctor Self Save Rule */}
              <div>
                <label className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5 mb-1.5">
                  <Shield className="w-4 h-4 text-emerald-500" /> Doctor Self-Save
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'once', label: 'Once / Game' },
                    { id: 'never', label: 'Never' },
                    { id: 'unlimited', label: 'Unlimited' },
                  ].map((rule) => (
                    <button
                      key={rule.id}
                      onClick={() => onUpdateSettings({ doctorSelfSaveRule: rule.id })}
                      className={`py-1.5 rounded-lg font-medium text-xs border transition-all ${
                        settings.doctorSelfSaveRule === rule.id
                          ? 'border-emerald-600 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold'
                          : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300'
                      }`}
                    >
                      {rule.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Doctor Consecutive Save */}
              <div className="flex items-center justify-between py-1">
                <span className="font-semibold text-stone-800 dark:text-stone-200 text-xs">
                  Allow Consecutive Doctor Saves
                </span>
                <button
                  onClick={() =>
                    onUpdateSettings({
                      doctorConsecutiveSave: !settings.doctorConsecutiveSave,
                    })
                  }
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                    settings.doctorConsecutiveSave ? 'bg-purple-600' : 'bg-stone-300 dark:bg-stone-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      settings.doctorConsecutiveSave ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Dev Mode Toggle */}
              <div className="flex items-center justify-between py-1 border-t border-stone-200 dark:border-stone-800 pt-3">
                <div className="flex flex-col">
                  <span className="font-semibold text-stone-800 dark:text-stone-200 text-xs flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Dev Mode (Allow 3 Players)
                  </span>
                  <span className="text-[10px] text-stone-400">
                    Allows testing full 9 phases with 3 players
                  </span>
                </div>
                <button
                  onClick={() =>
                    onUpdateSettings({
                      allowDevMode: !settings.allowDevMode,
                    })
                  }
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                    settings.allowDevMode ? 'bg-purple-600' : 'bg-stone-300 dark:bg-stone-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      settings.allowDevMode ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowSettingsModal(false)}
              className="mt-2 w-full py-2.5 rounded-xl bg-purple-600 text-white font-bold text-sm shadow-md"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
