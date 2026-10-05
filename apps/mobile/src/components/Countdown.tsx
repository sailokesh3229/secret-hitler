/* Time left in the current turn (spec Sec 10). The deadline comes from the
   server, so the countdown matches every phone, whatever its clock says. */
import { useEffect, useState } from "react"
import { StyleSheet, Text } from "react-native"
import { colors, fontFamily, fontSize, gameCopy } from "@game/theme"

export interface CountdownProps {
  deadlineAt: number
}

export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return minutes + ":" + String(seconds).padStart(2, "0")
}

export function Countdown({ deadlineAt }: CountdownProps) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  return <Text style={styles.text}>{gameCopy.deadlineLabel(formatRemaining(deadlineAt - now))}</Text>
}

const styles = StyleSheet.create({
  text: {
    fontFamily: fontFamily.interfaceSemiBold,
    fontSize: fontSize.sm,
    color: colors.accent,
    textAlign: "center",
  },
})
