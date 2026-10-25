#!/usr/bin/env node
/* Keeps apps/mobile/.env pointed at this machine's current Wi-Fi/LAN IP.
   Windows (and most routers) hand out a new IP whenever this machine
   reconnects, which silently breaks EXPO_PUBLIC_API_URL - the symptom is a
   generic "Something went wrong" on the first screen that calls the server
   (S5 choose username), because earlier screens are fake/local and never
   make a request. Runs automatically before `pnpm dev:mobile` so the app
   always boots pointed at a reachable address, with no manual .env editing. */
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { networkInterfaces } from "node:os"
import { join } from "node:path"

const ENV_PATH = join(process.cwd(), ".env")
const DEFAULT_PORT = 4000

function currentLanIp() {
  const candidates = []
  for (const [name, addresses] of Object.entries(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) {
        candidates.push({ name, ip: address.address })
      }
    }
  }
  if (candidates.length === 0) return null
  const wifi = candidates.find((c) => /wi.?fi|wireless|wlan/i.test(c.name))
  return (wifi ?? candidates[0]).ip
}

function currentPort(env) {
  const match = env.match(/EXPO_PUBLIC_API_URL=https?:\/\/[^:]+:(\d+)/)
  return match ? match[1] : String(DEFAULT_PORT)
}

const ip = currentLanIp()
if (!ip) {
  console.log("syncLanIp: no network interface found - leaving .env as is.")
  process.exit(0)
}

const existing = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf8") : ""
const port = currentPort(existing)
const nextUrl = `EXPO_PUBLIC_API_URL=http://${ip}:${port}`

let next
if (existing.includes("EXPO_PUBLIC_API_URL=")) {
  next = existing.replace(/EXPO_PUBLIC_API_URL=.*/g, nextUrl)
} else {
  const prefix = existing.length > 0 && !existing.endsWith("\n") ? existing + "\n" : existing
  next = prefix + nextUrl + "\n" + (existing.includes("EXPO_PUBLIC_DEV_LOGIN=") ? "" : "EXPO_PUBLIC_DEV_LOGIN=true\n")
}

if (next !== existing) {
  writeFileSync(ENV_PATH, next)
  console.log(`syncLanIp: EXPO_PUBLIC_API_URL set to http://${ip}:${port} (was different or missing)`)
} else {
  console.log(`syncLanIp: EXPO_PUBLIC_API_URL already correct (http://${ip}:${port})`)
}
