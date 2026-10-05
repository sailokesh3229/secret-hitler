/* Dev scenario switcher (plan.md Step 7): pick the player count, the phase
   and whose phone to view, then open the table already at that point. The
   game is driven by the real packages/engine (dev/autoplay.ts). Dev-only:
   the route is linked from the dev menu and the table is marked as a test
   table, so passing the phone is available. */
import { useState } from "react"
import { useRouter } from "expo-router"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { colors, fontFamily, fontSize, radii, spacing } from "@game/theme"
import { Button } from "../../src/components/Button.js"
import { ScreenFrame } from "../../src/components/ScreenFrame.js"
import { Segmented } from "../../src/components/Segmented.js"
import { newScenarioGame, playUntil, SCENARIO_PHASES, type ScenarioPhase } from "../../src/dev/autoplay.js"
import { random, useGameStore } from "../../src/game/store.js"

const SEAT_NAMES = ["Arjun", "Maya", "Priya", "Rohan", "Zara", "Dev", "Ishaan", "Kiara", "Neel", "Tara"]
const COUNT_OPTIONS = [5, 6, 7, 8, 9, 10].map((count) => ({ value: String(count), label: String(count) }))

function ScenarioPanel() {
  const router = useRouter()
  const adopt = useGameStore((store) => store.adopt)
  const setViewer = useGameStore((store) => store.setViewer)
  const [count, setCount] = useState("5")
  const [phase, setPhase] = useState<ScenarioPhase>("nomination")
  const [viewer, setViewerName] = useState(SEAT_NAMES[0] as string)
  const [message, setMessage] = useState<string | null>(null)
  const seatNames = SEAT_NAMES.slice(0, Number(count))

  function open() {
    const ids = seatNames
    const hostId = ids[0] as string
    const start = newScenarioGame(ids, random)
    const reached = playUntil(start, phase, hostId, random)
    if (!reached) {
      setMessage("That phase was not reached. Try again - the random game took another path.")
      return
    }
    adopt(reached, ids.map((id) => ({ id, name: id })), hostId, true)
    setViewer(viewer)
    router.replace("/table")
  }

  return (
    <ScreenFrame title="Scenario switcher" onBack={() => router.back()}>
      <Text style={styles.label}>Players</Text>
      <Segmented options={COUNT_OPTIONS} value={count} onChange={(next) => {
        setCount(next)
        if (!SEAT_NAMES.slice(0, Number(next)).includes(viewer)) setViewerName(SEAT_NAMES[0] as string)
      }} />

      <Text style={styles.label}>Phase</Text>
      <View style={styles.chipWrap}>
        {SCENARIO_PHASES.map((entry) => (
          <Pressable
            key={entry.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: phase === entry.value }}
            onPress={() => setPhase(entry.value)}
            style={[styles.chip, phase === entry.value && styles.chipSelected]}
          >
            <Text style={[styles.chipText, phase === entry.value && styles.chipTextSelected]}>{entry.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Whose phone</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chipRow}>
          {seatNames.map((name) => (
            <Pressable
              key={name}
              accessibilityRole="radio"
              accessibilityState={{ checked: viewer === name }}
              onPress={() => setViewerName(name)}
              style={[styles.chip, viewer === name && styles.chipSelected]}
            >
              <Text style={[styles.chipText, viewer === name && styles.chipTextSelected]}>{name}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {message && <Text style={styles.message}>{message}</Text>}
      <Button label="Open the table" onPress={open} />
    </ScreenFrame>
  )
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fontFamily.interfaceSemiBold,
    fontSize: fontSize.md,
    color: colors.accent,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chipRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
    borderRadius: radii.control,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  chipSelected: {
    backgroundColor: colors.accent,
  },
  chipText: {
    fontFamily: fontFamily.interfaceSemiBold,
    fontSize: fontSize.sm,
    color: colors.accent,
  },
  chipTextSelected: {
    color: colors.ink,
  },
  hidden: {
    flex: 1,
    backgroundColor: colors.background,
  },
  message: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.sm,
    color: colors.danger,
  },
})

export default function ScenarioScreen() {
  if (!__DEV__) {
    return <View style={styles.hidden} />
  }
  return <ScenarioPanel />
}
