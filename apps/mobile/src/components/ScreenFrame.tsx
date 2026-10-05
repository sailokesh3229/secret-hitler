/* Shared frame for entry and room screens: title, back action, and the
   loading / error / no-connection states every screen needs (spec Sec 4
   intro). Content is hidden while loading or offline. */
import type { ReactNode } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { colors, fontFamily, fontSize, screenCopy, spacing } from "@game/theme"
import { Toast } from "./Toast.js"

export type ScreenStatus = "ready" | "loading" | "error" | "offline"

export interface ScreenFrameProps {
  title: string
  status?: ScreenStatus
  errorText?: string
  onBack?: () => void
  children: ReactNode
}

export function ScreenFrame({ title, status = "ready", errorText, onBack, children }: ScreenFrameProps) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {onBack && (
        <Pressable accessibilityRole="button" accessibilityLabel={screenCopy.back} onPress={onBack} style={styles.back}>
          <Text style={styles.backLabel}>{screenCopy.back}</Text>
        </Pressable>
      )}
      <Text style={styles.title}>{title}</Text>
      {status === "offline" && <Toast text={screenCopy.offline} tone="danger" />}
      {status === "error" && <Toast text={errorText ?? screenCopy.genericError} tone="danger" />}
      {status === "loading" && (
        <View style={styles.loading}>
          <Text style={styles.loadingText}>{screenCopy.loading}</Text>
        </View>
      )}
      {(status === "ready" || status === "error") && <View style={styles.body}>{children}</View>}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  back: {
    minHeight: 44,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  backLabel: {
    fontFamily: fontFamily.interfaceSemiBold,
    fontSize: fontSize.md,
    color: colors.accent,
  },
  title: {
    fontFamily: fontFamily.documentBold,
    fontSize: fontSize.xxl,
    color: colors.textOnDark,
  },
  loading: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  loadingText: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.md,
    color: colors.textOnDarkMuted,
  },
  body: {
    gap: spacing.lg,
  },
})
