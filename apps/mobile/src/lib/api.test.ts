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

describe("bodyless game actions", () => {
  it("omits JSON Content-Type when starting a room or deleting an account", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    await api.startRoom("ABC123")
    await api.leaveRoom("ABC123")
    await api.getRoom("ABC123")

    for (const [, options] of fetchMock.mock.calls as [string, RequestInit][]) {
      expect(options.body).toBeUndefined()
      expect(options.headers).not.toHaveProperty("content-type")
    }
  })
})
