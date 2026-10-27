/* Manual test-only production match: five disposable Firebase accounts play
   a complete legal game through the public server and real sockets. */
import { randomBytes } from "node:crypto"
import { readFile } from "node:fs/promises"
import { closePhones, connectAndPlay, type PlayerSeat, type RoomSetup } from "./scriptedGame.js"
import { PHASE_GAME_OVER } from "@game/engine"

const env = await readFile(new URL("../../../apps/mobile/.env", import.meta.url), "utf8")
const key = env.match(/^EXPO_PUBLIC_FIREBASE_API_KEY=(.+)$/m)?.[1]?.trim()
const base = process.env.LIVE_API_URL ?? "https://secret-hitler-ye6l.onrender.com"
if (!key) throw new Error("Missing Firebase key in ignored apps/mobile/.env")

type Account = PlayerSeat & { email: string }
const accounts: Account[] = []
let roomCode = ""

async function firebase(action: string, body: unknown): Promise<Record<string, string>> {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${action}?key=${key}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(90000),
  })
  const json = await response.json() as Record<string, string>
  if (!response.ok) throw new Error(`Firebase ${action}: ${response.status}`)
  return json
}

async function request(path: string, method: string, token: string, body?: unknown): Promise<{ status: number; data: Record<string, unknown> }> {
  const response = await fetch(base + path, {
    method, headers: { ...(body === undefined ? {} : { "content-type": "application/json" }), authorization: "Bearer " + token },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(90000),
  })
  const data = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${String(data.code ?? "request failed")}`)
  return { status: response.status, data }
}

let phones: Awaited<ReturnType<typeof connectAndPlay>>["phones"] = []
try {
  for (let index = 0; index < 5; index += 1) {
    const suffix = randomBytes(5).toString("hex")
    const name = `match${suffix}`
    const email = `codex-match-${suffix}@example.com`
    const password = `Smoke-${randomBytes(12).toString("base64url")}`
    const auth = await firebase("signUp", { email, password, returnSecureToken: true })
    const account: Account = { name, email, token: auth.idToken ?? "", id: "" }
    accounts.push(account)
    const profile = await request("/me", "POST", account.token, { username: name })
    account.id = String(profile.data.id)
    console.log(`Registered player ${index + 1}/5`)
  }
  const host = accounts[0] as Account
  const created = await request("/rooms", "POST", host.token, {
    mode: "MODE_IN_PERSON", password: "Test123", settings: { timers: false, chat: false },
  })
  roomCode = String(created.data.code)
  for (const player of accounts.slice(1)) await request(`/rooms/${roomCode}/join`, "POST", player.token, { password: "Test123" })
  for (const player of accounts) await request(`/rooms/${roomCode}/ready`, "POST", player.token, { ready: true })
  await request(`/rooms/${roomCode}/start`, "POST", host.token)
  console.log("Started live five-player match", roomCode)

  const setup: RoomSetup = { code: roomCode, hostId: host.id, players: accounts }
  let seed = 223
  const random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000 }
  const result = await connectAndPlay(base, setup, random, { timeoutMs: 600000 })
  phones = result.phones
  if (!result.over || phones.some((phone) => phone.errors.length)) {
    throw new Error(`Match did not finish cleanly: ${phones.map((phone) => phone.errors.join(",")).join(";")}`)
  }
  for (const phone of phones) {
    for (const view of phone.views) {
      const { myHand, myPeekedPolicies, myInvestigationResults, gameOverReveal, ...publicPart } = view
      if (/POLICY_(LIBERAL|FASCIST)|ROLE_|VOTE_(YES|NO)/.test(JSON.stringify(publicPart))) throw new Error("Secret appeared in a public game view")
      if (view.phase !== PHASE_GAME_OVER && gameOverReveal !== null) throw new Error("Final roles appeared before game over")
      if (myHand !== null && ![view.presidentId, view.chancellorNomineeId].includes(view.viewerId)) throw new Error("Hand reached the wrong player")
      if (myPeekedPolicies !== null && view.presidentId !== view.viewerId) throw new Error("Peek reached the wrong player")
      if (myInvestigationResults.some((item) => item.targetId === view.viewerId)) throw new Error("Investigation reached its target")
    }
  }
  const history = await request("/me/games", "GET", host.token)
  const games = history.data as unknown as Array<{ id: string; roomCode: string }>
  const game = games.find((item) => item.roomCode === roomCode)
  if (!game) throw new Error("Completed game missing from server history")
  const detail = await request(`/games/${game.id}`, "GET", host.token)
  if (!Array.isArray(detail.data.players) || detail.data.players.length !== 5) throw new Error("History lost player records")
  console.log("Full game finished; five private views stayed on their own sockets; history contains five players")
} finally {
  closePhones(phones)
  for (const player of accounts.reverse()) {
    if (player.id) {
      try { await request("/me", "DELETE", player.token) } catch (error) { console.error("Server test-profile cleanup failed:", String(error)) }
    }
    try {
      await firebase("delete", { idToken: player.token })
      console.log("Removed disposable Firebase player")
    } catch (error) { console.error("Firebase test-account cleanup failed:", player.email, String(error)) }
  }
}
