/* S7 Create room: table mode, room password, settings, then the generated
   6-character Room ID (no look-alike characters, see mockServer.ts). */
import { useState } from "react"
import { useLocalSearchParams, useRouter } from "expo-router"
import { Share, StyleSheet, Switch, Text, View } from "react-native"
import { colors, fontFamily, fontSize, radii, screenCopy, spacing } from "@game/theme"
import { Button } from "../src/components/Button.js"
import { ScreenFrame, type ScreenStatus } from "../src/components/ScreenFrame.js"
import { Segmented } from "../src/components/Segmented.js"
import { TextField } from "../src/components/TextField.js"
import { createMockRoom, type MockRoom, type TableMode } from "../src/lib/mockServer.js"
import { passwordProblem } from "../src/lib/validation.js"

const MODE_OPTIONS: { value: TableMode; label: string }[] = [
  { value: "MODE_IN_PERSON", label: screenCopy.inPerson },
  { value: "MODE_ONLINE", label: screenCopy.online },
]

export default function CreateRoomScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ state?: string }>()
  const [mode, setMode] = useState<TableMode>("MODE_IN_PERSON")
  const [password, setPassword] = useState("")
  const [timers, setTimers] = useState(true)
  const [chat, setChat] = useState(true)
  const [room, setRoom] = useState<MockRoom | null>(null)
  const problem = passwordProblem(password)
  const passwordError = password.length > 0 && problem !== null ? screenCopy.passwordLength : undefined
  const status: ScreenStatus =
    params.state === "offline" ? "offline" : params.state === "loading" ? "loading" : params.state === "error" ? "error" : "ready"

  if (room) {
    return (
      <ScreenFrame title={screenCopy.roomIdTitle} onBack={() => setRoom(null)}>
        <View style={styles.idCard}>
          <Text style={styles.idLabel}>{screenCopy.roomIdTitle}</Text>
          <Text style={styles.id}>{room.id}</Text>
          <Text style={styles.hint}>{screenCopy.roomIdShareHint}</Text>
        </View>
        <Button label={screenCopy.shareInvite} variant="secondary" onPress={() => void Share.share({ message: screenCopy.shareMessage(room.id) })} />
        <Button label={screenCopy.goToLobby} onPress={() => router.replace({ pathname: "/lobby", params: { roomId: room.id, count: String(room.playerCount), role: "host" } })} />
      </ScreenFrame>
    )
  }

  return (
    <ScreenFrame title={screenCopy.createRoomTitle} status={status} onBack={() => router.back()}>
      <View style={styles.field}>
        <Text style={styles.label}>{screenCopy.tableMode}</Text>
        <Segmented options={MODE_OPTIONS} value={mode} onChange={setMode} />
        <Text style={styles.hint}>{mode === "MODE_ONLINE" ? screenCopy.onlineHint : screenCopy.inPersonHint}</Text>
      </View>

      <TextField
        label={screenCopy.roomPassword}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        maxLength={8}
        errorText={passwordError}
      />
      <Text style={styles.hint}>{screenCopy.roomPasswordHint}</Text>

      <View style={styles.switchRow}>
        <Text style={styles.label}>{screenCopy.phaseTimers}</Text>
        <Switch value={timers} onValueChange={setTimers} trackColor={{ false: colors.disabled, true: colors.accent }} thumbColor={colors.paper} />
      </View>
      {mode === "MODE_ONLINE" && (
        <View style={styles.switchRow}>
          <Text style={styles.label}>{screenCopy.tableChat}</Text>
          <Switch value={chat} onValueChange={setChat} trackColor={{ false: colors.disabled, true: colors.accent }} thumbColor={colors.paper} />
        </View>
      )}

      <Button
        label={screenCopy.createRoomAction}
        disabled={problem !== null}
        onPress={() => setRoom(createMockRoom(password))}
      />
    </ScreenFrame>
  )
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.sm,
  },
  label: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.md,
    color: colors.textOnDark,
  },
  hint: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.sm,
    color: colors.textOnDarkMuted,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  idCard: {
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radii.control,
    backgroundColor: colors.paper,
  },
  idLabel: {
    fontFamily: fontFamily.interfaceSemiBold,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  id: {
    fontFamily: fontFamily.documentBold,
    fontSize: fontSize.xxl,
    letterSpacing: 4,
    color: colors.ink,
  },
})
