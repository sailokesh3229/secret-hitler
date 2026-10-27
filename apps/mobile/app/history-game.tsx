/* S20 detail: one finished game with its winner, every player's role and the
   public record. Only players in the game can open it (server check). */
import { useEffect, useState } from "react"
import { useLocalSearchParams, useRouter } from "expo-router"
import { StyleSheet, Text, View } from "react-native"
import { colors, fontFamily, fontSize, moreCopy, roleNames, screenCopy, spacing, teamNames, winReasonCopy, type RoleToken, type TeamToken } from "@game/theme"
import { partyMembership } from "@game/engine"
import { Avatar } from "../src/components/Avatar.js"
import { Button } from "../src/components/Button.js"
import { LogEntry } from "../src/components/LogEntry.js"
import { ScreenFrame, type ScreenStatus } from "../src/components/ScreenFrame.js"
import { gamesApi } from "../src/lib/api.js"
import { useProtectedSession } from "../src/lib/useProtectedSession.js"
import { describePublicEvent, type PublicEventLike } from "../src/game/remoteLog.js"

type Detail = Awaited<ReturnType<typeof gamesApi.detail>>

export default function HistoryGameScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ id?: string }>()
  const session = useProtectedSession()
  const [detail, setDetail] = useState<Detail | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!params.id || session.state !== "ready") return
    let active = true
    gamesApi.detail(params.id).then((result) => { if (active) setDetail(result) }).catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [params.id, session.state])

  const status: ScreenStatus = failed ? "error" : detail === null ? "loading" : "ready"
  const names = Object.fromEntries((detail?.players ?? []).map((player) => [player.userId, player.username ?? player.userId]))
  const winnerTeam = detail?.winner === "TEAM_LIBERAL" ? "TEAM_LIBERAL" : "TEAM_FASCIST"

  if (session.state === "loading") return <ScreenFrame title={moreCopy.historyDetailTitle} status="loading">{null}</ScreenFrame>
  if (session.state === "error") return <ScreenFrame title={moreCopy.historyDetailTitle} status="error"><Button label={screenCopy.tryAgain} onPress={session.retry} /></ScreenFrame>

  return (
    <ScreenFrame title={moreCopy.historyDetailTitle} status={status} errorText={moreCopy.historyLoadFailed} onBack={() => router.back()}>
      {detail && (
        <View style={styles.block}>
          <Text style={styles.winner}>{teamNames[winnerTeam as TeamToken]} win</Text>
          {detail.winReason && <Text style={styles.text}>{winReasonCopy[detail.winReason as keyof typeof winReasonCopy]}</Text>}
          <Text style={styles.section}>{moreCopy.historyPlayers}</Text>
          {detail.players.map((player) => (
            <View key={player.userId} style={styles.player}>
              <Avatar name={names[player.userId] ?? ""} size={36} />
              <Text style={styles.name}>{names[player.userId]}</Text>
              <Text style={styles.text}>{roleNames[player.role as RoleToken] ?? ""}</Text>
              <Text style={styles.text}>{teamNames[partyMembership(player.role as RoleToken) as TeamToken]}</Text>
            </View>
          ))}
          <Text style={styles.section}>{moreCopy.historyLog}</Text>
          {detail.events.map((event) => {
            const text = describePublicEvent(event as PublicEventLike, names)
            return text ? <LogEntry key={event.seq} text={text} /> : null
          })}
        </View>
      )}
    </ScreenFrame>
  )
}

const styles = StyleSheet.create({
  block: {
    gap: spacing.sm,
  },
  winner: {
    fontFamily: fontFamily.documentBold,
    fontSize: fontSize.xl,
    color: colors.accent,
  },
  section: {
    fontFamily: fontFamily.interfaceSemiBold,
    fontSize: fontSize.lg,
    color: colors.accent,
    marginTop: spacing.md,
  },
  player: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    fontFamily: fontFamily.interfaceSemiBold,
    fontSize: fontSize.md,
    color: colors.textOnDark,
  },
  text: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.sm,
    color: colors.textOnDarkMuted,
  },
})
