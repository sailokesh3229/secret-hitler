/* Round phases, matching spec Sec 5.9 state diagram. RoleReveal is a
   client-acknowledgment flow with no rule consequence, so the engine
   state machine starts straight at Nomination. Chaos has no player
   action, so it resolves instantly inside revealVotes/vetoRespond rather
   than being a phase a client ever sits in. */
export const PHASE_NOMINATION = "PHASE_NOMINATION"
export const PHASE_VOTING = "PHASE_VOTING"
export const PHASE_AWAIT_HOST_REVEAL = "PHASE_AWAIT_HOST_REVEAL"
export const PHASE_PRESIDENT_POLICIES = "PHASE_PRESIDENT_POLICIES"
export const PHASE_CHANCELLOR_POLICIES = "PHASE_CHANCELLOR_POLICIES"
export const PHASE_VETO_RESPONSE = "PHASE_VETO_RESPONSE"
export const PHASE_PRESIDENTIAL_POWER = "PHASE_PRESIDENTIAL_POWER"
export const PHASE_GAME_OVER = "PHASE_GAME_OVER"
export type Phase =
  | typeof PHASE_NOMINATION
  | typeof PHASE_VOTING
  | typeof PHASE_AWAIT_HOST_REVEAL
  | typeof PHASE_PRESIDENT_POLICIES
  | typeof PHASE_CHANCELLOR_POLICIES
  | typeof PHASE_VETO_RESPONSE
  | typeof PHASE_PRESIDENTIAL_POWER
  | typeof PHASE_GAME_OVER
