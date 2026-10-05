/* S4 One-time code: six boxes, one hidden input so SMS auto-fill and
   paste work, resend unlocks after 30 s. Any 6 digits are accepted
   until Step 9; the dev state "error" shows the wrong-code message. */
import { useEffect, useRef, useState } from "react"
import { useLocalSearchParams, useRouter } from "expo-router"
import { Pressable, StyleSheet, Text, TextInput } from "react-native"
import { colors, fontFamily, fontSize, screenCopy, spacing } from "@game/theme"
import { Button } from "../src/components/Button.js"
import { OtpBoxes } from "../src/components/OtpBoxes.js"
import { ScreenFrame, type ScreenStatus } from "../src/components/ScreenFrame.js"
import { Toast } from "../src/components/Toast.js"

const RESEND_SECONDS = 30
const CODE_LENGTH = 6

export default function CodeScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ method?: string; state?: string }>()
  const inputRef = useRef<TextInput>(null)
  const [code, setCode] = useState("")
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS)
  const digits = code.replace(/\D/g, "").slice(0, CODE_LENGTH)
  const status: ScreenStatus = params.state === "offline" ? "offline" : params.state === "loading" ? "loading" : "ready"
  const showWrongCode = params.state === "error"
  const contact = params.method === "email" ? screenCopy.codeContactEmail : screenCopy.codeContactPhone

  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = setTimeout(() => setSecondsLeft((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft])

  return (
    <ScreenFrame title={screenCopy.codeTitle} status={status} onBack={() => router.back()}>
      <Text style={styles.hint}>{screenCopy.codeSent(contact)}</Text>
      <Pressable accessibilityRole="none" onPress={() => inputRef.current?.focus()}>
        <OtpBoxes value={digits} />
      </Pressable>
      <TextInput
        ref={inputRef}
        value={digits}
        onChangeText={setCode}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={CODE_LENGTH}
        style={styles.hiddenInput}
      />
      {showWrongCode && <Toast text={screenCopy.wrongCode} tone="danger" />}
      <Button
        label={screenCopy.verifyCode}
        disabled={digits.length !== CODE_LENGTH}
        onPress={() => router.replace("/username")}
      />
      {secondsLeft > 0 ? (
        <Text style={styles.resendWait}>{screenCopy.resendIn(secondsLeft)}</Text>
      ) : (
        <Button label={screenCopy.resendCode} variant="secondary" onPress={() => setSecondsLeft(RESEND_SECONDS)} />
      )}
    </ScreenFrame>
  )
}

const styles = StyleSheet.create({
  hint: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.md,
    color: colors.textOnDarkMuted,
  },
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
  resendWait: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.sm,
    color: colors.textOnDarkMuted,
    textAlign: "center",
    paddingVertical: spacing.sm,
  },
})
