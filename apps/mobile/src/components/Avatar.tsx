/* Review 1 design feedback: every player gets an avatar assigned by
   the app, not a plain grey initial. Real illustrated portraits
   (spec Sec 9, a set of 16) are not built yet - until then this is a
   deterministic medallion: a background tone from avatarTones
   (packages/theme/src/colors.ts), picked by hashing the players
   name, so the same player always gets the same avatar for the
   whole game. */
import { StyleSheet, Text, View } from "react-native"
import { Circle, Svg } from "react-native-svg"
import { avatarTones, colors, fontFamily } from "@game/theme"

function hashNameToIndex(name: string, rangeSize: number): number {
  let hash = 0
  let i = 0
  while (i < name.length) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0
    i += 1
  }
  const positiveHash = hash < 0 ? -hash : hash
  return positiveHash % rangeSize
}

export interface AvatarProps {
  name: string
  size?: number
}

export function Avatar({ name, size = 56 }: AvatarProps) {
  const tone = avatarTones[hashNameToIndex(name, avatarTones.length)] as string
  const initial = name.charAt(0).toUpperCase()
  const center = size / 2
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={"0 0 " + size + " " + size}>
        <Circle cx={center} cy={center} r={center - 1} fill={tone} />
        <Circle cx={center} cy={center} r={center - 5} stroke={colors.paper} strokeWidth={1} fill="none" />
      </Svg>
      <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  initial: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    textAlign: "center",
    textAlignVertical: "center",
    fontFamily: fontFamily.documentBold,
    color: colors.paper,
  },
})
