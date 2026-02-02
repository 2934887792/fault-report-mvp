import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";

export default function Home() {
  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>
        Fault Report
      </Text>

      <Pressable
        onPress={() => router.push("/manual")}
        style={{ padding: 16, borderWidth: 1, borderRadius: 12 }}
      >
        <Text style={{ fontSize: 16, fontWeight: "600" }}>
          I know my location (Manual)
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.push("/ai")}
        style={{ padding: 16, borderWidth: 1, borderRadius: 12 }}
      >
        <Text style={{ fontSize: 16, fontWeight: "600" }}>
          I’m not sure (AI Assist)
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.push("/reports")}
        style={{ padding: 16, borderWidth: 1, borderRadius: 12 }}
      >
        <Text style={{ fontSize: 16, fontWeight: "600" }}>
          View saved reports
        </Text>
      </Pressable>
    </View>
  );
}
