/* S13 Policy hand. President: 3 tiles, tap one to discard it. Chancellor:
   2 tiles, tap one to enact it, and "Request veto" once it is unlocked.
   Tap-to-select is the "drag or tap" of spec Sec 4 S13. Only the President or
   the Chancellor sees a hand (spec Sec 8); everyone else gets the waiting
   line. */
import { useState } from "react"
import { useRouter } from "expo-router"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { canRequestVeto, PHASE_CHANCELLOR_POLICIES, PHASE_PRESIDENT_POLICIES } from "@game/engine"
import type { PlayerCount } from "@game/engine"
import { colors, fontFamily, fontSize, gameCopy, HAPTIC_ENACTMENT, HAPTIC_SELECTION, policyLabels, radii, spacing } from "@game/theme"
import { Button } from "../src/components/Button.js"
import { PolicyTile } from "../src/components/PolicyTile.js"
import { ScreenFrame } from "../src/components/ScreenFrame.js"
import { playHaptic } from "../src/lib/haptics.js"
import { statusLineFor } from "../src/game/statusLine.js"
import { useGameStore } from "../src/game/store.js"

export default function PoliciesScreen() {
  const router = useRouter()
  const view = useGameStore((store) => store.view)
  const names = useGameStore((store) => store.names)
  const act = useGameStore((store) => store.act)
  const [selected, setSelected] = useState<number | null>(null)

  if (!view) {
    return <ScreenFrame title={gameCopy.presidentTitle} onBack={() => router.back()}><Text style={styles.text}>{gameCopy.nothingToDo}</Text></ScreenFrame>
  }
  const me = view.viewerId
  const isPresidentTurn = view.phase === PHASE_PRESIDENT_POLICIES && view.presidentId === me
  const isChancellorTurn = view.phase === PHASE_CHANCELLOR_POLICIES && view.chancellorNomineeId === me

  if (!isPresidentTurn && !isChancellorTurn) {
    return (
      <ScreenFrame title={gameCopy.presidentTitle} onBack={() => router.back()}>
        <Text style={styles.text}>{statusLineFor(view, names, null)}</Text>
      </ScreenFrame>
    )
  }

  const hand = view.myHand ?? []
  const canVeto = isChancellorTurn && canRequestVeto(view.fascistPoliciesEnacted, view.seats.length as PlayerCount, view.vetoRequestedThisSession)

  async function confirm() {
    if (selected === null) return
    const ok = await act(isPresidentTurn ? { type: "discard", tileIndex: selected } : { type: "enact", tileIndex: selected })
    if (ok) {
      playHaptic(isChancellorTurn ? HAPTIC_ENACTMENT : HAPTIC_SELECTION)
      if (router.canGoBack()) router.back()
    }
  }

  return (
    <ScreenFrame title={isPresidentTurn ? gameCopy.presidentTitle : gameCopy.chancellorTitle} onBack={() => router.back()}>
      <Text style={styles.text}>{isPresidentTurn ? gameCopy.presidentSub : gameCopy.chancellorSub}</Text>
      <View style={styles.hand}>
        {hand.map((policy, index) => (
          <Pressable
            key={index}
            accessibilityRole="radio"
            accessibilityLabel={policyLabels[policy]}
            accessibilityState={{ checked: selected === index }}
            onPress={() => {
              playHaptic(HAPTIC_SELECTION)
              setSelected(index)
            }}
            style={[styles.tileWrap, selected === index ? styles.tileSelected : styles.tileIdle]}
          >
            <PolicyTile policy={policy} />
          </Pressable>
        ))}
      </View>
      <Button label={isPresidentTurn ? gameCopy.discardConfirm : gameCopy.enactConfirm} disabled={selected === null} onPress={() => void confirm()} />
      {canVeto && <Button label={gameCopy.requestVeto} variant="secondary" onPress={() => void act({ type: "vetoRequest" })} />}
    </ScreenFrame>
  )
}

const styles = StyleSheet.create({
  text: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.md,
    color: colors.textOnDarkMuted,
  },
  hand: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.md,
  },
  tileWrap: {
    borderRadius: radii.tile,
    borderWidth: 3,
    padding: 2,
  },
  tileIdle: {
    borderColor: colors.background,
  },
  tileSelected: {
    borderColor: colors.accent,
  },
})
