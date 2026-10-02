/* Liberal, Fascist, or face-down. Tile radius 10pt (spec Sec 9).
   Colour is never the only signal - the emblem shape and the word
   both render alongside the tint. */
import { StyleSheet, Text, View } from "react-native"
import { colors, fontFamily, fontSize, policyLabels, radii, spacing } from "@game/theme"
import type { PolicyToken } from "@game/theme"
import { Emblem } from "./Emblem.js"

export interface PolicyTileProps {
  policy?: PolicyToken
}

export function PolicyTile({ policy }: PolicyTileProps) {
  if (policy === undefined) {
    return <View style={[styles.base, styles.faceDown]} />
  }
  const isLiberal = policy === "POLICY_LIBERAL"
  return (
    <View style={[styles.base, styles.faceUp, { borderColor: isLiberal ? colors.liberal : colors.fascist }]}>
      <Emblem team={isLiberal ? "TEAM_LIBERAL" : "TEAM_FASCIST"} size={24} />
      <Text style={styles.label}>{policyLabels[policy]}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    width: 84,
    height: 116,
    borderRadius: radii.tile,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  faceUp: {
    backgroundColor: colors.paper,
    borderWidth: 3,
    padding: spacing.sm,
  },
  faceDown: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: colors.border,
  },
  label: {
    fontFamily: fontFamily.document,
    fontSize: fontSize.xs,
    color: colors.ink,
    textAlign: "center",
  },
})
