/* Email and password sign-in through Firebase (plan Step 9). Shown instead of the
   fake one-time code when Firebase is configured. Phone, Google and Apple need
   an EAS development build and are not offered here yet. */
import { useState } from "react"
import { useRouter } from "expo-router"
import { screenCopy } from "@game/theme"
import { Button } from "../src/components/Button.js"
import { ScreenFrame } from "../src/components/ScreenFrame.js"
import { TextField } from "../src/components/TextField.js"
import { Toast } from "../src/components/Toast.js"
import { createAccountWithEmail, signInWithEmail } from "../src/lib/firebase.js"

export default function EmailScreen() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)

  async function run(action: (address: string, secret: string) => Promise<void>) {
    setBusy(true)
    setFailed(false)
    try {
      await action(email.trim(), password)
      router.replace("/username")
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScreenFrame title={screenCopy.emailTitle} onBack={() => router.back()}>
      <TextField label={screenCopy.emailLabel} value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextField label={screenCopy.passwordLabel} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
      {failed && <Toast text={screenCopy.emailSignInFailed} tone="danger" />}
      <Button label={screenCopy.logInWithEmail} disabled={busy || email.length === 0 || password.length === 0} onPress={() => void run(signInWithEmail)} />
      <Button label={screenCopy.createAccountWithEmail} variant="secondary" disabled={busy || email.length === 0 || password.length === 0} onPress={() => void run(createAccountWithEmail)} />
    </ScreenFrame>
  )
}
