import { StyleSheet, Text, View } from "react-native"

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Secret Hitler Mobile</Text>
      <Text style={styles.subtitle}>Scaffold placeholder - plan.md Step 1</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { fontSize: 24, fontWeight: "600", textAlign: "center" },
  subtitle: { marginTop: 8, fontSize: 14, textAlign: "center", opacity: 0.7 },
})
