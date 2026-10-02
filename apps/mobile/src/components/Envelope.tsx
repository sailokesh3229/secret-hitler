/* Sealed and revealed states, spec Sec 9 signature interaction (press
   and hold to reveal). The actual hold gesture and the role card
   underneath are built in Step 7 - this is the static envelope
   shell, identical for every role per CLAUDE.md rule 7. */
import { StyleSheet, View } from "react-native"
import { colors, radii } from "@game/theme"

export interface EnvelopeProps {
  revealed?: boolean
}

export function Envelope({ revealed = false }: EnvelopeProps) {
  return (
    <View style={styles.body}>
      <View style={[styles.flap, revealed && styles.flapOpen]} />
      {!revealed && <View style={styles.seal} />}
    </View>
  )
}

const styles = StyleSheet.create({
  body: {
    width: 180,
    height: 120,
    borderRadius: radii.control,
    backgroundColor: colors.paper,
    borderWidth: 2,
    borderColor: colors.borderOnPaper,
    alignItems: "center",
    overflow: "hidden",
  },
  flap: {
    width: 0,
    height: 0,
    borderLeftWidth: 90,
    borderRightWidth: 90,
    borderTopWidth: 60,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: colors.borderOnPaper,
  },
  flapOpen: {
    borderTopColor: colors.surfaceRaised,
    transform: [{ translateY: -40 }, { rotate: "180deg" }],
  },
  seal: {
    position: "absolute",
    top: 50,
    width: 20,
    height: 20,
    borderRadius: radii.full,
    backgroundColor: colors.accent,
  },
})
