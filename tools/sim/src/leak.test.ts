/* Step 4 check: asserts no projectView for any player, at any point in
   many real games, ever contains a secret that spec Sec 8 does not
   allow that player to see. Fewer games than the completion check
   above (2000 per player count, not 10,000) because this checks EVERY
   step of EVERY game for EVERY player, not just the final result -
   still thousands of state/viewer combinations per player count. */
import { describe, expect, it } from "vitest"
import { playRandomGame } from "./simulator.js"
import { createSeededRandom } from "./testUtils.js"
import { PHASE_GAME_OVER, projectView, ROLE_LIBERAL } from "@game/engine"
import type { GameState, PlayerCount } from "@game/engine"

function assertNoLeaks(state: GameState): void {
  for (const viewerId of state.playerIds) {
    const view = projectView(state, viewerId)

    if (view.ownRole !== state.roles.get(viewerId)) {
      throw new Error("LEAK: " + viewerId + " was shown the wrong own role")
    }

    if (state.phase !== PHASE_GAME_OVER && view.gameOverReveal !== null) {
      throw new Error("LEAK: " + viewerId + " saw the game-over reveal before the game ended")
    }

    const holdsPresidentHand = viewerId === state.presidentId && state.presidentHand !== null
    const holdsChancellorHand = viewerId === state.chancellorNomineeId && state.chancellorHand !== null
    if (!holdsPresidentHand && !holdsChancellorHand && view.myHand !== null) {
      throw new Error("LEAK: " + viewerId + " was shown a hand they are not holding")
    }

    const ownedInvestigations = state.investigations.filter((inv) => inv.investigatorId === viewerId)
    if (view.myInvestigationResults.length !== ownedInvestigations.length) {
      throw new Error("LEAK: " + viewerId + " saw the wrong number of investigation results")
    }

    const isCurrentPresident = viewerId === state.presidentId
    if (!isCurrentPresident && view.myPeekedPolicies !== null) {
      throw new Error("LEAK: " + viewerId + " saw peeked policies without being the peeking President")
    }

    if (state.roles.get(viewerId) === ROLE_LIBERAL && view.knownTeammates.length !== 0) {
      throw new Error("LEAK: Liberal " + viewerId + " was shown teammates")
    }
  }
}

const PLAYER_COUNTS: PlayerCount[] = [5, 6, 7, 8, 9, 10]
const GAMES_PER_COUNT = 2000

describe("leak test", () => {
  for (const playerCount of PLAYER_COUNTS) {
    it("no projectView ever leaks a secret, across " + GAMES_PER_COUNT + " games for " + playerCount + " players", () => {
      let game = 0
      let gameOverChecked = false
      while (game < GAMES_PER_COUNT) {
        const seed = playerCount * 2000000 + game
        const finalState = playRandomGame(playerCount, createSeededRandom(seed), assertNoLeaks)
        if (finalState.phase === PHASE_GAME_OVER) {
          gameOverChecked = true
        }
        game += 1
      }
      expect(gameOverChecked).toBe(true)
    }, 60000)
  }
})
