/* S10 Role reveal. A sealed envelope; press and hold to show the role card
   and teammates, release to hide (spec Sec 9 signature interaction). The
   layout, animation length and haptic are identical for every role
   (CLAUDE.md rule 7), so nothing here branches on the role. */
import { useEffect, useRef, useState } from "react"
import { useRouter } from "expo-router"
import { Animated, AccessibilityInfo, Pressable, StyleSheet, Text, View } from "react-native"
import { actionLabels, colors, fontFamily, fontSize, gameCopy, HAPTIC_SELECTION, motion, spacing } from "@game/theme"
import { Button } from "../src/components/Button.js"
import { Envelope } from "../src/components/Envelope.js"
import { RoleCard } from "../src/components/RoleCard.js"
import { playHaptic } from "../src/lib/haptics.js"
import { useGameStore } from "../src/game/store.js"

const STAGE_HEIGHT = 400

export default function RoleScreen() {
  const router = useRouter()
  const view = useGameStore((store) => store.view)
  const names = useGameStore((store) => store.names)
  const [revealed, setRevealed] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)
  const progress = useRef(new Animated.Value(0)).current

  useEffect(() => {
    let active = true
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduceMotion(value)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    Animated.timing(progress, {
      toValue: revealed ? 1 : 0,
      duration: reduceMotion ? motion.durationReducedMotion : motion.holdToReveal,
      useNativeDriver: true,
    }).start()
  }, [revealed, reduceMotion, progress])

  function close() {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace("/table")
    }
  }

  if (!view) {
    return (
      <View style={styles.screen}>
        <Button label={actionLabels.home} onPress={() => router.replace("/home")} />
      </View>
    )
  }

  const teammates = view.knownTeammates.map((id) => names[id] ?? id)

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{gameCopy.roleTitle}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={gameCopy.roleHoldHint}
        onPressIn={() => {
          playHaptic(HAPTIC_SELECTION)
          setRevealed(true)
        }}
        onPressOut={() => setRevealed(false)}
        style={styles.stage}
      >
        <Animated.View style={[styles.layer, { opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
          <Envelope />
        </Animated.View>
        <Animated.View style={[styles.layer, { opacity: progress }]}>
          <RoleCard role={view.ownRole} />
          <Text style={styles.teammatesTitle}>{gameCopy.teammatesTitle}</Text>
          <Text style={styles.teammates}>{teammates.length > 0 ? teammates.join(", ") : gameCopy.noTeammates}</Text>
        </Animated.View>
      </Pressable>
      <Text style={styles.hint}>{gameCopy.roleHoldHint}</Text>
      <Button label={gameCopy.roleSeen} onPress={close} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: spacing.xl,
    gap: spacing.lg,
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  title: {
    fontFamily: fontFamily.documentBold,
    fontSize: fontSize.xxl,
    color: colors.textOnDark,
    textAlign: "center",
  },
  stage: {
    height: STAGE_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  layer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  teammatesTitle: {
    fontFamily: fontFamily.interfaceSemiBold,
    fontSize: fontSize.md,
    color: colors.accent,
  },
  teammates: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.md,
    color: colors.textOnDark,
    textAlign: "center",
    minHeight: 24,
  },
  hint: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.sm,
    color: colors.textOnDarkMuted,
    textAlign: "center",
  },
})
