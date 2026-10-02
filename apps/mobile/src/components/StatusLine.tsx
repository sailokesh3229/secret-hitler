/* Always says what is happening and who must act (spec Sec 4). */
import { StyleSheet, Text, View } from "react-native"
import { colors, fontFamily, fontSize, radii, spacing } from "@game/theme"

export interface StatusLineProps {
  text: string
}

export function StatusLine({ text }: StatusLineProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceRecessed,
    borderRadius: radii.full,
  },
  text: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.sm,
    color: colors.textOnDark,
    textAlign: "center",
  },
})
