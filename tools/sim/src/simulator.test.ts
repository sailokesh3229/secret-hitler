/* Step 4 check: the simulator plays 10,000 random-but-legal games for
   every player count (5-10) and every one must finish with a valid
   winner. Each count gets its own seed range so failures are
   reproducible. */
import { describe, expect, it } from "vitest"
import { playRandomGame } from "./simulator.js"
import { createSeededRandom } from "./testUtils.js"
import { PHASE_GAME_OVER, TEAM_FASCIST, TEAM_LIBERAL } from "@game/engine"
import type { PlayerCount } from "@game/engine"

const PLAYER_COUNTS: PlayerCount[] = [5, 6, 7, 8, 9, 10]
const GAMES_PER_COUNT = 10000

describe("simulator", () => {
  for (const playerCount of PLAYER_COUNTS) {
    it("plays " + GAMES_PER_COUNT + " random legal games for " + playerCount + " players, every one reaching a valid winner", () => {
      let game = 0
      while (game < GAMES_PER_COUNT) {
        const seed = playerCount * 1000000 + game
        const state = playRandomGame(playerCount, createSeededRandom(seed))
        expect(state.phase).toBe(PHASE_GAME_OVER)
        const validTeams = [TEAM_LIBERAL, TEAM_FASCIST]
        expect(validTeams).toContain(state.winner)
        expect(state.winReason).not.toBeNull()
        game += 1
      }
    }, 60000)
  }
})
