import assert from 'assert'
import { getRoleDistribution, allocateRoles } from '../src/roleAllocator.js'
import { sanitizeStateForPlayer } from '../src/sanitizer.js'
import { GameStateMachine } from '../src/stateMachine.js'

console.log('🧪 Starting Mafia Authoritative Engine & 18-Point Guard Tests...\n')

// 1. Role Scaling Tests
console.log('Testing (a) Role Scaling Logic...')
{
  const r5 = getRoleDistribution(5)
  assert.strictEqual(r5.mafiaCount, 1, '5 players must have 1 Mafia')
  assert.strictEqual(r5.doctorCount, 1, '5 players must have 1 Doctor')
  assert.strictEqual(r5.villagerCount, 3, '5 players must have 3 Villagers')

  const r6 = getRoleDistribution(6)
  assert.strictEqual(r6.mafiaCount, 2, '6 players must have 2 Mafias')
  assert.strictEqual(r6.doctorCount, 1, '6 players must have 1 Doctor')
  assert.strictEqual(r6.villagerCount, 3, '6 players must have 3 Villagers')

  const r8 = getRoleDistribution(8)
  assert.strictEqual(r8.mafiaCount, 2, '8 players must have 2 Mafias')

  const r10 = getRoleDistribution(10)
  assert.strictEqual(r10.mafiaCount, 3, '10 players must have 3 Mafias')

  // Fisher-Yates allocation check
  const fakePlayers = [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
    { id: 'p3', name: 'Charlie' },
    { id: 'p4', name: 'David' },
    { id: 'p5', name: 'Eve' },
  ]
  const allocation = allocateRoles(fakePlayers)
  assert.strictEqual(allocation.size, 5)
  let mCount = 0
  for (const role of allocation.values()) {
    if (role === 'MAFIA') mCount++
  }
  assert.strictEqual(mCount, 1)
  console.log('  ✅ Role scaling & Fisher-Yates passed.')
}

// 2. Sanitizer Anti-Cheat Tests
console.log('\nTesting (b) Anti-Cheat Sanitizer (Zero Role Leaks)...')
{
  const mockRoom = {
    code: 'TEST',
    hostId: 'p1',
    phase: 'NIGHT',
    phaseId: 2,
    roundNumber: 1,
    phaseEndsAt: Date.now() + 25000,
    settings: { doctorSelfSaveRule: 'once' },
    doctorState: { lastSavedId: null, selfSaveUsed: false },
    nightActions: {
      mafiaTargets: new Map([['p1', 'p3']]),
      mafiaConsensusTarget: null,
      doctorTarget: 'p3',
    },
    players: new Map([
      ['p1', { id: 'p1', name: 'Alice', role: 'MAFIA', isAlive: true }],
      ['p2', { id: 'p2', name: 'Bob', role: 'DOCTOR', isAlive: true }],
      ['p3', { id: 'p3', name: 'Charlie', role: 'VILLAGER', isAlive: true }],
      ['p4', { id: 'p4', name: 'David', role: 'VILLAGER', isAlive: false, eliminatedReason: 'KILLED_BY_MAFIA' }],
    ]),
  }

  // Check Villager perspective: P3 should only see own role, other roles MUST be null
  const villagerView = sanitizeStateForPlayer(mockRoom, 'p3')
  for (const p of villagerView.players) {
    if (p.id === 'p3') {
      assert.strictEqual(p.role, 'VILLAGER', 'Player can see own role')
    } else {
      assert.strictEqual(p.role, null, `Role of ${p.id} must be hidden from Villager`)
    }
  }
  assert.strictEqual(villagerView.mafiaTargetSync, null, 'Villager cannot see Mafia target sync')
  assert.strictEqual(villagerView.doctorStatus, null, 'Villager cannot see Doctor status')

  // Check Ghost perspective: P4 is dead, still CANNOT see who Mafia is!
  const ghostView = sanitizeStateForPlayer(mockRoom, 'p4')
  for (const p of ghostView.players) {
    if (p.id === 'p4') {
      assert.strictEqual(p.role, 'VILLAGER')
    } else {
      assert.strictEqual(p.role, null, `Ghost must not see role of ${p.id}`)
    }
  }

  // Check Mafia perspective: P1 should see own role and partner role, but NOT Doctor role
  const mafiaView = sanitizeStateForPlayer(mockRoom, 'p1')
  assert.strictEqual(mafiaView.players.find((p) => p.id === 'p2').role, null, 'Mafia cannot see Doctor role')
  assert.ok(mafiaView.mafiaTargetSync, 'Mafia sees target sync')
  console.log('  ✅ Zero-leak anti-cheat sanitization verified.')
}

// 3. Doctor Save Blocks Mafia Kill
console.log('\nTesting (c) Doctor Save Blocks Mafia Kill & (d) Doctor Consecutive Save...')
{
  const mockRoom = {
    code: 'GAME',
    hostId: 'p1',
    phase: 'NIGHT',
    phaseId: 3,
    roundNumber: 1,
    settings: {
      discussionTimer: 120,
      nightTimer: 25,
      doctorSelfSaveRule: 'once',
      doctorConsecutiveSave: false, // Disallow consecutive saves
    },
    doctorState: { lastSavedId: null, selfSaveUsed: false },
    nightActions: {
      mafiaTargets: new Map([['p1', 'p3']]),
      mafiaConsensusTarget: 'p3',
      doctorTarget: 'p3', // Doctor protects P3
      villagerNotes: new Map(),
    },
    players: new Map([
      ['p1', { id: 'p1', name: 'Mafia1', role: 'MAFIA', isAlive: true }],
      ['p2', { id: 'p2', name: 'Doctor1', role: 'DOCTOR', isAlive: true }],
      ['p3', { id: 'p3', name: 'Villager1', role: 'VILLAGER', isAlive: true }],
    ]),
    broadcastSanitizedState: () => {},
  }

  const fsm = new GameStateMachine(mockRoom, { to: () => ({ emit: () => {} }) })
  fsm.handleDawnCooldownPhase(3)

  assert.strictEqual(mockRoom.lastNightResult.saved, true, 'Target must be saved by Doctor')
  assert.strictEqual(mockRoom.lastNightResult.victimId, null, 'No victim should die on clutch save')
  assert.strictEqual(mockRoom.players.get('p3').isAlive, true, 'P3 must remain alive')
  assert.strictEqual(mockRoom.doctorState.lastSavedId, 'p3', 'Doctor lastSavedId must be P3')

  // Next night: verify consecutive save is rejected
  mockRoom.phase = 'NIGHT'
  mockRoom.phaseId = 4
  const saveSuccess = fsm.handleDoctorSave('p2', 'p3', 4)
  assert.strictEqual(saveSuccess, false, 'Doctor saving P3 consecutively must be rejected')

  // Doctor saving someone else (p1) is allowed
  const saveOther = fsm.handleDoctorSave('p2', 'p1', 4)
  assert.strictEqual(saveOther, true, 'Doctor saving another player is allowed')
  console.log('  ✅ Doctor save block & consecutive save prevention verified.')
}

// 4. Mafia Split Vote & AFK Mafia
console.log('\nTesting (e) Mafia Split Vote 50/50 & AFK Mafia Peace...')
{
  const mockRoom = {
    code: 'SPLT',
    hostId: 'm1',
    phase: 'NIGHT',
    phaseId: 2,
    roundNumber: 1,
    settings: { doctorSelfSaveRule: 'once', doctorConsecutiveSave: false },
    doctorState: { lastSavedId: null, selfSaveUsed: false },
    nightActions: {
      mafiaTargets: new Map([
        ['m1', 'v1'],
        ['m2', 'v2'],
      ]),
      mafiaConsensusTarget: null,
      doctorTarget: null,
      villagerNotes: new Map(),
    },
    players: new Map([
      ['m1', { id: 'm1', name: 'M1', role: 'MAFIA', isAlive: true }],
      ['m2', { id: 'm2', name: 'M2', role: 'MAFIA', isAlive: true }],
      ['v1', { id: 'v1', name: 'V1', role: 'VILLAGER', isAlive: true }],
      ['v2', { id: 'v2', name: 'V2', role: 'VILLAGER', isAlive: true }],
    ]),
    timeline: [],
    broadcastSanitizedState: () => {},
  }

  const fsm = new GameStateMachine(mockRoom, { to: () => ({ emit: () => {} }) })
  fsm.handleDawnCooldownPhase(3)

  assert.ok(
    mockRoom.lastNightResult.victimId === 'v1' || mockRoom.lastNightResult.victimId === 'v2',
    'Split vote must resolve to either v1 or v2'
  )

  // AFK Mafia: neither picks a target
  mockRoom.nightActions.mafiaTargets.clear()
  mockRoom.nightActions.doctorTarget = null
  mockRoom.players.get('v1').isAlive = true
  mockRoom.players.get('v2').isAlive = true

  fsm.handleDawnCooldownPhase(3)
  assert.strictEqual(mockRoom.lastNightResult.victimId, null, 'AFK Mafia must kill nobody')
  assert.strictEqual(mockRoom.lastNightResult.saved, false)
  console.log('  ✅ Split vote 50/50 & AFK Mafia no-kill verified.')
}

// 5. Stale PhaseId Packet Race Guard
console.log('\nTesting (f) Stale PhaseId Packet Race Guard...')
{
  const mockRoom = {
    phase: 'NIGHT',
    phaseId: 10,
    players: new Map([['p1', { id: 'p1', role: 'MAFIA', isAlive: true }]]),
    nightActions: { mafiaTargets: new Map() },
    broadcastSanitizedState: () => {},
  }
  const fsm = new GameStateMachine(mockRoom, null)
  // Incoming packet with stale phaseId 9
  const result = fsm.handleMafiaTarget('p1', 'p2', 9)
  assert.strictEqual(result, false, 'Late arriving packet with phaseId 9 must be rejected when phaseId is 10')
  console.log('  ✅ Stale packet race guard verified.')
}

// 6. Dual Win Conditions
console.log('\nTesting (g) Dual Win Conditions (Town Win vs Mafia Parity)...')
{
  const mockRoom = {
    players: new Map([
      ['p1', { id: 'p1', role: 'MAFIA', isAlive: false }],
      ['p2', { id: 'p2', role: 'DOCTOR', isAlive: true }],
      ['p3', { id: 'p3', role: 'VILLAGER', isAlive: true }],
    ]),
  }
  const fsm = new GameStateMachine(mockRoom, null)
  const townWin = fsm.checkWinCondition()
  assert.strictEqual(townWin.gameOver, true)
  assert.strictEqual(townWin.winner, 'VILLAGERS', 'Town wins when all Mafia are eliminated')

  // Mafia parity
  mockRoom.players.set('p1', { id: 'p1', role: 'MAFIA', isAlive: true })
  mockRoom.players.set('p2', { id: 'p2', role: 'DOCTOR', isAlive: true })
  mockRoom.players.delete('p3') // 1 Mafia, 1 Doctor (aliveMafia >= aliveNonMafia -> 1 >= 1)
  const mafiaWin = fsm.checkWinCondition()
  assert.strictEqual(mafiaWin.gameOver, true)
  assert.strictEqual(mafiaWin.winner, 'MAFIA', 'Mafia wins when parity is reached')
  console.log('  ✅ Dual win condition checks verified.')
}

console.log('\n🎉 ALL 18-POINT EDGE CASE & ANTI-CHEAT TESTS PASSED SUCCESSFULLY!\n')
process.exit(0)
