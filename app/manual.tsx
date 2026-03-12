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
import * as Location from "expo-location";

import { insertReport } from "../src/db/db";
import rawRoomsByFloor from "../scripts/e5_rooms.json";
import {
  BUILDINGS,
  E5_BUILDING,
  type BuildingPolygon,
  type LatLngPoint,
} from "../src/location/buildings";
import {
  classifyPointAgainstBuilding,
  findBestMatchingBuilding,
} from "../src/location/geometry";
import { styles } from "./manual.styles";

type Room = {
  code: string;
  name: string;
};

type LocationStatusType =
  | "idle"
  | "loading"
  | "denied"
  | "error"
  | "success";

type MatchRelation = "inside" | "near" | "far" | "none-nearby";

type LocationStatusState = {
  type: LocationStatusType;
  message: string;
  relation?: MatchRelation;
  matchedBuildingId?: string;
  matchedBuildingName?: string;
  distanceMeters?: number;
  e5DistanceMeters?: number;
  accuracyMeters?: number;
  coords?: LatLngPoint;
};

const roomsByFloor: Record<string, Room[]> = rawRoomsByFloor;
const BUILDING = "E5";
const FLOORS = Object.keys(roomsByFloor).sort();

const NEAR_THRESHOLD_METERS = 20;
const NONE_NEARBY_THRESHOLD_METERS = 100;
const LOW_CONFIDENCE_ACCURACY_METERS = 50;

async function getCurrentPositionSafe(): Promise<
  | { ok: true; coords: Location.LocationObjectCoords }
  | { ok: false; reason: "denied" | "error"; error?: unknown }
> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      return { ok: false, reason: "denied" };
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return { ok: true, coords: position.coords };
  } catch (error) {
    return { ok: false, reason: "error", error };
  }
}

function buildLocationMessage(params: {
  relation: MatchRelation;
  matchedBuilding?: BuildingPolygon | null;
  matchedDistanceMeters?: number;
  e5DistanceMeters: number;
  accuracyMeters?: number;
}): string {
  const {
    relation,
    matchedBuilding,
    matchedDistanceMeters,
    e5DistanceMeters,
    accuracyMeters,
  } = params;

  const roundedMatchedDistance =
    matchedDistanceMeters != null ? Math.round(matchedDistanceMeters) : undefined;
  const roundedE5Distance = Math.round(e5DistanceMeters);
  const roundedAccuracy =
    accuracyMeters != null ? Math.round(accuracyMeters) : undefined;

  let headline = "";

  if (relation === "inside" && matchedBuilding) {
    headline = `You appear to be inside ${matchedBuilding.name}.`;
  } else if (relation === "near" && matchedBuilding) {
    headline = `You appear to be near ${matchedBuilding.name}.`;
  } else if (relation === "far" && matchedBuilding && roundedMatchedDistance != null) {
    headline = `You are about ${roundedMatchedDistance} m from ${matchedBuilding.name}.`;
  } else {
    headline = "You do not appear to be near any supported building.";
  }

  let detail = `Distance to E5: ${roundedE5Distance} m`;

  if (roundedAccuracy != null) {
    detail += ` · GPS accuracy ±${roundedAccuracy} m`;
  }

  let warning = "";
  if (
    roundedAccuracy != null &&
    roundedAccuracy > LOW_CONFIDENCE_ACCURACY_METERS
  ) {
    warning = "\nLocation may be inaccurate.";
  }

  return `${headline}\n${detail}${warning}`;
}

async function getLocationComparedToBuildings(): Promise<LocationStatusState> {
  const pos = await getCurrentPositionSafe();

  if (!pos.ok) {
    if (pos.reason === "denied") {
      return {
        type: "denied",
        message:
          "Location permission was not granted. You can still select the room manually.",
      };
    }

    return {
      type: "error",
      message:
        "There was an error while fetching your location. You can still select the room manually.",
    };
  }

  const { latitude, longitude, accuracy } = pos.coords;
  const point: LatLngPoint = { latitude, longitude };

  const bestMatch = findBestMatchingBuilding(
    point,
    BUILDINGS,
    NEAR_THRESHOLD_METERS
  );

  const e5Match = classifyPointAgainstBuilding(
    point,
    E5_BUILDING,
    NEAR_THRESHOLD_METERS
  );

  if (!bestMatch) {
    return {
      type: "success",
      relation: "none-nearby",
      e5DistanceMeters: e5Match.distanceMeters,
      accuracyMeters: accuracy ?? undefined,
      coords: point,
      message: buildLocationMessage({
        relation: "none-nearby",
        matchedBuilding: null,
        matchedDistanceMeters: undefined,
        e5DistanceMeters: e5Match.distanceMeters,
        accuracyMeters: accuracy ?? undefined,
      }),
    };
  }

  let relation: MatchRelation;

  if (bestMatch.relation === "inside") {
    relation = "inside";
  } else if (bestMatch.relation === "near") {
    relation = "near";
  } else if (bestMatch.distanceMeters > NONE_NEARBY_THRESHOLD_METERS) {
    relation = "none-nearby";
  } else {
    relation = "far";
  }

  return {
    type: "success",
    relation,
    matchedBuildingId:
      relation === "none-nearby" ? undefined : bestMatch.building.id,
    matchedBuildingName:
      relation === "none-nearby" ? undefined : bestMatch.building.name,
    distanceMeters:
      relation === "none-nearby" ? undefined : bestMatch.distanceMeters,
    e5DistanceMeters: e5Match.distanceMeters,
    accuracyMeters: accuracy ?? undefined,
    coords: point,
    message: buildLocationMessage({
      relation,
      matchedBuilding:
        relation === "none-nearby" ? null : bestMatch.building,
      matchedDistanceMeters:
        relation === "none-nearby" ? undefined : bestMatch.distanceMeters,
      e5DistanceMeters: e5Match.distanceMeters,
      accuracyMeters: accuracy ?? undefined,
    }),
  };
}

export default function Manual() {
  const [floor, setFloor] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomOpen, setRoomOpen] = useState(false);
  const [roomQuery, setRoomQuery] = useState("");

  const [description, setDescription] = useState("");
  const [imageUri, setImageUri] = useState("");

  const [locationStatus, setLocationStatus] = useState<LocationStatusState>({
    type: "idle",
    message: "",
  });

  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);

  const resetForm = useCallback(() => {
    setFloor("");
    setRoomCode("");
    setRoomName("");
    setDescription("");
    setImageUri("");
    setRoomOpen(false);
    setRoomQuery("");
  }, []);

  const refreshLocation = useCallback(async () => {
    setIsRefreshingLocation(true);
    setLocationStatus({
      type: "loading",
      message: "Trying to get your current location...",
    });

    try {
      const result = await getLocationComparedToBuildings();
      setLocationStatus(result);
    } finally {
      setIsRefreshingLocation(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      resetForm();
      refreshLocation();
    }, [resetForm, refreshLocation])
  );

  const roomOptions = useMemo<Room[]>(() => {
    if (!floor) return [];
    return roomsByFloor[floor] ?? [];
  }, [floor]);

  const filteredRoomOptions = useMemo<Room[]>(() => {
    const query = roomQuery.trim().toLowerCase();
    if (!query) return roomOptions;

    return roomOptions.filter((room) => {
      return (
        room.code.toLowerCase().includes(query) ||
        room.name.toLowerCase().includes(query)
      );
    });
  }, [roomOptions, roomQuery]);

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

  function selectRoom(room: Room) {
    setRoomCode(room.code);
    setRoomName(room.name);
    setRoomOpen(false);
    setRoomQuery("");
  }

  function renderLocationBanner() {
    if (locationStatus.type === "idle") return null;

    let title = "Location status";
    let color = "#4B5563";
    let bg = "#E5E7EB";

    if (locationStatus.type === "loading") {
      title = "Locating";
      color = "#2563EB";
      bg = "#DBEAFE";
    } else if (locationStatus.type === "denied") {
      title = "Location permission denied";
      color = "#F97316";
      bg = "#FFEDD5";
    } else if (locationStatus.type === "error") {
      title = "Location failed";
      color = "#DC2626";
      bg = "#FEE2E2";
    } else if (locationStatus.type === "success") {
      if (locationStatus.relation === "inside") {
        title = `Inside ${locationStatus.matchedBuildingName ?? "building"}`;
        color = "#16A34A";
        bg = "#DCFCE7";
      } else if (locationStatus.relation === "near") {
        title = `Near ${locationStatus.matchedBuildingName ?? "building"}`;
        color = "#F97316";
        bg = "#FFEDD5";
      } else if (locationStatus.relation === "far") {
        title = `Closest: ${locationStatus.matchedBuildingName ?? "building"}`;
        color = "#6B7280";
        bg = "#E5E7EB";
      } else {
        title = "No nearby supported building";
        color = "#6B7280";
        bg = "#E5E7EB";
      }
    }

    return (
      <View style={[styles.locationBanner, { backgroundColor: bg }]}> 
        <View style={styles.locationBannerHeader}>
          <Text style={[styles.locationBannerTitle, { color }]}>{title}</Text>

          <Pressable
            onPress={refreshLocation}
            disabled={isRefreshingLocation}
            style={[
              styles.refreshLocationButton,
              isRefreshingLocation && styles.refreshLocationButtonDisabled,
            ]}
          >
            <Text style={styles.refreshLocationButtonText}>
              {isRefreshingLocation ? "Refreshing..." : "Refresh"}
            </Text>
          </Pressable>
        </View>

        {locationStatus.message ? (
          <Text style={styles.locationBannerText}>{locationStatus.message}</Text>
        ) : null}
      </View>
    );
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

        {renderLocationBanner()}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Text style={styles.sectionHint}>Building is fixed to E5 for now.</Text>

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
                    setRoomQuery("");
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
              {roomName ? <Text style={styles.roomName}>{roomName}</Text> : null}
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
          onPress={() => {
            setRoomOpen(false);
            setRoomQuery("");
          }}
          style={styles.modalBackdrop}
        >
          <Pressable onPress={() => {}} style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select a room (Level {floor || "—"})
              </Text>
              <Pressable
                onPress={() => {
                  setRoomOpen(false);
                  setRoomQuery("");
                }}
              >
                <Text style={styles.modalClose}>Close</Text>
              </Pressable>
            </View>

            <TextInput
              value={roomQuery}
              onChangeText={setRoomQuery}
              placeholder="Search room code or name..."
              style={styles.searchInput}
            />

            <ScrollView>
              {filteredRoomOptions.length === 0 ? (
                <Text style={styles.emptySearchText}>
                  No matching rooms found.
                </Text>
              ) : (
                filteredRoomOptions.map((room) => (
                  <Pressable
                    key={room.code}
                    onPress={() => selectRoom(room)}
                    style={styles.roomOption}
                  >
                    <Text style={styles.roomOptionCode}>{room.code}</Text>
                    <Text style={styles.roomOptionName}>{room.name}</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
