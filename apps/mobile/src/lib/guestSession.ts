/* Guest sign-in is a temporary server-issued session for the coursework demo.
   AsyncStorage works on native and web, so a page reload keeps that identity
   until sign-out or server restart. */
import AsyncStorage from "@react-native-async-storage/async-storage"
import { api, ApiError, apiEnabled, setSessionToken, setSessionUsername } from "./api.js"

const STORAGE_KEY = "secret-hitler-guest-token"

export async function startGuestSession(): Promise<void> {
  const { token } = await api.createGuestSession()
  await AsyncStorage.setItem(STORAGE_KEY, token)
  setSessionToken(token)
}

export async function clearGuestSession(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY)
}

export async function restoreGuestSession(): Promise<"signed-out" | "needs-username" | "ready"> {
  if (!apiEnabled()) return "signed-out"
  const token = await AsyncStorage.getItem(STORAGE_KEY)
  if (!token) return "signed-out"
  setSessionToken(token)
  try {
    const me = await api.me()
    setSessionUsername(me.username)
    return "ready"
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return "needs-username"
    if (error instanceof ApiError && error.status === 401) {
      await clearGuestSession()
      setSessionToken(null)
      return "signed-out"
    }
    throw error
  }
}
