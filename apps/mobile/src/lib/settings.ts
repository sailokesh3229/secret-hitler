/* Player settings (spec S21): sound, haptics, reduced motion. Saved on this
   phone only. Read synchronously by the screens after loadSettings runs at
   startup. */
import AsyncStorage from "@react-native-async-storage/async-storage"

export interface Settings {
  sound: boolean
  haptics: boolean
  reducedMotion: boolean
}

const KEY = "secret-hitler.settings"
const DEFAULTS: Settings = { sound: false, haptics: true, reducedMotion: false }
let current: Settings = DEFAULTS

export function getSettings(): Settings {
  return current
}

export async function loadSettings(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    if (raw !== null) current = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    current = DEFAULTS
  }
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  current = { ...current, ...patch }
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    // keep the in-memory value for this session
  }
  return current
}
