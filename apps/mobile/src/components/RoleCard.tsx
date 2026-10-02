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
      <Emblem team={team} size={48} />
      <Text style={styles.teamHeading}>{teamNames[team]}</Text>
      <Text style={styles.roleLabel}>{roleNames[role]}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    width: 220,
    height: 280,
    borderRadius: radii.control,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
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
