/* Turns one accepted action into public log lines (spec Sec 4 S18). Only
   public facts go in: who nominated whom, who voted (not how), the
   revealed tally, enacted policy colour (not the cards), powers used,
   and the result. Hidden information never reaches this function. */
import { PHASE_GAME_OVER, POWER_EXECUTION, POWER_INVESTIGATE, POWER_SPECIAL_ELECTION, TEAM_LIBERAL, type GameAction, type GameState, type PlayerId } from "@game/engine"
import { gameCopy, logCopy, teamNames, winReasonCopy, type TeamToken } from "@game/theme"
import type { RevealSnapshot } from "./store.js"

export interface LogLine {
  text: string
}

const FAILED_LIMIT = 3

export function describeTransition(
  prev: GameState,
  next: GameState,
  actorId: PlayerId,
  action: GameAction,
  names: Record<PlayerId, string>,
  reveal: RevealSnapshot | null,
): LogLine[] {
  const name = (id: PlayerId | null): string => (id === null ? "" : names[id] ?? id)
  const lines: string[] = []

  switch (action.type) {
    case "nominate":
      lines.push(logCopy.nominated(name(prev.presidentId), name(action.targetId)))
      break
    case "vote":
      lines.push(logCopy.voted(name(actorId)))
      break
    case "closeVoting":
      lines.push(logCopy.votingClosed)
      break
    case "reveal":
      if (reveal) {
        lines.push(
          reveal.elected
            ? gameCopy.revealedElected(reveal.yes, reveal.no)
            : gameCopy.revealedRejected(reveal.yes, reveal.no, prev.electionTracker + 1, FAILED_LIMIT),
        )
      }
      break
    case "enact":
      lines.push(next.liberalPoliciesEnacted > prev.liberalPoliciesEnacted ? logCopy.enactedLiberal : logCopy.enactedFascist)
      break
    case "vetoRequest":
      lines.push(logCopy.vetoRequested(name(actorId)))
      break
    case "vetoRespond":
      lines.push(action.agree ? logCopy.vetoAgreed : logCopy.vetoRefused)
      break
    case "powerChoose":
      if (prev.pendingPower === POWER_INVESTIGATE) {
        lines.push(logCopy.investigated(name(prev.presidentId), name(action.targetId)))
      } else if (prev.pendingPower === POWER_SPECIAL_ELECTION) {
        lines.push(logCopy.specialElection(name(action.targetId)))
      } else if (prev.pendingPower === POWER_EXECUTION) {
        lines.push(logCopy.executed(name(action.targetId)))
      }
      break
    case "peekDone":
      lines.push(logCopy.peeked(name(prev.presidentId)))
      break
    case "discard":
      break
  }

  const failedElection =
    (action.type === "reveal" && reveal !== null && !reveal.elected) || (action.type === "vetoRespond" && action.agree)
  const chaosHappened = failedElection && prev.electionTracker === FAILED_LIMIT - 1 && next.electionTracker === 0
  if (chaosHappened) {
    lines.push(logCopy.chaos)
  }

  if (next.phase === PHASE_GAME_OVER && next.winner !== null && next.winReason !== null) {
    const team: TeamToken = next.winner === TEAM_LIBERAL ? "TEAM_LIBERAL" : "TEAM_FASCIST"
    lines.push(logCopy.gameOver(teamNames[team], winReasonCopy[next.winReason]))
  }

  return lines.map((text) => ({ text }))
}
