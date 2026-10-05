/* The server's game (plan Steps 11, 13). One engine state per room, changed
   only through here: every action is checked (phase, actor, target, vote-reveal
   duty) before the engine applies it, then the state is saved so a restart
   resumes the same game. Each phone is sent projectView(state, itself) only
   (CLAUDE.md rule 2); public events carry facts everyone may know. Turn timers
   (spec Sec 10) run here too, so a silent player cannot stall an online game. */
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
  getChancellorEligibility,
  getPlayerCount,
  getVoteRevealer,
  isGovernmentElected,
  PHASE_AWAIT_HOST_REVEAL,
  PHASE_CHANCELLOR_POLICIES,
  PHASE_GAME_OVER,
  PHASE_NOMINATION,
  PHASE_PRESIDENT_POLICIES,
  PHASE_VETO_RESPONSE,
  PHASE_VOTING,
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

export interface ChatLine {
  seq: number
  authorId: string
  authorName: string
  text: string
}

export interface GameRecord {
  roomCode: string
  state: GameState
  names: Record<string, string>
  hostId: string
  mode: string
  timers: boolean
  startedAt: string
  seq: number
  events: PublicGameEvent[]
  chat: ChatLine[]
  turnKey: string
  turnStartedAt: number
}

export type PerformResult = { ok: true; events: PublicGameEvent[] } | { ok: false; code: string; message?: string | undefined }
export type ChatResult = { ok: true; line: ChatLine } | { ok: false; code: string }

/* Spec Sec 10 phase timers, in milliseconds. Power has no timer: the game pauses. */
export const PHASE_TIMERS_MS: Partial<Record<string, number>> = {
  [PHASE_NOMINATION]: 120000,
  [PHASE_VOTING]: 90000,
  [PHASE_AWAIT_HOST_REVEAL]: 30000,
  [PHASE_PRESIDENT_POLICIES]: 90000,
  [PHASE_CHANCELLOR_POLICIES]: 90000,
  [PHASE_VETO_RESPONSE]: 60000,
}

export interface TimerHost {
  schedule(fn: () => void, ms: number): () => void
}

export const realTimers: TimerHost = {
  schedule: (fn, ms) => {
    const handle = setTimeout(fn, ms)
    return () => clearTimeout(handle)
  },
}

export interface GameServiceDeps {
  kv: KeyValueClient
  history: HistoryStore
  random: RandomFn
  now: () => Date
  timers?: TimerHost
  onChanged?: (roomCode: string, events: PublicGameEvent[]) => void
}

export interface StartSeat {
  userId: string
  username: string
}

const FAILED_ELECTIONS_LIMIT = 3
const MAX_CHAT_LENGTH = 300

/* A turn is identified by everything except votes, so a vote does not restart the clock. */
export function turnKey(state: GameState): string {
  return [
    state.phase,
    state.presidentId,
    state.chancellorNomineeId ?? "",
    state.pendingPower ?? "",
    state.liberalPoliciesEnacted,
    state.fascistPoliciesEnacted,
    state.electionTracker,
    state.drawPile.length,
    state.discardPile.length,
  ].join("|")
}

export function createGameService(deps: GameServiceDeps) {
  const locks = new Map<string, Promise<unknown>>()
  const timers = deps.timers ?? realTimers
  const cancelTimer = new Map<string, () => void>()
  const timerKey = new Map<string, string>()

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

  function cancel(roomCode: string): void {
    cancelTimer.get(roomCode)?.()
    cancelTimer.delete(roomCode)
    timerKey.delete(roomCode)
  }

  function scheduleFor(record: GameRecord): void {
    const roomCode = record.roomCode
    if (!record.timers || record.state.phase === PHASE_GAME_OVER) {
      cancel(roomCode)
      return
    }
    const key = turnKey(record.state)
    if (timerKey.get(roomCode) === key) return
    cancel(roomCode)
    const ms = PHASE_TIMERS_MS[record.state.phase]
    if (ms === undefined) return
    timerKey.set(roomCode, key)
    cancelTimer.set(roomCode, timers.schedule(() => void expire(roomCode, key), ms))
  }

  async function expire(roomCode: string, key: string): Promise<void> {
    const record = await load(roomCode)
    if (!record || turnKey(record.state) !== key) return
    const action = automaticAction(record)
    if (action === null) return
    const connected = new Set(record.state.alivePlayers)
    await performGame(roomCode, action.actorId, action.input, connected)
  }

  function automaticAction(record: GameRecord): { actorId: string; input: GameActionInput } | null {
    const state = record.state
    const random = deps.random
    switch (state.phase) {
      case PHASE_NOMINATION: {
        const eligible = state.playerIds.filter(
          (id) =>
            getChancellorEligibility(id, state.presidentId, state.alivePlayers, state.lastElectedPresidentId, state.lastElectedChancellorId).eligible,
        )
        const target = eligible[Math.floor(random() * eligible.length)]
        return target === undefined ? null : { actorId: state.presidentId, input: { type: "nominate", targetId: target } }
      }
      case PHASE_VOTING:
        return { actorId: record.hostId, input: { type: "closeVoting" } }
      case PHASE_AWAIT_HOST_REVEAL: {
        const revealer = getVoteRevealer(state.playerIds, record.hostId, state.alivePlayers, new Set(state.alivePlayers))
        return { actorId: revealer, input: { type: "reveal" } }
      }
      case PHASE_PRESIDENT_POLICIES:
        return { actorId: state.presidentId, input: { type: "discard", tileIndex: Math.floor(random() * 3) } }
      case PHASE_CHANCELLOR_POLICIES:
        return { actorId: state.chancellorNomineeId ?? "", input: { type: "enact", tileIndex: Math.floor(random() * 2) } }
      case PHASE_VETO_RESPONSE:
        return { actorId: state.presidentId, input: { type: "vetoRespond", agree: false } }
      default:
        return null
    }
  }

  function performGame(roomCode: string, actorId: string, input: GameActionInput, connected: ReadonlySet<string>): Promise<PerformResult> {
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
      const key = turnKey(next)
      const turn = key === record.turnKey ? {} : { turnKey: key, turnStartedAt: deps.now().getTime() }
      const updated: GameRecord = { ...record, state: next, seq: record.seq + fresh.length, events: [...record.events, ...fresh], ...turn }
      await save(updated)
      if (next.phase === PHASE_GAME_OVER) {
        cancel(roomCode)
        await deps.history.record(summaryOf(updated))
      } else {
        scheduleFor(updated)
      }
      deps.onChanged?.(roomCode, fresh)
      return { ok: true, events: fresh } as const
    })
  }

  return {
    async start(roomCode: string, seats: StartSeat[], hostId: string, mode: string, timersOn: boolean): Promise<void> {
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
        timers: timersOn,
        startedAt: deps.now().toISOString(),
        seq: 0,
        events: [],
        chat: [],
        turnKey: turnKey(state),
        turnStartedAt: deps.now().getTime(),
      }
      await serial(roomCode, async () => {
        await save(record)
        scheduleFor(record)
      })
    },

    async view(roomCode: string, viewerId: string): Promise<(PlayerView & { deadlineAt: number | null }) | null> {
      const record = await load(roomCode)
      if (!record) return null
      const ms = record.timers ? PHASE_TIMERS_MS[record.state.phase] : undefined
      return { ...projectView(record.state, viewerId), deadlineAt: ms === undefined ? null : record.turnStartedAt + ms }
    },

    async chatLog(roomCode: string, viewerId: string): Promise<ChatLine[] | null> {
      const record = await load(roomCode)
      if (!record || !record.state.playerIds.includes(viewerId)) return null
      return record.chat
    },

    perform(roomCode: string, actorId: string, input: GameActionInput, connected: ReadonlySet<string>): Promise<PerformResult> {
      return performGame(roomCode, actorId, input, connected)
    },

    chat(roomCode: string, authorId: string, rawText: string): Promise<ChatResult> {
      return serial<ChatResult>(roomCode, async (): Promise<ChatResult> => {
        const record = await load(roomCode)
        if (!record) return { ok: false, code: "GAME_NOT_STARTED" } as const
        if (record.mode !== "MODE_ONLINE") return { ok: false, code: "CHAT_IN_PERSON" } as const
        const { state } = record
        if (!state.alivePlayers.has(authorId)) return { ok: false, code: "CHAT_MUTED_EXECUTED" } as const
        const holdsTiles =
          (state.phase === PHASE_PRESIDENT_POLICIES && authorId === state.presidentId) ||
          ((state.phase === PHASE_CHANCELLOR_POLICIES || state.phase === PHASE_VETO_RESPONSE) && authorId === state.chancellorNomineeId)
        if (holdsTiles) return { ok: false, code: "CHAT_MUTED_TILES" } as const
        const text = rawText.trim()
        if (text.length === 0 || text.length > MAX_CHAT_LENGTH) return { ok: false, code: "INVALID_MESSAGE" } as const
        const line: ChatLine = { seq: record.chat.length + 1, authorId, authorName: record.names[authorId] ?? authorId, text }
        await save({ ...record, chat: [...record.chat, line] })
        return { ok: true, line } as const
      })
    },

    async summary(roomCode: string): Promise<GameRecord | null> {
      return load(roomCode)
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
      username: record.names[id] ?? id,
      seat: index,
      role: state.roles.get(id) ?? "",
      alive: state.alivePlayers.has(id),
    })),
    events: record.events,
  }
}
