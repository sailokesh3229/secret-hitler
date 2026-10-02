/* Buttons name the action exactly (CLAUDE.md copy rule). Touch target
   is >= 44pt (spec Sec 9 fixed rule) regardless of label length. */
import { Pressable, StyleSheet, Text } from "react-native"
import { colors, fontFamily, fontSize, radii, spacing } from "@game/theme"

export type ButtonVariant = "primary" | "secondary"

export interface ButtonProps {
  label: string
  variant?: ButtonVariant
  disabled?: boolean
  onPress?: () => void
}

export function Button({ label, variant = "primary", disabled = false, onPress }: ButtonProps) {
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
        isSecondary ? styles.secondary : styles.primary,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.label, isSecondary && styles.labelSecondary, disabled && styles.labelDisabled]}>
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.control,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: colors.accent,
  },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: colors.accent,
  },
  disabled: {
    backgroundColor: colors.disabled,
    borderColor: colors.disabled,
  },
  pressed: {
    opacity: 0.8,
  },
  label: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.ink,
  },
  labelSecondary: {
    color: colors.accent,
  },
  labelDisabled: {
    color: colors.disabledText,
  },
})
