/* Test-only driver (CLAUDE.md rule 8): sets up a room over REST exactly as
   the app does (sign up, create, join, ready, start) and then plays it over
   Socket.IO with scripted phones until the game is over, or until the caller
   pauses the phones to simulate a server restart. */
import type { RandomFn } from "@game/engine"
import { PHASE_GAME_OVER } from "@game/engine"
import { attachPlayLoop, connectPhone, type ScriptedPhone } from "./scriptedClient.js"

export interface PlayerSeat {
  name: string
  token: string
  id: string
}

export interface RoomSetup {
  code: string
  hostId: string
  players: PlayerSeat[]
}

async function call(base: string, method: string, path: string, token: string, body?: unknown): Promise<{ status: number; json: Record<string, unknown> }> {
  const init: RequestInit = {
    method,
    headers: body === undefined ? { authorization: "Bearer " + token } : { "content-type": "application/json", authorization: "Bearer " + token },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }
  const response = await fetch(base + path, init)
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>
  return { status: response.status, json }
}

export async function setUpRoom(base: string, playerCount: number, prefix: string): Promise<RoomSetup> {
  const players: PlayerSeat[] = []
  for (let index = 0; index < playerCount; index += 1) {
    const name = prefix + "P" + index
    const token = "dev:" + name
    const signed = await call(base, "POST", "/me", token, { username: name })
    if (signed.status !== 201) throw new Error("sign up failed for " + name + ": " + JSON.stringify(signed.json))
    players.push({ name, token, id: String(signed.json.id) })
  }
  const host = players[0] as PlayerSeat
  const created = await call(base, "POST", "/rooms", host.token, { mode: "MODE_IN_PERSON", password: "1234", settings: { timers: false, chat: false } })
  const code = String(created.json.code)
  for (const player of players.slice(1)) {
    const joined = await call(base, "POST", "/rooms/" + code + "/join", player.token, { password: "1234" })
    if (joined.status !== 200) throw new Error("join failed for " + player.name + ": " + JSON.stringify(joined.json))
  }
  for (const player of players) {
    await call(base, "POST", "/rooms/" + code + "/ready", player.token, { ready: true })
  }
  const started = await call(base, "POST", "/rooms/" + code + "/start", host.token)
  if (started.status !== 200) throw new Error("start failed: " + JSON.stringify(started.json))
  return { code, hostId: host.id, players }
}

export interface PlayOptions {
  stopAfterActions?: number
  timeoutMs?: number
}

export interface PlayResult {
  phones: ScriptedPhone[]
  over: boolean
}

export async function connectAndPlay(url: string, setup: RoomSetup, random: RandomFn, options: PlayOptions = {}): Promise<PlayResult> {
  const phones: ScriptedPhone[] = []
  for (const player of setup.players) {
    const phone = await connectPhone(url, player.name, player.token)
    phones.push(phone)
    attachPlayLoop(phone, setup.hostId, random)
    const reply = (await phone.socket.emitWithAck("room:subscribe", { code: setup.code })) as { ok: boolean }
    if (!reply.ok) throw new Error("subscribe failed for " + player.name)
  }
  const deadline = Date.now() + (options.timeoutMs ?? 60000)
  while (Date.now() < deadline) {
    const total = phones.reduce((sum, phone) => sum + phone.actions, 0)
    if (options.stopAfterActions !== undefined && total >= options.stopAfterActions) {
      for (const phone of phones) phone.paused = true
      return { phones, over: false }
    }
    if (phones.every((phone) => phone.latest?.phase === PHASE_GAME_OVER)) return { phones, over: true }
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  return { phones, over: false }
}

export function closePhones(phones: ScriptedPhone[]): void {
  for (const phone of phones) phone.socket.disconnect()
}
