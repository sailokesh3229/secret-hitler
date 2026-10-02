/* Seat: avatar + name + badges. Real illustrated portraits (spec Sec 9,
   set of 16) are not built yet - this placeholder avatar is a plain
   initial, swapped for real art without changing how this component
   is used. */
import { StyleSheet, Text, View } from "react-native"
import { colors, fontFamily, fontSize, radii, spacing } from "@game/theme"
import type { BadgeKind } from "@game/theme"
import { Badge } from "./Badge.js"

export interface SeatProps {
  name: string
  badges?: BadgeKind[]
}

export function Seat({ name, badges = [] }: SeatProps) {
  const initial = name.charAt(0).toUpperCase()
  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      <Text style={styles.name}>{name}</Text>
      {badges.length > 0 && (
        <View style={styles.badgeRow}>
          {badges.map((kind) => (
            <Badge key={kind} kind={kind} />
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: spacing.xs,
    width: 96,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: fontFamily.document,
    fontSize: fontSize.xl,
    color: colors.textOnDark,
  },
  name: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.sm,
    color: colors.textOnDark,
    textAlign: "center",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.xs,
  },
})
