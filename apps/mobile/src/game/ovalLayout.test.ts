import { describe, expect, it } from "vitest"
import { ovalSeatSpots } from "./ovalLayout.js"

describe("S11 oval seating", () => {
  for (const count of [5, 6, 7, 8, 9, 10]) {
    it(`places ${count} seats inside the table bounds, all distinct`, () => {
      const spots = ovalSeatSpots(count, 340, 380, 96, 110)
      expect(spots).toHaveLength(count)
      for (const spot of spots) {
        expect(spot.left).toBeGreaterThanOrEqual(0)
        expect(spot.left).toBeLessThanOrEqual(340 - 96)
        expect(spot.top).toBeGreaterThanOrEqual(0)
        expect(spot.top).toBeLessThanOrEqual(380 - 110)
      }
      const keys = new Set(spots.map((spot) => `${Math.round(spot.left)},${Math.round(spot.top)}`))
      expect(keys.size).toBe(count)
    })
  }
  it("puts seat 0 at the top of the table", () => {
    const spots = ovalSeatSpots(6, 340, 380, 96, 110)
    const topMost = Math.min(...spots.map((spot) => spot.top))
    expect(spots[0]?.top).toBe(topMost)
  })
})
