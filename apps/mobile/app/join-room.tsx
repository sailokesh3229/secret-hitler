/* S8 Join room: Room ID + password. Every error has its own message, and
   5 wrong passwords lock the form for 5 minutes (mockServer.ts). The dev
   menu opens each error directly with ?state=<key>. */
import { useState } from "react"
import { useLocalSearchParams, useRouter } from "expo-router"
import { StyleSheet, Text } from "react-native"
import { colors, fontFamily, fontSize, screenCopy } from "@game/theme"
import { Button } from "../src/components/Button.js"
import { ScreenFrame, type ScreenStatus } from "../src/components/ScreenFrame.js"
import { TextField } from "../src/components/TextField.js"
import { Toast } from "../src/components/Toast.js"
import { joinMockRoom, type JoinError } from "../src/lib/mockServer.js"
import { api, ApiError, mockAllowed, serverConfigured } from "../src/lib/api.js"
import { isRoomIdComplete, ROOM_ID_LENGTH } from "../src/lib/validation.js"

type FormError = JoinError | "ID_LENGTH"

const ERROR_COPY: Record<FormError, string> = {
  NO_ROOM: screenCopy.errNoRoom,
  WRONG_PASSWORD: screenCopy.errWrongPassword,
  LOCKED: screenCopy.errLocked,
  FULL: screenCopy.errFull,
  STARTED: screenCopy.errStarted,
  ID_LENGTH: screenCopy.roomIdLength,
}

const SERVER_ERROR_TO_FORM: Record<string, FormError> = {
  ROOM_NOT_FOUND: "NO_ROOM",
  WRONG_PASSWORD: "WRONG_PASSWORD",
  ROOM_LOCKED: "LOCKED",
  ROOM_FULL: "FULL",
  GAME_STARTED: "STARTED",
}

const DEV_ERRORS: Record<string, FormError> = {
  noRoom: "NO_ROOM",
  wrongPassword: "WRONG_PASSWORD",
  locked: "LOCKED",
  full: "FULL",
  started: "STARTED",
}

export default function JoinRoomScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ state?: string; roomId?: string }>()
  const devError = params.state ? DEV_ERRORS[params.state] : undefined
  const [roomId, setRoomId] = useState(() => (params.roomId ?? "").toUpperCase().slice(0, ROOM_ID_LENGTH))
  const [password, setPassword] = useState("")
  const [error, setError] = useState<FormError | null>(devError ?? null)
  const isLocked = error === "LOCKED"
  const status: ScreenStatus = params.state === "offline" ? "offline" : params.state === "loading" ? "loading" : "ready"

  async function submitToServer() {
    try {
      const view = await api.joinRoom(roomId, password)
      setError(null)
      router.replace({ pathname: "/lobby", params: { roomId: view.code, count: String(view.seats.length), role: "player" } })
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : ""
      setError(SERVER_ERROR_TO_FORM[code] ?? null)
    }
  }

  function submit() {
    if (!isRoomIdComplete(roomId)) {
      setError("ID_LENGTH")
      return
    }
    if (serverConfigured()) {
      void submitToServer()
      return
    }
    if (!mockAllowed()) {
      setError("NO_ROOM")
      return
    }
    const result = joinMockRoom(roomId, password)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(null)
    router.replace({ pathname: "/lobby", params: { roomId: result.room.id, count: String(result.room.playerCount), role: "player" } })
  }

  const fieldError = error === "ID_LENGTH" ? ERROR_COPY.ID_LENGTH : undefined
  const formError = error && error !== "ID_LENGTH" ? ERROR_COPY[error] : undefined

  return (
    <ScreenFrame title={screenCopy.joinRoomTitle} status={status} onBack={() => router.back()}>
      <TextField
        label={screenCopy.roomIdLabel}
        value={roomId}
        onChangeText={(next) => {
          setRoomId(next.toUpperCase().slice(0, ROOM_ID_LENGTH))
          setError(null)
        }}
        placeholder="K7M2QX"
        maxLength={ROOM_ID_LENGTH}
        errorText={fieldError}
      />
      <Text style={styles.hint}>{screenCopy.roomIdHint}</Text>
      <TextField
        label={screenCopy.roomPassword}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        maxLength={8}
      />
      {formError && <Toast text={formError} tone="danger" />}
      <Button label={screenCopy.joinRoomAction} disabled={isLocked} onPress={submit} />
    </ScreenFrame>
  )
}

const styles = StyleSheet.create({
  hint: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.sm,
    color: colors.textOnDarkMuted,
  },
})
