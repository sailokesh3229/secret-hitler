/* S20 Game history: my finished games (date, room, players, my role, result)
   and a simple win count. Tap a game for its public record. */
import { useEffect, useState } from "react"
import { useRouter } from "expo-router"
import { Pressable, StyleSheet, Text } from "react-native"
import { colors, fontFamily, fontSize, moreCopy, radii, roleNames, screenCopy, spacing, type RoleToken } from "@game/theme"
import { Button } from "../src/components/Button.js"
import { ScreenFrame, type ScreenStatus } from "../src/components/ScreenFrame.js"
import { apiEnabled, gamesApi, type GameListItemView } from "../src/lib/api.js"
import { useProtectedSession } from "../src/lib/useProtectedSession.js"

export default function HistoryScreen() {
  const router = useRouter()
  const session = useProtectedSession()
  const [items, setItems] = useState<GameListItemView[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (session.state !== "ready") return
    if (!apiEnabled()) {
      setItems([])
      return
    }
    let active = true
    gamesApi.mine().then((result) => { if (active) setItems(result) }).catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [session.state])

  const status: ScreenStatus = failed ? "error" : items === null ? "loading" : "ready"
  const wins = (items ?? []).filter((item) => item.won).length

  if (session.state === "loading") return <ScreenFrame title={moreCopy.historyTitle} status="loading">{null}</ScreenFrame>
  if (session.state === "error") return <ScreenFrame title={moreCopy.historyTitle} status="error"><Button label={screenCopy.tryAgain} onPress={session.retry} /></ScreenFrame>

  return (
    <ScreenFrame title={moreCopy.historyTitle} status={status} errorText={moreCopy.historyLoadFailed} onBack={() => router.back()}>
      {items !== null && items.length === 0 && <Text style={styles.text}>{moreCopy.historyEmpty}</Text>}
      {items !== null && items.length > 0 && <Text style={styles.summary}>{moreCopy.historyWins(wins, items.length)}</Text>}
      {(items ?? []).map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          accessibilityLabel={item.roomCode}
          onPress={() => router.push({ pathname: "/history-game", params: { id: item.id } })}
          style={styles.row}
        >
          <Text style={styles.name}>{item.roomCode} · {item.playerCount} players</Text>
          <Text style={styles.text}>{item.myRole ? roleNames[item.myRole as RoleToken] : ""} · {item.won ? moreCopy.historyWon : moreCopy.historyLost}</Text>
          <Text style={styles.text}>{new Date(item.endedAt).toLocaleDateString()}</Text>
        </Pressable>
      ))}
    </ScreenFrame>
  )
}

const styles = StyleSheet.create({
  summary: {
    fontFamily: fontFamily.interfaceSemiBold,
    fontSize: fontSize.md,
    color: colors.accent,
  },
  row: {
    minHeight: 44,
    padding: spacing.md,
    gap: spacing.xs,
    borderRadius: radii.control,
    backgroundColor: colors.surfaceRaised,
  },
  name: {
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
