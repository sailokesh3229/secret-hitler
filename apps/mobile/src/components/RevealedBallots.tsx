/* Spec Sec 6 point 4: every ballot flips at the same moment on every
   phone. All ballots mount together and share one animation with the same
   duration (motion.ballotFlip), so nobody's ballot flips first. */
import { useEffect, useRef } from "react"
import { Animated, StyleSheet, Text, View } from "react-native"
import { colors, fontFamily, fontSize, motion, spacing, type VoteToken } from "@game/theme"
import { Ballot } from "./Ballot.js"

export interface RevealedBallotsEntry {
  name: string
  vote: VoteToken
}

export interface RevealedBallotsProps {
  entries: RevealedBallotsEntry[]
}

export function RevealedBallots({ entries }: RevealedBallotsProps) {
  const progress = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: motion.ballotFlip,
      useNativeDriver: true,
    }).start()
  }, [progress])

  const scaleX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] })

  return (
    <View style={styles.row}>
      {entries.map((entry) => (
        <View key={entry.name} style={styles.entry}>
          <Animated.View style={{ transform: [{ scaleX }] }}>
            <Ballot vote={entry.vote} />
          </Animated.View>
          <Text style={styles.name} numberOfLines={1}>
            {entry.name}
          </Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.md,
  },
  entry: {
    alignItems: "center",
    gap: spacing.xs,
    width: 72,
  },
  name: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.xs,
    color: colors.textOnDark,
  },
})
