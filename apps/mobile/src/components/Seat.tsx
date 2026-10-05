/* Seat: avatar + name + badges. Review 1 design feedback: each player
   gets an app-assigned Avatar, not a plain initial (see Avatar.tsx
   for why it is deliberately team-colour-free). */
import { StyleSheet, Text, View } from "react-native"
import { colors, fontFamily, fontSize, spacing } from "@game/theme"
import type { BadgeKind } from "@game/theme"
import { Avatar } from "./Avatar.js"
import { Badge } from "./Badge.js"

export interface SeatProps {
  name: string
  badges?: BadgeKind[]
  compact?: boolean
}

export function Seat({ name, badges = [], compact = false }: SeatProps) {
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <Avatar name={name} size={compact ? 40 : 56} />
      <Text style={[styles.name, compact && styles.compactName]} numberOfLines={1}>
        {name}
      </Text>
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
  compact: {
    width: 70,
  },
  compactName: {
    fontSize: fontSize.xs,
  },
  container: {
    alignItems: "center",
    gap: spacing.xs,
    width: 96,
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
