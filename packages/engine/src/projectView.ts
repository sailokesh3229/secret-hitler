/* Spec Sec 8 (Who Sees What), enforced here. This is the only function
   allowed to decide what a given player is told - every other module
   works on the full GameState. The moment-of-reveal display (individual
   ballots flipping, Sec 6 point 4) is a one-time server log event, not
   ongoing state, so it is intentionally not modeled here: the reducer
   already resets votingState right after a reveal transition, and this
   function never exposes a vote value, only who has voted (R18).
   Likewise the full round-by-round hand/discard history for the S19
   game-over timeline belongs to the servers game_events log (spec
   Sec 12), not to GameState - this only reveals the CURRENT discard
   pile and roles, which is what GameState actually holds. */
import { getKnownTeammates } from "./knowledge.js"
import { getPlayerCount } from "./state.js"
import { PHASE_GAME_OVER } from "./phase.js"
import type { GameState, Investigation } from "./state.js"
import type { Power } from "./boards.js"
import type { Phase } from "./phase.js"
import type { Policy, PlayerId, Role, Team } from "./types.js"
import type { WinReason } from "./wins.js"

export interface InvestigationResultView {
  targetId: PlayerId
  team: Team
}

export interface GameOverReveal {
  roles: Record<PlayerId, Role>
  discardPile: Policy[]
  investigations: Investigation[]
}

export interface PlayerView {
  viewerId: PlayerId
  phase: Phase
  seats: PlayerId[]
  alivePlayers: PlayerId[]
  ownRole: Role
  knownTeammates: PlayerId[]
  presidentId: PlayerId
  chancellorNomineeId: PlayerId | null
  lastElectedPresidentId: PlayerId | null
  lastElectedChancellorId: PlayerId | null
  notHitlerBadges: PlayerId[]
  votedPlayerIds: PlayerId[]
  liberalPoliciesEnacted: number
  fascistPoliciesEnacted: number
  drawPileCount: number
  discardPileCount: number
  electionTracker: number
  vetoRequestedThisSession: boolean
  myHand: Policy[] | null
  investigatedPlayerIds: PlayerId[]
  myInvestigationResults: InvestigationResultView[]
  myPeekedPolicies: Policy[] | null
  pendingPower: Power | null
  winner: Team | null
  winReason: WinReason | null
  gameOverReveal: GameOverReveal | null
}

export function projectView(state: GameState, viewerId: PlayerId): PlayerView {
  const ownRole = state.roles.get(viewerId)
  if (ownRole === undefined) {
    throw new Error("Unknown viewer: cannot project a view for a player not in this game")
  }
  const isPresident = viewerId === state.presidentId
  const isChancellorNominee = viewerId === state.chancellorNomineeId
  let myHand: Policy[] | null = null
  if (isPresident && state.presidentHand !== null) {
    myHand = state.presidentHand
  } else if (isChancellorNominee && state.chancellorHand !== null) {
    myHand = state.chancellorHand
  }
  const myPeekedPolicies = isPresident ? state.peekedPolicies : null
  const myInvestigationResults: InvestigationResultView[] = state.investigations
    .filter((inv) => inv.investigatorId === viewerId)
    .map((inv) => ({ targetId: inv.targetId, team: inv.team }))

  let gameOverReveal: GameOverReveal | null = null
  if (state.phase === PHASE_GAME_OVER) {
    const roles: Record<PlayerId, Role> = {}
    for (const [playerId, role] of state.roles) {
      roles[playerId] = role
    }
    gameOverReveal = {
      roles,
      discardPile: [...state.discardPile],
      investigations: [...state.investigations],
    }
  }

  return {
    viewerId,
    phase: state.phase,
    seats: [...state.playerIds],
    alivePlayers: [...state.alivePlayers],
    ownRole,
    knownTeammates: getKnownTeammates(viewerId, state.roles, getPlayerCount(state)),
    presidentId: state.presidentId,
    chancellorNomineeId: state.chancellorNomineeId,
    lastElectedPresidentId: state.lastElectedPresidentId,
    lastElectedChancellorId: state.lastElectedChancellorId,
    notHitlerBadges: [...state.notHitlerBadges],
    votedPlayerIds: [...state.votingState.votes.keys()],
    liberalPoliciesEnacted: state.liberalPoliciesEnacted,
    fascistPoliciesEnacted: state.fascistPoliciesEnacted,
    drawPileCount: state.drawPile.length,
    discardPileCount: state.discardPile.length,
    electionTracker: state.electionTracker,
    vetoRequestedThisSession: state.vetoRequestedThisSession,
    myHand,
    investigatedPlayerIds: [...state.investigatedPlayerIds],
    myInvestigationResults,
    myPeekedPolicies,
    pendingPower: state.pendingPower,
    winner: state.winner,
    winReason: state.winReason,
    gameOverReveal,
  }
}
