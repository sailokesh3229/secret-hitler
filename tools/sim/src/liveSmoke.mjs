/* Manual production smoke test. Creates two disposable Firebase accounts,
   checks room creation, a second player's join, ready changes and the
   authenticated Socket.IO lobby broadcast, then deletes the test data.
   Run from the repository root: node tools/sim/src/liveSmoke.mjs
   Only tools/sim uses this; no bots are shipped in the game app. */
import { randomBytes } from "node:crypto"
import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { io } from "socket.io-client"

const envFile = new URL("../../../apps/mobile/.env", import.meta.url)
const envText = await readFile(fileURLToPath(envFile), "utf8")
const key = process.env.FIREBASE_WEB_API_KEY ?? envText.match(/^EXPO_PUBLIC_FIREBASE_API_KEY=(.+)$/m)?.[1]?.trim()
if (!key) throw new Error("Set FIREBASE_WEB_API_KEY or configure apps/mobile/.env")

const api = process.env.LIVE_API_URL ?? "https://secret-hitler-ye6l.onrender.com"
const firebaseUrl = "https://identitytoolkit.googleapis.com/v1/accounts:"
const created = []
let roomCode = ""

async function jsonRequest(url, body, token) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90000),
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`${response.status} ${json.code ?? json.error?.message ?? "request failed"}`)
  return json
}

async function gameRequest(path, method, token, body) {
  const response = await fetch(api + path, {
    method,
    headers: { ...(body === undefined ? {} : { "content-type": "application/json" }), authorization: "Bearer " + token },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(90000),
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${json.code ?? "request failed"}`)
  return json
}

async function createPlayer(index) {
  const suffix = randomBytes(5).toString("hex")
  const email = `codex-smoke-${suffix}@example.com`
  const password = `Smoke-${randomBytes(12).toString("base64url")}`
  const account = await jsonRequest(firebaseUrl + `signUp?key=${key}`, { email, password, returnSecureToken: true })
  const player = { token: account.idToken, userId: "", email }
  created.push(player)
  const profile = await gameRequest("/me", "POST", player.token, { username: `smoke${suffix}` })
  player.userId = profile.id
  console.log(`Player ${index}: authenticated and registered`)
  return player
}

async function waitForRoomUpdate(socket, expectedSeats) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off("room:update", onUpdate); reject(new Error("Room update timed out")) }, 20000)
    function onUpdate(view) {
      if (view.seats?.length < expectedSeats) return
      clearTimeout(timer)
      socket.off("room:update", onUpdate)
      resolve(view)
    }
    socket.on("room:update", onUpdate)
  })
}

let socket
try {
  const host = await createPlayer(1)
  const guest = await createPlayer(2)
  const room = await gameRequest("/rooms", "POST", host.token, {
    mode: "MODE_ONLINE", password: "Test123", settings: { timers: false, chat: true },
  })
  roomCode = room.code
  if (room.seats.length !== 1) throw new Error("Host missing from new room")
  console.log("Room created:", roomCode)

  socket = io(api, { transports: ["websocket"], auth: { token: host.token }, reconnection: false, timeout: 20000 })
  await new Promise((resolve, reject) => {
    socket.once("connect", resolve)
    socket.once("connect_error", reject)
  })
  await new Promise((resolve, reject) => socket.emit("room:subscribe", { code: roomCode }, (reply) => reply.ok ? resolve() : reject(new Error(reply.code ?? "subscribe failed"))))

  const joinedUpdate = waitForRoomUpdate(socket, 2)
  const joined = await gameRequest(`/rooms/${roomCode}/join`, "POST", guest.token, { password: "Test123" })
  if (joined.seats.length !== 2) throw new Error("Guest missing from joined room")
  await joinedUpdate
  console.log("Second player joined; socket delivered the lobby update")

  const ready = await gameRequest(`/rooms/${roomCode}/ready`, "POST", guest.token, { ready: true })
  if (!ready.seats.find((seat) => seat.userId === guest.userId)?.ready) throw new Error("Ready state did not persist")
  const hostView = await gameRequest(`/rooms/${roomCode}`, "GET", host.token)
  if (!hostView.seats.find((seat) => seat.userId === guest.userId)?.ready) throw new Error("Host cannot see guest readiness")
  if (JSON.stringify(hostView).includes("passwordHash")) throw new Error("Password hash leaked to a client")
  console.log("Ready state and host room view verified; no password hash leaked")
} finally {
  socket?.disconnect()
  for (const player of created.reverse()) {
    if (roomCode && player.userId) {
      try { await gameRequest(`/rooms/${roomCode}/leave`, "POST", player.token) } catch { /* room may have restarted */ }
    }
    if (player.userId) {
      try { await gameRequest("/me", "DELETE", player.token) } catch { /* report cleanup below */ }
    }
    try {
      await jsonRequest(firebaseUrl + `delete?key=${key}`, { idToken: player.token })
      console.log("Removed disposable Firebase player")
    } catch (error) {
      console.error("Disposable Firebase player cleanup failed:", player.email, String(error))
    }
  }
}
