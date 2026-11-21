# Imposter Party & Multiplayer Video Mafia

Live Web Application hosting both **Imposter: The Party Game** and the new **Multiplayer Video Mafia** with an automated Server Moderator ("God") and LiveKit WebRTC video calling.

A tab toggle at the middle-top allows seamless switching between **🕵️ Imposter** and **🎭 Mafia** without interfering with either game's state or files.

---

## 🎭 Multiplayer Video Mafia Overview

Multiplayer Video Mafia is a production-ready, mobile-first real-time social deduction web game:
- **Two-Plane Architecture**: Control Plane (Node.js + Socket.io authoritative FSM) strictly separated from the Media Plane (LiveKit SFU).
- **Interactive Video Grid**: Every living player's live camera tile acts directly as their interactive game card for Night targeting and Day voting.
- **Authoritative Server God**: Automated 9-phase finite state machine with server-enforced permissions, anti-cheat role isolation, and instant dual win checks.
- **Deferred LiveKit Credentials & Automatic Mock Video Mode**: Playtest immediately across multiple browser tabs without any API keys. When ready, simply add your LiveKit credentials to `server/.env` to go live with WebRTC video.

---

## 🚀 Quick Start (Local Multi-Tab Playtesting)

### 1. Start the Mafia Backend Server
In a terminal:
```bash
cd server
npm install
npm run dev
```
The server starts on port `3001` (health endpoint: `http://localhost:3001/health`).
By default, it runs in **Mock Video Mode** if LiveKit keys are not present, logging participant permission calls cleanly to the console.

To run the automated 18-point edge-case test suite:
```bash
cd server
npm test
```

### 2. Start the Frontend Client
In a separate terminal:
```bash
# from root repository
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Multi-Tab Testing
1. Toggle the middle-top pill to **🎭 Mafia**.
2. Enter a player name (e.g. `Host`) and click **Create New Mafia Room**.
3. Pass the **Green Room Check** and tap **Join Table & Enable Audio/Video**.
4. Open 2–4 incognito or separate browser tabs to `http://localhost:5173?game=mafia&room=CODE`.
5. Enter distinct names in each tab and join the table.
6. In **Mock Video Mode**, click **Simulate Mic** in the top banner of any tab to test the golden active-speaker ring.
7. In the Host lobby, you can enable **Dev Mode (Allow 3 Players)** under Host Settings to test the full 9-phase match cycle with 3 players, or gather 5+ players for standard competitive scaling.

---

## 🔑 Activating Real WebRTC Video (LiveKit Cloud)

When you are ready to enable real live WebRTC camera and microphone streaming, paste your 3 LiveKit credentials into `server/.env`:

```env
# server/.env
PORT=3001
CLIENT_URL=http://localhost:5173

# LiveKit Cloud Credentials:
LIVEKIT_URL=wss://your-project-name.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key_here
LIVEKIT_API_SECRET=your_livekit_api_secret_here
```

Restart the server (`npm run dev` in `server/`). The server will automatically detect the valid credentials, mint real JWTs, and stream 360p continuous video with zero renegotiation lag.

---

## 🛡️ 18-Point Edge-Case & Anti-Cheat Guards

1. **Ghost Video Spoiler Block**: Eliminated players lose BOTH audio and video publishing (`canPublish: false`) at the SFU level immediately; their tile turns grayscale with an `ELIMINATED` badge so they cannot mouth or gesture clues.
2. **Role-Reveal Gasp Mute**: All microphones are server-muted during the 6s `ROLE_REVEAL` phase to prevent startled reactions from giving away roles.
3. **Night Phone-Tapping Anti-Tell**: Villagers get an interactive "Night Watch" screen during Night so eye gaze and screen tapping look identical on camera across all roles.
4. **Dead-Player Role Secrecy**: Eliminated ghosts do not learn who the Mafias are until `GAME_OVER`, preventing WhatsApp/offline side-channel leaks to living friends.
5. **Anti-Cheat Payload Filter**: `sanitizeStateForPlayer` strips `role: null` for all other players in every WebSocket packet until `GAME_OVER`.
6. **45-Second Reconnect Grace Window**: Stores session tokens in `localStorage`. Disconnected players display a pulsing `Reconnecting...` badge; returning within 45s seamlessly re-hydrates their exact state and LiveKit token.
7. **Permanent Disconnect Resolution**: If the 45s timer expires mid-game, the player is eliminated (`DISCONNECTED`), LiveKit permissions are revoked, and an immediate Win Check is triggered.
8. **Automatic Host Handover**: If the host disconnects permanently in `LOBBY` or `GAME_OVER`, host privileges automatically transfer to the earliest-joined connected player.
9. **Mafia Consensus & Split Resolution**: Mafias see each other's live targeting; solid crimson `TARGET LOCKED` when both match. If timer expires while split, 50/50 random selection resolves the kill.
10. **AFK Mafia Rule**: If neither Mafia selects a target before Night ends, no one dies ("The city slept peacefully").
11. **Doctor Cooldown & 1x Self-Save**: Prevents saving the same player two nights in a row (`doctorConsecutiveSave: false`), and tracks `doctorSelfSaveUsed` for the 1x self-save rule.
12. **Timer-Zero Packet Race Guard**: Every incoming action validates `phaseId === room.phaseId`; stale packets are discarded.
13. **No Corpse Targeting**: Server strictly validates `actor.isAlive === true` and `target.isAlive === true` on all night actions and day votes.
14. **Exact Dual Win-Check Logic**: Evaluated after both `MORNING_REVEAL` and `EXECUTION_REVEAL`: Town wins when `aliveMafia === 0`; Mafia wins when `aliveMafia >= aliveNonMafia` (parity).
15. **Mobile Autoplay Unlock**: Mandatory Green Room user gesture explicitly calls `room.startAudio()` before entering the lobby.
16. **Camera Fallback**: Denied or unavailable webcams seamlessly fall back to styled avatar tiles with active-speaker rings.
17. **App-Switch Visibility Badge**: Tab minimization broadcasts an `Away` status pill without kicking the player.
18. **Instant Zero-Lag Rematch**: Clicking "Play Again" in `GAME_OVER` resets state back to `LOBBY` and restores LiveKit permissions without closing or recreating the room.

---

## 🏛️ 9-Phase Finite State Machine (FSM)

| # | Phase | LiveKit Permissions | Key Actions & Logic |
|---|---|---|---|
| 1 | **LOBBY** | All: Mic ON, Cam ON | 4-char room code, rule toggles, ready check, host start. |
| 2 | **ROLE_REVEAL** (6s) | Mics SERVER-MUTED; Cams ON | Fisher-Yates role assignment, partner reveal for Mafia. |
| 3 | **NIGHT** (25s) | Mics SERVER-MUTED; Cams ON | Simultaneous actions: Mafia kill sync, Doctor save, Villager note. |
| 4 | **DAWN_COOLDOWN** (3s) | Mics SERVER-MUTED; Inputs LOCKED | Consensus resolution, 50/50 split resolution, Doctor clutch check. |
| 5 | **MORNING_REVEAL** (5s) | Mics SERVER-MUTED; Victim revoked | Announce night casualty. Win Check #1. |
| 6 | **DAY_DISCUSSION** (120s) | Living: UNMUTED; Ghosts: REVOKED | Open video debate. Majority "Ready to Vote" fast-forwards. |
| 7 | **DAY_VOTING** (25s) | Living: UNMUTED; Ghosts: REVOKED | Plurality vote on tiles or Skip. Auto-advances when all voted. |
| 8 | **EXECUTION_REVEAL** (5s) | Living: UNMUTED; Executed revoked | Transparent vote tally, strict plurality eliminates. Win Check #2. |
| 9 | **GAME_OVER** | EVERYONE UNMUTED + Cams RESTORED | Full role reveal, timeline with clutch saves, "Play Again" rematch. |

---

## 📁 Repository Structure

```
├── README.md                     # Complete project documentation & setup guide
├── index.html                    # Root HTML
├── vite.config.js                # Vite configuration
├── package.json                  # Root React dependencies
├── server/                       # Mafia Control Plane & Media Service
│   ├── package.json              # Server dependencies (Express, Socket.io, LiveKit SDK)
│   ├── .env.example              # LiveKit credentials template
│   ├── .env                      # Local server environment config
│   ├── src/
│   │   ├── index.js              # Express + Socket.io bootstrap & event routing
│   │   ├── roomManager.js        # Room state, 4-char codes, session tokens, GC
│   │   ├── stateMachine.js       # Authoritative 9-phase FSM & win checks
│   │   ├── roleAllocator.js      # Cryptographic Fisher-Yates shuffle & role scaling
│   │   ├── sanitizer.js          # sanitizeStateForPlayer anti-cheat payload filter
│   │   └── livekitService.js     # LiveKit token minting & Mock Video Mode
│   └── test/
│       └── stateMachine.test.js  # Automated 18-point edge-case test suite
└── src/
    ├── main.jsx                  # Entry point rendering RootApp
    ├── RootApp.jsx               # Top Middle Tab Toggle (🕵️ Imposter | 🎭 Mafia)
    ├── App.jsx                   # UNTOUCHED Imposter Party Game
    ├── components/               # UNTOUCHED Imposter components
    ├── services/                 # UNTOUCHED Imposter services
    └── mafia/                    # New Mafia Game Frontend
        ├── MafiaApp.jsx          # Mafia root container & night/day themes
        ├── hooks/
        │   ├── useGameSocket.js  # Socket.io, sessionToken recovery, away detection
        │   └── useLiveKitRoom.js # LiveKit WebRTC room & Mock Video Mode
        └── components/
            ├── GreenRoom.jsx     # Pre-lobby cam/mic check & mobile audio unlock
            ├── LobbyControls.jsx # Share link, rule toggles, ready button
            ├── PhaseBanner.jsx   # Top editorial status bar & UTC countdown
            ├── VideoGrid.jsx     # Responsive mobile-first clickable tile grid
            ├── PlayerTile.jsx    # Live video tile, speaker ring, target/vote card
            ├── RoleRevealModal.jsx # 6s dramatic role reveal modal
            ├── NightActionBar.jsx # Docked bottom bar with anti-tell tapping
            ├── GameOverSummary.jsx # Full role reveal & rematch timeline
            └── DemoBanner.jsx    # Mock mode banner with simulate speaking toggle
```
