/* Transient notification banner. */
import { StyleSheet, Text, View } from "react-native"
import { colors, fontFamily, fontSize, radii, spacing } from "@game/theme"

export interface ToastProps {
  text: string
  tone?: "neutral" | "success" | "danger"
}

export function Toast({ text, tone = "neutral" }: ToastProps) {
  return (
    <View style={[styles.toast, styles[tone]]}>
      <Text style={styles.text}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  toast: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.control,
    alignSelf: "center",
  },
  neutral: {
    backgroundColor: colors.surfaceRaised,
  },
  success: {
    backgroundColor: colors.success,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  text: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.sm,
    color: colors.textOnDark,
    textAlign: "center",
  },
})
