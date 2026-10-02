/* tools/sim - test-only random-legal-play simulator (CLAUDE.md rule 8:
   never shipped to production). Plays a full game by picking a uniformly
   random LEGAL action at every decision point, using only the public
   engine API - exactly what a real client would be allowed to send.
   Used by Step 4 to prove every player count always reaches a valid
   winner, and by the leak test to check projectView at every step of
   many real games. */
import {
  applyCastVote,
  applyChancellorEnact,
  applyNomination,
  applyPowerChoose,
  applyPowerPeekDone,
  applyPresidentDiscard,
  applyRevealVotes,
  applyVetoRequest,
  applyVetoRespond,
  canRequestVeto,
  createInitialGameState,
  getChancellorEligibility,
  getGenericPowerTargetError,
  getInvestigateTargetError,
  getPlayerCount,
  getVoteRevealer,
  PHASE_AWAIT_HOST_REVEAL,
  PHASE_CHANCELLOR_POLICIES,
  PHASE_GAME_OVER,
  PHASE_NOMINATION,
  PHASE_PRESIDENTIAL_POWER,
  PHASE_PRESIDENT_POLICIES,
  PHASE_VETO_RESPONSE,
  PHASE_VOTING,
  POWER_INVESTIGATE,
  POWER_POLICY_PEEK,
  VOTE_NO,
  VOTE_YES,
} from "@game/engine"
import type { GameState, PlayerCount, PlayerId, RandomFn } from "@game/engine"

const SAFETY_LIMIT = 2000

function pickRandom<T>(items: readonly T[], random: RandomFn): T {
  if (items.length === 0) {
    throw new Error("pickRandom: no legal candidates - this is a rules bug, not a game state")
  }
  const index = Math.floor(random() * items.length)
  return items[index] as T
}

/* Plays one full game to completion. onStep, if given, runs after every
   state transition (including the initial state) - the leak test uses
   it to inspect projectView at every point in many real games. */
export function playRandomGame(
  playerCount: PlayerCount,
  random: RandomFn,
  onStep?: (state: GameState) => void,
): GameState {
  const playerIds = Array.from({ length: playerCount }, (_, i) => "player" + i)
  const hostId = playerIds[0] as PlayerId
  const connected = new Set(playerIds)
  let state = createInitialGameState(playerIds, hostId, random)
  if (onStep) {
    onStep(state)
  }
  let steps = 0
  while (state.phase !== PHASE_GAME_OVER) {
    steps += 1
    if (steps > SAFETY_LIMIT) {
      throw new Error("Simulated game exceeded the safety step limit - likely an infinite loop")
    }
    state = step(state, random, connected)
    if (onStep) {
      onStep(state)
    }
  }
  return state
}

function step(state: GameState, random: RandomFn, connected: ReadonlySet<PlayerId>): GameState {
  if (state.phase === PHASE_NOMINATION) {
    return stepNomination(state, random)
  }
  if (state.phase === PHASE_VOTING) {
    return stepVoting(state, random)
  }
  if (state.phase === PHASE_AWAIT_HOST_REVEAL) {
    const revealer = getVoteRevealer(state.playerIds, state.hostId, state.alivePlayers, connected)
    return applyRevealVotes(state, revealer, connected, random)
  }
  if (state.phase === PHASE_PRESIDENT_POLICIES) {
    return applyPresidentDiscard(state, Math.floor(random() * 3))
  }
  if (state.phase === PHASE_CHANCELLOR_POLICIES) {
    return stepChancellorPolicies(state, random)
  }
  if (state.phase === PHASE_VETO_RESPONSE) {
    return applyVetoRespond(state, random() < 0.5, random)
  }
  if (state.phase === PHASE_PRESIDENTIAL_POWER) {
    return stepPresidentialPower(state, random)
  }
  throw new Error("Unknown phase: " + state.phase)
}

function stepNomination(state: GameState, random: RandomFn): GameState {
  const candidates = state.playerIds.filter((playerId) => {
    const eligibility = getChancellorEligibility(
      playerId,
      state.presidentId,
      state.alivePlayers,
      state.lastElectedPresidentId,
      state.lastElectedChancellorId,
    )
    return eligibility.eligible
  })
  return applyNomination(state, pickRandom(candidates, random))
}

function stepVoting(state: GameState, random: RandomFn): GameState {
  let next = state
  for (const playerId of state.alivePlayers) {
    const vote = random() < 0.5 ? VOTE_YES : VOTE_NO
    next = applyCastVote(next, playerId, vote)
  }
  return next
}

function stepChancellorPolicies(state: GameState, random: RandomFn): GameState {
  const canVeto = canRequestVeto(state.fascistPoliciesEnacted, getPlayerCount(state), state.vetoRequestedThisSession)
  const requestsVeto = canVeto && random() < 0.1
  if (requestsVeto) {
    return applyVetoRequest(state)
  }
  return applyChancellorEnact(state, Math.floor(random() * 2), random)
}

function stepPresidentialPower(state: GameState, random: RandomFn): GameState {
  if (state.pendingPower === POWER_POLICY_PEEK) {
    return applyPowerPeekDone(state)
  }
  if (state.pendingPower === POWER_INVESTIGATE) {
    const candidates = state.playerIds.filter((playerId) => {
      const error = getInvestigateTargetError(
        playerId,
        state.presidentId,
        state.alivePlayers,
        state.investigatedPlayerIds,
      )
      return error === null
    })
    return applyPowerChoose(state, pickRandom(candidates, random))
  }
  const candidates = state.playerIds.filter((playerId) => {
    return getGenericPowerTargetError(playerId, state.presidentId, state.alivePlayers) === null
  })
  return applyPowerChoose(state, pickRandom(candidates, random))
}
