/* Dev-only scenario switcher engine (plan.md Step 7). Plays random LEGAL
   moves with the real packages/engine until the requested phase is
   reached, so the table can be opened at any phase and player count.
   Not shipped in production: only imported from dev screens (CLAUDE.md
   rule 8). Same move set as tools/sim, which is test-only. */
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
  POLICY_FASCIST,
  ROLE_LEADER,
  POLICY_LIBERAL,
  POWER_EXECUTION,
  POWER_POLICY_PEEK,
  VOTE_NO,
  VOTE_YES,
} from "@game/engine"
import type { GameState, Phase, Policy, PlayerId, RandomFn } from "@game/engine"

export type ScenarioPhase = "nomination" | "voting" | "reveal" | "discard" | "enact" | "veto" | "power" | "gameOver"

export const SCENARIO_PHASES: { value: ScenarioPhase; label: string; phase: Phase }[] = [
  { value: "nomination", label: "Nomination", phase: PHASE_NOMINATION },
  { value: "voting", label: "Voting", phase: PHASE_VOTING },
  { value: "reveal", label: "Vote reveal", phase: PHASE_AWAIT_HOST_REVEAL },
  { value: "discard", label: "President policies", phase: PHASE_PRESIDENT_POLICIES },
  { value: "enact", label: "Chancellor policies", phase: PHASE_CHANCELLOR_POLICIES },
  { value: "veto", label: "Veto response", phase: PHASE_VETO_RESPONSE },
  { value: "power", label: "Presidential power", phase: PHASE_PRESIDENTIAL_POWER },
  { value: "gameOver", label: "Game over", phase: PHASE_GAME_OVER },
]

const SAFETY_LIMIT = 2000

function pick<T>(items: readonly T[], random: RandomFn): T | undefined {
  if (items.length === 0) return undefined
  return items[Math.floor(random() * items.length)]
}

export function newScenarioGame(playerIds: PlayerId[], random: RandomFn): GameState {
  return createInitialGameState(playerIds, playerIds[0] as PlayerId, random)
}

export function playUntil(start: GameState, target: ScenarioPhase, hostId: PlayerId, random: RandomFn): GameState | null {
  const targetPhase = SCENARIO_PHASES.find((entry) => entry.value === target)?.phase
  let state = start
  for (let steps = 0; steps < SAFETY_LIMIT; steps += 1) {
    if (state.phase === targetPhase) return state
    if (state.phase === PHASE_GAME_OVER) return target === "gameOver" ? state : null
    state = step(state, hostId, random, target)
  }
  return null
}

function step(state: GameState, hostId: PlayerId, random: RandomFn, target: ScenarioPhase): GameState {
  switch (state.phase) {
    case PHASE_NOMINATION: {
      const candidates = state.playerIds.filter(
        (id) => getChancellorEligibility(id, state.presidentId, state.alivePlayers, state.lastElectedPresidentId, state.lastElectedChancellorId).eligible,
      )
      const safe = steer(target) ? candidates.filter((id) => state.roles.get(id) !== ROLE_LEADER) : candidates
      return applyNomination(state, pick(safe.length > 0 ? safe : candidates, random) as PlayerId)
    }
    case PHASE_VOTING: {
      let next = state
      for (const id of state.alivePlayers) {
        next = applyCastVote(next, id, steer(target) || random() < 0.5 ? VOTE_YES : VOTE_NO)
      }
      return next
    }
    case PHASE_AWAIT_HOST_REVEAL: {
      const connected = new Set(state.alivePlayers)
      const revealer = getVoteRevealer(state.playerIds, hostId, state.alivePlayers, connected)
      return applyRevealVotes(state, revealer, connected, random)
    }
    case PHASE_PRESIDENT_POLICIES:
      return applyPresidentDiscard(state, indexFor(state.presidentHand, POLICY_LIBERAL, target, random, 3))
    case PHASE_CHANCELLOR_POLICIES: {
      const canVeto = canRequestVeto(state.fascistPoliciesEnacted, getPlayerCount(state), state.vetoRequestedThisSession)
      if (canVeto && (target === "veto" ? true : random() < 0.1)) return applyVetoRequest(state)
      return applyChancellorEnact(state, indexFor(state.chancellorHand, POLICY_FASCIST, target, random, 2), random)
    }
    case PHASE_VETO_RESPONSE:
      return applyVetoRespond(state, random() < 0.5, random)
    case PHASE_PRESIDENTIAL_POWER:
      return stepPower(state, random, target)
    default:
      throw new Error("autoplay: unknown phase " + state.phase)
  }
}

function stepPower(state: GameState, random: RandomFn, target: ScenarioPhase): GameState {
  if (state.pendingPower === POWER_POLICY_PEEK) {
    return applyPowerPeekDone(state)
  }
  const candidates = state.playerIds.filter((id) => {
    if (state.pendingPower === POWER_INVESTIGATE) {
      return getInvestigateTargetError(id, state.presidentId, state.alivePlayers, state.investigatedPlayerIds) === null
    }
    const protectHitler = steer(target) && state.pendingPower === POWER_EXECUTION && state.roles.get(id) === ROLE_LEADER
    return id !== state.presidentId && state.alivePlayers.has(id) && !protectHitler
  })
  return applyPowerChoose(state, pick(candidates, random) as PlayerId)
}

/* Scenarios that need Fascist policies (veto, powers) steer the random
   game toward them: discard Liberal, enact Fascist, request the veto. */
function indexFor(hand: readonly Policy[] | null, keep: Policy, target: ScenarioPhase, random: RandomFn, size: number): number {
  const steering = steer(target)
  if (steering && hand) {
    const found = keep === POLICY_FASCIST ? hand.indexOf(POLICY_FASCIST) : hand.indexOf(POLICY_LIBERAL)
    if (found !== -1) return found
  }
  return Math.floor(random() * size)
}

function steer(target: ScenarioPhase): boolean {
  return target === "veto" || target === "power"
}
