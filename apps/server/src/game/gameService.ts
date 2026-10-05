/* The server's game (plan Step 11). One engine state per room, changed only
   through here: every action is checked (phase, actor, target, vote-reveal
   duty) before the engine applies it, then the state is saved so a restart
   resumes the same game. Each phone is sent projectView(state, itself)
   only (CLAUDE.md rule 2); public events carry facts everyone may know. */
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
  getPlayerCount,
  getVoteRevealer,
  isGovernmentElected,
  PHASE_GAME_OVER,
  POLICY_LIBERAL,
  POWER_EXECUTION,
  POWER_INVESTIGATE,
  POWER_SPECIAL_ELECTION,
  projectView,
  tallyVotes,
} from "@game/engine"
import type { GameAction, GameState, PlayerView, RandomFn, Vote } from "@game/engine"
import type { GameActionInput, PublicGameEvent } from "@game/protocol"
import type { GameSummary, HistoryStore } from "./history.js"
import { gameKey, type KeyValueClient } from "./gameStore.js"
import { deserializeState, serializeState } from "./serialize.js"

export interface GameRecord {
  roomCode: string
  state: GameState
  names: Record<string, string>
  hostId: string
  mode: string
  startedAt: string
  seq: number
  events: PublicGameEvent[]
}

export type PerformResult = { ok: true; events: PublicGameEvent[] } | { ok: false; code: string; message?: string | undefined }

export interface GameServiceDeps {
  kv: KeyValueClient
  history: HistoryStore
  random: RandomFn
  now: () => Date
}

export interface StartSeat {
  userId: string
  username: string
}

const FAILED_ELECTIONS_LIMIT = 3

export function createGameService(deps: GameServiceDeps) {
  const locks = new Map<string, Promise<unknown>>()

  function serial<T>(roomCode: string, work: () => Promise<T>): Promise<T> {
    const previous = locks.get(roomCode) ?? Promise.resolve()
    const next = previous.then(work, work)
    locks.set(roomCode, next.catch(() => undefined))
    return next
  }

  async function load(roomCode: string): Promise<GameRecord | null> {
    const text = await deps.kv.get(gameKey(roomCode))
    return text === null ? null : deserializeState<GameRecord>(text)
  }

  async function save(record: GameRecord): Promise<void> {
    await deps.kv.set(gameKey(record.roomCode), serializeState(record))
  }

  return {
    async start(roomCode: string, seats: StartSeat[], hostId: string, mode: string): Promise<void> {
      const state = createInitialGameState(
        seats.map((seat) => seat.userId),
        hostId,
        deps.random,
      )
      const record: GameRecord = {
        roomCode,
        state,
        names: Object.fromEntries(seats.map((seat) => [seat.userId, seat.username])),
        hostId,
        mode,
        startedAt: deps.now().toISOString(),
        seq: 0,
        events: [],
      }
      await save(record)
    },

    async view(roomCode: string, viewerId: string): Promise<PlayerView | null> {
      const record = await load(roomCode)
      if (!record) return null
      return projectView(record.state, viewerId)
    },

    async names(roomCode: string): Promise<Record<string, string> | null> {
      const record = await load(roomCode)
      return record ? record.names : null
    },

    perform(roomCode: string, actorId: string, input: GameActionInput, connected: ReadonlySet<string>): Promise<PerformResult> {
      return serial<PerformResult>(roomCode, async (): Promise<PerformResult> => {
        const record = await load(roomCode)
        if (!record) return { ok: false, code: "GAME_NOT_STARTED" } as const
        const { state } = record
        if (state.phase === PHASE_GAME_OVER) return { ok: false, code: "GAME_OVER" } as const

        const action = input as GameAction
        const blocked = actorError(state, actorId, action)
        if (blocked !== null) return { ok: false, code: blocked } as const

        let revealer: string | null = null
        if (input.type === "reveal") {
          try {
            revealer = getVoteRevealer(state.playerIds, record.hostId, state.alivePlayers, connected)
          } catch {
            return { ok: false, code: "NO_REVEALER" } as const
          }
          if (revealer !== actorId) return { ok: false, code: "NOT_REVEALER" } as const
        }

        let next: GameState
        let reveal: PublicGameEvent["reveal"]
        try {
          if (input.type === "reveal" && revealer !== null) {
            const tally = tallyVotes(state.votingState)
            const elected = isGovernmentElected(tally, state.alivePlayers.size)
            reveal = {
              votes: Object.fromEntries(state.votingState.votes) as Record<string, Vote>,
              yes: tally.yes,
              no: tally.no,
              elected,
              failedCount: state.electionTracker + 1,
            }
            next = applyRevealVotes(state, revealer, connected, deps.random)
          } else {
            next = applyAction(state, actorId, input, deps.random)
          }
        } catch (error) {
          return { ok: false, code: "ILLEGAL_MOVE", message: error instanceof Error ? error.message : undefined } as const
        }

        const fresh = publicEvents(state, next, actorId, input, reveal, record.seq)
        const updated: GameRecord = { ...record, state: next, seq: record.seq + fresh.length, events: [...record.events, ...fresh] }
        await save(updated)
        if (next.phase === PHASE_GAME_OVER) {
          await deps.history.record(summaryOf(updated))
        }
        return { ok: true, events: fresh } as const
      })
    },
  }
}

export type GameService = ReturnType<typeof createGameService>

function applyAction(state: GameState, actorId: string, action: GameActionInput, random: RandomFn): GameState {
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
      throw new Error("reveal is handled by the reveal branch")
  }
}

function publicEvents(
  prev: GameState,
  next: GameState,
  actorId: string,
  input: GameActionInput,
  reveal: PublicGameEvent["reveal"],
  seq: number,
): PublicGameEvent[] {
  const events: PublicGameEvent[] = []
  const push = (event: Omit<PublicGameEvent, "seq">) => events.push({ seq: seq + events.length + 1, ...event })
  switch (input.type) {
    case "nominate":
      push({ kind: "NOMINATED", actorId, targetId: input.targetId })
      break
    case "vote":
      push({ kind: "VOTED", actorId })
      break
    case "closeVoting":
      push({ kind: "VOTING_CLOSED" })
      break
    case "reveal":
      if (reveal) push({ kind: "REVEALED", reveal })
      break
    case "enact":
      push({ kind: "ENACTED", actorId, enacted: next.liberalPoliciesEnacted > prev.liberalPoliciesEnacted ? POLICY_LIBERAL : "POLICY_FASCIST" })
      break
    case "vetoRequest":
      push({ kind: "VETO_REQUESTED", actorId })
      break
    case "vetoRespond":
      push({ kind: input.agree ? "VETO_AGREED" : "VETO_REFUSED", actorId })
      break
    case "powerChoose": {
      const kind = prev.pendingPower === POWER_INVESTIGATE ? "INVESTIGATED" : prev.pendingPower === POWER_SPECIAL_ELECTION ? "SPECIAL_ELECTION" : prev.pendingPower === POWER_EXECUTION ? "EXECUTED" : "POWER_USED"
      push({ kind, actorId, targetId: input.targetId })
      break
    }
    case "peekDone":
      push({ kind: "PEEKED", actorId })
      break
    case "discard":
      break
  }
  const failed = (input.type === "reveal" && reveal !== undefined && !reveal.elected) || (input.type === "vetoRespond" && input.agree)
  if (failed && prev.electionTracker === FAILED_ELECTIONS_LIMIT - 1 && next.electionTracker === 0) {
    push({ kind: "CHAOS", chaosPolicy: next.liberalPoliciesEnacted > prev.liberalPoliciesEnacted ? POLICY_LIBERAL : "POLICY_FASCIST" })
  }
  if (next.phase === PHASE_GAME_OVER && next.winner !== null && next.winReason !== null) {
    push({ kind: "GAME_OVER", winner: next.winner, winReason: next.winReason })
  }
  return events
}

function summaryOf(record: GameRecord): GameSummary {
  const state = record.state
  return {
    roomCode: record.roomCode,
    hostId: record.hostId,
    mode: record.mode,
    playerCount: getPlayerCount(state),
    winner: state.winner,
    winReason: state.winReason,
    startedAt: record.startedAt,
    endedAt: new Date().toISOString(),
    players: state.playerIds.map((id, index) => ({
      userId: id,
      seat: index,
      role: state.roles.get(id) ?? "",
      alive: state.alivePlayers.has(id),
    })),
    events: record.events,
  }
}
