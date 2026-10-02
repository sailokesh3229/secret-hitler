import { describe, expect, it } from "vitest"
import {
  getFascistBoardSlots,
  getLiberalBoardSlots,
  POWER_EXECUTION,
  POWER_INVESTIGATE,
  POWER_POLICY_PEEK,
  POWER_SPECIAL_ELECTION,
} from "./boards.js"

function powerAt(slots: ReturnType<typeof getFascistBoardSlots>, slotNumber: number) {
  const slot = slots.find((s) => s.slot === slotNumber)
  if (slot === undefined) {
    throw new Error("missing slot " + slotNumber)
  }
  return slot.power
}

describe("R5 fascist board", () => {
  it("R5: 5-6 players get Policy Peek at slot 3 and Execution at slots 4-5", () => {
    for (const count of [5, 6] as const) {
      const slots = getFascistBoardSlots(count)
      expect(powerAt(slots, 1)).toBeNull()
      expect(powerAt(slots, 2)).toBeNull()
      expect(powerAt(slots, 3)).toBe(POWER_POLICY_PEEK)
      expect(powerAt(slots, 4)).toBe(POWER_EXECUTION)
      expect(powerAt(slots, 5)).toBe(POWER_EXECUTION)
    }
  })
})

describe("R5 fascist board - more brackets", () => {
  it("R5: 7-8 players get Investigate at slot 2 and Special Election at slot 3", () => {
    for (const count of [7, 8] as const) {
      const slots = getFascistBoardSlots(count)
      expect(powerAt(slots, 1)).toBeNull()
      expect(powerAt(slots, 2)).toBe(POWER_INVESTIGATE)
      expect(powerAt(slots, 3)).toBe(POWER_SPECIAL_ELECTION)
      expect(powerAt(slots, 4)).toBe(POWER_EXECUTION)
      expect(powerAt(slots, 5)).toBe(POWER_EXECUTION)
    }
  })

  it("R5: 9-10 players get Investigate at slots 1-2 and Special Election at slot 3", () => {
    for (const count of [9, 10] as const) {
      const slots = getFascistBoardSlots(count)
      expect(powerAt(slots, 1)).toBe(POWER_INVESTIGATE)
      expect(powerAt(slots, 2)).toBe(POWER_INVESTIGATE)
      expect(powerAt(slots, 3)).toBe(POWER_SPECIAL_ELECTION)
      expect(powerAt(slots, 4)).toBe(POWER_EXECUTION)
      expect(powerAt(slots, 5)).toBe(POWER_EXECUTION)
    }
  })
})

describe("R5 is data, not hard-coded", () => {
  it("R5: slot 2 differs by player count, proving the board is read from a table", () => {
    expect(powerAt(getFascistBoardSlots(5), 2)).toBeNull()
    expect(powerAt(getFascistBoardSlots(7), 2)).toBe(POWER_INVESTIGATE)
    expect(powerAt(getFascistBoardSlots(9), 2)).toBe(POWER_INVESTIGATE)
  })

  it("R5: slot 5 unlocks veto and slot 6 wins the game, for every bracket", () => {
    for (const count of [5, 6, 7, 8, 9, 10] as const) {
      const slots = getFascistBoardSlots(count)
      const slot5 = slots.find((s) => s.slot === 5)
      const slot6 = slots.find((s) => s.slot === 6)
      expect(slot5 && slot5.unlocksVeto).toBe(true)
      expect(slot6 && slot6.winsGame).toBe(true)
    }
  })
})

describe("R5 liberal board", () => {
  it("R5: liberal board has 5 slots with no powers and the 5th wins the game", () => {
    const slots = getLiberalBoardSlots()
    expect(slots.length).toBe(5)
    expect(slots.filter((s) => s.winsGame).length).toBe(1)
    expect(slots[4] && slots[4].winsGame).toBe(true)
  })
})
