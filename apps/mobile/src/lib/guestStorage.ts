import AsyncStorage from "@react-native-async-storage/async-storage"
import { Platform } from "react-native"

/* Resolve storage at runtime because this workspace's Metro resolver can
   select the unsuffixed module before guestStorage.web.ts. Browser storage
   is best-effort; a private browser can still use its in-memory session. */
function browserStorage(): Storage | null {
  if (Platform.OS !== "web") return null
  try { return window.localStorage } catch { return null }
}

export const guestStorage = {
  get: async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") {
      try { return browserStorage()?.getItem(key) ?? null } catch { return null }
    }
    return AsyncStorage.getItem(key)
  },
  set: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") {
      try { browserStorage()?.setItem(key, value) } catch { /* in-memory session still works */ }
      return
    }
    await AsyncStorage.setItem(key, value)
  },
  remove: async (key: string): Promise<void> => {
    if (Platform.OS === "web") {
      try { browserStorage()?.removeItem(key) } catch { /* nothing persisted */ }
      return
    }
    await AsyncStorage.removeItem(key)
  },
}
