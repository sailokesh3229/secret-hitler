/* Bottom bar housing the current action(s) - spec Sec 11 game table
   layout. A plain layout wrapper around whatever Button(s) the
   screen needs right now. */
import type { ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import { colors, spacing } from "@game/theme"

export interface ActionPanelProps {
  children: ReactNode
}

export function ActionPanel({ children }: ActionPanelProps) {
  return <View style={styles.container}>{children}</View>
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.surfaceRecessed,
  },
})
