/* The full round-by-round game state, composing R1-R25 (Steps 2-3) with
   the legislative/veto/power/win pieces built in this step. Everything
   the reducer needs lives here - nothing is implicit or external except
   the random source and (for vote reveal) who is currently connected,
   both of which are injected per CLAUDE.md rule 3. */
import { dealRoles } from "./roles.js"
import { buildPolicyDeck, shuffle } from "./deck.js"
import { pickFirstPresident } from "./seating.js"
import { EMPTY_VOTING_STATE } from "./voting.js"
import { PHASE_NOMINATION } from "./phase.js"
import { isValidPlayerCount } from "./types.js"
import type { PlayerCount, Policy, PlayerId, RandomFn, Role, Team } from "./types.js"
import type { Power } from "./boards.js"
import type { VotingState } from "./voting.js"
import type { Phase } from "./phase.js"
import type { WinReason } from "./wins.js"

export interface Investigation {
  investigatorId: PlayerId
  targetId: PlayerId
  team: Team
}

export interface GameState {
  playerIds: PlayerId[]
  roles: Map<PlayerId, Role>
  alivePlayers: Set<PlayerId>
  hostId: PlayerId

  presidentId: PlayerId
  specialElectionReturnTo: PlayerId | null
  chancellorNomineeId: PlayerId | null
  lastElectedPresidentId: PlayerId | null
  lastElectedChancellorId: PlayerId | null
  notHitlerBadges: Set<PlayerId>

  electionTracker: number
  votingState: VotingState

  drawPile: Policy[]
  discardPile: Policy[]
  presidentHand: Policy[] | null
  chancellorHand: Policy[] | null

  liberalPoliciesEnacted: number
  fascistPoliciesEnacted: number
  vetoRequestedThisSession: boolean

  pendingPower: Power | null
  investigatedPlayerIds: Set<PlayerId>
  investigations: Investigation[]
  peekedPolicies: Policy[] | null

  phase: Phase
  winner: Team | null
  winReason: WinReason | null
}

/* Composes R1-R10 (Step 2) and R4 deck setup into one ready-to-play
   state, with phase = Nomination (RoleReveal has already happened
   client-side by the time this runs). */
export function createInitialGameState(
  playerIds: readonly PlayerId[],
  hostId: PlayerId,
  random: RandomFn,
): GameState {
  if (!isValidPlayerCount(playerIds.length)) {
    throw new Error("R1: player count must be 5-10")
  }
  const roles = dealRoles(playerIds, random)
  const presidentId = pickFirstPresident(playerIds, random)
  const drawPile = shuffle(buildPolicyDeck(), random)
  return {
    playerIds: [...playerIds],
    roles,
    alivePlayers: new Set(playerIds),
    hostId,
    presidentId,
    specialElectionReturnTo: null,
    chancellorNomineeId: null,
    lastElectedPresidentId: null,
    lastElectedChancellorId: null,
    notHitlerBadges: new Set(),
    electionTracker: 0,
    votingState: EMPTY_VOTING_STATE,
    drawPile,
    discardPile: [],
    presidentHand: null,
    chancellorHand: null,
    liberalPoliciesEnacted: 0,
    fascistPoliciesEnacted: 0,
    vetoRequestedThisSession: false,
    pendingPower: null,
    investigatedPlayerIds: new Set(),
    investigations: [],
    peekedPolicies: null,
    phase: PHASE_NOMINATION,
    winner: null,
    winReason: null,
  }
}

/* playerIds never shrinks (execution only removes from alivePlayers), so
   its length is always the original, validated player count. */
export function getPlayerCount(state: GameState): PlayerCount {
  return state.playerIds.length as PlayerCount
}
