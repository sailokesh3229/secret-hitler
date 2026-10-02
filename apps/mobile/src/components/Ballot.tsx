/* Ja, Nein, or face-down. Spec Sec 9 signature interaction: all
   ballots flip together once revealed - that shared flip animation
   is built in Step 8, not here. This is the static visual. */
import { StyleSheet, Text, View } from "react-native"
import { colors, fontFamily, fontSize, radii, voteLabels } from "@game/theme"
import type { VoteToken } from "@game/theme"

export interface BallotProps {
  vote?: VoteToken
}

export function Ballot({ vote }: BallotProps) {
  if (vote === undefined) {
    return <View style={[styles.base, styles.faceDown]} />
  }
  const isYes = vote === "VOTE_YES"
  return (
    <View style={[styles.base, styles.faceUp, { borderColor: isYes ? colors.liberal : colors.fascist }]}>
      <Text style={styles.label}>{voteLabels[vote]}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    width: 90,
    height: 60,
    borderRadius: radii.tile,
    alignItems: "center",
    justifyContent: "center",
  },
  faceUp: {
    backgroundColor: colors.paper,
    borderWidth: 3,
  },
  faceDown: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: colors.border,
  },
  label: {
    fontFamily: fontFamily.documentBold,
    fontSize: fontSize.lg,
    color: colors.ink,
  },
})
