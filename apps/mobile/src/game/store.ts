/* Local game store (plan.md Steps 7-8). Runs packages/engine on this
   device so the table and every phase can be played before the server
   exists (Step 11). Every screen reads only projectView(state, viewer),
   never the full GameState (CLAUDE.md rule 2), so Step 12 can swap the
   store for server views without touching the screens.

   Randomness is Math.random here. That is acceptable only for this
   local, test-table build; the server uses secure randomness (Step 11). */
import { create } from "zustand"
import {
  actorError,
  applyCastVote,
  applyChancellorEnact,
  applyCloseVoting,
  applyNomination,
  applyPowerChoose,
  applyPowerPeekDone,
  applyPresidentDiscard,
  applyRevealVotes,
  applyVetoRequest,
  applyVetoRespond,
  createInitialGameState,
  getVoteRevealer,
  isGovernmentElected,
  POLICY_LIBERAL,
  tallyVotes,
} from "@game/engine"
import type { GameAction, GameState, Policy, PlayerId, RandomFn, Vote } from "@game/engine"
import { gameCopy } from "@game/theme"
import { describeTransition, type LogLine } from "./logText.js"

export interface RevealSnapshot {
  votes: Record<PlayerId, Vote>
  yes: number
  no: number
  elected: boolean
  failedCount: number
}

export interface ChaosEvent {
  id: number
  policy: Policy
}

export interface SeatInput {
  id: PlayerId
  name: string
}

export interface GameStore {
  state: GameState | null
  seats: SeatInput[]
  names: Record<PlayerId, string>
  hostId: PlayerId | null
  viewerId: PlayerId | null
  testTable: boolean
  log: LogLine[]
  lastReveal: RevealSnapshot | null
  chaos: ChaosEvent | null
  error: string | null
  start: (seats: SeatInput[], hostId: PlayerId, testTable: boolean) => void
  adopt: (state: GameState, seats: SeatInput[], hostId: PlayerId, testTable: boolean) => void
  restart: () => void
  setViewer: (playerId: PlayerId) => void
  perform: (actorId: PlayerId, action: GameAction) => boolean
  clearError: () => void
}

export const random: RandomFn = Math.random

function namesById(seats: SeatInput[]): Record<PlayerId, string> {
  const names: Record<PlayerId, string> = {}
  for (const seat of seats) {
    names[seat.id] = seat.name
  }
  return names
}

const EMPTY_SESSION = { log: [], lastReveal: null, chaos: null, error: null }

export const useGameStore = create<GameStore>((set, get) => ({
  state: null,
  seats: [],
  names: {},
  hostId: null,
  viewerId: null,
  testTable: false,
  ...EMPTY_SESSION,

  start(seats, hostId, testTable) {
    const playerIds = seats.map((seat) => seat.id)
    const state = createInitialGameState(playerIds, hostId, random)
    set({
      state,
      seats,
      names: namesById(seats),
      hostId,
      viewerId: playerIds[0] ?? null,
      testTable,
      ...EMPTY_SESSION,
    })
  },

  adopt(state, seats, hostId, testTable) {
    set({
      state,
      seats,
      names: namesById(seats),
      hostId,
      viewerId: state.playerIds[0] ?? null,
      testTable,
      ...EMPTY_SESSION,
    })
  },

  restart() {
    const { seats, hostId, testTable } = get()
    if (seats.length > 0 && hostId !== null) {
      get().start(seats, hostId, testTable)
    }
  },

  setViewer(playerId) {
    set({ viewerId: playerId, error: null })
  },

  perform(actorId, action) {
    const { state, names, hostId } = get()
    if (!state || hostId === null) {
      set({ error: gameCopy.moveNotAllowed })
      return false
    }
    const blocked = actorError(state, actorId, action)
    if (blocked !== null) {
      set({ error: blockedCopy(blocked, state, action, names) })
      return false
    }

    let next: GameState
    let lastReveal: RevealSnapshot | null = get().lastReveal
    let failedElection = action.type === "vetoRespond" && action.agree
    try {
      if (action.type === "reveal") {
        const connected = new Set(state.alivePlayers)
        const revealer = getVoteRevealer(state.playerIds, hostId, state.alivePlayers, connected)
        if (revealer !== actorId) {
          set({ error: gameCopy.notYourTurn })
          return false
        }
        const tally = tallyVotes(state.votingState)
        const elected = isGovernmentElected(tally, state.alivePlayers.size)
        lastReveal = {
          votes: Object.fromEntries(state.votingState.votes) as Record<PlayerId, Vote>,
          yes: tally.yes,
          no: tally.no,
          elected,
          failedCount: state.electionTracker + 1,
        }
        failedElection = !elected
        next = applyRevealVotes(state, revealer, connected, random)
      } else {
        next = applyAction(state, actorId, action)
      }
    } catch {
      set({ error: gameCopy.moveNotAllowed })
      return false
    }

    const lines = describeTransition(state, next, actorId, action, names, lastReveal)
    const chaosHappened = failedElection && state.electionTracker === 2 && next.electionTracker === 0
    const chaosPolicy: Policy = next.liberalPoliciesEnacted > state.liberalPoliciesEnacted ? POLICY_LIBERAL : "POLICY_FASCIST"
    set({
      state: next,
      log: [...get().log, ...lines],
      lastReveal: action.type === "nominate" ? null : lastReveal,
      chaos: chaosHappened ? { id: (get().chaos?.id ?? 0) + 1, policy: chaosPolicy } : get().chaos,
      error: null,
    })
    return true
  },

  clearError() {
    set({ error: null })
  },
}))

function applyAction(state: GameState, actorId: PlayerId, action: GameAction): GameState {
  switch (action.type) {
    case "nominate":
      return applyNomination(state, action.targetId)
    case "vote":
      return applyCastVote(state, actorId, action.vote)
    case "closeVoting":
      return applyCloseVoting(state)
    case "discard":
      return applyPresidentDiscard(state, action.tileIndex)
    case "enact":
      return applyChancellorEnact(state, action.tileIndex, random)
    case "vetoRequest":
      return applyVetoRequest(state)
    case "vetoRespond":
      return applyVetoRespond(state, action.agree, random)
    case "powerChoose":
      return applyPowerChoose(state, action.targetId)
    case "peekDone":
      return applyPowerPeekDone(state)
    case "reveal":
      throw new Error("reveal is handled by perform")
  }
}

function blockedCopy(code: string, state: GameState, action: GameAction, names: Record<PlayerId, string>): string {
  if (code === "INELIGIBLE_NOMINEE" && action.type === "nominate") {
    const name = names[action.targetId] ?? ""
    if (action.targetId === state.presidentId) return gameCopy.ineligiblePresident
    if (action.targetId === state.lastElectedChancellorId) return gameCopy.ineligibleLastChancellor(name)
    if (action.targetId === state.lastElectedPresidentId) return gameCopy.ineligibleLastPresident(name)
    return gameCopy.ineligibleNotAlive
  }
  if (code === "ACTOR_ALREADY_VOTED") return gameCopy.alreadyVoted
  return gameCopy.notYourTurn
}
