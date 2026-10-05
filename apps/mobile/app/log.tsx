/* S18 Game log: the public round-by-round record. Built from log lines the
   store writes for every accepted action; hidden information never gets in
   (see game/logText.ts). */
import { useRouter } from "expo-router"
import { StyleSheet, Text, View } from "react-native"
import { colors, fontFamily, fontSize, gameCopy, spacing } from "@game/theme"
import { Button } from "../src/components/Button.js"
import { LogEntry } from "../src/components/LogEntry.js"
import { ScreenFrame } from "../src/components/ScreenFrame.js"
import { useGameStore } from "../src/game/store.js"

export default function LogScreen() {
  const router = useRouter()
  const log = useGameStore((store) => store.log)
  return (
    <ScreenFrame title={gameCopy.logTitle} onBack={() => router.back()}>
      <View style={styles.list}>
        {log.length === 0 ? (
          <Text style={styles.empty}>{gameCopy.logEmpty}</Text>
        ) : (
          log.map((line, index) => <LogEntry key={index} text={line.text} />)
        )}
      </View>
      <Button label={gameCopy.dismiss} variant="secondary" onPress={() => router.back()} />
    </ScreenFrame>
  )
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  empty: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.md,
    color: colors.textOnDarkMuted,
  },
})
