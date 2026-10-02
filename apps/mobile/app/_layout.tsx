/* Loads the two spec Sec 9 fonts under their plain brief names (Jost,
   Libre Caslon Text) so every component just writes fontFamily: 
   fontFamily.interface and gets the right file, instead of the
   weight-suffixed names @expo-google-fonts ships (Jost_400Regular).
   Only one weight each is loaded for now - bold/semibold render via
   the OS synthetic-bold fallback until real weight files are added
   (not a spec requirement, a later polish item). */
import { Jost_400Regular } from "@expo-google-fonts/jost"
import { LibreCaslonText_400Regular } from "@expo-google-fonts/libre-caslon-text"
import { useFonts } from "expo-font"
import { Stack } from "expo-router"
import { View } from "react-native"

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Jost: Jost_400Regular,
    "Libre Caslon Text": LibreCaslonText_400Regular,
  })
  if (!fontsLoaded) {
    return <View />
  }
  return <Stack />
}
