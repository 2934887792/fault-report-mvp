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
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: "700" }}>
          Manual Fault Report
        </Text>

        <View
          style={{ borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600" }}>
            Location (required)
          </Text>

          <Text>Floor</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {FLOORS.map((f) => (
              <Pressable
                key={f}
                onPress={() => {
                  setFloor(f);
                  setRoomCode("");
                  setRoomName("");
                }}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  borderWidth: 1,
                  backgroundColor: floor === f ? "#000" : "transparent",
                }}
              >
                <Text
                  style={{
                    color: floor === f ? "#fff" : "#000",
                    fontWeight: "600",
                  }}
                >
                  Level {f}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text>Room</Text>
          <Pressable
            onPress={openRoomPicker}
            style={{
              borderWidth: 1,
              borderRadius: 10,
              padding: 12,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ fontWeight: "600" }}>
                {roomCode ? roomCode : "Please select a room"}
              </Text>
              {roomName ? (
                <Text style={{ fontSize: 12, opacity: 0.6 }}>{roomName}</Text>
              ) : null}
            </View>
            <Text style={{ fontSize: 18, opacity: 0.6 }}>▼</Text>
          </Pressable>
        </View>

        <View
          style={{ borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600" }}>
            Fault Details (photo or description required)
          </Text>

          <Pressable
            onPress={pickImage}
            style={{ padding: 12, borderWidth: 1, borderRadius: 10 }}
          >
            <Text style={{ fontWeight: "600" }}>
              {imageUri ? "Change photo" : "Upload photo"}
            </Text>
          </Pressable>

          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={{ width: "100%", height: 200, borderRadius: 12 }}
            />
          ) : null}

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Briefly describe the issue..."
            multiline
            style={{
              minHeight: 100,
              borderWidth: 1,
              borderRadius: 10,
              padding: 12,
              textAlignVertical: "top",
            }}
          />

          <Text style={{ color: hasEvidence ? "green" : "orange" }}>
            {hasEvidence
              ? "✓ Evidence provided"
              : "Please provide at least one: a photo or a description."}
          </Text>
        </View>

        <Pressable
          onPress={onSubmit}
          disabled={!canSubmit}
          style={{
            padding: 14,
            borderRadius: 12,
            borderWidth: 1,
            opacity: canSubmit ? 1 : 0.5,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "700" }}>
            Submit Report
          </Text>
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
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.25)",
            justifyContent: "flex-end",
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: "#fff",
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              padding: 12,
              maxHeight: "75%",
              borderWidth: 1,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: 8,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "700" }}>
                Select a room (Level {floor})
              </Text>
              <Pressable onPress={() => setRoomOpen(false)}>
                <Text style={{ fontSize: 16, fontWeight: "700" }}>Close</Text>
              </Pressable>
            </View>

            <ScrollView>
              {roomOptions.map((r) => (
                <Pressable
                  key={r.code}
                  onPress={() => selectRoom(r)}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 10,
                    borderRadius: 10,
                    borderWidth: 1,
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ fontWeight: "700" }}>{r.code}</Text>
                  <Text style={{ opacity: 0.6 }}>{r.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
