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

// 先判断 error，避免初始化失败时一直卡在 loading
if (error) {
return (
<View
style={{
flex: 1,
padding: 16,
justifyContent: "center",
backgroundColor: "#fff",
}}
>
<Text style={{ fontWeight: "700", color: "red", marginBottom: 8 }}>
Database initialization failed
</Text>
<Text>{error}</Text>
</View>
);
}

// DB 还没 ready，不渲染页面
if (!ready) {
return (
<View
style={{
flex: 1,
justifyContent: "center",
alignItems: "center",
backgroundColor: "#fff",
}}
>
<ActivityIndicator />
<Text style={{ marginTop: 8, opacity: 0.7 }}>
Initializing local database...
</Text>
</View>
);
}

// 只有 DB ready 才进入路由
return (
<Stack
screenOptions={{
headerShown: false,
}}
/>
);
}