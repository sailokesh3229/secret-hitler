/* Email and password auth through Firebase on web and native platforms. */
import { useState } from "react"
import { useLocalSearchParams, useRouter } from "expo-router"
import { screenCopy } from "@game/theme"
import { Button } from "../src/components/Button.js"
import { ScreenFrame } from "../src/components/ScreenFrame.js"
import { TextField } from "../src/components/TextField.js"
import { Toast } from "../src/components/Toast.js"
import { createAccountWithEmail, resetEmailPassword, signInWithEmail } from "../src/lib/firebase.js"
import { api, ApiError, setSessionUsername } from "../src/lib/api.js"

export default function EmailScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ mode?: string; roomId?: string; next?: string }>()
  const signUp = params.mode === "signup"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function run() {
    setBusy(true)
    setFailed(false)
    try {
      await (signUp ? createAccountWithEmail : signInWithEmail)(email.trim(), password)
      if (signUp) {
        router.replace({ pathname: "/username", params: { ...(params.roomId ? { roomId: params.roomId } : {}), ...(params.next === "create-room" ? { next: params.next } : {}) } })
      } else {
        try {
          const me = await api.me()
          setSessionUsername(me.username)
          router.replace(params.roomId ? { pathname: "/join-room", params: { roomId: params.roomId } } : params.next === "create-room" ? "/create-room" : "/home")
        } catch (error) {
          if (error instanceof ApiError && error.status === 404) router.replace({ pathname: "/username", params: { ...(params.roomId ? { roomId: params.roomId } : {}), ...(params.next === "create-room" ? { next: params.next } : {}) } })
          else throw error
        }
      }
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  async function resetPassword() {
    if (!email.trim()) return
    setBusy(true)
    setFailed(false)
    try {
      await resetEmailPassword(email.trim())
      setResetSent(true)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScreenFrame title={signUp ? screenCopy.createAccountWithEmail : screenCopy.emailTitle} onBack={() => router.back()}>
      <TextField label={screenCopy.emailLabel} value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextField label={screenCopy.passwordLabel} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
      {failed && <Toast text={screenCopy.emailSignInFailed} tone="danger" />}
      {resetSent && <Toast text={screenCopy.resetPasswordSent} tone="success" />}
      <Button label={signUp ? screenCopy.createAccountWithEmail : screenCopy.logInWithEmail} disabled={busy || email.length === 0 || password.length === 0} onPress={() => void run()} />
      {!signUp && <Button label={screenCopy.resetPassword} variant="secondary" disabled={busy || email.length === 0} onPress={() => void resetPassword()} />}
    </ScreenFrame>
  )
}
