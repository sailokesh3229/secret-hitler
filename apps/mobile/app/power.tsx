import { usePreventScreenCapture } from "expo-screen-capture"
/* S15 Presidential power screens (spec Sec 7). The President sees the power,
   its one-sentence description, the seat list with reasons for anyone who
   cannot be chosen, and a confirmation sheet before anything happens. Every
   other player sees the waiting version (spec Sec 7.3). Investigation
   results are private to the President and are held down to view. */
import { useState } from "react"
import { useRouter } from "expo-router"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { POWER_INVESTIGATE, POWER_POLICY_PEEK, PHASE_PRESIDENTIAL_POWER, POWER_SPECIAL_ELECTION } from "@game/engine"
import type { PlayerId, PlayerView } from "@game/engine"
import { actionLabels, colors, fontFamily, fontSize, gameCopy, HAPTIC_SELECTION, powerDescriptions, powerNames, radii, spacing, teamNames, type PowerToken, type TeamToken } from "@game/theme"
import { Avatar } from "../src/components/Avatar.js"
import { Button } from "../src/components/Button.js"
import { Emblem } from "../src/components/Emblem.js"
import { PolicyTile } from "../src/components/PolicyTile.js"
import { PowerIcon } from "../src/components/PowerIcon.js"
import { ScreenFrame } from "../src/components/ScreenFrame.js"
import { Sheet } from "../src/components/Sheet.js"
import { statusLineFor } from "../src/game/statusLine.js"
import { useGameStore } from "../src/game/store.js"
import { playHaptic } from "../src/lib/haptics.js"

export default function PowerScreen() {
  usePreventScreenCapture()
  const router = useRouter()
  const view = useGameStore((store) => store.view)
  const names = useGameStore((store) => store.names)
  const act = useGameStore((store) => store.act)
  const [choice, setChoice] = useState<PlayerId | null>(null)

  if (!view) {
    return <ScreenFrame title={gameCopy.powerWaitingTitle("")} onBack={() => router.back()}><Text style={styles.text}>{gameCopy.nothingToDo}</Text></ScreenFrame>
  }
  const current: PlayerView = view
  const me = current.viewerId
  const power = current.phase === PHASE_PRESIDENTIAL_POWER ? current.pendingPower : null
  const isPresident = current.presidentId === me
  const name = (id: PlayerId): string => names[id] ?? id
  const presidentName = name(current.presidentId)

  function reasonFor(id: PlayerId): string | null {
    if (id === current.presidentId) return gameCopy.powerReasonSelf
    if (!current.alivePlayers.includes(id)) return gameCopy.powerReasonExecuted
    if (power === POWER_INVESTIGATE && current.investigatedPlayerIds.includes(id)) return gameCopy.powerReasonInvestigated
    return null
  }

  function confirmText(id: PlayerId): string {
    if (power === POWER_INVESTIGATE) return gameCopy.confirmInvestigate(name(id))
    if (power === POWER_SPECIAL_ELECTION) return gameCopy.confirmSpecialElection(name(id))
    return gameCopy.confirmExecution(name(id))
  }

  async function confirm() {
    if (choice === null) return
    if ((await act({ type: "powerChoose", targetId: choice })) && router.canGoBack()) {
      setChoice(null)
      router.back()
    }
  }

  const powerName = power === null ? "" : powerNames[power as PowerToken]
  const description = power === null ? "" : powerDescriptions[power as PowerToken]
  const title = isPresident ? powerName : gameCopy.powerWaitingTitle(presidentName)

  return (
    <ScreenFrame title={title} onBack={() => router.back()}>
      {power !== null && (
        <View style={styles.powerHeader}>
          <PowerIcon power={power as PowerToken} size={36} />
          <Text style={styles.description}>{description}</Text>
        </View>
      )}

      {(power === null || !isPresident) && <Text style={styles.text}>{statusLineFor(view, names, null)}</Text>}

      {power !== null && isPresident && power === POWER_POLICY_PEEK && (
        <View style={styles.body}>
          <Text style={styles.heading}>{gameCopy.peekTitle}</Text>
          <Text style={styles.text}>{gameCopy.peekSub}</Text>
          <View style={styles.tiles}>
            {(view.myPeekedPolicies ?? []).map((policy, index) => (
              <PolicyTile key={index} policy={policy} />
            ))}
          </View>
          <Button label={gameCopy.powerDone} onPress={() => void act({ type: "peekDone" }).then((ok) => ok && router.canGoBack() && router.back())} />
        </View>
      )}

      {power !== null && isPresident && power !== POWER_POLICY_PEEK && (
        <View style={styles.body}>
          {view.seats.map((id) => {
            const reason = reasonFor(id)
            const disabled = reason !== null
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityLabel={name(id)}
                accessibilityState={{ disabled }}
                disabled={disabled}
                onPress={() => {
                  playHaptic(HAPTIC_SELECTION)
                  setChoice(id)
                }}
                style={[styles.player, disabled && styles.playerDisabled]}
              >
                <Avatar name={name(id)} size={36} />
                <Text style={styles.playerName}>{name(id)}</Text>
                {reason && <Text style={styles.reason}>{reason}</Text>}
              </Pressable>
            )
          })}
          {choice !== null && (
            <Sheet title={confirmText(choice)}>
              <Button label={actionLabels.confirm} onPress={() => void confirm()} />
              <Button label={gameCopy.cancelPower} variant="secondary" onPress={() => setChoice(null)} />
            </Sheet>
          )}
        </View>
      )}

      {isPresident && view.myInvestigationResults.length > 0 && (
        <View style={styles.body}>
          <Text style={styles.heading}>{gameCopy.privateResultsTitle}</Text>
          {view.myInvestigationResults.map((result) => (
            <InvestigationRow key={result.targetId} name={name(result.targetId)} team={result.team as TeamToken} />
          ))}
        </View>
      )}
    </ScreenFrame>
  )
}

function InvestigationRow({ name, team }: { name: string; team: TeamToken }) {
  const [held, setHeld] = useState(false)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={gameCopy.investigationTitle(name)}
      onPressIn={() => {
        playHaptic(HAPTIC_SELECTION)
        setHeld(true)
      }}
      onPressOut={() => setHeld(false)}
      style={styles.investigation}
    >
      <Text style={styles.heading}>{gameCopy.investigationTitle(name)}</Text>
      {held ? (
        <View style={styles.teamRow}>
          <Emblem team={team} size={28} />
          <Text style={styles.heading}>{teamNames[team]}</Text>
        </View>
      ) : (
        <Text style={styles.text}>{gameCopy.investigationHold}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  powerHeader: {
    alignItems: "center",
    gap: spacing.md,
  },
  description: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.md,
    color: colors.textOnDark,
    textAlign: "center",
  },
  body: {
    gap: spacing.sm,
  },
  heading: {
    fontFamily: fontFamily.interfaceSemiBold,
    fontSize: fontSize.lg,
    color: colors.accent,
  },
  text: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.md,
    color: colors.textOnDarkMuted,
  },
  tiles: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.md,
  },
  player: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radii.control,
    backgroundColor: colors.surfaceRaised,
  },
  playerDisabled: {
    opacity: 0.4,
  },
  playerName: {
    flex: 1,
    fontFamily: fontFamily.interfaceSemiBold,
    fontSize: fontSize.md,
    color: colors.textOnDark,
  },
  reason: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.xs,
    color: colors.textOnDarkMuted,
  },
  investigation: {
    minHeight: 44,
    padding: spacing.md,
    gap: spacing.xs,
    borderRadius: radii.control,
    backgroundColor: colors.paper,
  },
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
})
