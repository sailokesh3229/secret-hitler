import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("react-native", () => ({ Platform: { OS: "web" }, Share: { share: vi.fn() } }))
vi.mock("expo-linking", () => ({ createURL: () => "secrethitler://join-room" }))

import { shareInvite } from "./invite.js"

afterEach(() => vi.unstubAllGlobals())

describe("room invites across web browsers", () => {
  it("uses native web sharing when the browser offers it", async () => {
    const share = vi.fn(async () => undefined)
    vi.stubGlobal("navigator", { share })
    expect(await shareInvite("ABC123")).toBe("shared")
    expect(share).toHaveBeenCalledOnce()
  })

  it("copies when Web Share is absent or refuses the request", async () => {
    const writeText = vi.fn(async () => undefined)
    vi.stubGlobal("navigator", { share: vi.fn(async () => { throw new TypeError("unsupported") }), clipboard: { writeText } })
    expect(await shareInvite("ABC123")).toBe("copied")
    expect(writeText).toHaveBeenCalledOnce()
  })

  it("copies through selected text when the Clipboard API is unavailable", async () => {
    const remove = vi.fn()
    const field = { value: "", readOnly: false, style: { position: "", opacity: "" }, focus: vi.fn(), select: vi.fn(), remove }
    const appendChild = vi.fn()
    const execCommand = vi.fn(() => true)
    vi.stubGlobal("navigator", {})
    vi.stubGlobal("document", { body: { appendChild }, createElement: () => field, execCommand })
    expect(await shareInvite("ABC123")).toBe("copied")
    expect(field.value).toContain("ABC123")
    expect(field.select).toHaveBeenCalledOnce()
    expect(execCommand).toHaveBeenCalledWith("copy")
    expect(remove).toHaveBeenCalledOnce()
  })

  it("does not report a cancelled share sheet as an error", async () => {
    vi.stubGlobal("navigator", { share: vi.fn(async () => { throw new DOMException("cancelled", "AbortError") }) })
    expect(await shareInvite("ABC123")).toBe("cancelled")
  })
})
