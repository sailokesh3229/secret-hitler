import { describe, expect, it } from "vitest"
import type { Phase, RandomFn } from "@game/engine"
import { SCENARIO_PHASES, newScenarioGame, playUntil } from "./autoplay.js"

function seeded(seed: number): RandomFn {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    return state / 0x80000000
  }
}

describe("scenario switcher reaches every phase (dev only)", () => {
  for (const count of [5, 6, 7, 8, 9, 10]) {
    for (const entry of SCENARIO_PHASES) {
      it(`opens ${entry.label} for ${count} players`, () => {
        const ids = Array.from({ length: count }, (_, index) => "P" + index)
        const random = seeded(count * 97 + entry.label.length)
        const reached = playUntil(newScenarioGame(ids, random), entry.value, ids[0] as string, random)
        expect(reached?.phase).toBe<Phase>(entry.phase)
      })
    }
  }
})
