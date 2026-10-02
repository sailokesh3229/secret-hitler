/* Dev menu only (CLAUDE.md rule 8-adjacent: never shown in production
   builds - gating that happens when the real dev menu is built).
   Every component, every state, from plan.md Step 5. */
import type { ReactNode } from "react"
import { useState } from "react"
import { ScrollView, StyleSheet, Text, View } from "react-native"
import { actionLabels, colors, fontFamily, fontSize, spacing } from "@game/theme"
import { ActionPanel } from "../../src/components/ActionPanel.js"
import { Badge } from "../../src/components/Badge.js"
import { Ballot } from "../../src/components/Ballot.js"
import { Button } from "../../src/components/Button.js"
import { ChatBubble } from "../../src/components/ChatBubble.js"
import { ElectionTracker } from "../../src/components/ElectionTracker.js"
import { Envelope } from "../../src/components/Envelope.js"
import { FascistTrack } from "../../src/components/FascistTrack.js"
import { LiberalTrack } from "../../src/components/LiberalTrack.js"
import { LogEntry } from "../../src/components/LogEntry.js"
import { PolicyTile } from "../../src/components/PolicyTile.js"
import { RoleCard } from "../../src/components/RoleCard.js"
import { Seat } from "../../src/components/Seat.js"
import { Sheet } from "../../src/components/Sheet.js"
import { StatusLine } from "../../src/components/StatusLine.js"
import { TextField } from "../../src/components/TextField.js"
import { Toast } from "../../src/components/Toast.js"
import type { BadgeKind } from "@game/theme"

const ALL_BADGE_KINDS: BadgeKind[] = [
  "president",
  "chancellor",
  "nominee",
  "termLimited",
  "voted",
  "executed",
  "investigated",
  "notHitler",
  "host",
  "disconnected",
]

function Section({ title, children }: { title: string, children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  )
}

export default function ComponentGallery() {
  const [textValue, setTextValue] = useState("")
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Component Gallery</Text>
      <Text style={styles.subtitle}>Dev only. Every component, every state (plan.md Step 5).</Text>

      <Section title="Buttons">
        <View style={styles.row}>
          <Button label={actionLabels.castVote} variant="primary" />
          <Button label={actionLabels.cancel} variant="secondary" />
          <Button label={actionLabels.castVote} variant="primary" disabled />
        </View>
      </Section>

      <Section title="Inputs">
        <View style={styles.column}>
          <TextField label="Room ID" value={textValue} onChangeText={setTextValue} placeholder="K7M2QX" />
          <TextField label="Password" value="" errorText="Wrong password. Try again." />
          <TextField label="Password" value="secret12" disabled />
        </View>
      </Section>

      <Section title="Badges on their own (spec Sec 4)">
        <View style={styles.row}>
          {ALL_BADGE_KINDS.map((kind) => (
            <Badge key={kind} kind={kind} />
          ))}
        </View>
      </Section>

      <Section title="Seat with every badge">
        <View style={styles.row}>
          {ALL_BADGE_KINDS.map((kind) => (
            <Seat key={kind} name="Arjun" badges={[kind]} />
          ))}
        </View>
      </Section>

      <Section title="Seat with multiple badges">
        <Seat name="Maya" badges={["president", "voted", "host"]} />
      </Section>

      <Section title="Policy tiles">
        <View style={styles.row}>
          <PolicyTile policy="POLICY_LIBERAL" />
          <PolicyTile policy="POLICY_FASCIST" />
          <PolicyTile />
        </View>
      </Section>

      <Section title="Ballots">
        <View style={styles.row}>
          <Ballot vote="VOTE_YES" />
          <Ballot vote="VOTE_NO" />
          <Ballot />
        </View>
      </Section>

      <Section title="Role cards (identical layout for every role)">
        <View style={styles.row}>
          <RoleCard role="ROLE_LIBERAL" />
          <RoleCard role="ROLE_FASCIST" />
          <RoleCard role="ROLE_LEADER" />
        </View>
      </Section>

      <Section title="Envelope">
        <View style={styles.row}>
          <Envelope />
          <Envelope revealed />
        </View>
      </Section>

      <Section title="Liberal track">
        <LiberalTrack enactedCount={2} />
      </Section>

      <Section title="Fascist track - 5-6 players">
        <FascistTrack playerCount={5} enactedCount={2} />
      </Section>

      <Section title="Fascist track - 7-8 players">
        <FascistTrack playerCount={7} enactedCount={2} />
      </Section>

      <Section title="Fascist track - 9-10 players">
        <FascistTrack playerCount={9} enactedCount={2} />
      </Section>

      <Section title="Election tracker">
        <View style={styles.row}>
          <ElectionTracker tracker={0} />
          <ElectionTracker tracker={1} />
          <ElectionTracker tracker={2} />
          <ElectionTracker tracker={3} />
        </View>
      </Section>

      <Section title="Status line">
        <StatusLine text="Your turn: choose a Chancellor" />
      </Section>

      <Section title="Action panel">
        <ActionPanel>
          <Button label={actionLabels.castVote} variant="primary" />
          <Button label={actionLabels.cancel} variant="secondary" />
        </ActionPanel>
      </Section>

      <Section title="Sheet">
        <Sheet title="Investigate Arjun?">
          <Text style={styles.sheetBody}>You will privately see their party membership.</Text>
          <Button label={actionLabels.confirm} variant="primary" />
        </Sheet>
      </Section>

      <Section title="Chat bubble">
        <View style={styles.column}>
          <ChatBubble author="Priya" text="Who should we trust?" />
          <ChatBubble author="You" text="Not sure yet." isOwnMessage />
        </View>
      </Section>

      <Section title="Log entry">
        <View>
          <LogEntry text="Maya nominated Arjun as Chancellor" />
          <LogEntry text="Government elected - 5 Ja, 2 Nein" />
        </View>
      </Section>

      <Section title="Toast">
        <View style={styles.column}>
          <Toast text="Reconnected" tone="neutral" />
          <Toast text="Government elected" tone="success" />
          <Toast text="Connection lost" tone="danger" />
        </View>
      </Section>
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
    gap: spacing.xl,
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
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.accent,
  },
  sectionBody: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  column: {
    gap: spacing.sm,
  },
  sheetBody: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.sm,
    color: colors.textOnDark,
  },
})
