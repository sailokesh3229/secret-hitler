/* Who may send which action. The reducer checks the phase and the rule
   inputs; this checks the ACTOR (spec Sec 13: "every action is validated
   (phase, actor, target)"). Shared by the local test table (Step 8) and
   the server (Step 11), so the rule lives in one place. Returns a neutral
   error code, or null when the actor is allowed. */
import { getChancellorEligibility } from "./eligibility.js"
import { hasPlayerVoted } from "./voting.js"
import type { GameState } from "./state.js"
import type { PlayerId, Vote } from "./types.js"

export type GameAction =
  | { type: "nominate"; targetId: PlayerId }
  | { type: "vote"; vote: Vote }
  | { type: "closeVoting" }
  | { type: "reveal" }
  | { type: "discard"; tileIndex: number }
  | { type: "enact"; tileIndex: number }
  | { type: "vetoRequest" }
  | { type: "vetoRespond"; agree: boolean }
  | { type: "powerChoose"; targetId: PlayerId }
  | { type: "peekDone" }

export const ACTOR_NOT_SEATED = "ACTOR_NOT_SEATED"
export const ACTOR_NOT_ALIVE = "ACTOR_NOT_ALIVE"
export const ACTOR_NOT_PRESIDENT = "ACTOR_NOT_PRESIDENT"
export const ACTOR_NOT_CHANCELLOR = "ACTOR_NOT_CHANCELLOR"
export const ACTOR_ALREADY_VOTED = "ACTOR_ALREADY_VOTED"

export type ActorError =
  | typeof ACTOR_NOT_SEATED
  | typeof ACTOR_NOT_ALIVE
  | typeof ACTOR_NOT_PRESIDENT
  | typeof ACTOR_NOT_CHANCELLOR
  | typeof ACTOR_ALREADY_VOTED
  | "INELIGIBLE_NOMINEE"

export function actorError(state: GameState, actorId: PlayerId, action: GameAction): ActorError | null {
  if (!state.playerIds.includes(actorId)) {
    return ACTOR_NOT_SEATED
  }
  if (!state.alivePlayers.has(actorId)) {
    return ACTOR_NOT_ALIVE
  }
  switch (action.type) {
    case "nominate": {
      if (actorId !== state.presidentId) {
        return ACTOR_NOT_PRESIDENT
      }
      const check = getChancellorEligibility(
        action.targetId,
        state.presidentId,
        state.alivePlayers,
        state.lastElectedPresidentId,
        state.lastElectedChancellorId,
      )
      return check.eligible ? null : "INELIGIBLE_NOMINEE"
    }
    case "vote":
      return hasPlayerVoted(state.votingState, actorId) ? ACTOR_ALREADY_VOTED : null
    case "discard":
    case "powerChoose":
    case "peekDone":
    case "vetoRespond":
      return actorId === state.presidentId ? null : ACTOR_NOT_PRESIDENT
    case "enact":
    case "vetoRequest":
      return actorId === state.chancellorNomineeId ? null : ACTOR_NOT_CHANCELLOR
    case "closeVoting":
    case "reveal":
      return null
  }
}
