/* S9 Lobby: seats in order with avatar, name, host badge, ready tag and
   connection dot. Host can reorder seats (In-person), remove players and
   start the game once 5-10 players are all ready. Players see the same
   list with the host controls hidden.

   With a server configured (EXPO_PUBLIC_API_URL) the lobby shows the live
   room: the view comes from the server and updates over Socket.IO, and
   every action is sent to the server. Without one, the local mock keeps
   the screen usable for design review. Live games run on the server. */
import { useEffect, useState } from "react"
import { useLocalSearchParams, useRouter } from "expo-router"
import { StyleSheet, Text, useWindowDimensions, View } from "react-native"
import type { PlayerCount } from "@game/engine"
import { colors, fontFamily, fontSize, radii, screenCopy, spacing } from "@game/theme"
import { Avatar } from "../src/components/Avatar.js"
import { BrandSeal } from "../src/components/BrandSeal.js"
import { Badge } from "../src/components/Badge.js"
import { Button } from "../src/components/Button.js"
import { FascistTrack } from "../src/components/FascistTrack.js"
import { LiberalTrack } from "../src/components/LiberalTrack.js"
import { ScreenFrame, type ScreenStatus } from "../src/components/ScreenFrame.js"
import { api, currentUsername, serverConfigured, subscribeToRoom, type RoomView } from "../src/lib/api.js"
import { mockLobbyPlayers, type LobbyPlayer } from "../src/lib/mockServer.js"
import { useGameStore } from "../src/game/store.js"
import { shareInvite } from "../src/lib/invite.js"
import { Toast } from "../src/components/Toast.js"

const MIN_PLAYERS = 5
const MAX_PLAYERS = 10
const MOCK_HOST_NAME = "Arjun"
const MOCK_PLAYER_NAME = "Maya"

interface Row {
  id: string
  name: string
  ready: boolean
  connected: boolean
}

export default function LobbyScreen() {
  const router = useRouter()
  const { width } = useWindowDimensions()
  const desktop = width >= 800
  const params = useLocalSearchParams<{ roomId?: string; count?: string; role?: string; state?: string }>()
  const isHost = params.role !== "player"
  const requestedCount = Number(params.count ?? "6")
  const startCount = Math.min(MAX_PLAYERS, Math.max(1, Number.isFinite(requestedCount) ? requestedCount : 6))
  const roomId = params.roomId ?? "K7M2QX"
  const live = serverConfigured()
  const startLocalGame = useGameStore((store) => store.start)
  const setViewer = useGameStore((store) => store.setViewer)
  const connectRemote = useGameStore((store) => store.connectRemote)

  const [mockPlayers, setMockPlayers] = useState<LobbyPlayer[]>(() => mockLobbyPlayers(startCount, params.state === "notReady"))
  const [serverView, setServerView] = useState<RoomView | null>(null)
  const [reordering, setReordering] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [shareStatus, setShareStatus] = useState<string | null>(null)

  async function shareRoom() {
    setShareStatus(null)
    try {
      const result = await shareInvite(roomId)
      if (result === "copied") setShareStatus(screenCopy.shareCopied)
    } catch {
      setShareStatus(screenCopy.shareFailed)
    }
  }

  function enterRemoteGame() {
    connectRemote(roomId, { username: currentUsername() ?? "" })
    router.replace("/role")
  }

  useEffect(() => {
    if (live && serverView?.status === "STARTED") enterRemoteGame()
  }, [live, serverView?.status])

  useEffect(() => {
    if (!live) return
    let active = true
    void api.getRoom(roomId).then((view) => {
      if (active) setServerView(view)
    }).catch(() => setServerError(screenCopy.genericError))
    const stop = subscribeToRoom(roomId, (view) => {
      if (active) setServerView(view)
    })
    return () => {
      active = false
      stop()
    }
  }, [live, roomId])

  const status: ScreenStatus = params.state === "offline" ? "offline" : params.state === "loading" ? "loading" : params.state === "error" ? "error" : "ready"

  const rows: Row[] = live
    ? (serverView?.seats ?? []).map((seat) => ({ id: seat.userId, name: seat.username, ready: seat.ready, connected: seat.connected }))
    : mockPlayers.map((player) => ({ id: player.name, name: player.name, ready: player.ready, connected: player.connected }))
  const meName = live ? currentUsername() ?? "" : isHost ? MOCK_HOST_NAME : MOCK_PLAYER_NAME
  const me = rows.find((row) => row.name === meName)
  const iAmHost = live ? serverView?.hostId === me?.id : isHost
  const hostId = live ? serverView?.hostId ?? "" : rows[0]?.id ?? ""
  const canStart = live
    ? iAmHost && (serverView?.canStart ?? false)
    : iAmHost && rows.length >= MIN_PLAYERS && rows.length <= MAX_PLAYERS && rows.every((row) => row.ready)
  const boardCount = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, rows.length)) as PlayerCount

  function guard(action: () => Promise<unknown>) {
    setServerError(null)
    action().catch(() => setServerError(screenCopy.genericError))
  }

  function toggleReady() {
    if (live) {
      guard(async () => setServerView(await api.setReady(roomId, !(me?.ready ?? false))))
      return
    }
    setMockPlayers((current) => current.map((player) => (player.name === meName ? { ...player, ready: !player.ready } : player)))
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= rows.length) return
    const order = rows.map((row) => row.id)
    const [moved] = order.splice(index, 1)
    if (moved === undefined) return
    order.splice(target, 0, moved)
    if (live) {
      guard(async () => setServerView(await api.reorderSeats(roomId, order)))
      return
    }
    setMockPlayers((current) => {
      const next = [...current]
      const [item] = next.splice(index, 1)
      if (item) next.splice(target, 0, item)
      return next
    })
  }

  function remove(row: Row) {
    if (live) {
      guard(async () => setServerView(await api.kick(roomId, row.id)))
      return
    }
    setMockPlayers((current) => current.filter((player) => player.name !== row.name))
  }

  function startGame() {
    const seats = rows.map((row) => ({ id: row.name, name: row.name }))
    const hostName = rows.find((row) => row.id === hostId)?.name ?? rows[0]?.name ?? meName
    if (live) {
      guard(async () => {
        setServerView(await api.startRoom(roomId))
        enterRemoteGame()
      })
      return
    }
    startLocalGame(seats, hostName, false)
    setViewer(meName)
    router.replace("/role")
  }

  function leave() {
    if (live) {
      guard(async () => {
        await api.leaveRoom(roomId)
        router.replace("/home")
      })
      return
    }
    router.replace("/home")
  }

  return (
    <ScreenFrame title={screenCopy.lobbyTitle} status={status} errorText={serverError ?? undefined} onBack={leave} variant="open">
      <View style={styles.header}>
        <BrandSeal size={52} />
        <Text style={styles.roomId}>{roomId}</Text>
        <Text style={styles.count}>{screenCopy.playerCountLine(rows.length, MAX_PLAYERS)}</Text>
        {shareStatus && <Toast text={shareStatus} tone={shareStatus === screenCopy.shareCopied ? "success" : "danger"} />}
        <Button label={screenCopy.shareInvite} variant="secondary" onPress={() => void shareRoom()} />
      </View>

      <View style={[styles.seats, desktop && styles.seatsDesktop]}>
        {rows.map((row, index) => (
          <View key={row.id} style={[styles.seat, desktop && styles.seatDesktop]}>
            <View style={styles.seatMain}>
              <Avatar name={row.name} size={44} />
              <View style={styles.seatText}>
                <Text style={styles.name}>{row.name}</Text>
                <View style={styles.badges}>
                  {row.id === hostId && <Badge kind="host" />}
                  {!row.connected && <Badge kind="disconnected" />}
                </View>
              </View>
              <View style={styles.readyBlock}>
                <View style={[styles.dot, { backgroundColor: row.connected ? colors.success : colors.danger }]} />
                <Text style={styles.readyText}>{row.ready ? screenCopy.readyTag : screenCopy.notReadyTag}</Text>
              </View>
            </View>
            {iAmHost && reordering && (
              <View style={styles.seatActions}>
                <Button label={screenCopy.moveUp} variant="secondary" disabled={index === 0} onPress={() => move(index, -1)} />
                <Button label={screenCopy.moveDown} variant="secondary" disabled={index === rows.length - 1} onPress={() => move(index, 1)} />
                {row.id !== hostId && <Button label={screenCopy.removePlayer(row.name)} variant="secondary" onPress={() => remove(row)} />}
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

      {!iAmHost && <Text style={styles.waiting}>{screenCopy.waitingForHost}</Text>}

      <Button
        label={me?.ready ? screenCopy.notReadyAction : screenCopy.readyAction}
        variant={me?.ready ? "secondary" : "primary"}
        onPress={toggleReady}
      />

      {iAmHost && (
        <View style={styles.hostActions}>
          <Button label={reordering ? screenCopy.doneReordering : screenCopy.reorderSeats} variant="secondary" onPress={() => setReordering((value) => !value)} />
          <Button label={screenCopy.roomSettings} variant="secondary" disabled />
          <Button label={screenCopy.startGame} disabled={!canStart} onPress={startGame} />
          {!canStart && <Text style={styles.waiting}>{screenCopy.startBlocked}</Text>}
        </View>
      )}

      <Button label={screenCopy.leaveRoom} variant="secondary" onPress={leave} />
    </ScreenFrame>
  )
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.control,
    backgroundColor: colors.glass,
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
  seatsDesktop: { flexDirection: "row", flexWrap: "wrap" },
  seat: {
    padding: spacing.md,
    borderRadius: radii.control,
    backgroundColor: colors.surfaceRaised,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  seatDesktop: { width: "49%" },
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
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    backgroundColor: colors.glass,
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
