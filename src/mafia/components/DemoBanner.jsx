import { useState } from 'react'
import { Info, X, Volume2 } from 'lucide-react'

export function DemoBanner({ onToggleSimulateSpeaking, isLocalSpeaking }) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-3 py-2 text-xs text-amber-200 flex items-center justify-between gap-2 z-40 transition-all">
      <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
        <Info className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="truncate">
          <strong>Demo Video Mode</strong> — Add <code className="bg-black/30 px-1 py-0.5 rounded text-amber-300">LIVEKIT_URL</code>, <code className="bg-black/30 px-1 py-0.5 rounded text-amber-300">LIVEKIT_API_KEY</code> & <code className="bg-black/30 px-1 py-0.5 rounded text-amber-300">LIVEKIT_API_SECRET</code> to <code className="bg-black/30 px-1 py-0.5 rounded text-amber-300">server/.env</code> to enable live WebRTC video.
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onToggleSimulateSpeaking && (
          <button
            onClick={onToggleSimulateSpeaking}
            className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
              isLocalSpeaking
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title="Toggle speaking indicator for testing"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{isLocalSpeaking ? 'Speaking Active' : 'Simulate Mic'}</span>
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-white/10 rounded transition-colors text-amber-300/70 hover:text-amber-200"
          title="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
