/* Manual production restart check. Run `prepare`, restart the Render backend,
   then run `verify`. The only state file is ignored by Git and removed after
   verification. This script is test-only; it never ships in the game app. */
import { randomBytes } from "node:crypto"
import { readFile, unlink, writeFile } from "node:fs/promises"

const mode = process.argv[2]
const root = new URL("../../../", import.meta.url)
const env = await readFile(new URL("apps/mobile/.env", root), "utf8")
const key = env.match(/^EXPO_PUBLIC_FIREBASE_API_KEY=(.+)$/m)?.[1]?.trim()
const stateFile = new URL(".env.restart.local", import.meta.url)
const api = process.env.LIVE_API_URL ?? "https://secret-hitler-ye6l.onrender.com"
if (!key) throw new Error("Firebase web API key missing from ignored apps/mobile/.env")

async function post(url, body) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(90000) })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`${response.status} ${json.code ?? json.error?.message ?? "request failed"}`)
  return json
}

async function game(path, method, token, body) {
  const response = await fetch(api + path, {
    method, headers: { ...(body === undefined ? {} : { "content-type": "application/json" }), authorization: "Bearer " + token },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(90000),
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${json.code ?? "request failed"}`)
  return json
}

if (mode === "prepare") {
  const suffix = randomBytes(5).toString("hex")
  const email = `codex-restart-${suffix}@example.com`
  const password = `Smoke-${randomBytes(12).toString("base64url")}`
  const account = await post(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${key}`, { email, password, returnSecureToken: true })
  try {
    const profile = await game("/me", "POST", account.idToken, { username: `rst${suffix}` })
    const room = await game("/rooms", "POST", account.idToken, {
      mode: "MODE_IN_PERSON", password: "Test123", settings: { timers: false, chat: false },
    })
    await writeFile(stateFile, JSON.stringify({ token: account.idToken, code: room.code, userId: profile.id }), { mode: 0o600 })
    console.log("Prepared persistent test account and room", room.code)
  } catch (error) {
    await post(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${key}`, { idToken: account.idToken })
    throw error
  }
} else if (mode === "verify") {
  const { token, code, userId } = JSON.parse(await readFile(stateFile, "utf8"))
  try {
    const me = await game("/me", "GET", token)
    const room = await game(`/rooms/${code}`, "GET", token)
    if (me.id !== userId || room.hostId !== userId || room.seats.length !== 1) throw new Error("Restored identity or room differs from original")
    console.log("Verified profile and room", code, "survived backend restart")
  } finally {
    try { await game(`/rooms/${code}/leave`, "POST", token) } catch { /* service may have lost room */ }
    try { await game("/me", "DELETE", token) } catch { /* service may be unavailable */ }
    await post(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${key}`, { idToken: token })
    await unlink(stateFile)
    console.log("Removed disposable restart-test account")
  }
} else {
  throw new Error("Usage: node tools/sim/src/liveRestart.mjs prepare|verify")
}
