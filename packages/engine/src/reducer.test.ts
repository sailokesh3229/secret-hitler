import { describe, expect, it } from "vitest"
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
} from "./reducer.js"
import type { GameState } from "./state.js"
import { PHASE_AWAIT_HOST_REVEAL, PHASE_CHANCELLOR_POLICIES, PHASE_GAME_OVER, PHASE_VOTING } from "./phase.js"
import { PHASE_NOMINATION, PHASE_PRESIDENTIAL_POWER, PHASE_PRESIDENT_POLICIES, PHASE_VETO_RESPONSE } from "./phase.js"
import { POWER_EXECUTION, POWER_INVESTIGATE, POWER_POLICY_PEEK, POWER_SPECIAL_ELECTION } from "./boards.js"
import {
  POLICY_FASCIST,
  POLICY_LIBERAL,
  ROLE_FASCIST,
  ROLE_LEADER,
  ROLE_LIBERAL,
  TEAM_FASCIST,
  TEAM_LIBERAL,
  VOTE_NO,
  VOTE_YES,
} from "./types.js"
import type { Policy, PlayerId, Role } from "./types.js"
import { WIN_REASON_HITLER_CHANCELLOR, WIN_REASON_HITLER_EXECUTED, WIN_REASON_LIBERAL_POLICIES } from "./wins.js"
import { createSeededRandom } from "./testUtils.js"

/* 7 players: p1-p4 Liberal, p5-p6 Fascist, p7 the Leader (Hitler). This
   bracket (7-8 players) has Investigate at fascist slot 2 and Special
   Election at slot 3, which several tests below exercise. */
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

describe("full round, happy path", () => {
  it("R26-R29: nominate, elect, enact a Liberal policy, then rotate (no power)", () => {
    const deck: Policy[] = [POLICY_LIBERAL, POLICY_LIBERAL, POLICY_LIBERAL, POLICY_LIBERAL]
    let state = baseState({ drawPile: deck })
    state = applyNomination(state, "p2")
    expect(state.phase).toBe(PHASE_VOTING)
    for (const playerId of PLAYERS) {
      state = applyCastVote(state, playerId, VOTE_YES)
    }
    expect(state.phase).toBe(PHASE_AWAIT_HOST_REVEAL)
    state = applyRevealVotes(state, "p1", new Set(PLAYERS), createSeededRandom(1))
    expect(state.phase).toBe(PHASE_PRESIDENT_POLICIES)
    expect(state.presidentHand).toEqual([POLICY_LIBERAL, POLICY_LIBERAL, POLICY_LIBERAL])
    state = applyPresidentDiscard(state, 0)
    expect(state.phase).toBe(PHASE_CHANCELLOR_POLICIES)
    state = applyChancellorEnact(state, 0, createSeededRandom(1))
    expect(state.liberalPoliciesEnacted).toBe(1)
    expect(state.phase).toBe(PHASE_NOMINATION)
    expect(state.presidentId).toBe("p2")
    expect(state.lastElectedPresidentId).toBe("p1")
    expect(state.lastElectedChancellorId).toBe("p2")
  })
})

describe("R47 ordering", () => {
  it("R47: a winning enactment ends the game without ever looking up a power", () => {
    let state = baseState({
      liberalPoliciesEnacted: 4,
      chancellorHand: [POLICY_LIBERAL, POLICY_FASCIST],
      phase: PHASE_CHANCELLOR_POLICIES,
      drawPile: [POLICY_LIBERAL, POLICY_LIBERAL, POLICY_LIBERAL],
    })
    state = applyChancellorEnact(state, 0, createSeededRandom(1))
    expect(state.liberalPoliciesEnacted).toBe(5)
    expect(state.phase).toBe(PHASE_GAME_OVER)
    expect(state.winner).toBe(TEAM_LIBERAL)
    expect(state.winReason).toBe(WIN_REASON_LIBERAL_POLICIES)
    expect(state.pendingPower).toBeNull()
  })
})

describe("R36/R38 via the reducer", () => {
  it("R36: a Fascist enactment landing on slot 2 triggers Investigate for a 7-player game", () => {
    let state = baseState({
      fascistPoliciesEnacted: 1,
      chancellorHand: [POLICY_FASCIST, POLICY_LIBERAL],
      phase: PHASE_CHANCELLOR_POLICIES,
      drawPile: [POLICY_LIBERAL, POLICY_LIBERAL, POLICY_LIBERAL],
    })
    state = applyChancellorEnact(state, 0, createSeededRandom(1))
    expect(state.fascistPoliciesEnacted).toBe(2)
    expect(state.pendingPower).toBe(POWER_INVESTIGATE)
    expect(state.phase).toBe(PHASE_PRESIDENTIAL_POWER)

    state = applyPowerChoose(state, "p5")
    expect(state.pendingPower).toBeNull()
    expect(state.phase).toBe(PHASE_NOMINATION)
    expect(state.investigatedPlayerIds.has("p5")).toBe(true)
    expect(state.investigations).toEqual([{ investigatorId: "p1", targetId: "p5", team: TEAM_FASCIST }])
  })
})

describe("R39/R12 via the reducer", () => {
  it("R39: a Special Election makes the target President immediately, then R12 returns rotation to the caller", () => {
    let state = baseState({
      fascistPoliciesEnacted: 2,
      chancellorHand: [POLICY_FASCIST, POLICY_LIBERAL],
      phase: PHASE_CHANCELLOR_POLICIES,
      drawPile: [POLICY_LIBERAL, POLICY_LIBERAL, POLICY_LIBERAL],
    })
    state = applyChancellorEnact(state, 0, createSeededRandom(1))
    expect(state.pendingPower).toBe(POWER_SPECIAL_ELECTION)

    state = applyPowerChoose(state, "p6")
    expect(state.presidentId).toBe("p6")
    expect(state.specialElectionReturnTo).toBe("p1")
    expect(state.phase).toBe(PHASE_NOMINATION)

    state = applyNomination(state, "p7")
    for (const playerId of PLAYERS) {
      state = applyCastVote(state, playerId, VOTE_NO)
    }
    state = applyRevealVotes(state, "p1", new Set(PLAYERS), createSeededRandom(1))
    expect(state.presidentId).toBe("p2")
    expect(state.specialElectionReturnTo).toBeNull()
  })
})

describe("R41/R44 via the reducer", () => {
  it("R41: executing a non-Leader player removes them from alivePlayers and the game continues", () => {
    const state = applyPowerChoose(
      baseState({ pendingPower: POWER_EXECUTION, phase: PHASE_PRESIDENTIAL_POWER }),
      "p5",
    )
    expect(state.alivePlayers.has("p5")).toBe(false)
    expect(state.phase).toBe(PHASE_NOMINATION)
    expect(state.winner).toBeNull()
  })

  it("R41/R44: executing the Leader (Hitler) wins immediately for the Liberals", () => {
    const state = applyPowerChoose(
      baseState({ pendingPower: POWER_EXECUTION, phase: PHASE_PRESIDENTIAL_POWER }),
      "p7",
    )
    expect(state.alivePlayers.has("p7")).toBe(false)
    expect(state.phase).toBe(PHASE_GAME_OVER)
    expect(state.winner).toBe(TEAM_LIBERAL)
    expect(state.winReason).toBe(WIN_REASON_HITLER_EXECUTED)
  })
})

describe("R40 via the reducer", () => {
  it("R40: Policy Peek shows the top 3 tiles without changing their order, then clears on Done", () => {
    const FIVE_PLAYERS = ["a", "b", "c", "d", "e"]
    const roles = new Map<PlayerId, Role>([
      ["a", ROLE_LIBERAL],
      ["b", ROLE_LIBERAL],
      ["c", ROLE_LIBERAL],
      ["d", ROLE_FASCIST],
      ["e", ROLE_LEADER],
    ])
    let state = baseState({
      playerIds: FIVE_PLAYERS,
      roles,
      alivePlayers: new Set(FIVE_PLAYERS),
      hostId: "a",
      presidentId: "a",
      fascistPoliciesEnacted: 2,
      chancellorHand: [POLICY_FASCIST, POLICY_LIBERAL],
      phase: PHASE_CHANCELLOR_POLICIES,
      drawPile: [POLICY_LIBERAL, POLICY_FASCIST, POLICY_LIBERAL, POLICY_LIBERAL],
    })
    state = applyChancellorEnact(state, 0, createSeededRandom(1))
    expect(state.pendingPower).toBe(POWER_POLICY_PEEK)
    expect(state.peekedPolicies).toEqual([POLICY_LIBERAL, POLICY_FASCIST, POLICY_LIBERAL])

    state = applyPowerPeekDone(state)
    expect(state.pendingPower).toBeNull()
    expect(state.peekedPolicies).toBeNull()
    expect(state.phase).toBe(PHASE_NOMINATION)
  })
})

describe("R33-R35 via the reducer", () => {
  it("R35: an agreed veto discards both tiles, bumps the tracker, and rotates on", () => {
    let state = baseState({
      fascistPoliciesEnacted: 5,
      chancellorHand: [POLICY_FASCIST, POLICY_LIBERAL],
      phase: PHASE_CHANCELLOR_POLICIES,
      drawPile: [POLICY_LIBERAL, POLICY_LIBERAL, POLICY_LIBERAL],
    })
    state = applyVetoRequest(state)
    expect(state.phase).toBe(PHASE_VETO_RESPONSE)
    expect(state.vetoRequestedThisSession).toBe(true)

    state = applyVetoRespond(state, true, createSeededRandom(1))
    expect(state.chancellorHand).toBeNull()
    expect(state.fascistPoliciesEnacted).toBe(5)
    expect(state.electionTracker).toBe(1)
    expect(state.phase).toBe(PHASE_NOMINATION)
    expect(state.presidentId).toBe("p2")
  })

  it("R34: a refused veto sends the Chancellor back to enact one of the two", () => {
    let state = baseState({
      fascistPoliciesEnacted: 5,
      chancellorHand: [POLICY_FASCIST, POLICY_LIBERAL],
      phase: PHASE_CHANCELLOR_POLICIES,
    })
    state = applyVetoRequest(state)
    state = applyVetoRespond(state, false, createSeededRandom(1))
    expect(state.phase).toBe(PHASE_CHANCELLOR_POLICIES)
    expect(state.chancellorHand).toEqual([POLICY_FASCIST, POLICY_LIBERAL])
  })
})

describe("R21-R23 via the reducer", () => {
  it("R22/R23: a third failed election triggers Chaos, resetting the tracker and clearing term limits", () => {
    let state = baseState({
      electionTracker: 2,
      lastElectedPresidentId: "p1",
      lastElectedChancellorId: "p2",
      drawPile: [POLICY_LIBERAL, POLICY_LIBERAL, POLICY_LIBERAL, POLICY_LIBERAL],
    })
    state = applyNomination(state, "p3")
    for (const playerId of PLAYERS) {
      state = applyCastVote(state, playerId, VOTE_NO)
    }
    state = applyRevealVotes(state, "p1", new Set(PLAYERS), createSeededRandom(1))
    expect(state.electionTracker).toBe(0)
    expect(state.liberalPoliciesEnacted).toBe(1)
    expect(state.lastElectedPresidentId).toBeNull()
    expect(state.lastElectedChancellorId).toBeNull()
    expect(state.phase).toBe(PHASE_NOMINATION)
  })
})

describe("R25/R46 via the reducer", () => {
  it("R25/R46: electing the Leader as Chancellor at 3+ Fascist policies wins immediately, skipping legislation", () => {
    let state = baseState({
      fascistPoliciesEnacted: 3,
      drawPile: [POLICY_LIBERAL, POLICY_LIBERAL, POLICY_LIBERAL],
    })
    state = applyNomination(state, "p7")
    for (const playerId of PLAYERS) {
      state = applyCastVote(state, playerId, VOTE_YES)
    }
    state = applyRevealVotes(state, "p1", new Set(PLAYERS), createSeededRandom(1))
    expect(state.phase).toBe(PHASE_GAME_OVER)
    expect(state.winner).toBe(TEAM_FASCIST)
    expect(state.winReason).toBe(WIN_REASON_HITLER_CHANCELLOR)
    expect(state.presidentHand).toBeNull()
    expect(state.drawPile.length).toBe(3)
  })
})

describe("R37 via the reducer", () => {
  it("R37: a resolved power is cleared and cannot be acted on again", () => {
    let state = baseState({
      fascistPoliciesEnacted: 1,
      chancellorHand: [POLICY_FASCIST, POLICY_LIBERAL],
      phase: PHASE_CHANCELLOR_POLICIES,
      drawPile: [POLICY_LIBERAL, POLICY_LIBERAL, POLICY_LIBERAL],
    })
    state = applyChancellorEnact(state, 0, createSeededRandom(1))
    state = applyPowerChoose(state, "p5")
    expect(state.pendingPower).toBeNull()
    expect(() => applyPowerChoose(state, "p6")).toThrow()
  })
})
