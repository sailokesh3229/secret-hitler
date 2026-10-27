import { afterEach, describe, expect, it, vi } from "vitest"
import { api } from "./api.js"

afterEach(() => vi.unstubAllGlobals())

describe("guest session request", () => {
  it("sends a JSON object so Fastify accepts the guest sign-in", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ token: "test-token" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(api.createGuestSession()).resolves.toEqual({ token: "test-token" })
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/auth/guest"), expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ "content-type": "application/json" }),
      body: "{}",
    }))
  })
})
