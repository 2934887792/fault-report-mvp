import { View } from "react-native";
import { WebView } from "react-native-webview";

export default function AI() {
  return (
    <View style={{ flex: 1 }}>
      <WebView source={{ uri: "https://upstage-zodiac-preflight.ngrok-free.dev" }} />
    </View>
  );
}