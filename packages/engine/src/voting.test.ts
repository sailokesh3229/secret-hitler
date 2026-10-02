import { describe, expect, it } from "vitest"
import {
  castVote,
  closeVoting,
  EMPTY_VOTING_STATE,
  getVoteRevealer,
  hasPlayerVoted,
  haveAllVoted,
  isGovernmentElected,
  revealVotes,
  tallyVotes,
} from "./voting.js"
import { VOTE_NO, VOTE_YES } from "./types.js"

const SEATS = ["a", "b", "c", "d", "e"]
const ALL_ALIVE = new Set(SEATS)
const ALL_CONNECTED = new Set(SEATS)

describe("R17", () => {
  it("R17: an executed player cannot vote", () => {
    const alive = new Set(["a", "b", "c", "d"])
    expect(() => castVote(EMPTY_VOTING_STATE, "e", VOTE_YES, alive)).toThrow()
  })

  it("R17: a cast vote is locked and cannot be cast again", () => {
    const state = castVote(EMPTY_VOTING_STATE, "a", VOTE_YES, ALL_ALIVE)
    expect(() => castVote(state, "a", VOTE_NO, ALL_ALIVE)).toThrow()
  })

  it("R17: the President and the nominee vote just like everyone else", () => {
    let state = EMPTY_VOTING_STATE
    state = castVote(state, "a", VOTE_YES, ALL_ALIVE)
    state = castVote(state, "b", VOTE_YES, ALL_ALIVE)
    expect(haveAllVoted(state, ALL_ALIVE)).toBe(false)
  })
})

describe("R18", () => {
  it("R18: everyone can see WHO has voted before reveal, never HOW", () => {
    const state = castVote(EMPTY_VOTING_STATE, "a", VOTE_NO, ALL_ALIVE)
    expect(hasPlayerVoted(state, "a")).toBe(true)
    expect(hasPlayerVoted(state, "b")).toBe(false)
  })
})

describe("R19", () => {
  it("R19: a connected, living host reveals the votes themself", () => {
    expect(getVoteRevealer(SEATS, "a", ALL_ALIVE, ALL_CONNECTED)).toBe("a")
  })

  it("R19 (Sec 6): an executed host\x27s reveal duty passes to the next living, connected player clockwise", () => {
    const alive = new Set(["b", "c", "d", "e"])
    expect(getVoteRevealer(SEATS, "a", alive, ALL_CONNECTED)).toBe("b")
  })

  it("R19 (Sec 6): a disconnected host\x27s reveal duty also passes to the next living, connected player", () => {
    const connected = new Set(["b", "c", "d", "e"])
    expect(getVoteRevealer(SEATS, "a", ALL_ALIVE, connected)).toBe("b")
  })

  it("R19: only the player holding reveal duty may reveal", () => {
    let state = EMPTY_VOTING_STATE
    for (const playerId of SEATS) {
      state = castVote(state, playerId, VOTE_YES, ALL_ALIVE)
    }
    expect(() => revealVotes(state, "b", "a", ALL_ALIVE)).toThrow()
  })

  it("R19: cannot reveal until every living player has voted", () => {
    const state = castVote(EMPTY_VOTING_STATE, "a", VOTE_YES, ALL_ALIVE)
    expect(() => revealVotes(state, "a", "a", ALL_ALIVE)).toThrow()
  })
})

describe("R19 close voting", () => {
  it("R19 (App rule): Close voting fills every missing vote with Nein", () => {
    let state = EMPTY_VOTING_STATE
    state = castVote(state, "a", VOTE_YES, ALL_ALIVE)
    state = castVote(state, "b", VOTE_YES, ALL_ALIVE)
    state = closeVoting(state, ALL_ALIVE)
    expect(haveAllVoted(state, ALL_ALIVE)).toBe(true)
    const tally = tallyVotes(state)
    expect(tally).toEqual({ yes: 2, no: 3 })
  })
})

describe("R20", () => {
  it("R20: elected when Ja is strictly more than half of living players", () => {
    expect(isGovernmentElected({ yes: 4, no: 1 }, 5)).toBe(true)
  })

  it("R20: a tie fails", () => {
    expect(isGovernmentElected({ yes: 3, no: 3 }, 6)).toBe(false)
  })

  it("R20: a minority of Ja votes fails", () => {
    expect(isGovernmentElected({ yes: 2, no: 5 }, 7)).toBe(false)
  })
})

describe("R19 happy path", () => {
  it("R19: reveals successfully once everyone has voted and the revealer confirms", () => {
    let state = EMPTY_VOTING_STATE
    state = castVote(state, "a", VOTE_YES, ALL_ALIVE)
    state = castVote(state, "b", VOTE_YES, ALL_ALIVE)
    state = castVote(state, "c", VOTE_YES, ALL_ALIVE)
    state = castVote(state, "d", VOTE_NO, ALL_ALIVE)
    state = castVote(state, "e", VOTE_NO, ALL_ALIVE)
    const revealer = getVoteRevealer(SEATS, "a", ALL_ALIVE, ALL_CONNECTED)
    const result = revealVotes(state, revealer, revealer, ALL_ALIVE)
    expect(result).toEqual({ tally: { yes: 3, no: 2 }, elected: true })
  })
})
