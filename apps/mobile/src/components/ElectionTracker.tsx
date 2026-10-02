/* R21/R22: 3 pips, Chaos at 3. Neutral accent colour - this tracker
   belongs to the whole table, not either team. */
import { StyleSheet, View } from "react-native"
import { colors, radii, spacing } from "@game/theme"

export interface ElectionTrackerProps {
  tracker: number
}

export function ElectionTracker({ tracker }: ElectionTrackerProps) {
  return (
    <View style={styles.row}>
      {[1, 2, 3].map((slot) => (
        <View key={slot} style={[styles.pip, slot <= tracker && styles.pipFilled]} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  pip: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  pipFilled: {
    backgroundColor: colors.accent,
  },
})
