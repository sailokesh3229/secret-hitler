/* S3 Sign up / Log in. Four ways in (spec S3, Google and Apple listed as
   defaults). All of them are fake until plan.md Step 9 wires Firebase:
   phone and email go to the one-time code, Google and Apple go straight
   to choosing a username. */
import { useRouter } from "expo-router"
import { screenCopy } from "@game/theme"
import { ScreenFrame } from "../src/components/ScreenFrame.js"
import { Button } from "../src/components/Button.js"
import { StyleSheet, Text } from "react-native"
import { colors, fontFamily, fontSize } from "@game/theme"
import { firebaseConfigured } from "../src/lib/firebase.js"

export default function LoginScreen() {
  const router = useRouter()
  return (
    <ScreenFrame title={screenCopy.loginTitle} onBack={() => router.back()}>
      <Text style={styles.hint}>{screenCopy.loginHint}</Text>
      <Button label={screenCopy.continueWithPhone} onPress={() => router.push({ pathname: "/code", params: { method: "phone" } })} />
      <Button label={screenCopy.continueWithEmail} variant="secondary" onPress={() => router.push(firebaseConfigured() ? "/email" : { pathname: "/code", params: { method: "email" } })} />
      <Button label={screenCopy.continueWithGoogle} variant="secondary" onPress={() => router.push("/username")} />
      <Button label={screenCopy.continueWithApple} variant="secondary" onPress={() => router.push("/username")} />
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
