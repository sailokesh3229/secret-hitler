/* S19 Game over: winner and reason, every role, the full timeline including
   the discards and investigations that stayed hidden during play (spec
   Sec 8: revealed only at game over), then Play again or Home. */
import { useRouter } from "expo-router"
import { StyleSheet, Text, View } from "react-native"
import { partyMembership, projectView } from "@game/engine"
import type { PlayerId } from "@game/engine"
import { actionLabels, colors, fontFamily, fontSize, gameCopy, logCopy, roleNames, spacing, teamNames, winReasonCopy, type TeamToken } from "@game/theme"
import { Avatar } from "../src/components/Avatar.js"
import { Button } from "../src/components/Button.js"
import { Emblem } from "../src/components/Emblem.js"
import { LogEntry } from "../src/components/LogEntry.js"
import { PolicyTile } from "../src/components/PolicyTile.js"
import { ScreenFrame } from "../src/components/ScreenFrame.js"
import { useGameStore } from "../src/game/store.js"

export default function GameOverScreen() {
  const router = useRouter()
  const state = useGameStore((store) => store.state)
  const viewerId = useGameStore((store) => store.viewerId)
  const names = useGameStore((store) => store.names)
  const log = useGameStore((store) => store.log)
  const restart = useGameStore((store) => store.restart)

  if (!state || !viewerId || state.winner === null || state.winReason === null) {
    return (
      <ScreenFrame title={gameCopy.gameOverTitle} onBack={() => router.replace("/home")}>
        <Text style={styles.text}>{gameCopy.logEmpty}</Text>
      </ScreenFrame>
    )
  }

  const view = projectView(state, viewerId as PlayerId)
  const reveal = view.gameOverReveal
  const winnerToken: TeamToken = state.winner === "TEAM_LIBERAL" ? "TEAM_LIBERAL" : "TEAM_FASCIST"
  const name = (id: PlayerId): string => names[id] ?? id

  return (
    <ScreenFrame title={gameCopy.gameOverTitle}>
      <View style={styles.winner}>
        <Emblem team={winnerToken} size={56} />
        <Text style={styles.winnerTitle}>{gameCopy.gameOverWinner(teamNames[winnerToken])}</Text>
        <Text style={styles.text}>{winReasonCopy[state.winReason]}</Text>
      </View>

      <Text style={styles.section}>{gameCopy.rolesTitle}</Text>
      {state.playerIds.map((id) => {
        const role = reveal?.roles[id]
        return (
          <View key={id} style={styles.row}>
            <Avatar name={name(id)} size={36} />
            <Text style={styles.rowName}>{name(id)}</Text>
            {role && <Emblem team={partyMembership(role) as TeamToken} size={24} />}
            <Text style={styles.text}>{role ? roleNames[role] : ""}</Text>
          </View>
        )
      })}

      <Text style={styles.section}>{gameCopy.discardsTitle}</Text>
      <View style={styles.tiles}>
        {(reveal?.discardPile ?? []).map((policy, index) => (
          <PolicyTile key={index} policy={policy} />
        ))}
      </View>

      <Text style={styles.section}>{gameCopy.investigationsTitle}</Text>
      {(reveal?.investigations ?? []).length === 0 ? (
        <Text style={styles.text}>{gameCopy.noInvestigations}</Text>
      ) : (
        reveal?.investigations.map((entry, index) => (
          <Text key={index} style={styles.text}>
            {logCopy.investigated(name(entry.investigatorId), name(entry.targetId))} {teamNames[entry.team as TeamToken]}
          </Text>
        ))
      )}

      <Text style={styles.section}>{gameCopy.timelineTitle}</Text>
      <View style={styles.list}>
        {log.map((line, index) => (
          <LogEntry key={index} text={line.text} />
        ))}
      </View>

      <Button
        label={actionLabels.playAgain}
        onPress={() => {
          restart()
          router.replace("/table")
        }}
      />
      <Button label={actionLabels.home} variant="secondary" onPress={() => router.replace("/home")} />
    </ScreenFrame>
  )
}

const styles = StyleSheet.create({
  winner: {
    alignItems: "center",
    gap: spacing.sm,
  },
  winnerTitle: {
    fontFamily: fontFamily.documentBold,
    fontSize: fontSize.xl,
    color: colors.accent,
    textAlign: "center",
  },
  section: {
    fontFamily: fontFamily.interfaceSemiBold,
    fontSize: fontSize.lg,
    color: colors.accent,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  rowName: {
    flex: 1,
    fontFamily: fontFamily.interfaceSemiBold,
    fontSize: fontSize.md,
    color: colors.textOnDark,
  },
  tiles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  list: {
    gap: spacing.sm,
  },
  text: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.md,
    color: colors.textOnDarkMuted,
  },
})
