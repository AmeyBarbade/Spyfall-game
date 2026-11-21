import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Video, VideoOff, Users, ArrowRight, ShieldCheck } from 'lucide-react'

export function GreenRoom({
  playerName,
  roomCode,
  isMock,
  onJoinTable,
  unlockAudio,
}) {
  const [micEnabled, setMicEnabled] = useState(true)
  const [camEnabled, setCamEnabled] = useState(true)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    // Request local media preview if not in mock mode or for browser permission check
    async function initPreview() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 480, height: 360 },
            audio: true,
          })
          streamRef.current = stream
          if (videoRef.current) {
            videoRef.current.srcObject = stream
          }
        }
      } catch (err) {
        console.warn('[GreenRoom] Local cam preview unavailable or denied:', err.message)
      }
    }

    initPreview()

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const handleJoin = async () => {
    if (unlockAudio) {
      await unlockAudio()
    }
    onJoinTable({ micEnabled, camEnabled })
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] px-4 py-8 max-w-lg mx-auto animate-fade-in">
      <div className="w-full bg-white dark:bg-[#1E242B] rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 p-6 flex flex-col items-center">
        {/* Header */}
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-xs uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Green Room Check
          </span>
          <h2 className="text-2xl font-black text-stone-900 dark:text-white">
            Ready to Join Table?
          </h2>
          <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
            Room Code: <span className="font-mono font-bold text-purple-600 dark:text-purple-400">{roomCode}</span> • Player: <span className="font-semibold text-stone-800 dark:text-stone-200">{playerName}</span>
          </p>
        </div>

        {/* Video Preview Card */}
        <div className="relative w-full aspect-video bg-stone-900 rounded-xl overflow-hidden shadow-inner flex items-center justify-center border border-stone-300 dark:border-stone-700 mb-6">
          {camEnabled ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-stone-500">
              <div className="w-16 h-16 rounded-full bg-stone-800 flex items-center justify-center text-2xl font-bold text-stone-400 mb-2">
                {playerName.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs">Camera Off</span>
            </div>
          )}

          {/* Bottom device controls inside video */}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3 z-10">
            <button
              onClick={() => {
                setMicEnabled(!micEnabled)
                if (streamRef.current) {
                  streamRef.current.getAudioTracks().forEach((t) => (t.enabled = !micEnabled))
                }
              }}
              className={`p-2.5 rounded-full backdrop-blur-md transition-all shadow-md ${
                micEnabled
                  ? 'bg-white/20 hover:bg-white/30 text-white'
                  : 'bg-red-500/80 hover:bg-red-500 text-white'
              }`}
              title={micEnabled ? 'Mute Mic' : 'Unmute Mic'}
            >
              {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>

            <button
              onClick={() => {
                setCamEnabled(!camEnabled)
                if (streamRef.current) {
                  streamRef.current.getVideoTracks().forEach((t) => (t.enabled = !camEnabled))
                }
              }}
              className={`p-2.5 rounded-full backdrop-blur-md transition-all shadow-md ${
                camEnabled
                  ? 'bg-white/20 hover:bg-white/30 text-white'
                  : 'bg-red-500/80 hover:bg-red-500 text-white'
              }`}
              title={camEnabled ? 'Turn Off Cam' : 'Turn On Cam'}
            >
              {camEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Join button */}
        <button
          onClick={handleJoin}
          className="w-full py-3.5 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-lg shadow-purple-900/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-base"
        >
          <span>Join Table & Enable Audio/Video</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        <p className="text-xs text-stone-400 dark:text-stone-500 mt-4 text-center">
          Tapping unlocks audio autoplay on mobile devices (iOS Safari & Android Chrome).
        </p>
      </div>
    </div>
  )
}
