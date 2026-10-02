/* 5 slots, no powers (R5). The winning slot is read from
   getLiberalBoardSlots(), never hard-coded as "the 5th" - CLAUDE.md
   rule 4 (boards are data) applies to the UI too, not just the
   engine. */
import { StyleSheet, Text, View } from "react-native"
import { getLiberalBoardSlots } from "@game/engine"
import { colors, fontFamily, fontSize, radii, spacing } from "@game/theme"

export interface LiberalTrackProps {
  enactedCount: number
}

export function LiberalTrack({ enactedCount }: LiberalTrackProps) {
  const slots = getLiberalBoardSlots()
  return (
    <View style={styles.row}>
      {slots.map((slot) => {
        const filled = slot.slot <= enactedCount
        return (
          <View key={slot.slot} style={[styles.pip, filled && styles.pipFilled]}>
            {slot.winsGame && <Text style={styles.winLabel}>Win</Text>}
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  pip: {
    width: 44,
    height: 44,
    borderRadius: radii.tile,
    borderWidth: 2,
    borderColor: colors.liberal,
    alignItems: "center",
    justifyContent: "center",
  },
  pipFilled: {
    backgroundColor: colors.liberal,
  },
  winLabel: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.xs,
    color: colors.textOnDark,
  },
})
