/* Test-only deterministic PRNG (mulberry32), mirroring
   packages/engine/src/testUtils.ts. tools/sim is itself test-only
   infrastructure (CLAUDE.md rule 8), so it keeps its own copy rather
   than reaching into another packages internal (non-exported) file. */
import type { RandomFn } from "@game/engine"

export function createSeededRandom(seed: number): RandomFn {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
