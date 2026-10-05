/* Loads the spec Sec 9 fonts under their plain brief names (Jost,
   Libre Caslon Text) plus the weight variants the app actually uses
   (interfaceSemiBold, interfaceBold, documentBold - see
   packages/theme/src/typography.ts for why Android needs these as
   separate registered families rather than fontWeight alone). */
import { Jost_400Regular, Jost_600SemiBold, Jost_700Bold } from "@expo-google-fonts/jost"
import { LibreCaslonText_400Regular, LibreCaslonText_700Bold } from "@expo-google-fonts/libre-caslon-text"
import { useFonts } from "expo-font"
import { Stack } from "expo-router"
import { View } from "react-native"
import { colors } from "@game/theme"

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Jost: Jost_400Regular,
    "Jost-SemiBold": Jost_600SemiBold,
    "Jost-Bold": Jost_700Bold,
    "Libre Caslon Text": LibreCaslonText_400Regular,
    "Libre Caslon Text-Bold": LibreCaslonText_700Bold,
  })
  if (!fontsLoaded) {
    return <View />
  }
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
}
