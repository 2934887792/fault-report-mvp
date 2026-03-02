import { useCallback, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
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
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Saved reports</Text>
          <Text style={styles.subtitle}>
            These reports are stored only on this device and can be reviewed or
            deleted at any time.
          </Text>

          <View style={styles.headerButtons}>
            <Pressable
              onPress={() => router.replace("/")}
              style={styles.headerButton}
            >
              <Text style={styles.headerButtonText}>← Home</Text>
            </Pressable>

            <Pressable
              onPress={debugPrintReports}
              style={[styles.headerButton, styles.debugButton]}
            >
              <Text style={styles.headerButtonText}>Debug JSON</Text>
            </Pressable>
          </View>
        </View>

        {reports.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No reports yet</Text>
            <Text style={styles.emptyText}>
              Once you save a fault report on this device, it will appear here
              for quick reference.
            </Text>
          </View>
        ) : (
          reports.map((r) => (
            <View key={r.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.location}>
                    {r.building} · Level {r.floor}
                  </Text>
                  <Text style={styles.room}>{r.room_code}</Text>

                  {r.room_name ? (
                    <Text style={styles.roomName}>{r.room_name}</Text>
                  ) : null}
                </View>

                <Text style={styles.badge}>Local</Text>
              </View>

              {r.image_uri ? (
                <Pressable onPress={() => setPreviewImage(r.image_uri)}>
                  <Image
                    source={{ uri: r.image_uri }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                </Pressable>
              ) : null}

              {r.description ? (
                <Text style={styles.description}>{r.description}</Text>
              ) : null}
              <View style={styles.footer}>
                <Text style={styles.time}>
                  {new Date(r.created_at).toLocaleString()}
                </Text>

                <Pressable
                  onPress={() => onDelete(r.id)}
                  style={styles.deleteButton}
                >
                  <Text style={styles.deleteText}>Delete</Text>
                </Pressable>
              </View>
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
          style={styles.modalBg}
        >
          {previewImage ? (
            <Image
              source={{ uri: previewImage }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          ) : null}
        </Pressable>
      </Modal>
    </>
  );
}

/* ===========================
   Styles
=========================== */

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#F5F6FA",
  },

  header: {
    marginBottom: 16,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },

  headerButtons: {
    flexDirection: "row",
    gap: 10,
  },

  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
  },

  headerButtonText: {
    fontWeight: "600",
  },

  debugButton: {
    backgroundColor: "#EEF2FF",
  },

  emptyBox: {
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
    color: "#111827",
  },

  emptyText: {
    opacity: 0.7,
    fontSize: 13,
    textAlign: "center",
    color: "#6B7280",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  location: {
    fontWeight: "700",
    fontSize: 15,
  },

  room: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },

  roomName: {
    opacity: 0.6,
    marginBottom: 6,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#EEF2FF",
    color: "#4338CA",
    fontSize: 11,
    fontWeight: "600",
  },

  image: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    marginVertical: 8,
  },

  description: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },

  footer: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  time: {
    fontSize: 12,
    opacity: 0.5,
  },

  deleteButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FF4D4F",
  },

  deleteText: {
    color: "#FF4D4F",
    fontWeight: "600",
    fontSize: 12,
  },

  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },

  previewImage: {
    width: "100%",
    height: "100%",
  },
});
