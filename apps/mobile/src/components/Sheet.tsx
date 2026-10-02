/* Static visual for the bottom-sheet pattern (confirmation sheets,
   spec Sec 7.1 step 4). Shown inline here for gallery review. The
   real slide-up/dismiss behaviour is wired up when a screen actually
   uses one. */
import type { ReactNode } from "react"
import { StyleSheet, Text, View } from "react-native"
import { colors, fontFamily, fontSize, radii, spacing } from "@game/theme"

export interface SheetProps {
  title: string
  children: ReactNode
}

export function Sheet({ title, children }: SheetProps) {
  return (
    <View style={styles.sheet}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  sheet: {
    width: "100%",
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    backgroundColor: colors.surfaceRecessed,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontFamily: fontFamily.interfaceSemiBold,
    fontSize: fontSize.lg,
    color: colors.textOnDark,
  },
})
