/* S16 Chaos. Three governments failed in a row, so the top policy is
   enacted without a vote. The table opens this screen whenever a chaos
   event is recorded in the store. */
import { useRouter } from "expo-router"
import { StyleSheet, Text, View } from "react-native"
import { colors, fontFamily, fontSize, gameCopy, spacing } from "@game/theme"
import { Button } from "../src/components/Button.js"
import { PolicyTile } from "../src/components/PolicyTile.js"
import { ScreenFrame } from "../src/components/ScreenFrame.js"
import { useGameStore } from "../src/game/store.js"

export default function ChaosScreen() {
  const router = useRouter()
  const chaos = useGameStore((store) => store.chaos)

  return (
    <ScreenFrame title={gameCopy.chaosTitle} onBack={() => router.back()}>
      <Text style={styles.body}>{gameCopy.chaosBody}</Text>
      {chaos && (
        <View style={styles.tile}>
          <PolicyTile policy={chaos.policy} />
        </View>
      )}
      <Button label={gameCopy.chaosContinue} onPress={() => router.back()} />
    </ScreenFrame>
  )
}

const styles = StyleSheet.create({
  body: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.md,
    color: colors.textOnDarkMuted,
  },
  tile: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
})
