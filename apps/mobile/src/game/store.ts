/* Game store for the table screens (plan.md Steps 7-12). It has two sources:

   - remote (Step 12): the server runs the game. The phone gets only its own
     game:view and public events over Socket.IO, and sends actions to be
     checked there. This is the real In-person game.
   - local (Steps 7-8, dev and test table only): packages/engine runs on this
     device so every phase can be clicked through with one phone.

   Every screen reads `view` (the viewer's projection) and never a full
   GameState, so a phone cannot show what the server withholds (CLAUDE.md
   rule 2). */
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
  projectView,
  tallyVotes,
} from "@game/engine"
import type { GameAction, GameState, PlayerView, Policy, PlayerId, RandomFn, Vote } from "@game/engine"
import { gameCopy } from "@game/theme"
import { describeTransition, type LogLine } from "./logText.js"
import { describePublicEvent, type PublicEventLike } from "./remoteLog.js"
import { openRoomSocket, type ChatLineView, type RoomSeat } from "../lib/api.js"

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

export type ConnectionState = "idle" | "connecting" | "live" | "offline"

interface RemoteHandle {
  act: (action: unknown) => Promise<{ ok: boolean; code?: string }>
  sendChat: (text: string) => Promise<{ ok: boolean; code?: string }>
  reportChat: (seq: number) => Promise<{ ok: boolean; code?: string }>
  resync: () => void
  close: () => void
}

export interface GameStore {
  mode: "local" | "remote"
  roomCode: string | null
  connection: ConnectionState
  state: GameState | null
  view: PlayerView | null
  viewerId: PlayerId | null
  names: Record<PlayerId, string>
  hostId: PlayerId | null
  revealerId: PlayerId | null
  connectedIds: PlayerId[]
  seats: SeatInput[]
  testTable: boolean
  log: LogLine[]
  lastReveal: RevealSnapshot | null
  chaos: ChaosEvent | null
  chat: ChatLineView[]
  roomMode: string | null
  deadlineAt: number | null
  error: string | null
  start: (seats: SeatInput[], hostId: PlayerId, testTable: boolean) => void
  adopt: (state: GameState, seats: SeatInput[], hostId: PlayerId, testTable: boolean) => void
  restart: () => void
  setViewer: (playerId: PlayerId) => void
  connectRemote: (roomCode: string, me: { username: string }) => void
  disconnectRemote: () => void
  act: (action: GameAction) => Promise<boolean>
  sendChat: (text: string) => Promise<boolean>
  reportChat: (seq: number) => Promise<boolean>
  resync: () => void
  perform: (actorId: PlayerId, action: GameAction) => boolean
  clearError: () => void
}

export const random: RandomFn = Math.random

let remoteHandle: RemoteHandle | null = null
let remoteView: PlayerView | null = null

function namesById(seats: SeatInput[]): Record<PlayerId, string> {
  const names: Record<PlayerId, string> = {}
  for (const seat of seats) {
    names[seat.id] = seat.name
  }
  return names
}

function revealerOf(view: PlayerView | null, hostId: PlayerId | null, connected: PlayerId[]): PlayerId | null {
  if (!view || hostId === null) return null
  try {
    return getVoteRevealer(view.seats, hostId, new Set(view.alivePlayers), new Set(connected))
  } catch {
    return null
  }
}

const EMPTY_SESSION = { log: [], lastReveal: null, chaos: null, error: null, chat: [] as ChatLineView[], roomMode: null as string | null, deadlineAt: null as number | null }

export const useGameStore = create<GameStore>((set, get) => ({
  mode: "local",
  roomCode: null,
  connection: "idle",
  state: null,
  view: null,
  viewerId: null,
  names: {},
  hostId: null,
  revealerId: null,
  connectedIds: [],
  seats: [],
  testTable: false,
  ...EMPTY_SESSION,

  start(seats, hostId, testTable) {
    const playerIds = seats.map((seat) => seat.id)
    const state = createInitialGameState(playerIds, hostId, random)
    const viewerId = playerIds[0] ?? null
    set(localSnapshot(state, seats, hostId, testTable, viewerId))
  },

  adopt(state, seats, hostId, testTable) {
    set(localSnapshot(state, seats, hostId, testTable, state.playerIds[0] ?? null))
  },

  restart() {
    const { seats, hostId, testTable, mode } = get()
    if (mode === "local" && seats.length > 0 && hostId !== null) {
      get().start(seats, hostId, testTable)
    }
  },

  setViewer(playerId) {
    const { state, seats, hostId, testTable } = get()
    if (get().mode === "local" && state) {
      set(localSnapshot(state, seats, hostId ?? "", testTable, playerId))
      return
    }
    set({ viewerId: playerId })
  },

  connectRemote(roomCode, me) {
    remoteHandle?.close()
    remoteView = null
    set({
      mode: "remote",
      roomCode,
      connection: "connecting",
      state: null,
      view: null,
      viewerId: null,
      names: {},
      hostId: null,
      revealerId: null,
      connectedIds: [],
      seats: [],
      testTable: false,
      ...EMPTY_SESSION,
    })
    remoteHandle = openRoomSocket(roomCode, {
      onStatus: (connection) => set({ connection }),
      onChatHistory: (chat) => set({ chat }),
      onChatMessage: (line) => set({ chat: [...useGameStore.getState().chat, line] }),
      onRoom: (room) => {
        const mine = room.seats.find((seat: RoomSeat) => seat.username === me.username)
        const connectedIds = room.seats.filter((seat) => seat.connected).map((seat) => seat.userId)
        set({
          names: Object.fromEntries(room.seats.map((seat) => [seat.userId, seat.username])),
          seats: room.seats.map((seat) => ({ id: seat.userId, name: seat.username })),
          hostId: room.hostId,
          roomMode: room.mode,
          connectedIds,
          viewerId: mine?.userId ?? null,
          revealerId: revealerOf(remoteView, room.hostId, connectedIds),
          view: remoteView ?? get().view,
        })
      },
      onGameView: (raw) => {
        const view = raw as PlayerView
        remoteView = view
        const hostId = get().hostId
        const connectedIds = get().connectedIds
        set({ view, viewerId: view.viewerId, revealerId: revealerOf(view, hostId, connectedIds), deadlineAt: (raw as { deadlineAt?: number | null }).deadlineAt ?? null })
      },
      onEvents: (events) => applyRemoteEvents(events as PublicEventLike[]),
    })
  },

  disconnectRemote() {
    remoteHandle?.close()
    remoteHandle = null
    remoteView = null
    set({ connection: "idle", roomCode: null })
  },

  async sendChat(text) {
    const current = get()
    if (current.mode === "local") {
      const author = current.viewerId ?? ""
      set({ chat: [...current.chat, { seq: current.chat.length + 1, authorId: author, authorName: current.names[author] ?? "", text }] })
      return true
    }
    if (!remoteHandle) return false
    const reply = await remoteHandle.sendChat(text)
    if (!reply.ok) set({ error: chatErrorCopy(reply.code ?? "") })
    return reply.ok
  },

  async reportChat(seq) {
    if (get().mode === "local") return true
    if (!remoteHandle) return false
    return (await remoteHandle.reportChat(seq)).ok
  },

  resync() {
    remoteHandle?.resync()
  },

  async act(action) {
    const current = get()
    if (current.mode === "local") {
      if (current.viewerId === null) return false
      return performLocal(current.viewerId, action)
    }
    if (!remoteHandle) return false
    const reply = await remoteHandle.act(action)
    if (!reply.ok) {
      set({ error: remoteErrorCopy(reply.code ?? "", action, get().view, get().names) })
      return false
    }
    return true
  },

  perform(actorId, action) {
    return performLocal(actorId, action)
  },

  clearError() {
    set({ error: null })
  },
}))


function localSnapshot(state: GameState, seats: SeatInput[], hostId: PlayerId, testTable: boolean, viewerId: PlayerId | null) {
  const names = namesById(seats)
  const connectedIds = [...state.alivePlayers]
  const view = viewerId ? projectView(state, viewerId) : null
  return {
    mode: "local" as const,
    state,
    seats,
    names,
    hostId,
    testTable,
    viewerId,
    view,
    connectedIds,
    revealerId: revealerOf(view, hostId, connectedIds),
    connection: "live" as const,
    ...EMPTY_SESSION,
  }
}

function performLocal(actorId: PlayerId, action: GameAction): boolean {
  const { state, names, hostId, lastReveal } = useGameStore.getState()
  if (!state || hostId === null) {
    useGameStore.setState({ error: gameCopy.moveNotAllowed })
    return false
  }
  const blocked = actorError(state, actorId, action)
  if (blocked !== null) {
    useGameStore.setState({ error: blockedCopy(blocked, state, action, names) })
    return false
  }

  let next: GameState
  let nextReveal: RevealSnapshot | null = lastReveal
  let failedElection = action.type === "vetoRespond" && action.agree
  try {
    if (action.type === "reveal") {
      const connected = new Set(state.alivePlayers)
      const revealer = getVoteRevealer(state.playerIds, hostId, state.alivePlayers, connected)
      if (revealer !== actorId) {
        useGameStore.setState({ error: gameCopy.notYourTurn })
        return false
      }
      const tally = tallyVotes(state.votingState)
      const elected = isGovernmentElected(tally, state.alivePlayers.size)
      nextReveal = {
        votes: Object.fromEntries(state.votingState.votes) as Record<PlayerId, Vote>,
        yes: tally.yes,
        no: tally.no,
        elected,
        failedCount: state.electionTracker + 1,
      }
      failedElection = !elected
      next = applyRevealVotes(state, revealer, connected, random)
    } else {
      next = applyLocal(state, actorId, action)
    }
  } catch {
    useGameStore.setState({ error: gameCopy.moveNotAllowed })
    return false
  }

  const lines = describeTransition(state, next, actorId, action, names, nextReveal)
  const chaosHappened = failedElection && state.electionTracker === 2 && next.electionTracker === 0
  const chaosPolicy: Policy = next.liberalPoliciesEnacted > state.liberalPoliciesEnacted ? POLICY_LIBERAL : "POLICY_FASCIST"
  const previous = useGameStore.getState()
  useGameStore.setState({
    ...localSnapshot(next, previous.seats, hostId, previous.testTable, actorId),
    log: [...previous.log, ...lines],
    lastReveal: action.type === "nominate" ? null : nextReveal,
    chaos: chaosHappened ? { id: (previous.chaos?.id ?? 0) + 1, policy: chaosPolicy } : previous.chaos,
  })
  return true
}

function applyLocal(state: GameState, actorId: PlayerId, action: GameAction): GameState {
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
      throw new Error("reveal is handled by performLocal")
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

function remoteErrorCopy(code: string, action: GameAction, view: PlayerView | null, names: Record<PlayerId, string>): string {
  if (code === "INELIGIBLE_NOMINEE" && action.type === "nominate" && view) {
    const name = names[action.targetId] ?? ""
    if (action.targetId === view.presidentId) return gameCopy.ineligiblePresident
    if (action.targetId === view.lastElectedChancellorId) return gameCopy.ineligibleLastChancellor(name)
    if (action.targetId === view.lastElectedPresidentId) return gameCopy.ineligibleLastPresident(name)
    return gameCopy.ineligibleNotAlive
  }
  if (code === "ACTOR_ALREADY_VOTED") return gameCopy.alreadyVoted
  if (code === "NOT_REVEALER" || code.startsWith("ACTOR_")) return gameCopy.notYourTurn
  return gameCopy.moveNotAllowed
}

function applyRemoteEvents(events: PublicEventLike[]): void {
  const { names } = useGameStore.getState()
  const lines: LogLine[] = []
  let lastReveal = useGameStore.getState().lastReveal
  let chaos = useGameStore.getState().chaos
  for (const event of events) {
    const text = describePublicEvent(event, names)
    if (text) lines.push({ text })
    if (event.kind === "NOMINATED") lastReveal = null
    if (event.kind === "REVEALED" && event.reveal) {
      lastReveal = {
        votes: event.reveal.votes as Record<PlayerId, Vote>,
        yes: event.reveal.yes,
        no: event.reveal.no,
        elected: event.reveal.elected,
        failedCount: event.reveal.failedCount,
      }
    }
    if (event.kind === "CHAOS" && event.chaosPolicy) {
      chaos = { id: (chaos?.id ?? 0) + 1, policy: event.chaosPolicy as Policy }
    }
  }
  useGameStore.setState({ log: [...useGameStore.getState().log, ...lines], lastReveal, chaos })
}

function chatErrorCopy(code: string): string {
  if (code === "CHAT_MUTED_TILES") return gameCopy.chatMutedTiles
  if (code === "CHAT_MUTED_EXECUTED") return gameCopy.chatMutedExecuted
  if (code === "RATE_LIMITED") return gameCopy.chatRateLimited
  if (code === "CHAT_IN_PERSON") return gameCopy.chatOnlineOnly
  return gameCopy.chatInvalid
}
