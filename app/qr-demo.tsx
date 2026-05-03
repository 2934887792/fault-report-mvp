import { Image, ScrollView, StyleSheet, Text, View } from "react-native";

const qrSamples = [
  {
    id: "e5-male-toilet",
    title: "E5 QR Example 1",
    content: "Building: E5\nFloor: 1\nLocation: Male toilet near LT6",
  },
  {
    id: "e5-lift-lobby",
    title: "E5 QR Example 2",
    content: "Building: E5\nFloor: 1\nLocation: Lift lobby near entrance",
  },
  {
    id: "e5-staircase",
    title: "E5 QR Example 3",
    content: "Building: E5\nFloor: 3\nLocation: Staircase near corridor",
  },
];

function getQrImageUrl(content: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(content)}`;
}

export default function QrDemoScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>QR demo</Text>
        <Text style={styles.subtitle}>
          Three POC QR examples for E5. Each card shows the QR image and the exact text encoded in it.
        </Text>
      </View>

      {qrSamples.map((sample) => (
        <View key={sample.id} style={styles.card}>
          <Text style={styles.cardTitle}>{sample.title}</Text>
          <Image
            source={{ uri: getQrImageUrl(sample.content) }}
            style={styles.qrImage}
          />
          <Text style={styles.label}>Encoded text</Text>
          <Text style={styles.content}>{sample.content}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: "#F5F6FA",
    gap: 16,
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
  card: {
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 10,
    alignItems: "center",
  },
  cardTitle: {
    alignSelf: "stretch",
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  qrImage: {
    width: 280,
    height: 280,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  label: {
    alignSelf: "stretch",
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  content: {
    alignSelf: "stretch",
    fontSize: 13,
    lineHeight: 20,
    color: "#111827",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
  },
});
