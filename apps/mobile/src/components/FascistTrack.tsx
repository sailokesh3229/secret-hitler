/* 6 slots, powers read from getFascistBoardSlots(playerCount) per R5 -
   never a hard-coded "slot 2 = investigate". Spec Sec 7.5: empty
   slots show their power icon. */
import { StyleSheet, Text, View } from "react-native"
import { getFascistBoardSlots } from "@game/engine"
import type { PlayerCount } from "@game/engine"
import { boardMarkers, colors, fontFamily, fontSize, radii, spacing } from "@game/theme"
import { PowerIcon } from "./PowerIcon.js"

export interface FascistTrackProps {
  playerCount: PlayerCount
  enactedCount: number
}

export function FascistTrack({ playerCount, enactedCount }: FascistTrackProps) {
  const slots = getFascistBoardSlots(playerCount)
  return (
    <View style={styles.row}>
      {slots.map((slot) => {
        const filled = slot.slot <= enactedCount
        return (
          <View key={slot.slot} style={[styles.pip, filled && styles.pipFilled]}>
            <View style={[styles.inset, filled && styles.insetFilled]} />
            {slot.power !== null && <PowerIcon power={slot.power} size={20} color={colors.textOnDark} />}
            {slot.winsGame && <Text style={styles.marker}>{boardMarkers.win}</Text>}
            {slot.unlocksVeto && <Text style={styles.marker}>{boardMarkers.veto}</Text>}
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
    maxWidth: 510,
    padding: spacing.sm,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.fascistDark,
    backgroundColor: colors.surfaceRecessed,
  },
  pip: {
    flex: 1,
    minWidth: 0,
    height: 54,
    borderRadius: radii.tile,
    borderWidth: 1,
    borderColor: colors.fascist,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceRaised,
    overflow: "hidden",
  },
  pipFilled: {
    backgroundColor: colors.fascist,
  },
  inset: { position: "absolute", top: 3, right: 3, bottom: 3, left: 3, borderWidth: 1, borderColor: colors.fascistDark, borderRadius: radii.tile },
  insetFilled: { borderColor: colors.paper },
  marker: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.micro,
    color: colors.textOnDark,
  },
})
