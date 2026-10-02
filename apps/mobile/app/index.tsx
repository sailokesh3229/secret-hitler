/* Temporary placeholder (plan.md Step 1) with a dev-only link to the
   Component Gallery (Step 5) - Home itself is built in Step 6. */
import { Link } from "expo-router"
import { StyleSheet, Text, View } from "react-native"
import { colors, fontFamily, fontSize, spacing } from "@game/theme"

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Secret Hitler Mobile</Text>
      <Text style={styles.subtitle}>Scaffold placeholder - plan.md Step 1</Text>
      <Link href="/dev/gallery" style={styles.link}>
        Open the Component Gallery (dev)
      </Link>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.lg,
    backgroundColor: colors.background,
  },
  title: {
    fontFamily: fontFamily.document,
    fontSize: fontSize.xxl,
    color: colors.textOnDark,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.sm,
    color: colors.textOnDarkMuted,
    textAlign: "center",
  },
  link: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.md,
    color: colors.accent,
    textDecorationLine: "underline",
  },
})
