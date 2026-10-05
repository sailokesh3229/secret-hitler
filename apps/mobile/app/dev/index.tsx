/* Dev menu (plan.md Step 6): one shortcut to every entry screen and every
   state. Shown only in development builds (__DEV__). Labels here are
   developer-facing, not player-facing, so they are not in packages/theme
   (same rule the Component Gallery follows). */
import type { ReactNode } from "react"
import { Link, type Href } from "expo-router"
import { ScrollView, StyleSheet, Text, View } from "react-native"
import { colors, fontFamily, fontSize, spacing } from "@game/theme"

interface Shortcut {
  label: string
  href: string
}

const SECTIONS: { title: string; shortcuts: Shortcut[] }[] = [
  {
    title: "S1-S3 Splash, welcome, log in",
    shortcuts: [
      { label: "Splash", href: "/" },
      { label: "Welcome", href: "/welcome" },
      { label: "Log in", href: "/login" },
    ],
  },
  {
    title: "S4 One-time code",
    shortcuts: [
      { label: "Phone", href: "/code?method=phone" },
      { label: "Email", href: "/code?method=email" },
      { label: "Wrong code", href: "/code?state=error" },
      { label: "Loading", href: "/code?state=loading" },
      { label: "No connection", href: "/code?state=offline" },
    ],
  },
  {
    title: "S5 Choose username",
    shortcuts: [
      { label: "Ready", href: "/username" },
      { label: "Loading", href: "/username?state=loading" },
      { label: "No connection", href: "/username?state=offline" },
    ],
  },
  {
    title: "S6 Home",
    shortcuts: [
      { label: "No active game", href: "/home" },
      { label: "Resume banner", href: "/home?state=resume" },
      { label: "No history", href: "/home?state=empty" },
      { label: "Loading", href: "/home?state=loading" },
      { label: "No connection", href: "/home?state=offline" },
    ],
  },
  {
    title: "S7 Create room",
    shortcuts: [
      { label: "Ready", href: "/create-room" },
      { label: "Error", href: "/create-room?state=error" },
      { label: "No connection", href: "/create-room?state=offline" },
    ],
  },
  {
    title: "S8 Join room (every error)",
    shortcuts: [
      { label: "Ready", href: "/join-room" },
      { label: "No such room", href: "/join-room?state=noRoom" },
      { label: "Wrong password", href: "/join-room?state=wrongPassword" },
      { label: "Locked 5 min", href: "/join-room?state=locked" },
      { label: "Room full", href: "/join-room?state=full" },
      { label: "Already started", href: "/join-room?state=started" },
      { label: "No connection", href: "/join-room?state=offline" },
    ],
  },
  {
    title: "S9 Lobby",
    shortcuts: [
      { label: "Host, 5 players", href: "/lobby?roomId=K7M2QX&count=5&role=host" },
      { label: "Host, 10 players", href: "/lobby?roomId=P3WD9R&count=10&role=host" },
      { label: "Player, 10 players", href: "/lobby?roomId=P3WD9R&count=10&role=player" },
      { label: "Host, one not ready", href: "/lobby?roomId=K7M2QX&count=5&role=host&state=notReady" },
      { label: "Error", href: "/lobby?roomId=K7M2QX&count=5&role=host&state=error" },
      { label: "No connection", href: "/lobby?roomId=K7M2QX&count=5&role=host&state=offline" },
    ],
  },
  {
    title: "Game table (Steps 7-8)",
    shortcuts: [
      { label: "Scenario switcher", href: "/dev/scenario" },
      { label: "Role reveal", href: "/role" },
      { label: "Table", href: "/table" },
      { label: "Game log", href: "/log" },
    ],
  },
  {
    title: "Design review",
    shortcuts: [{ label: "Component Gallery", href: "/dev/gallery" }],
  },
]

export default function DevMenu() {
  if (!__DEV__) {
    return <View style={styles.hidden} />
  }
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Dev menu</Text>
      <Text style={styles.subtitle}>Development builds only. Every entry screen and state.</Text>
      {SECTIONS.map((section) => (
        <Group key={section.title} title={section.title}>
          {section.shortcuts.map((shortcut) => (
            <Link key={shortcut.href} href={shortcut.href as Href} style={styles.link}>
              {shortcut.label}
            </Link>
          ))}
        </Group>
      ))}
    </ScrollView>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  hidden: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  title: {
    fontFamily: fontFamily.document,
    fontSize: fontSize.xxl,
    color: colors.textOnDark,
  },
  subtitle: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.sm,
    color: colors.textOnDarkMuted,
  },
  group: {
    gap: spacing.sm,
  },
  groupTitle: {
    fontFamily: fontFamily.interfaceSemiBold,
    fontSize: fontSize.md,
    color: colors.accent,
  },
  link: {
    minHeight: 44,
    paddingVertical: spacing.sm,
    fontFamily: fontFamily.interface,
    fontSize: fontSize.md,
    color: colors.textOnDark,
    textDecorationLine: "underline",
  },
})
