/* Username rules (spec S5): 3-16 letters, numbers or underscore. Shared by the app and the server so the rule exists in one place. */
export const USERNAME_MIN_LENGTH = 3
export const USERNAME_MAX_LENGTH = 16
const USERNAME_PATTERN = /^[A-Za-z0-9_]+$/

export type UsernameProblem = "USERNAME_TOO_SHORT" | "USERNAME_TOO_LONG" | "USERNAME_BAD_CHARACTERS"

export function usernameProblem(name: string): UsernameProblem | null {
  if (name.length < USERNAME_MIN_LENGTH) return "USERNAME_TOO_SHORT"
  if (name.length > USERNAME_MAX_LENGTH) return "USERNAME_TOO_LONG"
  if (!USERNAME_PATTERN.test(name)) return "USERNAME_BAD_CHARACTERS"
  return null
}
