import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function Home() {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.appName}>Fault Report Demo</Text>
        <Text style={styles.subtitle}>
          Quickly capture facility issues with smart building, floor, and room selection.
        </Text>
      </View>

      <View style={styles.cardList}>
        <Pressable
          onPress={() => router.push("/manual")}
          style={({ pressed }) => [
            styles.card,
            styles.primaryCard,
            pressed && styles.cardPressed,
          ]}
        >
          <Text style={styles.cardTitle}>I know my location</Text>
          <Text style={styles.cardTag}>Manual report</Text>
          <Text style={styles.cardDescription}>
            Select floor and room, attach photo or description, and save the
            fault locally.
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/ai")}
          style={({ pressed }) => [
            styles.card,
            styles.secondaryCard,
            pressed && styles.cardPressed,
          ]}
        >
          <Text style={styles.cardTitle}>I&apos;m not sure</Text>
          <Text style={styles.cardTag}>AI assist (coming soon)</Text>
          <Text style={styles.cardDescription}>
            Use AI assistance to locate and describe faults when you&apos;re
            unsure of the exact room.
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/reports")}
          style={({ pressed }) => [
            styles.card,
            styles.neutralCard,
            pressed && styles.cardPressed,
          ]}
        >
          <Text style={styles.cardTitle}>View saved reports</Text>
          <Text style={styles.cardTag}>Local history</Text>
          <Text style={styles.cardDescription}>
            Review, preview images, or delete reports stored on this device.
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 20,
    backgroundColor: "#F5F6FA",
  },
  header: {
    marginBottom: 24,
  },
  appName: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 0.3,
    color: "#111827",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#6B7280",
  },
  cardList: {
    gap: 14,
  },
  card: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  primaryCard: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF4FF",
  },
  secondaryCard: {
    borderColor: "#7C3AED",
    backgroundColor: "#F5F3FF",
  },
  neutralCard: {
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  cardTag: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  cardDescription: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: "#4B5563",
  },
});
