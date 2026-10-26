/* 5 slots, no powers (R5). The winning slot is read from
   getLiberalBoardSlots(), never hard-coded as "the 5th" - CLAUDE.md
   rule 4 (boards are data) applies to the UI too, not just the
   engine. */
import { StyleSheet, Text, View } from "react-native"
import { getLiberalBoardSlots } from "@game/engine"
import { boardMarkers, colors, fontFamily, fontSize, radii, spacing } from "@game/theme"

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
            <View style={[styles.inset, filled && styles.insetFilled]} />
            {slot.winsGame && <Text style={styles.winLabel}>{boardMarkers.win}</Text>}
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.xs,
    width: "100%",
    maxWidth: 450,
    padding: spacing.sm,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.liberalDark,
    backgroundColor: colors.surfaceRecessed,
  },
  pip: {
    flex: 1,
    minWidth: 0,
    height: 54,
    borderRadius: radii.tile,
    borderWidth: 1,
    borderColor: colors.liberal,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceRaised,
    overflow: "hidden",
  },
  pipFilled: {
    backgroundColor: colors.liberal,
  },
  inset: { position: "absolute", top: 3, right: 3, bottom: 3, left: 3, borderWidth: 1, borderColor: colors.liberalDark, borderRadius: radii.tile },
  insetFilled: { borderColor: colors.paper },
  winLabel: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.xs,
    color: colors.textOnDark,
  },
})
