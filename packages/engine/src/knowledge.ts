/* R8-R10: who each player is shown as a teammate on the role-reveal screen.
   R10: Liberals see nobody. R8: with 5-6 players the lone Fascist and the
   Leader (Hitler-equivalent) see each other. R9: with 7-10 players each
   Fascist sees every other Fascist and the Leader, but the Leader sees
   nobody. */
import { ROLE_FASCIST, ROLE_LEADER, ROLE_LIBERAL } from "./types.js"
import type { PlayerCount, PlayerId, Role } from "./types.js"

function findPlayersWithRole(roles: Map<PlayerId, Role>, role: Role): PlayerId[] {
  const result: PlayerId[] = []
  for (const [playerId, playerRole] of roles) {
    if (playerRole === role) {
      result.push(playerId)
    }
  }
  return result
}

export function getKnownTeammates(
  playerId: PlayerId,
  roles: Map<PlayerId, Role>,
  playerCount: PlayerCount,
): PlayerId[] {
  const role = roles.get(playerId)
  if (role === undefined) {
    throw new Error("Unknown player: cannot look up role knowledge")
  }
  if (role === ROLE_LIBERAL) {
    return []
  }
  const isSmallGame = playerCount <= 6
  if (isSmallGame) {
    if (role === ROLE_FASCIST) {
      return findPlayersWithRole(roles, ROLE_LEADER)
    }
    return findPlayersWithRole(roles, ROLE_FASCIST)
  }
  if (role === ROLE_FASCIST) {
    const otherFascists = findPlayersWithRole(roles, ROLE_FASCIST).filter((id) => id !== playerId)
    const leaders = findPlayersWithRole(roles, ROLE_LEADER)
    return [...otherFascists, ...leaders]
  }
  return []
}
