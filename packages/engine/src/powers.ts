/* R36: a power triggers only for a Fascist policy landing on a slot that
   has one, read from the R5 board table - never hard-code which slot
   number has which power. Chaos never calls this (it has its own path
   in chaos.ts with no power field at all), which is how Chaos ignoring
   powers stays true automatically. R37 (single-use, no stacking) falls
   out of the state machine: pendingPower is cleared the moment it is
   resolved, before the next round starts. */
import { getFascistBoardSlots } from "./boards.js"
import type { Power } from "./boards.js"
import type { PlayerCount, PlayerId } from "./types.js"

export function getTriggeredPower(fascistPoliciesEnacted: number, playerCount: PlayerCount): Power | null {
  const slots = getFascistBoardSlots(playerCount)
  const slot = slots.find((s) => s.slot === fascistPoliciesEnacted)
  return slot ? slot.power : null
}

export const POWER_TARGET_INVALID_SELF = "POWER_TARGET_INVALID_SELF"
export const POWER_TARGET_INVALID_NOT_ALIVE = "POWER_TARGET_INVALID_NOT_ALIVE"
export const POWER_TARGET_INVALID_ALREADY_INVESTIGATED = "POWER_TARGET_INVALID_ALREADY_INVESTIGATED"
export type PowerTargetError =
  | typeof POWER_TARGET_INVALID_SELF
  | typeof POWER_TARGET_INVALID_NOT_ALIVE
  | typeof POWER_TARGET_INVALID_ALREADY_INVESTIGATED

/* R38: Investigate target must be alive, not the President, and never
   investigated before in this game. */
export function getInvestigateTargetError(
  targetId: PlayerId,
  presidentId: PlayerId,
  alivePlayers: ReadonlySet<PlayerId>,
  investigatedPlayerIds: ReadonlySet<PlayerId>,
): PowerTargetError | null {
  if (!alivePlayers.has(targetId)) {
    return POWER_TARGET_INVALID_NOT_ALIVE
  }
  if (targetId === presidentId) {
    return POWER_TARGET_INVALID_SELF
  }
  if (investigatedPlayerIds.has(targetId)) {
    return POWER_TARGET_INVALID_ALREADY_INVESTIGATED
  }
  return null
}

/* R39 (Special Election) and R41 (Execution) share the same target rule:
   any other living player. R39 explicitly allows term-limited players -
   true automatically since this check never consults term limits. */
export function getGenericPowerTargetError(
  targetId: PlayerId,
  presidentId: PlayerId,
  alivePlayers: ReadonlySet<PlayerId>,
): PowerTargetError | null {
  if (!alivePlayers.has(targetId)) {
    return POWER_TARGET_INVALID_NOT_ALIVE
  }
  if (targetId === presidentId) {
    return POWER_TARGET_INVALID_SELF
  }
  return null
}
