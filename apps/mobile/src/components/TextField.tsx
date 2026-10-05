/* Text input with default, focused, error and disabled states. Error
   copy says what happened and how to fix it (CLAUDE.md copy rule). */
import { useState } from "react"
import { StyleSheet, Text, TextInput, View } from "react-native"
import { colors, fontFamily, fontSize, radii, spacing } from "@game/theme"

export interface TextFieldProps {
  label: string
  value: string
  onChangeText?: (next: string) => void
  placeholder?: string
  errorText?: string
  disabled?: boolean
  secureTextEntry?: boolean
  autoCapitalize?: "none" | "characters"
  maxLength?: number
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  errorText,
  disabled = false,
  secureTextEntry = false,
  autoCapitalize = "characters",
  maxLength,
}: TextFieldProps) {
  const [isFocused, setIsFocused] = useState(false)
  const hasError = Boolean(errorText)
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.disabledText}
        editable={!disabled}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        maxLength={maxLength}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={[
          styles.input,
          isFocused && styles.inputFocused,
          hasError && styles.inputError,
          disabled && styles.inputDisabled,
        ]}
      />
      {hasError && <Text style={styles.errorText}>{errorText}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.sm,
    color: colors.textOnDarkMuted,
  },
  input: {
    minHeight: 44,
    borderRadius: radii.control,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRecessed,
    color: colors.textOnDark,
    paddingHorizontal: spacing.md,
    fontFamily: fontFamily.interface,
    fontSize: fontSize.md,
  },
  inputFocused: {
    borderColor: colors.accent,
  },
  inputError: {
    borderColor: colors.danger,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  errorText: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.xs,
    color: colors.danger,
  },
})
