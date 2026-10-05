/* S2 Welcome: game name, one-line pitch, sign up or log in. */
import { useRouter } from "expo-router"
import { StyleSheet, Text, View } from "react-native"
import { colors, fontFamily, fontSize, screenCopy, spacing } from "@game/theme"
import { Button } from "../src/components/Button.js"

export default function WelcomeScreen() {
  const router = useRouter()
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>{screenCopy.appName}</Text>
        <Text style={styles.pitch}>{screenCopy.pitch}</Text>
      </View>
      <View style={styles.actions}>
        <Button label={screenCopy.signUp} onPress={() => router.push("/login")} />
        <Button label={screenCopy.logIn} variant="secondary" onPress={() => router.push("/login")} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: "space-between",
    backgroundColor: colors.background,
  },
  hero: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.lg,
  },
  title: {
    fontFamily: fontFamily.documentBold,
    fontSize: fontSize.xxl,
    color: colors.accent,
    textAlign: "center",
  },
  pitch: {
    fontFamily: fontFamily.document,
    fontSize: fontSize.lg,
    color: colors.textOnDark,
    textAlign: "center",
  },
  actions: {
    gap: spacing.md,
  },
})
