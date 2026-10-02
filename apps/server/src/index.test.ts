import { describe, it, expect } from "vitest"
import { buildServer } from "./index.js"

describe("scaffold", () => {
  it("Step 1: GET /health returns status ok", async () => {
    const app = buildServer()
    const response = await app.inject({ method: "GET", url: "/health" })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: "ok" })
    await app.close()
  })
})
