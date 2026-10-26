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

export async function shareInvite(roomId: string): Promise<"shared" | "copied"> {
  const message = screenCopy.shareMessage(roomId, inviteUrl(roomId))
  if (Platform.OS !== "web") {
    await Share.share({ message })
    return "shared"
  }
  if (navigator.share) {
    await navigator.share({ text: message, url: inviteUrl(roomId) })
    return "shared"
  }
  await navigator.clipboard.writeText(message)
  return "copied"
}
