/* Game events and actions (spec Sec 13). Phone -> server actions are checked
   with zod here and again by the engine (phase, actor, target) on the server. */
import { z } from "zod"

export const GAME_ACTION_EVENT = "game:action"
export const GAME_VIEW_EVENT = "game:view"
export const GAME_PUBLIC_EVENT = "game:event"

export const gameActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("nominate"), targetId: z.string().min(1) }),
  z.object({ type: z.literal("vote"), vote: z.enum(["VOTE_YES", "VOTE_NO"]) }),
  z.object({ type: z.literal("closeVoting") }),
  z.object({ type: z.literal("reveal") }),
  z.object({ type: z.literal("discard"), tileIndex: z.number().int().min(0).max(2) }),
  z.object({ type: z.literal("enact"), tileIndex: z.number().int().min(0).max(1) }),
  z.object({ type: z.literal("vetoRequest") }),
  z.object({ type: z.literal("vetoRespond"), agree: z.boolean() }),
  z.object({ type: z.literal("powerChoose"), targetId: z.string().min(1) }),
  z.object({ type: z.literal("peekDone") }),
])

export type GameActionInput = z.infer<typeof gameActionSchema>

/* Public facts only (spec Sec 8): nominations, who voted, the revealed
   votes after reveal, enacted policy colour, power use and results. Never
   roles, hands, discards or investigation teams. */
export interface PublicGameEvent {
  seq: number
  kind: string
  actorId?: string
  targetId?: string
  enacted?: string
  reveal?: { votes: Record<string, string>; yes: number; no: number; elected: boolean; failedCount: number }
  chaosPolicy?: string
  winner?: string
  winReason?: string
}
