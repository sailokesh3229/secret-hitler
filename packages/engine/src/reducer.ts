/* The round state machine: one apply* function per client action from
   spec Sec 13, each validating its own phase and delegating to the
   small pure rule modules built in Steps 2-4. This is the composition
   layer - correctness of each individual rule is already covered by
   that modules own tests. The tests here check the composition itself
   (phase transitions, ordering, who-sees-what is projectView.ts job). */
import { getChancellorEligibility, recordElectedGovernment, clearTermLimits } from "./eligibility.js"
import { getNextPresident, getSpecialElectionReturnAnchor } from "./rotation.js"
import { castVote, closeVoting, getVoteRevealer, haveAllVoted, revealVotes } from "./voting.js"
import { hasReachedChaos, incrementElectionTracker, resetElectionTracker } from "./tracker.js"
import { resolveChaos } from "./chaos.js"
import {
  checkHitlerChancellor,
  GOVERNMENT_OUTCOME_FASCISTS_WIN,
  GOVERNMENT_OUTCOME_NOT_HITLER_BADGE,
} from "./hitlerCheck.js"
import {
  dealPresidentHand,
  discardFromPresidentHand,
  reshuffleIfNeeded,
  resolveChancellorChoice,
} from "./legislative.js"
import { canRequestVeto } from "./veto.js"
import {
  getGenericPowerTargetError,
  getInvestigateTargetError,
  getTriggeredPower,
} from "./powers.js"
import { checkFascistPoliciesWin, checkHitlerExecutedWin, checkLiberalPoliciesWin } from "./wins.js"
import {
  WIN_REASON_FASCIST_POLICIES,
  WIN_REASON_HITLER_CHANCELLOR,
  WIN_REASON_HITLER_EXECUTED,
  WIN_REASON_LIBERAL_POLICIES,
} from "./wins.js"
import { partyMembership } from "./roles.js"
import {
  POWER_EXECUTION,
  POWER_INVESTIGATE,
  POWER_POLICY_PEEK,
  POWER_SPECIAL_ELECTION,
} from "./boards.js"
import {
  PHASE_AWAIT_HOST_REVEAL,
  PHASE_CHANCELLOR_POLICIES,
  PHASE_GAME_OVER,
  PHASE_NOMINATION,
  PHASE_PRESIDENTIAL_POWER,
  PHASE_PRESIDENT_POLICIES,
  PHASE_VETO_RESPONSE,
  PHASE_VOTING,
} from "./phase.js"
import { POLICY_LIBERAL, TEAM_FASCIST, TEAM_LIBERAL } from "./types.js"
import type { PlayerId, RandomFn, Vote } from "./types.js"
import { getPlayerCount } from "./state.js"
import type { GameState } from "./state.js"

/* R13/R14: nominate a Chancellor. Moves Nomination to Voting. */
export function applyNomination(state: GameState, chancellorNomineeId: PlayerId): GameState {
  if (state.phase !== PHASE_NOMINATION) {
    throw new Error("Can only nominate during the Nomination phase")
  }
  const eligibility = getChancellorEligibility(
    chancellorNomineeId,
    state.presidentId,
    state.alivePlayers,
    state.lastElectedPresidentId,
    state.lastElectedChancellorId,
  )
  if (!eligibility.eligible) {
    throw new Error("INELIGIBLE_NOMINEE: " + eligibility.reason)
  }
  return { ...state, chancellorNomineeId, votingState: { votes: new Map() }, phase: PHASE_VOTING }
}

/* R17: cast a vote. Moves to AwaitHostReveal once everyone has voted. */
export function applyCastVote(state: GameState, playerId: PlayerId, vote: Vote): GameState {
  if (state.phase !== PHASE_VOTING) {
    throw new Error("Can only vote during the Voting phase")
  }
  const votingState = castVote(state.votingState, playerId, vote, state.alivePlayers)
  const phase = haveAllVoted(votingState, state.alivePlayers) ? PHASE_AWAIT_HOST_REVEAL : PHASE_VOTING
  return { ...state, votingState, phase }
}

/* (App rule, Sec 6) Close voting: missing votes count as Nein. */
export function applyCloseVoting(state: GameState): GameState {
  if (state.phase !== PHASE_VOTING) {
    throw new Error("Can only close voting during the Voting phase")
  }
  const votingState = closeVoting(state.votingState, state.alivePlayers)
  return { ...state, votingState, phase: PHASE_AWAIT_HOST_REVEAL }
}

/* Shared by a failed vote (R21/R22) and an agreed veto (R35): resolve
   Chaos, check R43/R45, then either end the game or rotate on. */
function resolveChaosTransition(state: GameState, random: RandomFn): GameState {
  const chaos = resolveChaos(state.drawPile, state.discardPile, random)
  const isLiberal = chaos.enactedPolicy === POLICY_LIBERAL
  const liberalPoliciesEnacted = isLiberal ? state.liberalPoliciesEnacted + 1 : state.liberalPoliciesEnacted
  const fascistPoliciesEnacted = isLiberal ? state.fascistPoliciesEnacted : state.fascistPoliciesEnacted + 1
  const base: GameState = {
    ...state,
    ...clearTermLimits(),
    drawPile: chaos.drawPile,
    discardPile: chaos.discardPile,
    electionTracker: chaos.tracker,
    liberalPoliciesEnacted,
    fascistPoliciesEnacted,
    votingState: { votes: new Map() },
    chancellorNomineeId: null,
  }
  if (isLiberal && checkLiberalPoliciesWin(liberalPoliciesEnacted)) {
    return { ...base, phase: PHASE_GAME_OVER, winner: TEAM_LIBERAL, winReason: WIN_REASON_LIBERAL_POLICIES }
  }
  if (!isLiberal && checkFascistPoliciesWin(fascistPoliciesEnacted, getPlayerCount(state))) {
    return { ...base, phase: PHASE_GAME_OVER, winner: TEAM_FASCIST, winReason: WIN_REASON_FASCIST_POLICIES }
  }
  const nextPresidentId = getNextPresident(
    state.playerIds,
    state.presidentId,
    state.specialElectionReturnTo,
    state.alivePlayers,
  )
  return { ...base, presidentId: nextPresidentId, specialElectionReturnTo: null, phase: PHASE_NOMINATION }
}

/* R19/R20: reveal the votes. On a failure, R21/R22 run (Chaos if the
   tracker reaches 3). On a success, R15 records the term limits, then
   R25/R46 check the Chancellor before anything else - a Fascists-win
   here skips the legislative session entirely, matching the Sec 5.9
   diagram (AwaitHostReveal straight to GameOver). */
export function applyRevealVotes(
  state: GameState,
  revealedBy: PlayerId,
  connectedPlayers: ReadonlySet<PlayerId>,
  random: RandomFn,
): GameState {
  if (state.phase !== PHASE_AWAIT_HOST_REVEAL) {
    throw new Error("Can only reveal votes once everyone has voted")
  }
  const revealerId = getVoteRevealer(state.playerIds, state.hostId, state.alivePlayers, connectedPlayers)
  const result = revealVotes(state.votingState, revealedBy, revealerId, state.alivePlayers)

  if (!result.elected) {
    const tracker = incrementElectionTracker(state.electionTracker)
    if (hasReachedChaos(tracker)) {
      return resolveChaosTransition({ ...state, electionTracker: tracker }, random)
    }
    const nextPresidentId = getNextPresident(
      state.playerIds,
      state.presidentId,
      state.specialElectionReturnTo,
      state.alivePlayers,
    )
    return {
      ...state,
      electionTracker: tracker,
      votingState: { votes: new Map() },
      chancellorNomineeId: null,
      presidentId: nextPresidentId,
      specialElectionReturnTo: null,
      phase: PHASE_NOMINATION,
    }
  }

  const chancellorId = state.chancellorNomineeId
  if (chancellorId === null) {
    throw new Error("No Chancellor nominee to elect")
  }
  const chancellorRole = state.roles.get(chancellorId)
  if (chancellorRole === undefined) {
    throw new Error("Chancellor nominee has no role")
  }
  const termUpdate = recordElectedGovernment(state.presidentId, chancellorId)
  const outcome = checkHitlerChancellor(chancellorRole, state.fascistPoliciesEnacted)
  if (outcome === GOVERNMENT_OUTCOME_FASCISTS_WIN) {
    return {
      ...state,
      ...termUpdate,
      votingState: { votes: new Map() },
      phase: PHASE_GAME_OVER,
      winner: TEAM_FASCIST,
      winReason: WIN_REASON_HITLER_CHANCELLOR,
    }
  }
  const notHitlerBadges =
    outcome === GOVERNMENT_OUTCOME_NOT_HITLER_BADGE
      ? new Set([...state.notHitlerBadges, chancellorId])
      : state.notHitlerBadges
  const dealt = dealPresidentHand(state.drawPile)
  return {
    ...state,
    ...termUpdate,
    notHitlerBadges,
    votingState: { votes: new Map() },
    drawPile: dealt.drawPile,
    presidentHand: dealt.hand,
    phase: PHASE_PRESIDENT_POLICIES,
  }
}

/* R27/R28: President discards one of the 3, the other 2 go together to
   the Chancellor. */
export function applyPresidentDiscard(state: GameState, tileIndex: number): GameState {
  if (state.phase !== PHASE_PRESIDENT_POLICIES) {
    throw new Error("Can only discard during the PresidentPolicies phase")
  }
  if (state.presidentHand === null) {
    throw new Error("Can only discard during the PresidentPolicies phase")
  }
  const { discarded, chancellorHand } = discardFromPresidentHand(state.presidentHand, tileIndex)
  return {
    ...state,
    presidentHand: null,
    chancellorHand,
    discardPile: [...state.discardPile, discarded],
    phase: PHASE_CHANCELLOR_POLICIES,
  }
}

/* R11/R12: rotate to the next President and return to Nomination. Shared
   by every path that ends a round without a game-over result. */
function advanceToNextRound(state: GameState): GameState {
  const nextPresidentId = getNextPresident(
    state.playerIds,
    state.presidentId,
    state.specialElectionReturnTo,
    state.alivePlayers,
  )
  return {
    ...state,
    presidentId: nextPresidentId,
    specialElectionReturnTo: null,
    chancellorNomineeId: null,
    votingState: { votes: new Map() },
    phase: PHASE_NOMINATION,
  }
}

/* R29: Chancellor enacts one of the 2, the other is discarded. R24
   resets the tracker. R45 then R36 (R47 order: a winning tile triggers
   no power, so this checks the win before looking up a power). The
   Liberal board has no powers, so only the Fascist branch looks one
   up. */
export function applyChancellorEnact(state: GameState, tileIndex: number, random: RandomFn): GameState {
  if (state.phase !== PHASE_CHANCELLOR_POLICIES) {
    throw new Error("Can only enact during the ChancellorPolicies phase")
  }
  if (state.chancellorHand === null) {
    throw new Error("Can only enact during the ChancellorPolicies phase")
  }
  const { enacted, discarded } = resolveChancellorChoice(state.chancellorHand, tileIndex)
  const reshuffled = reshuffleIfNeeded(state.drawPile, [...state.discardPile, discarded], random)
  const isLiberal = enacted === POLICY_LIBERAL
  const liberalPoliciesEnacted = isLiberal ? state.liberalPoliciesEnacted + 1 : state.liberalPoliciesEnacted
  const fascistPoliciesEnacted = isLiberal ? state.fascistPoliciesEnacted : state.fascistPoliciesEnacted + 1
  const base: GameState = {
    ...state,
    chancellorHand: null,
    drawPile: reshuffled.drawPile,
    discardPile: reshuffled.discardPile,
    liberalPoliciesEnacted,
    fascistPoliciesEnacted,
    electionTracker: resetElectionTracker(),
  }
  if (isLiberal) {
    if (checkLiberalPoliciesWin(liberalPoliciesEnacted)) {
      return { ...base, phase: PHASE_GAME_OVER, winner: TEAM_LIBERAL, winReason: WIN_REASON_LIBERAL_POLICIES }
    }
    return advanceToNextRound(base)
  }
  if (checkFascistPoliciesWin(fascistPoliciesEnacted, getPlayerCount(state))) {
    return { ...base, phase: PHASE_GAME_OVER, winner: TEAM_FASCIST, winReason: WIN_REASON_FASCIST_POLICIES }
  }
  const power = getTriggeredPower(fascistPoliciesEnacted, getPlayerCount(state))
  if (power === null) {
    return advanceToNextRound(base)
  }
  const peekedPolicies = power === POWER_POLICY_PEEK ? base.drawPile.slice(0, 3) : null
  return { ...base, pendingPower: power, peekedPolicies, phase: PHASE_PRESIDENTIAL_POWER }
}

/* R34: Chancellor requests a veto, once per session, only once unlocked
   (R33). */
export function applyVetoRequest(state: GameState): GameState {
  if (state.phase !== PHASE_CHANCELLOR_POLICIES) {
    throw new Error("Can only request a veto during the ChancellorPolicies phase")
  }
  if (state.chancellorHand === null) {
    throw new Error("Can only request a veto during the ChancellorPolicies phase")
  }
  const allowed = canRequestVeto(
    state.fascistPoliciesEnacted,
    getPlayerCount(state),
    state.vetoRequestedThisSession,
  )
  if (!allowed) {
    throw new Error("R33/R34: veto is not available right now")
  }
  return { ...state, vetoRequestedThisSession: true, phase: PHASE_VETO_RESPONSE }
}

/* R34/R35: President agrees or refuses. Agreed: both tiles discarded,
   tracker +1 (Chaos if it reaches 3), round ends. Refused: Chancellor
   must enact one of the two (back to ChancellorPolicies, hand
   unchanged). */
export function applyVetoRespond(state: GameState, agree: boolean, random: RandomFn): GameState {
  if (state.phase !== PHASE_VETO_RESPONSE) {
    throw new Error("Can only respond to a veto during the VetoResponse phase")
  }
  if (state.chancellorHand === null) {
    throw new Error("Can only respond to a veto during the VetoResponse phase")
  }
  if (!agree) {
    return { ...state, phase: PHASE_CHANCELLOR_POLICIES }
  }
  const reshuffled = reshuffleIfNeeded(state.drawPile, [...state.discardPile, ...state.chancellorHand], random)
  const tracker = incrementElectionTracker(state.electionTracker)
  const afterVeto: GameState = {
    ...state,
    chancellorHand: null,
    drawPile: reshuffled.drawPile,
    discardPile: reshuffled.discardPile,
    electionTracker: tracker,
  }
  if (hasReachedChaos(tracker)) {
    return resolveChaosTransition(afterVeto, random)
  }
  return advanceToNextRound(afterVeto)
}

/* R38/R39/R41: resolve a power that targets a player. R37: the power is
   cleared the moment it resolves, so it can never stack or repeat. */
export function applyPowerChoose(state: GameState, targetPlayerId: PlayerId): GameState {
  if (state.phase !== PHASE_PRESIDENTIAL_POWER) {
    throw new Error("No power is awaiting a choice right now")
  }
  if (state.pendingPower === POWER_INVESTIGATE) {
    const error = getInvestigateTargetError(
      targetPlayerId,
      state.presidentId,
      state.alivePlayers,
      state.investigatedPlayerIds,
    )
    if (error !== null) {
      throw new Error(error)
    }
    const targetRole = state.roles.get(targetPlayerId)
    if (targetRole === undefined) {
      throw new Error("Investigation target has no role")
    }
    const team = partyMembership(targetRole)
    const investigation = { investigatorId: state.presidentId, targetId: targetPlayerId, team }
    return advanceToNextRound({
      ...state,
      pendingPower: null,
      investigatedPlayerIds: new Set([...state.investigatedPlayerIds, targetPlayerId]),
      investigations: [...state.investigations, investigation],
    })
  }
  if (state.pendingPower === POWER_SPECIAL_ELECTION) {
    const error = getGenericPowerTargetError(targetPlayerId, state.presidentId, state.alivePlayers)
    if (error !== null) {
      throw new Error(error)
    }
    const returnTo = getSpecialElectionReturnAnchor(state.presidentId, state.specialElectionReturnTo)
    return {
      ...state,
      pendingPower: null,
      presidentId: targetPlayerId,
      specialElectionReturnTo: returnTo,
      chancellorNomineeId: null,
      votingState: { votes: new Map() },
      phase: PHASE_NOMINATION,
    }
  }
  if (state.pendingPower === POWER_EXECUTION) {
    const error = getGenericPowerTargetError(targetPlayerId, state.presidentId, state.alivePlayers)
    if (error !== null) {
      throw new Error(error)
    }
    const alivePlayers = new Set(state.alivePlayers)
    alivePlayers.delete(targetPlayerId)
    const executedRole = state.roles.get(targetPlayerId)
    if (executedRole === undefined) {
      throw new Error("Execution target has no role")
    }
    if (checkHitlerExecutedWin(executedRole)) {
      return {
        ...state,
        alivePlayers,
        pendingPower: null,
        phase: PHASE_GAME_OVER,
        winner: TEAM_LIBERAL,
        winReason: WIN_REASON_HITLER_EXECUTED,
      }
    }
    return advanceToNextRound({ ...state, alivePlayers, pendingPower: null })
  }
  throw new Error("This power does not take a player target")
}

/* R40: dismiss the Policy Peek. The 3 tiles are not removed or
   reordered - peekedPolicies was already a read-only look at the top
   of drawPile, set when the power triggered in applyChancellorEnact. */
export function applyPowerPeekDone(state: GameState): GameState {
  if (state.phase !== PHASE_PRESIDENTIAL_POWER) {
    throw new Error("No power is awaiting a choice right now")
  }
  if (state.pendingPower !== POWER_POLICY_PEEK) {
    throw new Error("Policy Peek is not the pending power")
  }
  return advanceToNextRound({ ...state, pendingPower: null, peekedPolicies: null })
}
