/* Real Postgres (plan Step 11: game history saved at game end). Starts a
   throwaway Postgres 17 with embedded-postgres, applies the Prisma migration
   with `prisma migrate deploy`, and checks that a finished game lands in the
   games, game_players and game_events tables. */
import { execSync } from "node:child_process"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import EmbeddedPostgres from "embedded-postgres"
import { PrismaClient } from "@prisma/client"
import { createPrismaHistory, type GameSummary } from "./history.js"
import { createPrismaRoomStore, type Room } from "../rooms/roomStore.js"
import { createPrismaKeyValue } from "./gameStore.js"

const PORT = 54329
const DATABASE = "secret_hitler"
const url = "postgresql://postgres:postgres@localhost:" + PORT + "/" + DATABASE
const serverDir = join(process.cwd())

let postgres: EmbeddedPostgres | undefined
let prisma: PrismaClient | undefined

beforeAll(async () => {
  postgres = new EmbeddedPostgres({
    databaseDir: mkdtempSync(join(tmpdir(), "sh-pg-")),
    user: "postgres",
    password: "postgres",
    port: PORT,
    persistent: false,
  })
  await postgres.initialise()
  await postgres.start()
  await postgres.createDatabase(DATABASE)
  execSync("pnpm exec prisma migrate deploy", {
    cwd: serverDir,
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  })
  prisma = new PrismaClient({ datasourceUrl: url })
}, 300000)

afterAll(async () => {
  await prisma?.$disconnect()
  await postgres?.stop()
}, 60000)

describe("game history in Postgres (plan Step 11)", () => {
  it("saves a finished game with its players and public events", async () => {
    const db = prisma as PrismaClient
    const users = []
    for (let index = 0; index < 5; index += 1) {
      users.push(await db.user.create({ data: { username: "Hist" + index + "_" + Date.now() } }))
    }
    const summary: GameSummary = {
      roomCode: "H" + Date.now().toString(36).slice(-5).toUpperCase(),
      hostId: (users[0] as { id: string }).id,
      mode: "MODE_IN_PERSON",
      playerCount: 5,
      winner: "TEAM_LIBERAL",
      winReason: "WIN_REASON_LIBERAL_POLICIES",
      startedAt: new Date(Date.now() - 60000).toISOString(),
      endedAt: new Date().toISOString(),
      players: users.map((user, index) => ({
        userId: user.id,
        seat: index,
        role: index === 0 ? "ROLE_LEADER" : "ROLE_LIBERAL",
        alive: true,
      })),
      events: [
        { seq: 1, kind: "NOMINATED", actorId: (users[0] as { id: string }).id, targetId: (users[1] as { id: string }).id },
        { seq: 2, kind: "GAME_OVER", winner: "TEAM_LIBERAL", winReason: "WIN_REASON_LIBERAL_POLICIES" },
      ],
    }

    await createPrismaHistory(db).record(summary)

    const saved = await db.game.findFirst({
      where: { room: { roomCode: summary.roomCode } },
      include: { players: true, events: true },
    })
    expect(saved?.winner).toBe("TEAM_LIBERAL")
    expect(saved?.players).toHaveLength(5)
    expect(saved?.events.map((event) => event.type)).toEqual(["NOMINATED", "GAME_OVER"])
  }, 120000)
})

describe("live room and game recovery from Postgres", () => {
  it("restores a room and private game snapshot after a fresh store opens", async () => {
    const db = prisma as PrismaClient
    const code = "P" + Date.now().toString(36).slice(-5).toUpperCase()
    const initial: Room = {
      code, mode: "MODE_ONLINE", passwordHash: "argon2-test-hash", hostId: "host-1",
      status: "STARTED", settings: { timers: false, chat: true },
      members: [{ userId: "host-1", username: "Host", ready: true, connected: true }],
    }
    const rooms = await createPrismaRoomStore(db)
    rooms.set(initial)
    await rooms.flush()
    await createPrismaKeyValue(db).set("game:" + code, "private-game-snapshot")

    const restored = await createPrismaRoomStore(db)
    expect(restored.get(code)).toMatchObject({ code, status: "STARTED", passwordHash: "argon2-test-hash" })
    expect(restored.get(code)?.members[0]?.connected).toBe(false)
    expect(restored.listStartedCodes()).toContain(code)
    expect(await createPrismaKeyValue(db).get("game:" + code)).toBe("private-game-snapshot")

    restored.delete(code)
    await restored.flush()
    expect((await createPrismaRoomStore(db)).hasCode(code)).toBe(false)
  }, 120000)
})
