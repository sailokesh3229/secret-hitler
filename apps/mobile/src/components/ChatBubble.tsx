/* Online-only chat (spec Sec 2, Sec 17). Own messages align right in
   accent, others align left on a recessed surface. */
import { StyleSheet, Text, View } from "react-native"
import { colors, fontFamily, fontSize, radii, spacing } from "@game/theme"

export interface ChatBubbleProps {
  author: string
  text: string
  isOwnMessage?: boolean
}

export function ChatBubble({ author, text, isOwnMessage = false }: ChatBubbleProps) {
  return (
    <View style={[styles.row, isOwnMessage && styles.rowOwn]}>
      <View style={[styles.bubble, isOwnMessage ? styles.bubbleOwn : styles.bubbleOther]}>
        {!isOwnMessage && <Text style={styles.author}>{author}</Text>}
        <Text style={[styles.text, isOwnMessage && styles.textOwn]}>{text}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  rowOwn: {
    justifyContent: "flex-end",
  },
  bubble: {
    maxWidth: "80%",
    borderRadius: radii.control,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  bubbleOther: {
    backgroundColor: colors.surfaceRecessed,
  },
  bubbleOwn: {
    backgroundColor: colors.accent,
  },
  author: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.xs,
    color: colors.textOnDarkMuted,
  },
  text: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.md,
    color: colors.textOnDark,
  },
  textOwn: {
    color: colors.ink,
  },
})
