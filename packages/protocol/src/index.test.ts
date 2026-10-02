import { describe, it, expect } from "vitest"
import { pingSchema } from "./index.js"

describe("scaffold", () => {
  it("Step 1: protocol package validates a schema with zod", () => {
    expect(pingSchema.parse({ type: "ping" })).toEqual({ type: "ping" })
  })
})
