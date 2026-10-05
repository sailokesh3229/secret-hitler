/* Input rules for the entry screens (spec Sec 4: S5 usernames, S7 room
   passwords, S8 Room IDs). Pure functions so the same rule text is
   tested once and reused by the screens and, later, the server. */
export type UsernameProblem = "TOO_SHORT" | "TOO_LONG" | "BAD_CHARACTERS"
export type PasswordProblem = "TOO_SHORT" | "TOO_LONG"

const USERNAME_PATTERN = /^[A-Za-z0-9_]+$/
const USERNAME_MIN = 3
const USERNAME_MAX = 16
const PASSWORD_MIN = 4
const PASSWORD_MAX = 8
export const ROOM_ID_LENGTH = 6

export function usernameProblem(name: string): UsernameProblem | null {
  if (name.length < USERNAME_MIN) return "TOO_SHORT"
  if (name.length > USERNAME_MAX) return "TOO_LONG"
  if (!USERNAME_PATTERN.test(name)) return "BAD_CHARACTERS"
  return null
}

export function passwordProblem(password: string): PasswordProblem | null {
  if (password.length < PASSWORD_MIN) return "TOO_SHORT"
  if (password.length > PASSWORD_MAX) return "TOO_LONG"
  return null
}

export function isRoomIdComplete(roomId: string): boolean {
  return roomId.length === ROOM_ID_LENGTH
}
