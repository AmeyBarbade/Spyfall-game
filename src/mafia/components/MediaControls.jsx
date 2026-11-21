import { Mic, MicOff, Video, VideoOff, VolumeX } from 'lucide-react'

export function MediaControls({
  isMicMuted,
  isCamMuted,
  onToggleMic,
  onToggleCam,
  phase,
  isAlive,
}) {
  const isServerMuted = phase === 'ROLE_REVEAL' || phase === 'NIGHT' || phase === 'DAWN_COOLDOWN' || !isAlive

  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2">
      <div className="bg-stone-900/90 backdrop-blur-md border border-white/20 p-1.5 rounded-full shadow-2xl flex items-center gap-2">
        {/* Mic Toggle Button */}
        <button
          onClick={isServerMuted ? undefined : onToggleMic}
          disabled={isServerMuted}
          className={`px-3 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all shadow-md ${
            isServerMuted
              ? 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
              : isMicMuted
              ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
          title={
            isServerMuted
              ? 'Mics server-muted during night/role reveal'
              : isMicMuted
              ? 'Unmute Microphone'
              : 'Mute Microphone'
          }
        >
          {isServerMuted ? (
            <>
              <VolumeX className="w-4 h-4 text-stone-400" />
              <span className="hidden sm:inline text-[11px]">Server Muted</span>
            </>
          ) : isMicMuted ? (
            <>
              <MicOff className="w-4 h-4" />
              <span className="text-[11px]">Unmute</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              <span className="text-[11px]">Mute</span>
            </>
          )}
        </button>

        {/* Camera Toggle Button */}
        <button
          onClick={!isAlive ? undefined : onToggleCam}
          disabled={!isAlive}
          className={`px-3 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all shadow-md ${
            !isAlive
              ? 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
              : isCamMuted
              ? 'bg-red-600 hover:bg-red-500 text-white'
              : 'bg-stone-700 hover:bg-stone-600 text-white'
          }`}
          title={
            !isAlive
              ? 'Camera revoked for eliminated ghost'
              : isCamMuted
              ? 'Turn On Camera'
              : 'Turn Off Camera'
          }
        >
          {isCamMuted ? (
            <>
              <VideoOff className="w-4 h-4" />
              <span className="text-[11px]">Cam Off</span>
            </>
          ) : (
            <>
              <Video className="w-4 h-4" />
              <span className="text-[11px]">Cam On</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
