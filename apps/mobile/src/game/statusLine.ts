/* The one line under the table that says what is happening and who must
   act (spec Sec 4 S11). Built from the viewer's projection only. */
import { PHASE_AWAIT_HOST_REVEAL, PHASE_CHANCELLOR_POLICIES, PHASE_GAME_OVER, PHASE_NOMINATION, PHASE_PRESIDENT_POLICIES, PHASE_PRESIDENTIAL_POWER, PHASE_VETO_RESPONSE, PHASE_VOTING, type PlayerId, type PlayerView } from "@game/engine"
import { gameCopy, powerNames } from "@game/theme"
import type { PowerToken } from "@game/theme"

export function statusLineFor(view: PlayerView, names: Record<PlayerId, string>, revealerId: PlayerId | null): string {
  const name = (id: PlayerId | null): string => (id === null ? "" : names[id] ?? id)
  const isPresident = view.viewerId === view.presidentId
  const isChancellor = view.viewerId === view.chancellorNomineeId

  switch (view.phase) {
    case PHASE_NOMINATION:
      return isPresident ? gameCopy.statusYourNomination : gameCopy.statusNominating(name(view.presidentId))
    case PHASE_VOTING:
      return view.votedPlayerIds.includes(view.viewerId)
        ? gameCopy.voteCast
        : gameCopy.statusVoting
    case PHASE_AWAIT_HOST_REVEAL:
      if (revealerId === null) return gameCopy.statusRevealing
      return revealerId === view.viewerId ? gameCopy.yourReveal : gameCopy.waitingForReveal(name(revealerId))
    case PHASE_PRESIDENT_POLICIES:
      return isPresident ? gameCopy.presidentSub : gameCopy.statusDiscarding(name(view.presidentId))
    case PHASE_CHANCELLOR_POLICIES:
      return isChancellor ? gameCopy.chancellorSub : gameCopy.statusEnacting(name(view.chancellorNomineeId))
    case PHASE_VETO_RESPONSE:
      return isPresident ? gameCopy.vetoAskTitle(name(view.chancellorNomineeId)) : gameCopy.statusVetoAnswer(name(view.presidentId))
    case PHASE_PRESIDENTIAL_POWER: {
      const power = view.pendingPower === null ? "" : powerNames[view.pendingPower as PowerToken]
      return gameCopy.statusPower(name(view.presidentId), power)
    }
    case PHASE_GAME_OVER:
      return gameCopy.statusGameOver
  }
}
