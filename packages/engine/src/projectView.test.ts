import { describe, expect, it } from "vitest"
import { projectView } from "./projectView.js"
import type { GameState } from "./state.js"
import { PHASE_CHANCELLOR_POLICIES, PHASE_GAME_OVER, PHASE_NOMINATION } from "./phase.js"
import { POWER_POLICY_PEEK } from "./boards.js"
import {
  POLICY_LIBERAL,
  ROLE_FASCIST,
  ROLE_LEADER,
  ROLE_LIBERAL,
  TEAM_FASCIST,
  TEAM_LIBERAL,
  VOTE_YES,
} from "./types.js"
import type { PlayerId, Role, Vote } from "./types.js"
import { WIN_REASON_LIBERAL_POLICIES } from "./wins.js"

const PLAYERS = ["p1", "p2", "p3", "p4", "p5", "p6", "p7"]

function baseRoles(): Map<PlayerId, Role> {
  return new Map([
    ["p1", ROLE_LIBERAL],
    ["p2", ROLE_LIBERAL],
    ["p3", ROLE_LIBERAL],
    ["p4", ROLE_LIBERAL],
    ["p5", ROLE_FASCIST],
    ["p6", ROLE_FASCIST],
    ["p7", ROLE_LEADER],
  ])
}

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    playerIds: [...PLAYERS],
    roles: baseRoles(),
    alivePlayers: new Set(PLAYERS),
    hostId: "p1",
    presidentId: "p1",
    specialElectionReturnTo: null,
    chancellorNomineeId: null,
    lastElectedPresidentId: null,
    lastElectedChancellorId: null,
    notHitlerBadges: new Set(),
    electionTracker: 0,
    votingState: { votes: new Map() },
    drawPile: [],
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
    ...overrides,
  }
}

describe("own role and teammates", () => {
  it("shows each viewer their own role and nobody elses", () => {
    const state = baseState()
    expect(projectView(state, "p1").ownRole).toBe(ROLE_LIBERAL)
    expect(projectView(state, "p5").ownRole).toBe(ROLE_FASCIST)
    expect(projectView(state, "p7").ownRole).toBe(ROLE_LEADER)
  })

  it("R9/R10: only Fascists and the Leader see teammates - Liberals see none", () => {
    const state = baseState()
    expect(projectView(state, "p1").knownTeammates).toEqual([])
    expect(projectView(state, "p5").knownTeammates.sort()).toEqual(["p6", "p7"])
    expect(projectView(state, "p7").knownTeammates).toEqual([])
  })
})

describe("hand visibility (spec Sec 8)", () => {
  it("the hand is visible only to whoever is holding it", () => {
    const state = baseState({
      presidentHand: [POLICY_LIBERAL, POLICY_LIBERAL, POLICY_LIBERAL],
      chancellorNomineeId: "p2",
      chancellorHand: null,
    })
    expect(projectView(state, "p1").myHand).toEqual([POLICY_LIBERAL, POLICY_LIBERAL, POLICY_LIBERAL])
    expect(projectView(state, "p2").myHand).toBeNull()
    expect(projectView(state, "p3").myHand).toBeNull()
  })
})

describe("R38 investigation result visibility", () => {
  it("the result is visible only to the investigating President, never to the target or anyone else", () => {
    const state = baseState({
      investigatedPlayerIds: new Set(["p5"]),
      investigations: [{ investigatorId: "p1", targetId: "p5", team: TEAM_FASCIST }],
    })
    expect(projectView(state, "p1").myInvestigationResults).toEqual([{ targetId: "p5", team: TEAM_FASCIST }])
    expect(projectView(state, "p5").myInvestigationResults).toEqual([])
    expect(projectView(state, "p2").myInvestigationResults).toEqual([])
    expect(projectView(state, "p1").investigatedPlayerIds).toEqual(["p5"])
    expect(projectView(state, "p2").investigatedPlayerIds).toEqual(["p5"])
  })
})

describe("R40 peek visibility", () => {
  it("peeked tiles are visible only to the current President", () => {
    const state = baseState({
      pendingPower: POWER_POLICY_PEEK,
      peekedPolicies: [POLICY_LIBERAL, POLICY_LIBERAL, POLICY_LIBERAL],
    })
    expect(projectView(state, "p1").myPeekedPolicies).toEqual([POLICY_LIBERAL, POLICY_LIBERAL, POLICY_LIBERAL])
    expect(projectView(state, "p2").myPeekedPolicies).toBeNull()
  })
})

describe("R48 game-over reveal", () => {
  it("roles stay hidden from everyone while the game is still running", () => {
    const state = baseState({ phase: PHASE_CHANCELLOR_POLICIES })
    expect(projectView(state, "p1").gameOverReveal).toBeNull()
  })

  it("R48: once the game is over, every role becomes visible to every player", () => {
    const state = baseState({
      phase: PHASE_GAME_OVER,
      winner: TEAM_LIBERAL,
      winReason: WIN_REASON_LIBERAL_POLICIES,
    })
    const view = projectView(state, "p3")
    expect(view.gameOverReveal).not.toBeNull()
    expect(view.gameOverReveal && view.gameOverReveal.roles.p7).toBe(ROLE_LEADER)
    expect(view.gameOverReveal && view.gameOverReveal.roles.p5).toBe(ROLE_FASCIST)
  })
})

describe("R18 voted-players visibility", () => {
  it("shows who has voted but never how, regardless of their actual vote", () => {
    const votes = new Map<PlayerId, Vote>([
      ["p1", VOTE_YES],
      ["p2", VOTE_YES],
    ])
    const state = baseState({ phase: PHASE_CHANCELLOR_POLICIES, votingState: { votes } })
    const view = projectView(state, "p3")
    expect(view.votedPlayerIds.sort()).toEqual(["p1", "p2"])
  })
})

describe("R31 discard secrecy", () => {
  it("R31: discard pile contents are never exposed during the game, only a count", () => {
    const state = baseState({
      phase: PHASE_CHANCELLOR_POLICIES,
      discardPile: [POLICY_LIBERAL, POLICY_LIBERAL],
    })
    const view = projectView(state, "p1")
    expect(view.discardPileCount).toBe(2)
    expect(Object.prototype.hasOwnProperty.call(view, "discardPile")).toBe(false)
  })
})
