/* S2 Welcome: game name, one-line pitch, sign up or log in. */
import { useEffect, useRef } from "react"
import { useRouter } from "expo-router"
import { AccessibilityInfo, Animated, Platform, StyleSheet, Text, useWindowDimensions, View } from "react-native"
import { colors, fontFamily, fontSize, motion, screenCopy, spacing } from "@game/theme"
import { Button } from "../src/components/Button.js"
import { BrandSeal } from "../src/components/BrandSeal.js"
import { GameBackdrop } from "../src/components/GameBackdrop.js"

export default function WelcomeScreen() {
  const router = useRouter()
  const { width } = useWindowDimensions()
  const desktop = width >= 800
  const reveal = useRef(new Animated.Value(0)).current
  useEffect(() => {
    let disposed = false
    let animation: Animated.CompositeAnimation | null = null
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (disposed) return
      if (reduced) { reveal.setValue(1); return }
      animation = Animated.timing(reveal, { toValue: 1, duration: motion.slow, useNativeDriver: Platform.OS !== "web" })
      animation.start()
    }).catch(() => reveal.setValue(1))
    return () => { disposed = true; animation?.stop() }
  }, [reveal])
  return (
    <View style={styles.container}>
      <GameBackdrop />
      <Animated.View style={[styles.content, desktop && styles.contentDesktop, { opacity: reveal, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [spacing.md, 0] }) }] }]}>
        <View style={styles.hero}>
          <BrandSeal size={desktop ? 90 : 72} />
          <View style={styles.rule} />
          <Text style={[styles.title, desktop && styles.titleDesktop]}>{screenCopy.appName}</Text>
          <Text style={[styles.pitch, desktop && styles.pitchDesktop]}>{screenCopy.pitch}</Text>
        </View>
        <View style={[styles.actions, desktop && styles.actionsDesktop]}>
          <View style={styles.actionSlot}><Button label={screenCopy.signUp} onPress={() => router.push({ pathname: "/login", params: { mode: "signup" } })} /></View>
          <View style={styles.actionSlot}><Button label={screenCopy.logIn} variant="secondary" onPress={() => router.push({ pathname: "/login", params: { mode: "login" } })} /></View>
        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
    flex: 1,
    padding: spacing.xl,
    justifyContent: "space-between",
  },
  contentDesktop: { padding: spacing.xxxl },
  hero: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-start",
    gap: spacing.lg,
    maxWidth: 630,
  },
  rule: {
    width: 92,
    height: 2,
    backgroundColor: colors.accent,
  },
  title: {
    fontFamily: fontFamily.documentBold,
    fontSize: fontSize.heroMobile,
    color: colors.paper,
    lineHeight: fontSize.heroMobile * 1.2,
  },
  titleDesktop: { fontSize: fontSize.heroDesktop, lineHeight: fontSize.heroDesktop * 1.16 },
  pitch: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.lg,
    color: colors.textOnDark,
    maxWidth: 520,
  },
  pitchDesktop: { fontSize: fontSize.xl, lineHeight: 34 },
  actions: {
    gap: spacing.md,
    width: "100%",
    maxWidth: 540,
  },
  actionsDesktop: { flexDirection: "row" },
  actionSlot: { flex: 1 },
})
