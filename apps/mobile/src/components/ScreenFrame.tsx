/* Shared frame for entry and room screens: title, back action, and the
   loading / error / no-connection states every screen needs (spec Sec 4
   intro). Content is hidden while loading or offline. */
import type { ReactNode } from "react"
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native"
import { colors, fontFamily, fontSize, radii, screenCopy, spacing } from "@game/theme"
import { GameBackdrop } from "./GameBackdrop.js"
import { Toast } from "./Toast.js"

export type ScreenStatus = "ready" | "loading" | "error" | "offline"

export interface ScreenFrameProps {
  title: string
  status?: ScreenStatus
  errorText?: string
  onBack?: () => void
  variant?: "panel" | "open"
  children: ReactNode
}

export function ScreenFrame({ title, status = "ready", errorText, onBack, variant = "panel", children }: ScreenFrameProps) {
  const { width } = useWindowDimensions()
  return (
    <View style={styles.screen}>
      <GameBackdrop subtle />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingHorizontal: width >= 720 ? spacing.xxl : spacing.md }]}
        keyboardShouldPersistTaps="handled"
      >
      {onBack && (
        <Pressable accessibilityRole="button" accessibilityLabel={screenCopy.back} onPress={onBack} style={styles.back}>
          <Text style={styles.backLabel}>{"‹  "}{screenCopy.back}</Text>
        </Pressable>
      )}
      <View style={styles.heading}>
        <View style={styles.headingRule} />
        <Text style={styles.title}>{title}</Text>
      </View>
      {status === "offline" && <Toast text={screenCopy.offline} tone="danger" />}
      {status === "error" && <Toast text={errorText ?? screenCopy.genericError} tone="danger" />}
      {status === "loading" && (
        <View style={styles.loading}>
          <Text style={styles.loadingText}>{screenCopy.loading}</Text>
        </View>
      )}
      {(status === "ready" || status === "error") && <View style={[styles.body, variant === "panel" && styles.panel]}>{children}</View>}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: { flex: 1 },
  content: {
    width: "100%",
    maxWidth: 1000,
    alignSelf: "center",
    paddingTop: spacing.xl,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  heading: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headingRule: { width: 48, height: 3, borderRadius: 2, backgroundColor: colors.accent },
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
    letterSpacing: 0.3,
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
  panel: {
    padding: spacing.lg,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    shadowColor: colors.background,
    shadowOpacity: 0.3,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
  },
})
