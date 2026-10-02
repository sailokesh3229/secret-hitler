/* R17: every living player votes, President and nominee included.
   Executed players do not (R42). A cast vote is locked (Sec 6 point 1).
   R18: individual votes stay hidden until reveal - hasPlayerVoted below
   is the only thing visible before then, never the vote itself. R19/
   Sec 6: the host (or whoever currently holds reveal duty) reveals once
   everyone has voted, counting the tally. R20: elected needs strictly
   more than half of LIVING players (a tie fails). */
import { findNextClockwise } from "./clockwise.js"
import { VOTE_NO, VOTE_YES } from "./types.js"
import type { PlayerId, Vote } from "./types.js"

export interface VotingState {
  votes: ReadonlyMap<PlayerId, Vote>
}

export const EMPTY_VOTING_STATE: VotingState = { votes: new Map() }

export function castVote(
  state: VotingState,
  playerId: PlayerId,
  vote: Vote,
  alivePlayers: ReadonlySet<PlayerId>,
): VotingState {
  if (!alivePlayers.has(playerId)) {
    throw new Error("R17: only living players may vote")
  }
  if (state.votes.has(playerId)) {
    throw new Error("A cast vote is locked and cannot be changed")
  }
  const nextVotes = new Map(state.votes)
  nextVotes.set(playerId, vote)
  return { votes: nextVotes }
}

/* R18: everyone sees who has voted, never what they voted. */
export function hasPlayerVoted(state: VotingState, playerId: PlayerId): boolean {
  return state.votes.has(playerId)
}

export function haveAllVoted(state: VotingState, alivePlayers: ReadonlySet<PlayerId>): boolean {
  for (const playerId of alivePlayers) {
    if (!state.votes.has(playerId)) {
      return false
    }
  }
  return true
}

/* Sec 6 edge cases: if the host is executed, disconnected, or has left,
   reveal duty passes to the next living, connected player clockwise from
   the host, and keeps passing until someone qualifies. */
export function getVoteRevealer(
  seatOrder: readonly PlayerId[],
  hostId: PlayerId,
  alivePlayers: ReadonlySet<PlayerId>,
  connectedPlayers: ReadonlySet<PlayerId>,
): PlayerId {
  const hostCanReveal = alivePlayers.has(hostId) && connectedPlayers.has(hostId)
  if (hostCanReveal) {
    return hostId
  }
  const next = findNextClockwise(seatOrder, hostId, (p) => alivePlayers.has(p) && connectedPlayers.has(p))
  if (next === null) {
    throw new Error("No living, connected player is available to reveal the votes")
  }
  return next
}

/* (App rule, Sec 6 edge cases) Close voting: used both for the In-person
   host button after 2 minutes and for an Online vote-timer expiry.
   Missing votes count as Nein. */
export function closeVoting(state: VotingState, alivePlayers: ReadonlySet<PlayerId>): VotingState {
  const nextVotes = new Map(state.votes)
  for (const playerId of alivePlayers) {
    if (!nextVotes.has(playerId)) {
      nextVotes.set(playerId, VOTE_NO)
    }
  }
  return { votes: nextVotes }
}

export interface VoteTally {
  yes: number
  no: number
}

export function tallyVotes(state: VotingState): VoteTally {
  let yes = 0
  let no = 0
  for (const vote of state.votes.values()) {
    if (vote === VOTE_YES) {
      yes += 1
    } else {
      no += 1
    }
  }
  return { yes, no }
}

/* R20: elected only if Ja votes are strictly more than half of LIVING
   players (not just votes cast). A tie fails. */
export function isGovernmentElected(tally: VoteTally, aliveCount: number): boolean {
  return tally.yes > aliveCount / 2
}

export interface RevealResult {
  tally: VoteTally
  elected: boolean
}

/* R19 (App rule): votes are revealed only when the player with reveal
   duty confirms - never early, never by anyone else. The host can only
   reveal, never change, see early, or cancel votes (Sec 6 point 5). */
export function revealVotes(
  state: VotingState,
  revealedBy: PlayerId,
  revealerId: PlayerId,
  alivePlayers: ReadonlySet<PlayerId>,
): RevealResult {
  if (revealedBy !== revealerId) {
    throw new Error("R19: only the player with reveal duty may reveal the votes")
  }
  if (!haveAllVoted(state, alivePlayers)) {
    throw new Error("R19: cannot reveal until every living player has voted")
  }
  const tally = tallyVotes(state)
  const elected = isGovernmentElected(tally, alivePlayers.size)
  return { tally, elected }
}
