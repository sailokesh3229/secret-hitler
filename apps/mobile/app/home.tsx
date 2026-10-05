/* S6 Home: resume banner (only when a game is running), create or join a
   room, recent games preview, and the profile avatar in the top corner.
   How to play and Profile are placeholders until S21/S22 are built. */
import { useRouter, useLocalSearchParams } from "expo-router"
import { StyleSheet, Text, View } from "react-native"
import { colors, fontFamily, fontSize, radii, screenCopy, spacing } from "@game/theme"
import { Avatar } from "../src/components/Avatar.js"
import { Button } from "../src/components/Button.js"
import { ScreenFrame } from "../src/components/ScreenFrame.js"

const MOCK_PLAYER_NAME = "Arjun"
const MOCK_RESUME_ROOM_ID = "K7M2QX"
const MOCK_HISTORY = [
  { date: "28 Sep", playerCount: 7 },
  { date: "21 Sep", playerCount: 5 },
]

export default function HomeScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ state?: string }>()
  const showResume = params.state === "resume"
  const history = params.state === "empty" ? [] : MOCK_HISTORY
  const status = params.state === "offline" ? "offline" : params.state === "loading" ? "loading" : "ready"

  return (
    <ScreenFrame title={screenCopy.greeting(MOCK_PLAYER_NAME)} status={status}>
      <View style={styles.corner}>
        <Avatar name={MOCK_PLAYER_NAME} size={48} />
      </View>

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
        {history.length === 0 ? (
          <Text style={styles.empty}>{screenCopy.noGames}</Text>
        ) : (
          history.map((game) => (
            <Text key={game.date} style={styles.historyLine}>
              {screenCopy.historyLine(game.date, game.playerCount)}
            </Text>
          ))
        )}
      </View>

      <Button label={screenCopy.howToPlay} variant="secondary" disabled />
      <Button label={screenCopy.profile} variant="secondary" disabled />
    </ScreenFrame>
  )
}

const styles = StyleSheet.create({
  corner: {
    alignSelf: "flex-end",
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
