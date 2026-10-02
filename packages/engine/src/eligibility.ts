/* R13: a Chancellor nominee must be alive, not the President, not the last
   elected Chancellor, and not the last elected President. R14: with 5 or
   fewer players alive, only the last Chancellor is blocked - the last
   President may be nominated again. R15: term limits are set only from a
   successfully ELECTED government (see recordElectedGovernment below),
   never from a failed nomination or vote. R16: Chaos clears them. */
import type { PlayerId } from "./types.js"

export const INELIGIBLE_NOT_ALIVE = "INELIGIBLE_NOT_ALIVE"
export const INELIGIBLE_IS_PRESIDENT = "INELIGIBLE_IS_PRESIDENT"
export const INELIGIBLE_LAST_CHANCELLOR = "INELIGIBLE_LAST_CHANCELLOR"
export const INELIGIBLE_LAST_PRESIDENT = "INELIGIBLE_LAST_PRESIDENT"
export type IneligibilityReason =
  | typeof INELIGIBLE_NOT_ALIVE
  | typeof INELIGIBLE_IS_PRESIDENT
  | typeof INELIGIBLE_LAST_CHANCELLOR
  | typeof INELIGIBLE_LAST_PRESIDENT

export interface EligibilityCheck {
  eligible: boolean
  reason: IneligibilityReason | null
}

export function getChancellorEligibility(
  candidateId: PlayerId,
  presidentId: PlayerId,
  alivePlayers: ReadonlySet<PlayerId>,
  lastElectedPresidentId: PlayerId | null,
  lastElectedChancellorId: PlayerId | null,
): EligibilityCheck {
  if (!alivePlayers.has(candidateId)) {
    return { eligible: false, reason: INELIGIBLE_NOT_ALIVE }
  }
  if (candidateId === presidentId) {
    return { eligible: false, reason: INELIGIBLE_IS_PRESIDENT }
  }
  if (candidateId === lastElectedChancellorId) {
    return { eligible: false, reason: INELIGIBLE_LAST_CHANCELLOR }
  }
  const lastPresidentIsBlocked = alivePlayers.size > 5
  if (lastPresidentIsBlocked && candidateId === lastElectedPresidentId) {
    return { eligible: false, reason: INELIGIBLE_LAST_PRESIDENT }
  }
  return { eligible: true, reason: null }
}

export interface TermLimits {
  lastElectedPresidentId: PlayerId | null
  lastElectedChancellorId: PlayerId | null
}

/* R15: call this only after a vote SUCCEEDS. A failed vote must never
   touch term limits - the caller enforces that by only calling this on
   the elected branch. R15 also notes a later veto does not undo it. */
export function recordElectedGovernment(presidentId: PlayerId, chancellorId: PlayerId): TermLimits {
  return { lastElectedPresidentId: presidentId, lastElectedChancellorId: chancellorId }
}

/* R16: Chaos clears term limits. */
export function clearTermLimits(): TermLimits {
  return { lastElectedPresidentId: null, lastElectedChancellorId: null }
}
