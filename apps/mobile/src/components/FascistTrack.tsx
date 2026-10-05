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
    gap: spacing.sm,
  },
  pip: {
    width: 44,
    height: 44,
    borderRadius: radii.tile,
    borderWidth: 2,
    borderColor: colors.fascist,
    alignItems: "center",
    justifyContent: "center",
  },
  pipFilled: {
    backgroundColor: colors.fascist,
  },
  marker: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.micro,
    color: colors.textOnDark,
  },
})
