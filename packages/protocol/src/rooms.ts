/* Room rules shared by the app and the server (spec S7-S9, Sec 13). The room code alphabet leaves out look-alike characters (0/O, 1/I/L). */
import { z } from "zod"

export const ROOM_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
export const ROOM_CODE_LENGTH = 6
export const ROOM_PASSWORD_MIN_LENGTH = 4
export const ROOM_PASSWORD_MAX_LENGTH = 8
export const MIN_PLAYERS_TO_START = 5
export const MAX_PLAYERS = 10

export const TABLE_MODES = ["MODE_IN_PERSON", "MODE_ONLINE"] as const
export type TableMode = (typeof TABLE_MODES)[number]

export const roomSettingsSchema = z.object({
  timers: z.boolean(),
  chat: z.boolean(),
})
export type RoomSettings = z.infer<typeof roomSettingsSchema>

export function generateRoomCode(randomInt: (max: number) => number): string {
  let code = ""
  for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
    code += ROOM_CODE_ALPHABET.charAt(randomInt(ROOM_CODE_ALPHABET.length))
  }
  return code
}

export function roomPasswordProblem(password: string): "PASSWORD_TOO_SHORT" | "PASSWORD_TOO_LONG" | null {
  if (password.length < ROOM_PASSWORD_MIN_LENGTH) return "PASSWORD_TOO_SHORT"
  if (password.length > ROOM_PASSWORD_MAX_LENGTH) return "PASSWORD_TOO_LONG"
  return null
}
