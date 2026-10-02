/* R25: on a successful election, once 3 or more Fascist policies have
   been enacted, the Chancellor is checked. If the Chancellor is the
   Leader (Hitler-equivalent) the Fascists win immediately - this is the
   same win condition as R46, just triggered from the enactment side.
   Otherwise the Chancellor gets a public "Not Hitler" badge. Below 3
   Fascist policies, nothing happens. Invoked by the legislative flow
   (Step 4) right after a Fascist policy is enacted. */
import { ROLE_LEADER } from "./types.js"
import type { Role } from "./types.js"

export const GOVERNMENT_OUTCOME_NONE = "GOVERNMENT_OUTCOME_NONE"
export const GOVERNMENT_OUTCOME_FASCISTS_WIN = "GOVERNMENT_OUTCOME_FASCISTS_WIN"
export const GOVERNMENT_OUTCOME_NOT_HITLER_BADGE = "GOVERNMENT_OUTCOME_NOT_HITLER_BADGE"
export type GovernmentOutcome =
  | typeof GOVERNMENT_OUTCOME_NONE
  | typeof GOVERNMENT_OUTCOME_FASCISTS_WIN
  | typeof GOVERNMENT_OUTCOME_NOT_HITLER_BADGE

export const HITLER_CHANCELLOR_FASCIST_THRESHOLD = 3

export function checkHitlerChancellor(chancellorRole: Role, fascistPoliciesEnacted: number): GovernmentOutcome {
  if (fascistPoliciesEnacted < HITLER_CHANCELLOR_FASCIST_THRESHOLD) {
    return GOVERNMENT_OUTCOME_NONE
  }
  if (chancellorRole === ROLE_LEADER) {
    return GOVERNMENT_OUTCOME_FASCISTS_WIN
  }
  return GOVERNMENT_OUTCOME_NOT_HITLER_BADGE
}
