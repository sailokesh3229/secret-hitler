/* S13 Policy hand. President: 3 tiles, tap one to discard it. Chancellor:
   2 tiles, tap one to enact it, and "Request veto" once it is unlocked.
   Tap-to-select is the "drag or tap" of spec Sec 4 S13; drag is a later
   refinement. Only the President or the Chancellor sees a hand, so anyone
   else gets the waiting message instead (spec Sec 8). */
import { useState } from "react"
import { useRouter } from "expo-router"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { canRequestVeto, getPlayerCount, PHASE_CHANCELLOR_POLICIES, PHASE_PRESIDENT_POLICIES, projectView } from "@game/engine"
import type { PlayerId } from "@game/engine"
import { colors, fontFamily, fontSize, gameCopy, HAPTIC_ENACTMENT, HAPTIC_SELECTION, policyLabels, radii, spacing } from "@game/theme"
import { Button } from "../src/components/Button.js"
import { PolicyTile } from "../src/components/PolicyTile.js"
import { ScreenFrame } from "../src/components/ScreenFrame.js"
import { playHaptic } from "../src/lib/haptics.js"
import { statusLineFor } from "../src/game/statusLine.js"
import { useGameStore } from "../src/game/store.js"

export default function PoliciesScreen() {
  const router = useRouter()
  const state = useGameStore((store) => store.state)
  const viewerId = useGameStore((store) => store.viewerId)
  const names = useGameStore((store) => store.names)
  const perform = useGameStore((store) => store.perform)
  const [selected, setSelected] = useState<number | null>(null)

  if (!state || !viewerId) {
    return <ScreenFrame title={gameCopy.presidentTitle} onBack={() => router.back()}><Text style={styles.text}>{gameCopy.nothingToDo}</Text></ScreenFrame>
  }
  const me: PlayerId = viewerId
  const view = projectView(state, me)
  const isPresidentTurn = state.phase === PHASE_PRESIDENT_POLICIES && view.presidentId === me
  const isChancellorTurn = state.phase === PHASE_CHANCELLOR_POLICIES && view.chancellorNomineeId === me

  if (!isPresidentTurn && !isChancellorTurn) {
    return (
      <ScreenFrame title={gameCopy.presidentTitle} onBack={() => router.back()}>
        <Text style={styles.text}>{statusLineFor(view, names, null)}</Text>
      </ScreenFrame>
    )
  }

  const hand = view.myHand ?? []
  const canVeto = isChancellorTurn && canRequestVeto(state.fascistPoliciesEnacted, getPlayerCount(state), state.vetoRequestedThisSession)

  function confirm() {
    if (selected === null) return
    const ok = isPresidentTurn
      ? perform(me, { type: "discard", tileIndex: selected })
      : perform(me, { type: "enact", tileIndex: selected })
    if (ok) {
      playHaptic(isChancellorTurn ? HAPTIC_ENACTMENT : HAPTIC_SELECTION)
      if (router.canGoBack()) router.back()
    }
  }

  return (
    <ScreenFrame
      title={isPresidentTurn ? gameCopy.presidentTitle : gameCopy.chancellorTitle}
      onBack={() => router.back()}
    >
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
      <Button
        label={isPresidentTurn ? gameCopy.discardConfirm : gameCopy.enactConfirm}
        disabled={selected === null}
        onPress={confirm}
      />
      {canVeto && <Button label={gameCopy.requestVeto} variant="secondary" onPress={() => perform(me, { type: "vetoRequest" })} />}
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
