import { useCallback, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { fetchReports, deleteReport } from "../src/db/db";

type Report = {
  id: number;
  building: string;
  floor: string;
  room_code: string;
  room_name: string;
  description: string;
  image_uri: string;
  created_at: string;
};

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    const data = await fetchReports();
    setReports(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [loadReports])
  );

  async function onDelete(id: number) {
    await deleteReport(id);
    loadReports();
  }

  function debugPrintReports() {
    console.log("==== REPORTS JSON START ====");
    console.log(JSON.stringify(reports, null, 2));
    console.log("==== REPORTS JSON END ====");
  }

  return (
    <>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: "700" }}>
          Saved Reports
        </Text>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={() => router.replace("/")}
            style={{
              padding: 10,
              borderWidth: 1,
              borderRadius: 10,
            }}
          >
            <Text style={{ fontWeight: "600" }}>← Back to Home</Text>
          </Pressable>

          <Pressable
            onPress={debugPrintReports}
            style={{
              padding: 10,
              borderWidth: 1,
              borderRadius: 10,
            }}
          >
            <Text style={{ fontWeight: "600" }}>
              Debug: Print JSON
            </Text>
          </Pressable>
        </View>

        {reports.length === 0 ? (
          <Text style={{ opacity: 0.6 }}>No reports yet.</Text>
        ) : (
          reports.map((r) => (
            <View
              key={r.id}
              style={{
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                gap: 8,
              }}
            >
              <Text style={{ fontWeight: "700" }}>
                {r.building} · Level {r.floor}
              </Text>

              <Text style={{ fontWeight: "600" }}>
                {r.room_code}
              </Text>

              {r.room_name ? (
                <Text style={{ opacity: 0.6 }}>{r.room_name}</Text>
              ) : null}

              {r.image_uri ? (
                <Pressable onPress={() => setPreviewImage(r.image_uri)}>
                  <Image
                    source={{ uri: r.image_uri }}
                    style={{
                      width: "100%",
                      height: 180,
                      borderRadius: 10,
                    }}
                    resizeMode="cover"
                  />
                </Pressable>
              ) : null}

              {r.description ? (
                <Text>{r.description}</Text>
              ) : null}

              <Text style={{ fontSize: 12, opacity: 0.5 }}>
                {new Date(r.created_at).toLocaleString()}
              </Text>

              <Pressable
                onPress={() => onDelete(r.id)}
                style={{
                  padding: 8,
                  borderWidth: 1,
                  borderRadius: 8,
                  alignSelf: "flex-start",
                }}
              >
                <Text style={{ color: "red", fontWeight: "600" }}>
                  Delete
                </Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={previewImage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <Pressable
          onPress={() => setPreviewImage(null)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.9)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {previewImage ? (
            <Image
              source={{ uri: previewImage }}
              style={{
                width: "100%",
                height: "100%",
              }}
              resizeMode="contain"
            />
          ) : null}
        </Pressable>
      </Modal>
    </>
  );
}
