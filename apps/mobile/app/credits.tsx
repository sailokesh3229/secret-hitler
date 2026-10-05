/* Credits and license (spec Sec 15). The rules are CC BY-NC-SA 4.0 and the
   creators are named with a link, as the license requires. */
import { Linking, StyleSheet, Text } from "react-native"
import { useRouter } from "expo-router"
import { colors, fontFamily, fontSize, moreCopy } from "@game/theme"
import { Button } from "../src/components/Button.js"
import { ScreenFrame } from "../src/components/ScreenFrame.js"

export default function CreditsScreen() {
  const router = useRouter()
  return (
    <ScreenFrame title={moreCopy.creditsTitle} onBack={() => router.back()}>
      <Text style={styles.body}>{moreCopy.creditsBody}</Text>
      <Text style={styles.body}>{moreCopy.creditsStoreNote}</Text>
      <Button label={moreCopy.creditsLicenseLink} variant="secondary" onPress={() => void Linking.openURL(moreCopy.creditsLicenseUrl)} />
    </ScreenFrame>
  )
}

const styles = StyleSheet.create({
  body: {
    fontFamily: fontFamily.document,
    fontSize: fontSize.md,
    color: colors.textOnDark,
  },
})
