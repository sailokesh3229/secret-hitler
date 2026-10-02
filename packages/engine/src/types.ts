/* Shared types and neutral identifiers for the rules engine (CLAUDE.md rule
   6: engine and protocol use neutral identifiers, e.g. TEAM_LIBERAL, not
   theme-specific names, so the game can be rebranded via packages/theme). */

export const TEAM_LIBERAL = "TEAM_LIBERAL"
export const TEAM_FASCIST = "TEAM_FASCIST"
export type Team = typeof TEAM_LIBERAL | typeof TEAM_FASCIST

/* ROLE_LEADER is the Hitler-equivalent role: a single Fascist-team player
   with special win/loss conditions (R25, R41, R44, R46). */
export const ROLE_LIBERAL = "ROLE_LIBERAL"
export const ROLE_FASCIST = "ROLE_FASCIST"
export const ROLE_LEADER = "ROLE_LEADER"
export type Role = typeof ROLE_LIBERAL | typeof ROLE_FASCIST | typeof ROLE_LEADER

export const POLICY_LIBERAL = "POLICY_LIBERAL"
export const POLICY_FASCIST = "POLICY_FASCIST"
export type Policy = typeof POLICY_LIBERAL | typeof POLICY_FASCIST

export type PlayerId = string
export type PlayerCount = 5 | 6 | 7 | 8 | 9 | 10

/* Returns a float, like Math.random. Production code injects one source
   and tests inject another (CLAUDE.md rule 3). */
export type RandomFn = () => number

export const MIN_PLAYER_COUNT = 5
export const MAX_PLAYER_COUNT = 10

/* R1: player count is 5-10. */
export function isValidPlayerCount(n: number): n is PlayerCount {
  return Number.isInteger(n) && n >= MIN_PLAYER_COUNT && n <= MAX_PLAYER_COUNT
}

export const VOTE_YES = "VOTE_YES"
export const VOTE_NO = "VOTE_NO"
export type Vote = typeof VOTE_YES | typeof VOTE_NO
