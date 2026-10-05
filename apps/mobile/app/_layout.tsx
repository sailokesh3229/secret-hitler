/* Loads the spec Sec 9 fonts under their plain brief names (Jost,
   Libre Caslon Text) plus the weight variants the app actually uses
   (interfaceSemiBold, interfaceBold, documentBold - see
   packages/theme/src/typography.ts for why Android needs these as
   separate registered families rather than fontWeight alone). Also loads the
   saved settings and resyncs an online game when the app returns to the
   foreground (spec Sec 10 background/foreground). */
import { useEffect } from "react"
import { AppState, View } from "react-native"
import { Jost_400Regular, Jost_600SemiBold, Jost_700Bold } from "@expo-google-fonts/jost"
import { LibreCaslonText_400Regular, LibreCaslonText_700Bold } from "@expo-google-fonts/libre-caslon-text"
import { useFonts } from "expo-font"
import { Stack } from "expo-router"
import { colors } from "@game/theme"
import { useGameStore } from "../src/game/store.js"
import { loadSettings } from "../src/lib/settings.js"

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Jost: Jost_400Regular,
    "Jost-SemiBold": Jost_600SemiBold,
    "Jost-Bold": Jost_700Bold,
    "Libre Caslon Text": LibreCaslonText_400Regular,
    "Libre Caslon Text-Bold": LibreCaslonText_700Bold,
  })

  useEffect(() => {
    void loadSettings()
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") useGameStore.getState().resync()
    })
    return () => subscription.remove()
  }, [])

  if (!fontsLoaded) {
    return <View />
  }
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
}
