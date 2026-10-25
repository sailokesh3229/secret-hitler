/* S5 Choose username: 3-16 characters, unique, live availability check
   (debounced). The avatar is assigned by the app from the name (Review 1
   design feedback), so the player sees it here but does not pick it. */
import { useEffect, useState } from "react"
import { useLocalSearchParams, useRouter } from "expo-router"
import { StyleSheet, Text, View } from "react-native"
import { colors, fontFamily, fontSize, screenCopy, spacing } from "@game/theme"
import { Avatar } from "../src/components/Avatar.js"
import { Button } from "../src/components/Button.js"
import { ScreenFrame } from "../src/components/ScreenFrame.js"
import { TextField } from "../src/components/TextField.js"
import { isUsernameTaken } from "../src/lib/mockServer.js"
import { api, apiEnabled, ApiError, DEV_LOGIN, setSessionToken, setSessionUsername } from "../src/lib/api.js"
import { usernameProblem } from "../src/lib/validation.js"

const CHECK_DEBOUNCE_MS = 400
type Availability = "idle" | "checking" | "available" | "taken" | "error"

export default function UsernameScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ state?: string }>()
  const [name, setName] = useState("")
  const [checkedName, setCheckedName] = useState("")
  const [availability, setAvailability] = useState<Availability>("idle")
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setCheckedName(name), CHECK_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [name])

  useEffect(() => {
    if (checkedName.length === 0 || usernameProblem(checkedName) !== null) {
      setAvailability("idle")
      return
    }
    let active = true
    setAvailability("checking")
    const check = apiEnabled() ? api.checkUsername(checkedName).then((result) => result.available) : Promise.resolve(!isUsernameTaken(checkedName))
    check
      .then((isAvailable) => {
        if (active) setAvailability(isAvailable ? "available" : "taken")
      })
      .catch(() => {
        if (active) setAvailability("error")
      })
    return () => {
      active = false
    }
  }, [checkedName])

  const problem = usernameProblem(name)
  const isPending = name !== checkedName || availability === "checking" || availability === "idle"
  const available = problem === null && !isPending && availability === "available"
  const problemText =
    problem === "TOO_SHORT"
      ? screenCopy.usernameTooShort
      : problem === "TOO_LONG"
        ? screenCopy.usernameTooLong
        : problem === "BAD_CHARACTERS"
          ? screenCopy.usernameBadCharacters
          : !isPending && availability === "taken"
            ? screenCopy.usernameTaken(name)
            : !isPending && availability === "error"
              ? screenCopy.genericError
              : undefined
  const status = params.state === "offline" ? "offline" : params.state === "loading" ? "loading" : "ready"

  async function save() {
    if (apiEnabled()) {
      if (DEV_LOGIN) setSessionToken("dev:" + name)
      try {
        await api.saveUsername(name)
      } catch (error) {
        if (!(error instanceof ApiError) || error.code !== "ALREADY_HAS_USERNAME") {
          setServerError(error instanceof ApiError && error.code === "USERNAME_TAKEN" ? screenCopy.usernameTaken(name) : screenCopy.genericError)
          return
        }
      }
      setSessionUsername(name)
    }
    router.replace("/home")
  }

  return (
    <ScreenFrame title={screenCopy.usernameTitle} status={status} onBack={() => router.back()}>
      <View style={styles.avatarBlock}>
        <Avatar name={name.trim() || "?"} size={96} />
        <Text style={styles.avatarHint}>{screenCopy.avatarHint}</Text>
      </View>
      <TextField
        label={screenCopy.usernameTitle}
        value={name}
        onChangeText={setName}
        placeholder="maya_k"
        autoCapitalize="none"
        maxLength={16}
        errorText={problemText}
      />
      <Text style={styles.rules}>{isPending && name.length > 0 ? screenCopy.usernameChecking : available ? screenCopy.usernameAvailable(name) : screenCopy.usernameRules}</Text>
      {serverError && <Text style={styles.rules}>{serverError}</Text>}
      <Button label={screenCopy.saveUsername} disabled={!available} onPress={() => void save()} />
    </ScreenFrame>
  )
}

const styles = StyleSheet.create({
  avatarBlock: {
    alignItems: "center",
    gap: spacing.sm,
  },
  avatarHint: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.sm,
    color: colors.textOnDarkMuted,
    textAlign: "center",
  },
  rules: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.sm,
    color: colors.textOnDarkMuted,
  },
})
