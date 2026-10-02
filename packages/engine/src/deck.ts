/* R4: policy deck is 6 Liberal + 11 Fascist tiles, shuffled with an
   injected secure random source (Fisher-Yates). */
import { POLICY_FASCIST, POLICY_LIBERAL } from "./types.js"
import type { Policy, RandomFn } from "./types.js"

export const LIBERAL_POLICY_COUNT = 6
export const FASCIST_POLICY_COUNT = 11

export function buildPolicyDeck(): Policy[] {
  const liberal = Array.from({ length: LIBERAL_POLICY_COUNT }, (): Policy => POLICY_LIBERAL)
  const fascist = Array.from({ length: FASCIST_POLICY_COUNT }, (): Policy => POLICY_FASCIST)
  return [...liberal, ...fascist]
}

/* Fisher-Yates. Pure: returns a new array, never mutates the input. */
export function shuffle<T>(items: readonly T[], random: RandomFn): T[] {
  const result = items.slice()
  let i = result.length - 1
  while (i > 0) {
    const j = Math.floor(random() * (i + 1))
    const temp = result[i]
    result[i] = result[j] as T
    result[j] = temp as T
    i -= 1
  }
  return result
}
