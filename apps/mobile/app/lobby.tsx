/* S9 Lobby: seats in order with avatar, name, host badge, ready tag and
   connection dot. Host can reorder seats (In-person), remove players and
   start the game once 5-10 players are all ready. Players see the same
   list with the host controls hidden. Start and settings are placeholders
   until plan.md Steps 7 and 10. */
import { useState } from "react"
import { useLocalSearchParams, useRouter } from "expo-router"
import { Share, StyleSheet, Text, View } from "react-native"
import type { PlayerCount } from "@game/engine"
import { colors, fontFamily, fontSize, radii, screenCopy, spacing } from "@game/theme"
import { Avatar } from "../src/components/Avatar.js"
import { Badge } from "../src/components/Badge.js"
import { Button } from "../src/components/Button.js"
import { FascistTrack } from "../src/components/FascistTrack.js"
import { LiberalTrack } from "../src/components/LiberalTrack.js"
import { ScreenFrame, type ScreenStatus } from "../src/components/ScreenFrame.js"
import { mockLobbyPlayers, type LobbyPlayer } from "../src/lib/mockServer.js"

const MIN_PLAYERS = 5
const MAX_PLAYERS = 10
const MOCK_HOST_NAME = "Arjun"
const MOCK_PLAYER_NAME = "Maya"

export default function LobbyScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ roomId?: string; count?: string; role?: string; state?: string }>()
  const isHost = params.role !== "player"
  const requestedCount = Number(params.count ?? "6")
  const startCount = Math.min(MAX_PLAYERS, Math.max(1, Number.isFinite(requestedCount) ? requestedCount : 6))
  const roomId = params.roomId ?? "K7M2QX"
  const meName = isHost ? MOCK_HOST_NAME : MOCK_PLAYER_NAME
  const [players, setPlayers] = useState<LobbyPlayer[]>(() => mockLobbyPlayers(startCount, params.state === "notReady"))
  const [reordering, setReordering] = useState(false)

  const me = players.find((player) => player.name === meName)
  const canStart = isHost && players.length >= MIN_PLAYERS && players.length <= MAX_PLAYERS && players.every((player) => player.ready)
  const boardCount = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, players.length)) as PlayerCount
  const status: ScreenStatus = params.state === "offline" ? "offline" : params.state === "loading" ? "loading" : params.state === "error" ? "error" : "ready"

  function toggleReady() {
    setPlayers((current) => current.map((player) => (player.name === meName ? { ...player, ready: !player.ready } : player)))
  }

  function move(index: number, direction: -1 | 1) {
    setPlayers((current) => {
      const target = index + direction
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      const [moved] = next.splice(index, 1)
      if (!moved) return current
      next.splice(target, 0, moved)
      return next
    })
  }

  function remove(name: string) {
    setPlayers((current) => current.filter((player) => player.name !== name))
  }

  return (
    <ScreenFrame title={screenCopy.lobbyTitle} status={status} onBack={() => router.replace("/home")}>
      <View style={styles.header}>
        <Text style={styles.roomId}>{roomId}</Text>
        <Text style={styles.count}>{screenCopy.playerCountLine(players.length, MAX_PLAYERS)}</Text>
        <Button label={screenCopy.shareInvite} variant="secondary" onPress={() => void Share.share({ message: screenCopy.shareMessage(roomId) })} />
      </View>

      <View style={styles.seats}>
        {players.map((player, index) => (
          <View key={player.name} style={styles.seat}>
            <View style={styles.seatMain}>
              <Avatar name={player.name} size={44} />
              <View style={styles.seatText}>
                <Text style={styles.name}>{player.name}</Text>
                <View style={styles.badges}>
                  {index === 0 && <Badge kind="host" />}
                  {!player.connected && <Badge kind="disconnected" />}
                </View>
              </View>
              <View style={styles.readyBlock}>
                <View style={[styles.dot, { backgroundColor: player.connected ? colors.success : colors.danger }]} />
                <Text style={styles.readyText}>{player.ready ? screenCopy.readyTag : screenCopy.notReadyTag}</Text>
              </View>
            </View>
            {isHost && reordering && (
              <View style={styles.seatActions}>
                <Button label={screenCopy.moveUp} variant="secondary" disabled={index === 0} onPress={() => move(index, -1)} />
                <Button label={screenCopy.moveDown} variant="secondary" disabled={index === players.length - 1} onPress={() => move(index, 1)} />
                {index !== 0 && <Button label={screenCopy.removePlayer(player.name)} variant="secondary" onPress={() => remove(player.name)} />}
              </View>
            )}
          </View>
        ))}
      </View>

      <View style={styles.board}>
        <Text style={styles.sectionTitle}>{screenCopy.boardFor(boardCount)}</Text>
        <FascistTrack playerCount={boardCount} enactedCount={0} />
        <LiberalTrack enactedCount={0} />
      </View>

      {!isHost && <Text style={styles.waiting}>{screenCopy.waitingForHost}</Text>}

      <Button
        label={me?.ready ? screenCopy.notReadyAction : screenCopy.readyAction}
        variant={me?.ready ? "secondary" : "primary"}
        onPress={toggleReady}
      />

      {isHost && (
        <View style={styles.hostActions}>
          <Button label={reordering ? screenCopy.doneReordering : screenCopy.reorderSeats} variant="secondary" onPress={() => setReordering((value) => !value)} />
          <Button label={screenCopy.roomSettings} variant="secondary" disabled />
          <Button label={screenCopy.startGame} disabled={!canStart} />
          {!canStart && <Text style={styles.waiting}>{screenCopy.startBlocked}</Text>}
        </View>
      )}

      <Button label={screenCopy.leaveRoom} variant="secondary" onPress={() => router.replace("/home")} />
    </ScreenFrame>
  )
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    gap: spacing.sm,
  },
  roomId: {
    fontFamily: fontFamily.documentBold,
    fontSize: fontSize.xl,
    letterSpacing: 4,
    color: colors.accent,
  },
  count: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.md,
    color: colors.textOnDark,
  },
  seats: {
    gap: spacing.sm,
  },
  seat: {
    padding: spacing.md,
    borderRadius: radii.control,
    backgroundColor: colors.surfaceRaised,
    gap: spacing.sm,
  },
  seatMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  seatText: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    fontFamily: fontFamily.interfaceSemiBold,
    fontSize: fontSize.md,
    color: colors.textOnDark,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  readyBlock: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radii.full,
  },
  readyText: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.xs,
    color: colors.textOnDarkMuted,
  },
  seatActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  board: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontFamily: fontFamily.interfaceSemiBold,
    fontSize: fontSize.lg,
    color: colors.accent,
  },
  waiting: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.sm,
    color: colors.textOnDarkMuted,
    textAlign: "center",
  },
  hostActions: {
    gap: spacing.md,
  },
})
