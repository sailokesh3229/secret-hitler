/* S3: only offer authentication that actually works in this build. */
import { useState } from "react"
import { useLocalSearchParams, useRouter } from "expo-router"
import { screenCopy } from "@game/theme"
import { ScreenFrame } from "../src/components/ScreenFrame.js"
import { Button } from "../src/components/Button.js"
import { StyleSheet, Text } from "react-native"
import { colors, fontFamily, fontSize } from "@game/theme"
import { firebaseConfigured } from "../src/lib/firebase.js"
import { apiEnabled, DEV_LOGIN } from "../src/lib/api.js"
import { startGuestSession } from "../src/lib/guestSession.js"
import { Toast } from "../src/components/Toast.js"

export default function LoginScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ mode?: string; roomId?: string; next?: string }>()
  const signUp = params.mode === "signup"
  const firebase = firebaseConfigured()
  const guest = !firebase && DEV_LOGIN && apiEnabled()
  const [guestError, setGuestError] = useState(false)
  const [busy, setBusy] = useState(false)
  async function beginGuest() {
    setBusy(true)
    setGuestError(false)
    try {
      await startGuestSession()
      router.push({ pathname: "/username", params: { ...(params.roomId ? { roomId: params.roomId } : {}), ...(params.next === "create-room" ? { next: params.next } : {}) } })
    } catch (error) {
      console.warn("Guest sign-in failed:", error)
      setGuestError(true)
    } finally {
      setBusy(false)
    }
  }
  return (
    <ScreenFrame title={signUp ? screenCopy.signUp : screenCopy.logIn} onBack={() => router.back()}>
      <Text style={styles.hint}>{firebase ? screenCopy.loginHint : guest ? screenCopy.guestLoginHint : screenCopy.authNotConfigured}</Text>
      {firebase && <Button label={screenCopy.continueWithEmail} onPress={() => router.push({ pathname: "/email", params: { mode: signUp ? "signup" : "login", ...(params.roomId ? { roomId: params.roomId } : {}), ...(params.next === "create-room" ? { next: params.next } : {}) } })} />}
      {guestError && <Toast text={screenCopy.offline} tone="danger" />}
      {guest && <Button label={screenCopy.continueAsGuest} disabled={busy} onPress={() => void beginGuest()} />}
    </ScreenFrame>
  )
}

const styles = StyleSheet.create({
  hint: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.md,
    color: colors.textOnDarkMuted,
  },
})
