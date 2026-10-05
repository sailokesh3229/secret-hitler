/* S14 Veto response. The President agrees (the policies are discarded and
   the election counts as failed) or refuses (the Chancellor must enact).
   Everyone else sees the waiting line. */
import { useRouter } from "expo-router"
import { StyleSheet, Text } from "react-native"
import { PHASE_VETO_RESPONSE } from "@game/engine"
import { actionLabels, colors, fontFamily, fontSize, gameCopy } from "@game/theme"
import { Button } from "../src/components/Button.js"
import { ScreenFrame } from "../src/components/ScreenFrame.js"
import { statusLineFor } from "../src/game/statusLine.js"
import { useGameStore } from "../src/game/store.js"

export default function VetoScreen() {
  const router = useRouter()
  const view = useGameStore((store) => store.view)
  const names = useGameStore((store) => store.names)
  const act = useGameStore((store) => store.act)

  if (!view) {
    return <ScreenFrame title={actionLabels.requestVeto} onBack={() => router.back()}><Text style={styles.text}>{gameCopy.nothingToDo}</Text></ScreenFrame>
  }
  const isPresident = view.phase === PHASE_VETO_RESPONSE && view.presidentId === view.viewerId

  if (!isPresident) {
    return (
      <ScreenFrame title={gameCopy.vetoRequestedTitle} onBack={() => router.back()}>
        <Text style={styles.text}>{statusLineFor(view, names, null)}</Text>
      </ScreenFrame>
    )
  }

  async function answer(agree: boolean) {
    if ((await act({ type: "vetoRespond", agree })) && router.canGoBack()) {
      router.back()
    }
  }

  return (
    <ScreenFrame title={gameCopy.vetoRequestedTitle} onBack={() => router.back()}>
      <Text style={styles.heading}>{gameCopy.vetoAskTitle(names[view.chancellorNomineeId ?? ""] ?? "")}</Text>
      <Text style={styles.text}>{gameCopy.vetoAskSub}</Text>
      <Button label={gameCopy.agreeToVeto} onPress={() => void answer(true)} />
      <Button label={gameCopy.refuseVeto} variant="secondary" onPress={() => void answer(false)} />
    </ScreenFrame>
  )
}

const styles = StyleSheet.create({
  heading: {
    fontFamily: fontFamily.interfaceSemiBold,
    fontSize: fontSize.lg,
    color: colors.textOnDark,
  },
  text: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.md,
    color: colors.textOnDarkMuted,
  },
})
