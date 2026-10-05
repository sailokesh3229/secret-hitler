import { describe, expect, it } from "vitest"
import { createInitialGameState, POLICY_FASCIST } from "@game/engine"
import { deserializeState, serializeState } from "./serialize.js"

describe("restart recovery: game state survives serialization (plan Step 11)", () => {
  it("restores Maps and Sets exactly", () => {
    const random = () => 0.42
    const state = createInitialGameState(["a", "b", "c", "d", "e"], "a", random)
    const copy = deserializeState<typeof state>(serializeState(state))
    expect(copy.roles).toEqual(state.roles)
    expect(copy.alivePlayers).toEqual(state.alivePlayers)
    expect(copy.drawPile).toEqual(state.drawPile)
    expect(copy.drawPile.includes(POLICY_FASCIST) || copy.drawPile.length > 0).toBe(true)
  })
})
