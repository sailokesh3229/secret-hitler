import { describe, expect, it } from "vitest"
import { createMemoryUserRepository } from "./userRepository.js"

describe("temporary in-memory accounts", () => {
  it("never reuses a player ID after an account is deleted", async () => {
    const users = createMemoryUserRepository()
    const first = await users.createUser({ username: "First", provider: "firebase", providerUid: "first" })
    const second = await users.createUser({ username: "Second", provider: "firebase", providerUid: "second" })
    await users.deleteUser(first.id)
    const third = await users.createUser({ username: "Third", provider: "firebase", providerUid: "third" })
    expect(new Set([first.id, second.id, third.id]).size).toBe(3)
    expect((await users.findByIdentity("firebase", "second"))?.id).toBe(second.id)
  })
})
