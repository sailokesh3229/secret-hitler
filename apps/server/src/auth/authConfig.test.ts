import { describe, expect, it } from "vitest"
import { chooseAuth } from "../index.js"

describe("public auth configuration", () => {
  it("issues signed guest sessions when Firebase is not configured", async () => {
    const auth = chooseAuth({})
    const token = auth.issueGuestToken?.()
    expect(token).toBeTruthy()
    expect((await auth.verifier.verify(token ?? ""))?.provider).toBe("guest")
    expect(await auth.verifier.verify("dev:Host")).toBeNull()
  })

  it("allows the temporary guest route to be disabled explicitly", async () => {
    const auth = chooseAuth({ ALLOW_GUEST_LOGIN: "false" })
    expect(auth.issueGuestToken).toBeUndefined()
    expect(await auth.verifier.verify("dev:Host")).toBeNull()
  })
})
