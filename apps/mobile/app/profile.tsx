/* S21 Profile and settings: username, sound, haptics and reduced motion (kept
   on this phone), how to play, credits, log out, and account deletion. Deleting
   the account removes it on the server, then signs this phone out. */
import { useState } from "react"
import { useRouter } from "expo-router"
import { StyleSheet, Switch, Text, View } from "react-native"
import { actionLabels, colors, fontFamily, fontSize, moreCopy, screenCopy, spacing } from "@game/theme"
import { Button } from "../src/components/Button.js"
import { ScreenFrame } from "../src/components/ScreenFrame.js"
import { Sheet } from "../src/components/Sheet.js"
import { Toast } from "../src/components/Toast.js"
import { useGameStore } from "../src/game/store.js"
import { apiEnabled, currentUsername, gamesApi } from "../src/lib/api.js"
import { signOutAccount } from "../src/lib/firebase.js"
import { getSettings, updateSettings, type Settings } from "../src/lib/settings.js"
import { useProtectedSession } from "../src/lib/useProtectedSession.js"

export default function ProfileScreen() {
  const router = useRouter()
  const session = useProtectedSession()
  const disconnectRemote = useGameStore((store) => store.disconnectRemote)
  const [settings, setSettings] = useState<Settings>(() => getSettings())
  const [confirming, setConfirming] = useState(false)
  const [failed, setFailed] = useState(false)

  function setFlag(key: keyof Settings, value: boolean) {
    setSettings(() => ({ ...settings, [key]: value }))
    void updateSettings({ [key]: value })
  }

  async function signOut() {
    disconnectRemote()
    await signOutAccount()
    router.replace("/welcome")
  }

  async function deleteAccount() {
    setFailed(false)
    if (apiEnabled()) {
      try {
        await gamesApi.deleteAccount()
      } catch {
        setFailed(true)
        return
      }
    }
    await signOut()
  }

  const row = (label: string, value: boolean, key: keyof Settings) => (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Switch value={value} onValueChange={(next) => setFlag(key, next)} trackColor={{ false: colors.disabled, true: colors.accent }} thumbColor={colors.paper} />
    </View>
  )

  if (session.state === "loading") return <ScreenFrame title={moreCopy.profileTitle} status="loading">{null}</ScreenFrame>
  if (session.state === "error") return <ScreenFrame title={moreCopy.profileTitle} status="error"><Button label={screenCopy.tryAgain} onPress={session.retry} /></ScreenFrame>

  return (
    <ScreenFrame title={moreCopy.profileTitle} onBack={() => router.back()}>
      <Text style={styles.label}>
        {moreCopy.profileUsername}: {currentUsername() ?? ""}
      </Text>

      <Text style={styles.section}>{moreCopy.profileSettings}</Text>
      {row(moreCopy.profileSound, settings.sound, "sound")}
      {row(moreCopy.profileHaptics, settings.haptics, "haptics")}
      {row(moreCopy.profileReducedMotion, settings.reducedMotion, "reducedMotion")}

      <Button label={moreCopy.profileHowToPlay} variant="secondary" onPress={() => router.push("/how-to-play")} />
      <Button label={moreCopy.profileCredits} variant="secondary" onPress={() => router.push("/credits")} />
      <Button label={moreCopy.profileSignOut} variant="secondary" onPress={() => void signOut()} />

      {failed && <Toast text={moreCopy.profileDeleteFailed} tone="danger" />}
      {confirming ? (
        <Sheet title={moreCopy.profileDeleteSheet}>
          <Text style={styles.label}>{moreCopy.profileDeleteBody}</Text>
          <Button label={moreCopy.profileDeleteConfirm} onPress={() => void deleteAccount()} />
          <Button label={actionLabels.cancel} variant="secondary" onPress={() => setConfirming(false)} />
        </Sheet>
      ) : (
        <Button label={moreCopy.profileDelete} variant="secondary" onPress={() => setConfirming(true)} />
      )}
    </ScreenFrame>
  )
}

const styles = StyleSheet.create({
  section: {
    fontFamily: fontFamily.interfaceSemiBold,
    fontSize: fontSize.lg,
    color: colors.accent,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  label: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.md,
    color: colors.textOnDark,
    flexShrink: 1,
    paddingRight: spacing.sm,
  },
})
