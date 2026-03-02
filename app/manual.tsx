import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import { insertReport } from "../src/db/db";
import rawRoomsByFloor from "../scripts/e5_rooms.json";

type Room = {
  code: string;
  name: string;
};

const roomsByFloor: Record<string, Room[]> = rawRoomsByFloor;
const BUILDING = "E5";
const FLOORS = Object.keys(roomsByFloor).sort();

export default function Manual() {
  const [floor, setFloor] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomOpen, setRoomOpen] = useState(false);

  const [description, setDescription] = useState("");
  const [imageUri, setImageUri] = useState("");

  const resetForm = useCallback(() => {
    setFloor("");
    setRoomCode("");
    setRoomName("");
    setDescription("");
    setImageUri("");
    setRoomOpen(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      resetForm();
    }, [resetForm])
  );

  const roomOptions = useMemo<Room[]>(() => {
    if (!floor) return [];
    return roomsByFloor[floor] ?? [];
  }, [floor]);

  const hasEvidence = Boolean(imageUri) || description.trim().length > 0;
  const canSubmit = Boolean(floor) && Boolean(roomCode) && hasEvidence;

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert("Permission needed", "Please allow photo access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function onSubmit() {
    if (!canSubmit) {
      Alert.alert(
        "Incomplete report",
        "Please select a location and provide a photo or description."
      );
      return;
    }

    await insertReport({
      building: BUILDING,
      floor,
      roomCode,
      roomName,
      description: description.trim(),
      imageUri,
    });

    Alert.alert("Saved", "Report saved locally.");
    resetForm();
    router.replace("/reports");
  }

  function openRoomPicker() {
    if (!floor) {
      Alert.alert("Select floor first", "Please select a floor first.");
      return;
    }
    setRoomOpen(true);
  }

  function selectRoom(r: Room) {
    setRoomCode(r.code);
    setRoomName(r.name);
    setRoomOpen(false);
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Manual fault report</Text>
          <Text style={styles.subtitle}>
            Provide the exact location in E5 and at least one piece of evidence
            so the issue can be followed up efficiently.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Text style={styles.sectionHint}>Building is fixed to E5.</Text>

          <Text style={styles.fieldLabel}>Floor</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.floorList}
          >
            {FLOORS.map((f) => {
              const selected = floor === f;
              return (
                <Pressable
                  key={f}
                  onPress={() => {
                    setFloor(f);
                    setRoomCode("");
                    setRoomName("");
                  }}
                  style={[
                    styles.floorChip,
                    selected && styles.floorChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.floorChipText,
                      selected && styles.floorChipTextSelected,
                    ]}
                  >
                    Level {f}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.fieldLabel}>Room</Text>
          <Pressable onPress={openRoomPicker} style={styles.roomSelector}>
            <View style={styles.roomSelectorText}>
              <Text style={styles.roomCode}>
                {roomCode ? roomCode : "Please select a room"}
              </Text>
              {roomName ? (
                <Text style={styles.roomName}>{roomName}</Text>
              ) : null}
            </View>
            <Text style={styles.chevron}>▼</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fault details</Text>
          <Text style={styles.sectionHint}>
            At least one of the following is required: a photo or a written
            description.
          </Text>

          <Pressable onPress={pickImage} style={styles.uploadButton}>
            <Text style={styles.uploadButtonText}>
              {imageUri ? "Change photo" : "Upload photo"}
            </Text>
          </Pressable>

          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : null}

          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Briefly describe what is broken or unsafe..."
            multiline
            style={styles.textArea}
          />

          <Text
            style={[
              styles.evidenceStatus,
              hasEvidence ? styles.evidenceOk : styles.evidenceMissing,
            ]}
          >
            {hasEvidence
              ? "✓ At least one piece of evidence has been added."
              : "Please provide a photo or a short description so the fault can be assessed."}
          </Text>
        </View>

        <Pressable
          onPress={onSubmit}
          disabled={!canSubmit}
          style={[
            styles.submitButton,
            !canSubmit && styles.submitButtonDisabled,
          ]}
        >
          <Text style={styles.submitButtonText}>Save report locally</Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={roomOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setRoomOpen(false)}
      >
        <Pressable
          onPress={() => setRoomOpen(false)}
          style={styles.modalBackdrop}
        >
          <Pressable onPress={() => {}} style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select a room (Level {floor || "—"})
              </Text>
              <Pressable onPress={() => setRoomOpen(false)}>
                <Text style={styles.modalClose}>Close</Text>
              </Pressable>
            </View>

            <ScrollView>
              {roomOptions.map((r) => (
                <Pressable
                  key={r.code}
                  onPress={() => selectRoom(r)}
                  style={styles.roomOption}
                >
                  <Text style={styles.roomOptionCode}>{r.code}</Text>
                  <Text style={styles.roomOptionName}>{r.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
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
  section: {
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  sectionHint: {
    fontSize: 12,
    color: "#6B7280",
  },
  fieldLabel: {
    marginTop: 6,
    marginBottom: 4,
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  floorList: {
    gap: 8,
    marginVertical: 2,
  },
  floorChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  floorChipSelected: {
    backgroundColor: "#1D4ED8",
    borderColor: "#1D4ED8",
  },
  floorChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  floorChipTextSelected: {
    color: "#FFFFFF",
  },
  roomSelector: {
    borderWidth: 1,
    borderRadius: 12,
    borderColor: "#D1D5DB",
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  roomSelectorText: {
    flex: 1,
    paddingRight: 10,
  },
  roomCode: {
    fontWeight: "600",
    color: "#111827",
  },
  roomName: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
  },
  chevron: {
    fontSize: 18,
    color: "#9CA3AF",
  },
  uploadButton: {
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
    alignItems: "center",
  },
  uploadButtonText: {
    fontWeight: "600",
    color: "#111827",
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginTop: 10,
  },
  textArea: {
    minHeight: 110,
    borderWidth: 1,
    borderRadius: 10,
    borderColor: "#D1D5DB",
    padding: 12,
    textAlignVertical: "top",
    backgroundColor: "#F9FAFB",
    fontSize: 13,
  },
  evidenceStatus: {
    marginTop: 6,
    fontSize: 12,
  },
  evidenceOk: {
    color: "#16A34A",
  },
  evidenceMissing: {
    color: "#F97316",
  },
  submitButton: {
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "#1D4ED8",
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#93C5FD",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 14,
    maxHeight: "75%",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  modalClose: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
  },
  roomOption: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
  },
  roomOptionCode: {
    fontWeight: "700",
    color: "#111827",
  },
  roomOptionName: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
  },
});
