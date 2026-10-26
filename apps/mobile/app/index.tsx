/* S1 Splash. Restore the provider session before entering the game. */
import { useEffect, useState } from "react"
import { useRouter } from "expo-router"
import { StyleSheet, Text, View } from "react-native"
import { colors, fontFamily, fontSize, screenCopy, spacing } from "@game/theme"
import { BrandSeal } from "../src/components/BrandSeal.js"
import { Button } from "../src/components/Button.js"
import { GameBackdrop } from "../src/components/GameBackdrop.js"
import { restoreSession } from "../src/lib/firebase.js"

export default function SplashScreen() {
  const router = useRouter()
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setFailed(false)
    void restoreSession().then((session) => {
      if (!active) return
      router.replace(session === "ready" ? "/home" : session === "needs-username" ? "/username" : "/welcome")
    }).catch(() => {
      if (active) setFailed(true)
    })
    return () => { active = false }
  }, [router, attempt])
  return (
    <View style={styles.container}>
      <GameBackdrop />
      <BrandSeal size={76} />
      <Text style={styles.logo}>{screenCopy.appName}</Text>
      <Text style={styles.status}>{failed ? screenCopy.offline : screenCopy.loading}</Text>
      {failed && <Button label={screenCopy.tryAgain} onPress={() => setAttempt((value) => value + 1)} />}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: colors.background,
    gap: spacing.lg,
  },
  logo: {
    fontFamily: fontFamily.documentBold,
    fontSize: fontSize.xxl,
    color: colors.accent,
    textAlign: "center",
  },
  status: { fontFamily: fontFamily.interface, fontSize: fontSize.md, color: colors.textOnDarkMuted },
})
