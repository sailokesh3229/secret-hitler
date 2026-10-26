/* CLAUDE.md rule 7 (no tells): Liberal, Fascist and Hitler use the
   exact same layout, size and position for every element. Review 1
   design feedback (docs/design-feedback.md): the heading is always
   the TEAM (party membership, R3), the specific role is the small
   line underneath - so Hitlers card reads "Fascist" (big) / "Hitler"
   (small), and never reveals the identity at a glance. Liberal and
   Fascist cards show the same word twice by the same rule - that
   redundancy is what keeps Hitlers card unreadable among them.
   Driven by partyMembership (R3) from @game/engine so the Role to
   Team mapping is never duplicated. Document font (spec Sec 9).
   Hold-to-reveal gesture is built in Step 7, not here. */
import { StyleSheet, Text, View } from "react-native"
import { partyMembership } from "@game/engine"
import { colors, fontFamily, fontSize, radii, roleNames, spacing, teamNames } from "@game/theme"
import type { RoleToken } from "@game/theme"
import { Emblem } from "./Emblem.js"

export interface RoleCardProps {
  role: RoleToken
}

export function RoleCard({ role }: RoleCardProps) {
  const team = partyMembership(role)
  return (
    <View style={styles.card}>
      <View style={styles.inset} />
      <Emblem team={team} size={56} />
      <Text style={styles.teamHeading}>{teamNames[team]}</Text>
      <View style={styles.rule} />
      <Text style={styles.roleLabel}>{roleNames[role]}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    width: 236,
    height: 300,
    borderRadius: radii.control,
    backgroundColor: colors.paper,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.lg,
    shadowColor: colors.background,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
  },
  inset: { position: "absolute", top: 9, right: 9, bottom: 9, left: 9, borderWidth: 1, borderColor: colors.borderOnPaper, borderRadius: radii.tile },
  rule: { width: 54, height: 1, backgroundColor: colors.borderOnPaper },
  teamHeading: {
    fontFamily: fontFamily.documentBold,
    fontSize: fontSize.xxl,
    color: colors.ink,
  },
  roleLabel: {
    fontFamily: fontFamily.document,
    fontSize: fontSize.md,
    color: colors.ink,
  },
})
