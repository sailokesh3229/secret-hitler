/* Public game events from the server as readable log lines (spec Sec 4 S18).
   Uses the same wording as the local log (logCopy), so a server game and a
   local test table read the same. */
import { gameCopy, logCopy, teamNames, winReasonCopy, type TeamToken } from "@game/theme"

const POLICY_LIBERAL_TOKEN = "POLICY_LIBERAL"

export interface PublicEventLike {
  seq: number
  kind: string
  actorId?: string
  targetId?: string
  enacted?: string
  reveal?: { votes: Record<string, string>; yes: number; no: number; elected: boolean; failedCount: number }
  chaosPolicy?: string
  winner?: string
  winReason?: string
}

export function describePublicEvent(event: PublicEventLike, names: Record<string, string>): string | null {
  const name = (id: string | undefined): string => (id === undefined ? "" : names[id] ?? id)
  switch (event.kind) {
    case "NOMINATED":
      return logCopy.nominated(name(event.actorId), name(event.targetId))
    case "VOTED":
      return logCopy.voted(name(event.actorId))
    case "VOTING_CLOSED":
      return logCopy.votingClosed
    case "REVEALED":
      return event.reveal?.elected
        ? gameCopy.revealedElected(event.reveal.yes, event.reveal.no)
        : gameCopy.revealedRejected(event.reveal?.yes ?? 0, event.reveal?.no ?? 0, event.reveal?.failedCount ?? 0, 3)
    case "ENACTED":
      return event.enacted === POLICY_LIBERAL_TOKEN ? logCopy.enactedLiberal : logCopy.enactedFascist
    case "VETO_REQUESTED":
      return logCopy.vetoRequested(name(event.actorId))
    case "VETO_AGREED":
      return logCopy.vetoAgreed
    case "VETO_REFUSED":
      return logCopy.vetoRefused
    case "INVESTIGATED":
      return logCopy.investigated(name(event.actorId), name(event.targetId))
    case "SPECIAL_ELECTION":
      return logCopy.specialElection(name(event.targetId))
    case "EXECUTED":
      return logCopy.executed(name(event.targetId))
    case "PEEKED":
      return logCopy.peeked(name(event.actorId))
    case "CHAOS":
      return logCopy.chaos
    case "GAME_OVER": {
      const team = teamNames[(event.winner ?? "TEAM_FASCIST") as TeamToken]
      const reason = winReasonCopy[(event.winReason ?? "WIN_REASON_FASCIST_POLICIES") as keyof typeof winReasonCopy]
      return logCopy.gameOver(team, reason)
    }
    default:
      return null
  }
}
