/* Six visible boxes for the one-time code (spec S4). The real input is a
   single hidden field on the screen, so SMS auto-fill and paste work. */
import { StyleSheet, Text, View } from "react-native"
import { colors, fontFamily, fontSize, radii, spacing } from "@game/theme"

export interface OtpBoxesProps {
  value: string
}

const BOX_COUNT = 6

export function OtpBoxes({ value }: OtpBoxesProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: BOX_COUNT }, (_, index) => {
        const digit = value.charAt(index)
        const isNext = index === value.length
        return (
          <View key={index} style={[styles.box, isNext && styles.boxNext]}>
            <Text style={styles.digit}>{digit}</Text>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  box: {
    flex: 1,
    height: 52,
    borderRadius: radii.control,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRecessed,
    alignItems: "center",
    justifyContent: "center",
  },
  boxNext: {
    borderColor: colors.accent,
  },
  digit: {
    fontFamily: fontFamily.interfaceSemiBold,
    fontSize: fontSize.xl,
    color: colors.textOnDark,
  },
})
