import { describe, expect, it } from "vitest"
import { colors } from "./colors.js"
import { fontFamily } from "./typography.js"
import { radii } from "./radii.js"
import { roleNames, teamNames, voteLabels } from "./strings.js"

describe("spec Sec 9 defaults", () => {
  it("background is the owner-chosen walnut tone, not the green baize default (Review 1)", () => {
    expect(colors.background).toBe("#1C1714")
  })

  it("accent is the brass default", () => {
    expect(colors.accent).toBe("#C29A4B")
  })

  it("Liberal and Fascist use distinct, spec-default colours", () => {
    expect(colors.liberal).toBe("#3A6EA5")
    expect(colors.fascist).toBe("#9B2F24")
    expect(colors.liberal).not.toBe(colors.fascist)
  })

  it("fonts match the brief: Jost interface, Libre Caslon Text documents", () => {
    expect(fontFamily.interface).toBe("Jost")
    expect(fontFamily.document).toBe("Libre Caslon Text")
  })

  it("corner radii match the brief: tiles 10pt, controls 14pt", () => {
    expect(radii.tile).toBe(10)
    expect(radii.control).toBe(14)
  })

  it("team colour is never the only signal - a word label exists for every team and role", () => {
    expect(teamNames.TEAM_LIBERAL).toBeTruthy()
    expect(teamNames.TEAM_FASCIST).toBeTruthy()
    expect(roleNames.ROLE_LEADER).toBeTruthy()
  })

  it("Yes and No vote labels are plain English and distinct (Review 1)", () => {
    expect(voteLabels.VOTE_YES).toBe("Yes")
    expect(voteLabels.VOTE_NO).toBe("No")
  })
})
