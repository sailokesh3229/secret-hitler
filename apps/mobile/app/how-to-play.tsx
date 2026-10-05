/* S22 How to play: the rules in short sections, with a search box. The text
   follows docs/spec.md Sec 5 and lives in packages/theme (moreCopy.ts). */
import { useState } from "react"
import { useRouter } from "expo-router"
import { StyleSheet, Text, View } from "react-native"
import { colors, fontFamily, fontSize, howToSections, moreCopy, spacing } from "@game/theme"
import { ScreenFrame } from "../src/components/ScreenFrame.js"
import { TextField } from "../src/components/TextField.js"

export default function HowToPlayScreen() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const needle = query.trim().toLowerCase()
  const sections = howToSections.filter((section) => needle === "" || (section.title + " " + section.body).toLowerCase().includes(needle))

  return (
    <ScreenFrame title={moreCopy.howToTitle} onBack={() => router.back()}>
      <TextField label={moreCopy.howToSearch} value={query} onChangeText={setQuery} autoCapitalize="none" />
      {sections.length === 0 && <Text style={styles.body}>{moreCopy.howToNoMatch}</Text>}
      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.title}>{section.title}</Text>
          <Text style={styles.body}>{section.body}</Text>
        </View>
      ))}
    </ScreenFrame>
  )
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.xs,
  },
  title: {
    fontFamily: fontFamily.interfaceSemiBold,
    fontSize: fontSize.lg,
    color: colors.accent,
  },
  body: {
    fontFamily: fontFamily.document,
    fontSize: fontSize.md,
    color: colors.textOnDark,
  },
})
