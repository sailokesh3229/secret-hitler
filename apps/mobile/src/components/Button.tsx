/* Buttons name the action exactly (CLAUDE.md copy rule). Touch target
   is >= 44pt (spec Sec 9 fixed rule) regardless of label length. */
import { Pressable, StyleSheet, Text, View } from "react-native"
import { colors, fontFamily, fontSize, radii, spacing } from "@game/theme"

export type ButtonVariant = "primary" | "secondary"

export interface ButtonProps {
  label: string
  variant?: ButtonVariant
  disabled?: boolean
  compact?: boolean
  onPress?: () => void
}

export function Button({ label, variant = "primary", disabled = false, compact = false, onPress }: ButtonProps) {
  const isSecondary = variant === "secondary"
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        isSecondary ? styles.secondary : styles.primary,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View style={[styles.edge, isSecondary && styles.edgeSecondary, disabled && styles.edgeDisabled]} />
      <Text style={[styles.label, compact && styles.compactLabel, isSecondary && styles.labelSecondary, disabled && styles.labelDisabled]}>
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.control,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    borderWidth: 1,
    shadowColor: colors.accent,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  primary: {
    backgroundColor: colors.paper,
    borderColor: colors.accent,
  },
  compact: { minHeight: 46, paddingHorizontal: spacing.md },
  compactLabel: { fontSize: fontSize.sm },
  secondary: {
    backgroundColor: colors.glass,
    borderColor: colors.border,
  },
  disabled: {
    backgroundColor: colors.disabled,
    borderColor: colors.disabled,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  edge: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accentPressed },
  edgeSecondary: { backgroundColor: colors.accent },
  edgeDisabled: { backgroundColor: colors.disabledText },
  label: {
    fontFamily: fontFamily.interfaceSemiBold,
    fontSize: fontSize.md,
    color: colors.ink,
    letterSpacing: 0.4,
  },
  labelSecondary: {
    color: colors.accent,
  },
  labelDisabled: {
    color: colors.disabledText,
  },
})
