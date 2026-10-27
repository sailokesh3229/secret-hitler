/* Test-only scripted phone (CLAUDE.md rule 8: never shipped). It connects over
   Socket.IO like a real phone, sees only its own game:view, and sends one
   legal action when it is the one who must act. The choice is random, so a
   full game exercises every phase. */
import { io, type Socket } from "socket.io-client"
import type { PlayerView, RandomFn } from "@game/engine"
import {
  PHASE_AWAIT_HOST_REVEAL,
  PHASE_CHANCELLOR_POLICIES,
  PHASE_GAME_OVER,
  PHASE_NOMINATION,
  PHASE_PRESIDENT_POLICIES,
  PHASE_PRESIDENTIAL_POWER,
  PHASE_VETO_RESPONSE,
  PHASE_VOTING,
  POWER_INVESTIGATE,
  POWER_POLICY_PEEK,
  VOTE_NO,
  VOTE_YES,
} from "@game/engine"
import { GAME_ACTION_EVENT, GAME_PUBLIC_EVENT, GAME_VIEW_EVENT, type GameActionInput } from "@game/protocol"

export interface ScriptedPhone {
  name: string
  socket: Socket
  latest: PlayerView | null
  views: PlayerView[]
  publicEvents: unknown[]
  errors: string[]
  actions: number
  paused: boolean
}

export function pick<T>(items: readonly T[], random: RandomFn): T | undefined {
  if (items.length === 0) return undefined
  return items[Math.floor(random() * items.length)]
}

export function connectPhone(url: string, name: string, token: string): Promise<ScriptedPhone> {
  const socket = io(url, { auth: { token }, transports: ["websocket"], forceNew: true })
  const phone: ScriptedPhone = { name, socket, latest: null, views: [], publicEvents: [], errors: [], actions: 0, paused: false }
  return new Promise((resolve, reject) => {
    socket.on("connect_error", reject)
    socket.on("connect", () => resolve(phone))
  })
}

/* The host reveals the votes; if the host is gone, the next living player
   clockwise from the host does (spec Sec 6). */
export function revealerFor(view: PlayerView, hostId: string): string | undefined {
  const seats = view.seats
  const start = seats.indexOf(hostId)
  for (let step = 0; step < seats.length; step += 1) {
    const candidate = seats[(start + step) % seats.length]
    if (candidate !== undefined && view.alivePlayers.includes(candidate)) return candidate
  }
  return undefined
}

export function chooseAction(view: PlayerView, hostId: string, random: RandomFn): GameActionInput | null {
  const me = view.viewerId
  const alive = view.alivePlayers
  switch (view.phase) {
    case PHASE_NOMINATION: {
      if (me !== view.presidentId) return null
      const eligible = alive.filter(
        (id) =>
          id !== me &&
          id !== view.lastElectedChancellorId &&
          !(alive.length > 5 && id === view.lastElectedPresidentId),
      )
      const target = pick(eligible, random)
      return target === undefined ? null : { type: "nominate", targetId: target }
    }
    case PHASE_VOTING:
      if (!alive.includes(me) || view.votedPlayerIds.includes(me)) return null
      return { type: "vote", vote: random() < 0.5 ? VOTE_YES : VOTE_NO }
    case PHASE_AWAIT_HOST_REVEAL:
      return revealerFor(view, hostId) === me ? { type: "reveal" } : null
    case PHASE_PRESIDENT_POLICIES:
      return me === view.presidentId ? { type: "discard", tileIndex: Math.floor(random() * 3) } : null
    case PHASE_CHANCELLOR_POLICIES: {
      if (me !== view.chancellorNomineeId) return null
      const canVeto = view.fascistPoliciesEnacted >= 5 && !view.vetoRequestedThisSession
      if (canVeto && random() < 0.25) return { type: "vetoRequest" }
      return { type: "enact", tileIndex: Math.floor(random() * 2) }
    }
    case PHASE_VETO_RESPONSE:
      return me === view.presidentId ? { type: "vetoRespond", agree: random() < 0.5 } : null
    case PHASE_PRESIDENTIAL_POWER: {
      if (me !== view.presidentId) return null
      if (view.pendingPower === POWER_POLICY_PEEK) return { type: "peekDone" }
      const candidates = alive.filter(
        (id) => id !== me && !(view.pendingPower === POWER_INVESTIGATE && view.investigatedPlayerIds.includes(id)),
      )
      const target = pick(candidates, random)
      return target === undefined ? null : { type: "powerChoose", targetId: target }
    }
    case PHASE_GAME_OVER:
      return null
  }
  return null
}

function stepKey(view: PlayerView): string {
  return JSON.stringify([
    view.phase,
    view.presidentId,
    view.chancellorNomineeId,
    view.drawPileCount,
    view.discardPileCount,
    view.electionTracker,
    view.liberalPoliciesEnacted,
    view.fascistPoliciesEnacted,
    view.votedPlayerIds.length,
    view.pendingPower,
  ])
}

/* Attaches the play loop. A phone sends one action at a time and waits for
   its reply before deciding again, so a view that was broadcast before its own
   action was applied cannot make it act twice. */
export function attachPlayLoop(phone: ScriptedPhone, hostId: string, random: RandomFn): void {
  let lastKey = ""
  let lastBallot = ""
  let pending = false

  function decide(view: PlayerView): void {
    if (view.phase === PHASE_GAME_OVER || phone.paused || pending) return
    const key = stepKey(view)
    if (key === lastKey) return
    const action = chooseAction(view, hostId, random)
    if (action === null) return
    /* Socket views can arrive out of order while other players vote. The
       scripted phone should cast once per election, just like a human UI. */
    const ballot = JSON.stringify([view.presidentId, view.chancellorNomineeId, view.electionTracker, view.liberalPoliciesEnacted, view.fascistPoliciesEnacted])
    if (action.type === "vote" && ballot === lastBallot) return
    if (action.type === "vote") lastBallot = ballot
    lastKey = key
    pending = true
    phone.actions += 1
    phone.socket
      .emitWithAck(GAME_ACTION_EVENT, action)
      .then((reply: { ok: boolean; code?: string }) => {
        pending = false
        if (!reply.ok) phone.errors.push(String(reply.code) + " for " + JSON.stringify(action))
        if (phone.latest) decide(phone.latest)
      })
      .catch((error: unknown) => {
        pending = false
        phone.errors.push(String(error))
      })
  }

  phone.socket.on(GAME_VIEW_EVENT, (view: PlayerView) => {
    phone.latest = view
    phone.views.push(view)
    decide(view)
  })
  phone.socket.on(GAME_PUBLIC_EVENT, (events: unknown[]) => {
    phone.publicEvents.push(...events)
  })
}
