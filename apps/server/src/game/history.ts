/* Finished-game history (spec Sec 12: games, game_players, game_events). The
   room row is created on first use because the live room lives in memory
   until rooms are persisted; its password hash is intentionally left empty
   here, since history never needs the password. */
import type { PrismaClient } from "@prisma/client"
import type { Prisma } from "@prisma/client"
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
  players: { userId: string; seat: number; role: string; alive: boolean }[]
  events: PublicGameEvent[]
}

export interface HistoryStore {
  record(summary: GameSummary): Promise<void>
}

export function createMemoryHistory(): HistoryStore & { all(): GameSummary[] } {
  const games: GameSummary[] = []
  return {
    record: (summary) => {
      games.push(summary)
      return Promise.resolve()
    },
    all: () => [...games],
  }
}

export function createPrismaHistory(prisma: PrismaClient): HistoryStore {
  return {
    async record(summary) {
      await prisma.$transaction(async (tx) => {
        const room = await tx.room.upsert({
          where: { roomCode: summary.roomCode },
          create: { roomCode: summary.roomCode, passwordHash: "", hostUserId: summary.hostId, mode: summary.mode, status: "STARTED", settings: {} },
          update: { status: "STARTED" },
        })
        await tx.game.create({
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
      })
    },
  }
}
