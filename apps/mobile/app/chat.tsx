/* S17 Chat drawer. UI only in Step 8: messages stay on this phone and
   nothing is sent. Real table chat, mute rules (R30, R42) and reporting
   arrive with Online mode in Step 13. Shown from the bottom bar in test
   table mode only. */
import { useState } from "react"
import { useRouter } from "expo-router"
import { StyleSheet, Text, View } from "react-native"
import { colors, fontFamily, fontSize, spacing } from "@game/theme"
import { gameCopy } from "@game/theme"
import { Button } from "../src/components/Button.js"
import { ChatBubble } from "../src/components/ChatBubble.js"
import { ScreenFrame } from "../src/components/ScreenFrame.js"
import { TextField } from "../src/components/TextField.js"
import { Toast } from "../src/components/Toast.js"
import { useGameStore } from "../src/game/store.js"

interface Message {
  id: number
  author: string
  text: string
  own: boolean
}

export default function ChatScreen() {
  const router = useRouter()
  const viewerId = useGameStore((store) => store.viewerId)
  const names = useGameStore((store) => store.names)
  const [draft, setDraft] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [reported, setReported] = useState(false)
  const viewerName = viewerId ? names[viewerId] ?? viewerId : ""

  function send() {
    const text = draft.trim()
    if (text.length === 0) return
    setMessages((current) => [...current, { id: current.length + 1, author: viewerName, text, own: true }])
    setDraft("")
  }

  return (
    <ScreenFrame title={gameCopy.chatTitle} onBack={() => router.back()}>
      <Text style={styles.note}>{gameCopy.chatSystemNote}</Text>
      <View style={styles.list}>
        {messages.map((message) => (
          <View key={message.id} style={styles.messageRow}>
            <ChatBubble author={message.author} text={message.text} isOwnMessage={message.own} />
            <Button label={gameCopy.chatReport} variant="secondary" onPress={() => setReported(true)} />
          </View>
        ))}
      </View>
      {reported && <Toast text={gameCopy.chatReported} tone="neutral" />}
      <TextField label={gameCopy.chatPlaceholder} value={draft} onChangeText={setDraft} autoCapitalize="none" />
      <Button label={gameCopy.chatSend} disabled={draft.trim().length === 0} onPress={send} />
    </ScreenFrame>
  )
}

const styles = StyleSheet.create({
  note: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.xs,
    color: colors.textOnDarkMuted,
  },
  list: {
    gap: spacing.sm,
  },
  messageRow: {
    gap: spacing.xs,
  },
})
