/* The 10 seat badges from spec Sec 4. One generic pill, tinted by
   kind - colour is never the only signal, so the word always renders
   too (never an icon-only badge). */
import { StyleSheet, Text, View } from "react-native"
import { badgeLabels, colors, fontFamily, fontSize, radii, spacing } from "@game/theme"
import type { BadgeKind } from "@game/theme"

export interface BadgeProps {
  kind: BadgeKind
}

const FILLED_KINDS = new Set<BadgeKind>(["host", "notHitler", "executed"])

function getFillColor(kind: BadgeKind): string {
  if (kind === "executed") {
    return colors.danger
  }
  if (kind === "notHitler") {
    return colors.success
  }
  return colors.accent
}

export function Badge({ kind }: BadgeProps) {
  const isFilled = FILLED_KINDS.has(kind)
  return (
    <View style={[styles.base, isFilled ? { backgroundColor: getFillColor(kind) } : styles.outline]}>
      <Text style={[styles.label, isFilled && styles.labelFilled]}>{badgeLabels[kind]}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.full,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.xs,
    color: colors.textOnDark,
  },
  labelFilled: {
    color: colors.ink,
    fontWeight: "600",
  },
})
