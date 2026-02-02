import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { initDb } from "../src/db/db";

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await initDb();
        setReady(true);
      } catch (e: any) {
        setError(String(e));
      }
    })();
  }, []);

  // ❌ DB 还没 ready，不渲染任何页面
  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8, opacity: 0.7 }}>
          Initializing local database…
        </Text>
      </View>
    );
  }

  // ❌ DB 初始化失败，直接显示错误
  if (error) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontWeight: "700", color: "red" }}>
          Database initialization failed
        </Text>
        <Text>{error}</Text>
      </View>
    );
  }

  // ✅ 只有 DB ready 才进入路由
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
