/* S1 Splash. Shows the logo while the login status is checked; with no
   real auth yet (plan.md Step 9) it always moves on to Welcome. */
import { useEffect } from "react"
import { useRouter } from "expo-router"
import { StyleSheet, Text, View } from "react-native"
import { colors, fontFamily, fontSize, screenCopy, spacing } from "@game/theme"

const SPLASH_MS = 1200

export default function SplashScreen() {
  const router = useRouter()
  useEffect(() => {
    const timer = setTimeout(() => router.replace("/welcome"), SPLASH_MS)
    return () => clearTimeout(timer)
  }, [router])
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>{screenCopy.appName}</Text>
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
  },
  logo: {
    fontFamily: fontFamily.documentBold,
    fontSize: fontSize.xxl,
    color: colors.accent,
    textAlign: "center",
  },
})
