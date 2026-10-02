/* R2, R3: role counts by player count, and the Role to Team mapping
   (Party Membership). R1 is enforced by isValidPlayerCount. */
import { ROLE_FASCIST, ROLE_LEADER, ROLE_LIBERAL, TEAM_FASCIST, TEAM_LIBERAL } from "./types.js"
import { isValidPlayerCount } from "./types.js"
import { shuffle } from "./deck.js"
import type { PlayerCount, PlayerId, RandomFn, Role, Team } from "./types.js"

/* R2: roles by player count (data table, not logic). */
export interface RoleCounts {
  liberals: number
  fascists: number
  leaders: number
}

export const ROLE_COUNTS_BY_PLAYER_COUNT: Record<PlayerCount, RoleCounts> = {
  5: { liberals: 3, fascists: 1, leaders: 1 },
  6: { liberals: 4, fascists: 1, leaders: 1 },
  7: { liberals: 4, fascists: 2, leaders: 1 },
  8: { liberals: 5, fascists: 2, leaders: 1 },
  9: { liberals: 5, fascists: 3, leaders: 1 },
  10: { liberals: 6, fascists: 3, leaders: 1 },
}

/* R3: Party Membership. Liberal maps to the Liberal team. Fascist and the
   Leader (Hitler-equivalent) both map to the Fascist team. */
export function partyMembership(role: Role): Team {
  if (role === ROLE_LIBERAL) {
    return TEAM_LIBERAL
  }
  return TEAM_FASCIST
}

/* R2: builds the role list for this player count, shuffles it with the
   injected random source, and assigns one role per player. R1 guards the
   count first. */
export function dealRoles(playerIds: readonly PlayerId[], random: RandomFn): Map<PlayerId, Role> {
  const count = playerIds.length
  if (!isValidPlayerCount(count)) {
    throw new Error("R1: player count must be 5-10, got " + count)
  }
  const counts = ROLE_COUNTS_BY_PLAYER_COUNT[count]
  const liberalRoles = Array.from({ length: counts.liberals }, (): Role => ROLE_LIBERAL)
  const fascistRoles = Array.from({ length: counts.fascists }, (): Role => ROLE_FASCIST)
  const leaderRoles = Array.from({ length: counts.leaders }, (): Role => ROLE_LEADER)
  const roleList = shuffle([...liberalRoles, ...fascistRoles, ...leaderRoles], random)
  const assignment = new Map<PlayerId, Role>()
  let i = 0
  while (i < playerIds.length) {
    assignment.set(playerIds[i] as PlayerId, roleList[i] as Role)
    i += 1
  }
  return assignment
}
