/* Finished-game history (spec Sec 12: games, game_players, game_events, and
   S20 game history). The room row is created on first use because the live
   room lives in memory until rooms are persisted; its password hash is left
   empty here, since history never needs the password. */
import type { Prisma, PrismaClient } from "@prisma/client"
import { randomUUID } from "node:crypto"
import { partyMembership } from "@game/engine"
import type { PublicGameEvent } from "@game/protocol"

export interface GameSummary {
  roomCode: string
  hostId: string
  mode: string
  playerCount: number
  winner: string | null
  winReason: string | null
  startedAt: string
  endedAt: string
  players: { userId: string; username?: string; seat: number; role: string; alive: boolean }[]
  events: PublicGameEvent[]
}

export interface GameListItem {
  id: string
  roomCode: string
  mode: string
  playerCount: number
  winner: string | null
  winReason: string | null
  startedAt: string
  endedAt: string
  myRole: string
  won: boolean
}

export interface GameDetail extends GameSummary {
  id: string
}

export interface HistoryStore {
  record(summary: GameSummary): Promise<string>
  listForUser(userId: string): Promise<GameListItem[]>
  get(id: string): Promise<GameDetail | null>
  deleteForUser(userId: string): Promise<void>
}

function won(summary: GameSummary, userId: string): { myRole: string; won: boolean } {
  const mine = summary.players.find((player) => player.userId === userId)
  if (!mine) return { myRole: "", won: false }
  const team = partyMembership(mine.role as Parameters<typeof partyMembership>[0])
  return { myRole: mine.role, won: summary.winner === team }
}

export function createMemoryHistory(): HistoryStore & { all(): GameSummary[] } {
  const games: { id: string; summary: GameSummary }[] = []
  return {
    record: (summary) => {
      const id = String(games.length + 1)
      games.push({ id, summary })
      return Promise.resolve(id)
    },
    listForUser: (userId) =>
      Promise.resolve(
        games
          .filter((game) => game.summary.players.some((player) => player.userId === userId))
          .map((game) => ({ id: game.id, roomCode: game.summary.roomCode, mode: game.summary.mode, playerCount: game.summary.playerCount, winner: game.summary.winner, winReason: game.summary.winReason, startedAt: game.summary.startedAt, endedAt: game.summary.endedAt, ...won(game.summary, userId) }))
          .reverse(),
      ),
    get: (id) => {
      const game = games.find((candidate) => candidate.id === id)
      return Promise.resolve(game ? { id, ...game.summary } : null)
    },
    deleteForUser: (userId) => {
      const anonymousId = "deleted:" + randomUUID()
      for (const game of games) {
        game.summary.players = game.summary.players.map((player) => (player.userId === userId ? { ...player, userId: anonymousId } : player))
        game.summary.events = game.summary.events.map((event) => replacePlayerId(event, userId, anonymousId) as PublicGameEvent)
      }
      return Promise.resolve()
    },
    all: () => games.map((game) => game.summary),
  }
}

export function createPrismaHistory(prisma: PrismaClient): HistoryStore {
  return {
    async record(summary) {
      return prisma.$transaction(async (tx) => {
        const room = await tx.room.upsert({
          where: { roomCode: summary.roomCode },
          create: { roomCode: summary.roomCode, passwordHash: "", hostUserId: summary.hostId, mode: summary.mode, status: "STARTED", settings: {} },
          update: { status: "STARTED" },
        })
        const game = await tx.game.create({
          data: {
            roomId: room.id,
            mode: summary.mode,
            playerCount: summary.playerCount,
            winner: summary.winner,
            winReason: summary.winReason,
            startedAt: new Date(summary.startedAt),
            endedAt: new Date(summary.endedAt),
            players: { create: summary.players.map((player) => ({ userId: player.userId, seat: player.seat, role: player.role, alive: player.alive })) },
            events: {
              create: summary.events.map((event) => ({
                seq: event.seq,
                type: event.kind,
                payload: event as unknown as Prisma.InputJsonValue,
                visibleTo: "PUBLIC",
              })),
            },
          },
        })
        return game.id
      })
    },

    async listForUser(userId) {
      const rows = await prisma.gamePlayer.findMany({
        where: { userId },
        include: { game: { include: { room: true, players: true } } },
        orderBy: { game: { endedAt: "desc" } },
        take: 50,
      })
      return rows.map((row) => {
        const summary = {
          roomCode: row.game.room.roomCode,
          hostId: row.game.room.hostUserId,
          mode: row.game.mode,
          playerCount: row.game.playerCount,
          winner: row.game.winner,
          winReason: row.game.winReason,
          startedAt: row.game.startedAt.toISOString(),
          endedAt: (row.game.endedAt ?? row.game.startedAt).toISOString(),
          players: row.game.players.map((player) => ({ userId: player.userId, seat: player.seat, role: player.role, alive: player.alive })),
          events: [],
        }
        return {
          id: row.gameId,
          roomCode: summary.roomCode,
          mode: summary.mode,
          playerCount: summary.playerCount,
          winner: summary.winner,
          winReason: summary.winReason,
          startedAt: summary.startedAt,
          endedAt: summary.endedAt,
          ...won(summary, userId),
        }
      })
    },

    async get(id) {
      const game = await prisma.game.findUnique({
        where: { id },
        include: { room: true, players: { include: { user: true } }, events: { orderBy: { seq: "asc" } } },
      })
      if (!game) return null
      return {
        id: game.id,
        roomCode: game.room.roomCode,
        hostId: game.room.hostUserId,
        mode: game.mode,
        playerCount: game.playerCount,
        winner: game.winner,
        winReason: game.winReason,
        startedAt: game.startedAt.toISOString(),
        endedAt: (game.endedAt ?? game.startedAt).toISOString(),
        players: game.players.map((player) => ({ userId: player.userId, username: player.user.username, seat: player.seat, role: player.role, alive: player.alive })),
        events: game.events.map((event) => event.payload as unknown as PublicGameEvent),
      }
    },

    async deleteForUser(userId) {
      await prisma.$transaction(async (tx) => {
        const games = await tx.gamePlayer.findMany({ where: { userId }, select: { gameId: true } })
        const hosted = await tx.room.count({ where: { hostUserId: userId } })
        if (games.length === 0 && hosted === 0) return
        /* A distinct placeholder is needed for each deleted player: one
           finished game can contain several later-deleted accounts. */
        const anonymous = await tx.user.create({ data: { username: "deleted-player-" + randomUUID() } })
        await tx.gamePlayer.updateMany({ where: { userId }, data: { userId: anonymous.id } })
        await tx.room.updateMany({ where: { hostUserId: userId }, data: { hostUserId: anonymous.id } })
        const events = await tx.gameEvent.findMany({ where: { gameId: { in: games.map((game) => game.gameId) } } })
        for (const event of events) {
          await tx.gameEvent.update({
            where: { gameId_seq: { gameId: event.gameId, seq: event.seq } },
            data: { payload: replacePlayerId(event.payload, userId, anonymous.id) as Prisma.InputJsonValue },
          })
        }
      })
    },
  }
}

function replacePlayerId(value: unknown, oldId: string, newId: string): unknown {
  if (typeof value === "string") return value === oldId ? newId : value
  if (Array.isArray(value)) return value.map((item) => replacePlayerId(item, oldId, newId))
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key === oldId ? newId : key, replacePlayerId(item, oldId, newId)]))
  }
  return value
}
