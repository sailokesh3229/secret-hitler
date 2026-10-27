import { Platform, Share } from "react-native"
import * as Linking from "expo-linking"
import { screenCopy } from "@game/theme"

export function inviteUrl(roomId: string): string {
  const path = `/join-room?roomId=${encodeURIComponent(roomId)}`
  const publicWebUrl = process.env.EXPO_PUBLIC_WEB_URL
  if (publicWebUrl) return publicWebUrl.replace(/\/$/, "") + path
  if (Platform.OS === "web" && typeof window !== "undefined") return window.location.origin + path
  return Linking.createURL(path)
}

export async function shareInvite(roomId: string): Promise<"shared" | "copied" | "cancelled"> {
  const message = screenCopy.shareMessage(roomId, inviteUrl(roomId))
  if (Platform.OS !== "web") {
    await Share.share({ message })
    return "shared"
  }
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ text: message })
      return "shared"
    } catch (error) {
      /* Cancelling the share sheet is intentional. Other failures (for
         example an unsupported share target) can fall back to copying. */
      if (error instanceof Error && error.name === "AbortError") return "cancelled"
    }
  }
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(message)
      return "copied"
    } catch {
      /* Clipboard permission varies between browsers. Try a selected text
         field while the user's share-button gesture is still active. */
    }
  }
  if (typeof document !== "undefined" && document.body) {
    const field = document.createElement("textarea")
    field.value = message
    field.readOnly = true
    field.style.position = "fixed"
    field.style.opacity = "0"
    document.body.appendChild(field)
    try {
      field.focus()
      field.select()
      if (document.execCommand("copy")) return "copied"
    } finally {
      field.remove()
    }
  }
  throw new Error("SHARE_UNAVAILABLE")
}
