/* CLAUDE.md rule 7 (no tells): Liberal, Fascist and Hitler use the
   exact same layout, size and position for every element - only the
   two text strings and the emblem colour/shape differ, driven by
   partyMembership (R3) from @game/engine so the Role to Team mapping
   is never duplicated. Document font (spec Sec 9) for the role card.
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
      <Text style={styles.roleName}>{roleNames[role]}</Text>
      <Text style={styles.teamLabel}>Team: {teamNames[team]}</Text>
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
  roleName: {
    fontFamily: fontFamily.documentBold,
    fontSize: fontSize.xxl,
    color: colors.ink,
  },
  teamLabel: {
    fontFamily: fontFamily.document,
    fontSize: fontSize.md,
    color: colors.ink,
  },
})
