/* S17 Chat drawer. Online games only: one channel for all living players
   (spec Sec 2). The server enforces the mute rules (R30, R42) and the rate
   limit; executed players and the President or Chancellor holding tiles get
   a reason instead of a silent failure. Reports go to the server. */
import { useState } from "react"
import { useRouter } from "expo-router"
import { StyleSheet, Text, View } from "react-native"
import { colors, fontFamily, fontSize, gameCopy, spacing } from "@game/theme"
import { Button } from "../src/components/Button.js"
import { ChatBubble } from "../src/components/ChatBubble.js"
import { ScreenFrame } from "../src/components/ScreenFrame.js"
import { TextField } from "../src/components/TextField.js"
import { Toast } from "../src/components/Toast.js"
import { useGameStore } from "../src/game/store.js"

export default function ChatScreen() {
  const router = useRouter()
  const chat = useGameStore((store) => store.chat)
  const viewerId = useGameStore((store) => store.viewerId)
  const sendChat = useGameStore((store) => store.sendChat)
  const reportChat = useGameStore((store) => store.reportChat)
  const roomMode = useGameStore((store) => store.roomMode)
  const testTable = useGameStore((store) => store.testTable)
  const [draft, setDraft] = useState("")
  const [reported, setReported] = useState(false)

  async function send() {
    const text = draft.trim()
    if (text.length === 0) return
    if (await sendChat(text)) setDraft("")
  }

  return (
    <ScreenFrame title={gameCopy.chatTitle} onBack={() => router.back()}>
      {roomMode !== "MODE_ONLINE" && !testTable ? (
        <Text style={styles.note}>{gameCopy.chatOnlineOnly}</Text>
      ) : (
        <>
          <Text style={styles.note}>{gameCopy.chatSystemNote}</Text>
          <View style={styles.list}>
            {chat.length === 0 && <Text style={styles.note}>{gameCopy.logEmpty}</Text>}
            {chat.map((message) => (
              <View key={message.seq} style={styles.messageRow}>
                <ChatBubble author={message.authorName} text={message.text} isOwnMessage={message.authorId === viewerId} />
                {message.authorId !== viewerId && (
                  <Button
                    label={gameCopy.chatReport}
                    variant="secondary"
                    onPress={() => void reportChat(message.seq).then(() => setReported(true))}
                  />
                )}
              </View>
            ))}
          </View>
          {reported && <Toast text={gameCopy.chatReported} tone="neutral" />}
          <TextField label={gameCopy.chatPlaceholder} value={draft} onChangeText={setDraft} autoCapitalize="none" maxLength={300} />
          <Button label={gameCopy.chatSend} disabled={draft.trim().length === 0} onPress={() => void send()} />
        </>
      )}
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
