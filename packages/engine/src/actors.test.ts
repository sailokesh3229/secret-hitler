import { describe, expect, it } from "vitest"
import { actorError, ACTOR_ALREADY_VOTED, ACTOR_NOT_ALIVE, ACTOR_NOT_CHANCELLOR, ACTOR_NOT_PRESIDENT } from "./actors.js"
import { PHASE_CHANCELLOR_POLICIES, PHASE_PRESIDENT_POLICIES, PHASE_VOTING } from "./phase.js"
import { createInitialGameState } from "./state.js"
import { castVote } from "./voting.js"
import { createSeededRandom } from "./testUtils.js"
import { VOTE_YES } from "./types.js"
import type { GameState } from "./state.js"

const PLAYERS = ["a", "b", "c", "d", "e"]

function freshState() {
  return createInitialGameState(PLAYERS, "a", createSeededRandom(7))
}

describe("actor checks (spec Sec 13: phase, actor, target)", () => {
  it("R13: only the President may nominate a Chancellor", () => {
    const state = freshState()
    const notPresident = PLAYERS.find((id) => id !== state.presidentId) as string
    const target = PLAYERS.find((id) => id !== state.presidentId && id !== notPresident) as string
    expect(actorError(state, notPresident, { type: "nominate", targetId: target })).toBe(ACTOR_NOT_PRESIDENT)
    expect(actorError(state, state.presidentId, { type: "nominate", targetId: target })).toBeNull()
  })

  it("R14: the President cannot nominate themselves", () => {
    const state = freshState()
    expect(actorError(state, state.presidentId, { type: "nominate", targetId: state.presidentId })).toBe("INELIGIBLE_NOMINEE")
  })

  it("R17: an executed player cannot act", () => {
    const state: GameState = { ...freshState(), alivePlayers: new Set(PLAYERS.filter((id) => id !== "e")) }
    expect(actorError(state, "e", { type: "vote", vote: VOTE_YES })).toBe(ACTOR_NOT_ALIVE)
  })

  it("R18: a player who already voted cannot vote again", () => {
    const base: GameState = { ...freshState(), phase: PHASE_VOTING }
    const voted = { ...base, votingState: castVote(base.votingState, "b", VOTE_YES, base.alivePlayers) }
    expect(actorError(voted, "b", { type: "vote", vote: VOTE_YES })).toBe(ACTOR_ALREADY_VOTED)
  })

  it("R35: only the Chancellor can enact a policy or request a veto", () => {
    const state: GameState = { ...freshState(), phase: PHASE_CHANCELLOR_POLICIES, chancellorNomineeId: "c" }
    expect(actorError(state, "c", { type: "enact", tileIndex: 0 })).toBeNull()
    expect(actorError(state, "d", { type: "enact", tileIndex: 0 })).toBe(ACTOR_NOT_CHANCELLOR)
    expect(actorError(state, "d", { type: "vetoRequest" })).toBe(ACTOR_NOT_CHANCELLOR)
  })

  it("R36: only the President can discard, choose a power target or finish a peek", () => {
    const state: GameState = { ...freshState(), phase: PHASE_PRESIDENT_POLICIES }
    const other = PLAYERS.find((id) => id !== state.presidentId) as string
    expect(actorError(state, state.presidentId, { type: "discard", tileIndex: 0 })).toBeNull()
    expect(actorError(state, other, { type: "discard", tileIndex: 0 })).toBe(ACTOR_NOT_PRESIDENT)
    expect(actorError(state, other, { type: "peekDone" })).toBe(ACTOR_NOT_PRESIDENT)
  })
})
