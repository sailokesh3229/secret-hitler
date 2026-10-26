import { Image, StyleSheet, useWindowDimensions, View } from "react-native"
import { colors } from "@game/theme"
import portraitArt from "../../assets/art/table-portrait.png"
import wideArt from "../../assets/art/table-wide.png"

interface GameBackdropProps {
  subtle?: boolean
}

/* Decorative public artwork only. It must never depend on a player's role
   or private result, so it cannot become a visual tell. */
export function GameBackdrop({ subtle = false }: GameBackdropProps) {
  const { width, height } = useWindowDimensions()
  const portrait = width < height * 0.8
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image
        source={portrait ? portraitArt : wideArt}
        resizeMode="cover"
        style={[StyleSheet.absoluteFill, subtle && styles.subtle]}
      />
      <View style={[StyleSheet.absoluteFill, subtle ? styles.subtleScrim : styles.scrim]} />
    </View>
  )
}

const styles = StyleSheet.create({
  subtle: { opacity: 0.42 },
  scrim: { backgroundColor: colors.heroScrim },
  subtleScrim: { backgroundColor: colors.overlayScrim },
})
