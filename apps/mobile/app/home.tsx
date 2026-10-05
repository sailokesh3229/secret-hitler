/* S6 Home: resume banner (only when a game is running), create or join a
   room, recent games (from the server when it is set up), how to play, and
   the profile avatar in the top corner. */
import { useEffect, useState } from "react"
import { useLocalSearchParams, useRouter } from "expo-router"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { colors, fontFamily, fontSize, moreCopy, radii, screenCopy, spacing } from "@game/theme"
import { Avatar } from "../src/components/Avatar.js"
import { Button } from "../src/components/Button.js"
import { ScreenFrame, type ScreenStatus } from "../src/components/ScreenFrame.js"
import { apiEnabled, currentUsername, gamesApi, type GameListItemView } from "../src/lib/api.js"

const MOCK_PLAYER_NAME = "Arjun"
const MOCK_RESUME_ROOM_ID = "K7M2QX"
const MOCK_HISTORY = [
  { date: "28 Sep", playerCount: 7 },
  { date: "21 Sep", playerCount: 5 },
]

export default function HomeScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ state?: string }>()
  const live = apiEnabled()
  const name = currentUsername() || MOCK_PLAYER_NAME
  const [recent, setRecent] = useState<GameListItemView[] | null>(null)

  useEffect(() => {
    if (!live) return
    gamesApi.mine().then((items) => setRecent(items.slice(0, 2))).catch(() => setRecent([]))
  }, [live])

  const showResume = params.state === "resume"
  const status: ScreenStatus = params.state === "offline" ? "offline" : params.state === "loading" ? "loading" : "ready"
  const mockHistory = params.state === "empty" ? [] : MOCK_HISTORY

  return (
    <ScreenFrame title={screenCopy.greeting(name)} status={status}>
      <Pressable accessibilityRole="button" accessibilityLabel={screenCopy.profile} onPress={() => router.push("/profile")} style={styles.corner}>
        <Avatar name={name} size={48} />
      </Pressable>

      {showResume && (
        <View style={styles.resume}>
          <Text style={styles.resumeText}>{screenCopy.resumeBanner(MOCK_RESUME_ROOM_ID)}</Text>
          <Button label={screenCopy.resumeGame} onPress={() => router.push({ pathname: "/lobby", params: { roomId: MOCK_RESUME_ROOM_ID, count: "6", role: "host" } })} />
        </View>
      )}

      <Button label={screenCopy.createRoom} onPress={() => router.push("/create-room")} />
      <Button label={screenCopy.joinRoom} variant="secondary" onPress={() => router.push("/join-room")} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{screenCopy.recentGames}</Text>
        {live && recent !== null && recent.length === 0 && <Text style={styles.empty}>{screenCopy.noGames}</Text>}
        {live &&
          (recent ?? []).map((game) => (
            <Text key={game.id} style={styles.historyLine}>
              {screenCopy.historyLine(new Date(game.endedAt).toLocaleDateString(), game.playerCount)} · {game.won ? moreCopy.historyWon : moreCopy.historyLost}
            </Text>
          ))}
        {!live && mockHistory.length === 0 && <Text style={styles.empty}>{screenCopy.noGames}</Text>}
        {!live && mockHistory.map((game) => <Text key={game.date} style={styles.historyLine}>{screenCopy.historyLine(game.date, game.playerCount)}</Text>)}
        <Button label={moreCopy.historyTitle} variant="secondary" onPress={() => router.push("/history")} />
      </View>

      <Button label={screenCopy.howToPlay} variant="secondary" onPress={() => router.push("/how-to-play")} />
    </ScreenFrame>
  )
}

const styles = StyleSheet.create({
  corner: {
    alignSelf: "flex-end",
    minHeight: 44,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  resume: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.control,
    backgroundColor: colors.surfaceRaised,
  },
  resumeText: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.md,
    color: colors.textOnDark,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fontFamily.interfaceSemiBold,
    fontSize: fontSize.lg,
    color: colors.accent,
  },
  historyLine: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.md,
    color: colors.textOnDark,
  },
  empty: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.md,
    color: colors.textOnDarkMuted,
  },
})
