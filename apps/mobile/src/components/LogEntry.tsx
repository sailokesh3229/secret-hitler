/* Public round-by-round record (spec S18) - document font, since it
   reads like a log/dossier entry. Never shows hidden info (R31,
   discards etc stay out of this until game over). */
import { StyleSheet, Text, View } from "react-native"
import { colors, fontFamily, fontSize, spacing } from "@game/theme"

export interface LogEntryProps {
  text: string
}

export function LogEntry({ text }: LogEntryProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.text}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  text: {
    fontFamily: fontFamily.document,
    fontSize: fontSize.sm,
    color: colors.textOnDarkMuted,
  },
})
