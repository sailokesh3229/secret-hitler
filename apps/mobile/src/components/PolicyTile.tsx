/* Liberal, Fascist, or face-down. Tile radius 10pt (spec Sec 9).
   Colour is never the only signal - the emblem shape and the word
   both render alongside the tint. */
import { StyleSheet, Text, View } from "react-native"
import { colors, fontFamily, fontSize, policyLabels, radii, spacing } from "@game/theme"
import type { PolicyToken } from "@game/theme"
import { Emblem } from "./Emblem.js"
import { BrandSeal } from "./BrandSeal.js"

export interface PolicyTileProps {
  policy?: PolicyToken
}

export function PolicyTile({ policy }: PolicyTileProps) {
  if (policy === undefined) {
    return <View style={[styles.base, styles.faceDown]}><View style={styles.inset} /><BrandSeal size={40} /></View>
  }
  const isLiberal = policy === "POLICY_LIBERAL"
  return (
    <View style={[styles.base, styles.faceUp, { borderColor: isLiberal ? colors.liberal : colors.fascist }]}>
      <View style={styles.insetPaper} />
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
    shadowColor: colors.background,
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  faceUp: {
    backgroundColor: colors.paper,
    borderWidth: 2,
    padding: spacing.sm,
  },
  faceDown: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  inset: { position: "absolute", top: 5, right: 5, bottom: 5, left: 5, borderWidth: 1, borderColor: colors.borderOnPaper, borderRadius: radii.tile },
  insetPaper: { position: "absolute", top: 5, right: 5, bottom: 5, left: 5, borderWidth: 1, borderColor: colors.borderOnPaper, borderRadius: radii.tile },
  label: {
    fontFamily: fontFamily.document,
    fontSize: fontSize.xs,
    color: colors.ink,
    textAlign: "center",
  },
})
