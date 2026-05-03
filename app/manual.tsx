import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import rawRoomsByBuilding from "../src/data/rooms_by_building.json";
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
import { styles } from "../src/styles/manual.styles";

type Room = {
  code: string;
  name: string;
};

const OTHER_ROOM_OPTION: Room = {
  code: "OTHERS",
  name: "Other location (e.g. corridor, toilet, stairwell, rooftop)",
};

type RoomsByBuilding = Record<
  string,
  {
    buildingName: string;
    floors: Record<string, Room[]>;
  }
>;

type LocationStatusType =
  | "idle"
  | "loading"
  | "denied"
  | "error"
  | "success";

type MatchRelation = "inside" | "near" | "far" | "none-nearby";
type BuildingSelectionSource = "none" | "auto" | "user";

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
  matchedBuildingSupported?: boolean;
  suggestedBuildingId?: string;
  suggestedBuildingName?: string;
};

type PositionResult =
  | { ok: true; coords: Location.LocationObjectCoords }
  | { ok: false; reason: "denied" | "error"; error?: unknown };

const roomsByBuilding: RoomsByBuilding = rawRoomsByBuilding;
const SUPPORTED_BUILDING_IDS = Object.keys(roomsByBuilding).sort();
const NEAR_THRESHOLD_METERS = 20;
const NONE_NEARBY_THRESHOLD_METERS = 100;
const AUTO_SELECT_NEAR_THRESHOLD_METERS = 15;
const AUTO_SELECT_MAX_ACCURACY_METERS = 40;
const LOW_CONFIDENCE_ACCURACY_METERS = 50;
const ENABLE_LOCATION_TIMING_LOG = true;
const REFRESH_COOLDOWN_MS = 1000;

function nowMs() {
  return Date.now();
}

function logTiming(label: string, startedAt: number) {
  if (!ENABLE_LOCATION_TIMING_LOG) return;
  const elapsed = Date.now() - startedAt;
  console.log(`[manual/location] ${label}: ${elapsed}ms`);
}

function getSupportedBuildingName(buildingId?: string) {
  if (!buildingId) return undefined;
  return roomsByBuilding[buildingId]?.buildingName ?? buildingId;
}

function isSupportedBuilding(buildingId?: string) {
  return Boolean(buildingId && roomsByBuilding[buildingId]);
}

async function ensureLocationPermission(): Promise<
  { ok: true } | { ok: false; reason: "denied" | "error"; error?: unknown }
> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      return { ok: false, reason: "denied" };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, reason: "error", error };
  }
}

async function getLastKnownPositionSafe(): Promise<PositionResult> {
  try {
    const position = await Location.getLastKnownPositionAsync();

    if (!position?.coords) {
      return { ok: false, reason: "error" };
    }

    return { ok: true, coords: position.coords };
  } catch (error) {
    return { ok: false, reason: "error", error };
  }
}

async function getCurrentPositionSafe(): Promise<PositionResult> {
  try {
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
  e5DistanceMeters?: number;
  accuracyMeters?: number;
  matchedBuildingSupported?: boolean;
}) {
  const {
    relation,
    matchedBuilding,
    matchedDistanceMeters,
    e5DistanceMeters,
    accuracyMeters,
    matchedBuildingSupported,
  } = params;

  const roundedMatchedDistance =
    matchedDistanceMeters != null ? Math.round(matchedDistanceMeters) : undefined;
  const roundedE5Distance =
    e5DistanceMeters != null ? Math.round(e5DistanceMeters) : undefined;
  const roundedAccuracy =
    accuracyMeters != null ? Math.round(accuracyMeters) : undefined;

  let headline = "";

  if (relation === "inside" && matchedBuilding) {
    headline = `You appear to be inside ${matchedBuilding.name}.`;
  } else if (relation === "near" && matchedBuilding) {
    headline = `You appear to be near ${matchedBuilding.name}.`;
  } else if (
    relation === "far" &&
    matchedBuilding &&
    roundedMatchedDistance != null
  ) {
    headline = `Closest detected building: ${matchedBuilding.name} (${roundedMatchedDistance} m).`;
  } else {
    headline = "You do not appear to be near a supported pilot building.";
  }

  let detail = "";

  if (matchedBuilding && !matchedBuildingSupported) {
    detail =
      "Detailed room data is currently available only for selected pilot buildings. Please choose one manually below.";
  } else if (relation === "inside" && matchedBuildingSupported) {
    detail = "This supported building can be auto-selected for room lookup.";
  } else if (relation === "near" && matchedBuildingSupported) {
    detail = "This supported building can be used as a suggested location. Please confirm it.";
  } else if (relation === "none-nearby") {
    detail =
      "Please choose one of the supported pilot buildings manually.";
  }

  if (roundedE5Distance != null) {
    const e5DistanceLabel =
      roundedE5Distance >= 1000
        ? `${(roundedE5Distance / 1000).toFixed(2)} km`
        : `${roundedE5Distance} m`;

    detail = detail
      ? `${detail}\nYou are ${e5DistanceLabel} from E5.`
      : `You are ${e5DistanceLabel} from E5.`;
  }

  if (roundedAccuracy != null) {
    detail = detail
      ? `${detail}\nGPS accuracy ±${roundedAccuracy} m`
      : `GPS accuracy ±${roundedAccuracy} m`;
  }

  if (
    roundedAccuracy != null &&
    roundedAccuracy > LOW_CONFIDENCE_ACCURACY_METERS
  ) {
    detail = detail
      ? `${detail}\nLocation may be inaccurate.`
      : "Location may be inaccurate.";
  }

  return detail ? `${headline}\n${detail}` : headline;
}

function buildLocationStatusFromCoords(
  coords: Location.LocationObjectCoords,
  sourceLabel = "unknown"
): LocationStatusState {
  const timingStart = nowMs();
  const { latitude, longitude, accuracy } = coords;
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

  let result: LocationStatusState;

  if (!bestMatch) {
    result = {
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
  } else {
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

    const matchedBuildingSupported =
      relation === "none-nearby"
        ? false
        : isSupportedBuilding(bestMatch.building.id);

    result = {
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
      matchedBuildingSupported,
      suggestedBuildingId:
        relation !== "none-nearby" && matchedBuildingSupported
          ? bestMatch.building.id
          : undefined,
      suggestedBuildingName:
        relation !== "none-nearby" && matchedBuildingSupported
          ? getSupportedBuildingName(bestMatch.building.id)
          : undefined,
      message: buildLocationMessage({
        relation,
        matchedBuilding:
          relation === "none-nearby" ? null : bestMatch.building,
        matchedDistanceMeters:
          relation === "none-nearby" ? undefined : bestMatch.distanceMeters,
        e5DistanceMeters: e5Match.distanceMeters,
        accuracyMeters: accuracy ?? undefined,
        matchedBuildingSupported,
      }),
    };
  }

  logTiming(`buildLocationStatusFromCoords(${sourceLabel})`, timingStart);
  return result;
}

function shouldAutoSelectBuilding(status: LocationStatusState) {
  if (status.type !== "success") return false;
  if (!status.suggestedBuildingId) return false;

  const accuracyOk =
    status.accuracyMeters == null ||
    status.accuracyMeters <= AUTO_SELECT_MAX_ACCURACY_METERS;

  if (!accuracyOk) return false;

  if (status.relation === "inside") return true;

  if (
    status.relation === "near" &&
    status.distanceMeters != null &&
    status.distanceMeters <= AUTO_SELECT_NEAR_THRESHOLD_METERS
  ) {
    return true;
  }

  return false;
}

export default function Manual() {
  const backgroundCurrentUpdateActiveRef = useRef(false);
  const lastManualRefreshAtRef = useRef(0);

  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [buildingSelectionSource, setBuildingSelectionSource] =
    useState<BuildingSelectionSource>("none");
  const [buildingOpen, setBuildingOpen] = useState(false);
  const [buildingQuery, setBuildingQuery] = useState("");

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
    setSelectedBuildingId("");
    setBuildingSelectionSource("none");
    setBuildingOpen(false);
    setBuildingQuery("");
    setFloor("");
    setRoomCode("");
    setRoomName("");
    setDescription("");
    setImageUri("");
    setRoomOpen(false);
    setRoomQuery("");
  }, []);

  const applyBuildingSelection = useCallback(
    (buildingId: string, source: BuildingSelectionSource) => {
      setSelectedBuildingId((prev) => {
        if (prev !== buildingId) {
          setFloor("");
          setRoomCode("");
          setRoomName("");
          setRoomQuery("");
        }
        return buildingId;
      });
      setBuildingSelectionSource(source);
    },
    []
  );

  const refreshLocation = useCallback(async () => {
    const now = nowMs();
    if (now - lastManualRefreshAtRef.current < REFRESH_COOLDOWN_MS) {
      return;
    }
    lastManualRefreshAtRef.current = now;

    const visibleRefreshStart = nowMs();
    setIsRefreshingLocation(true);

    const permissionStart = nowMs();
    const permission = await ensureLocationPermission();
    logTiming("ensureLocationPermission", permissionStart);

    if (!permission.ok) {
      if (permission.reason === "denied") {
        setLocationStatus({
          type: "denied",
          message:
            "Location permission was not granted. You can still select a supported building manually.",
        });
      } else {
        setLocationStatus({
          type: "error",
          message:
            "There was an error while checking location permission. You can still select a supported building manually.",
        });
      }
      setIsRefreshingLocation(false);
      logTiming("refreshLocation(visible)", visibleRefreshStart);
      return;
    }

    if (locationStatus.type === "idle") {
      setLocationStatus({
        type: "loading",
        message: "Trying to get your current location...",
      });
    }

    const lastKnownStart = nowMs();
    const lastKnown = await getLastKnownPositionSafe();
    logTiming("getLastKnownPositionSafe", lastKnownStart);

    if (lastKnown.ok) {
      const status = buildLocationStatusFromCoords(lastKnown.coords, "lastKnown");
      setLocationStatus(status);
    } else if (locationStatus.type === "idle") {
      setLocationStatus({
        type: "loading",
        message: "Trying to get your current location...",
      });
    }

    setIsRefreshingLocation(false);
    logTiming("refreshLocation(visible)", visibleRefreshStart);

    if (backgroundCurrentUpdateActiveRef.current) {
      return;
    }

    backgroundCurrentUpdateActiveRef.current = true;

    void (async () => {
      const backgroundStart = nowMs();
      try {
        const currentStart = nowMs();
        const current = await getCurrentPositionSafe();
        logTiming("getCurrentPositionSafe", currentStart);

        if (current.ok) {
          const status = buildLocationStatusFromCoords(current.coords, "current");
          setLocationStatus(status);
        } else if (!lastKnown.ok) {
          setLocationStatus({
            type: "error",
            message:
              "There was an error while fetching your location. You can still select a supported building manually.",
          });
        }
      } finally {
        backgroundCurrentUpdateActiveRef.current = false;
        logTiming("refreshLocation(backgroundCurrent)", backgroundStart);
      }
    })();
  }, [locationStatus.type]);

  useEffect(() => {
    refreshLocation();
  }, [refreshLocation]);

  useEffect(() => {
    if (buildingSelectionSource === "user") return;
    if (!shouldAutoSelectBuilding(locationStatus)) return;
    if (!locationStatus.suggestedBuildingId) return;

    applyBuildingSelection(locationStatus.suggestedBuildingId, "auto");
  }, [applyBuildingSelection, buildingSelectionSource, locationStatus]);

  useFocusEffect(
    useCallback(() => {
      resetForm();
    }, [resetForm])
  );

  const selectedBuilding = selectedBuildingId
    ? roomsByBuilding[selectedBuildingId]
    : undefined;

  const floors = useMemo(() => {
    if (!selectedBuildingId) return [];
    return Object.keys(roomsByBuilding[selectedBuildingId]?.floors ?? {}).sort();
  }, [selectedBuildingId]);

  const roomOptions = useMemo<Room[]>(() => {
    if (!selectedBuildingId || !floor) return [];
    return [
      ...(roomsByBuilding[selectedBuildingId]?.floors?.[floor] ?? []),
      OTHER_ROOM_OPTION,
    ];
  }, [selectedBuildingId, floor]);

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

  const isOtherRoomSelected = roomCode === OTHER_ROOM_OPTION.code;

  const filteredBuildingOptions = useMemo(() => {
    const query = buildingQuery.trim().toLowerCase();

    return SUPPORTED_BUILDING_IDS.filter((buildingId) => {
      const buildingName = getSupportedBuildingName(buildingId) ?? buildingId;
      if (!query) return true;
      return (
        buildingId.toLowerCase().includes(query) ||
        buildingName.toLowerCase().includes(query)
      );
    });
  }, [buildingQuery]);

  const selectedBuildingLabel = selectedBuilding
    ? `${selectedBuildingId} · ${selectedBuilding.buildingName}`
    : "Please select a supported building";

  const hasEvidence = Boolean(imageUri) || description.trim().length > 0;
  const canSubmit =
    Boolean(selectedBuildingId) && Boolean(floor) && Boolean(roomCode) && hasEvidence;

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
        "Please select a building, floor, room, and provide a photo or description."
      );
      return;
    }

    await insertReport({
      building: selectedBuildingId,
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
    if (!selectedBuildingId) {
      Alert.alert("Select building first", "Please select a supported building first.");
      return;
    }

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

  function selectBuilding(buildingId: string) {
    applyBuildingSelection(buildingId, "user");
    setBuildingOpen(false);
    setBuildingQuery("");
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
      if (
        locationStatus.relation === "inside" &&
        locationStatus.matchedBuildingSupported
      ) {
        title = `Inside supported building: ${locationStatus.suggestedBuildingId ?? locationStatus.matchedBuildingId}`;
        color = "#16A34A";
        bg = "#DCFCE7";
      } else if (
        locationStatus.relation === "near" &&
        locationStatus.matchedBuildingSupported
      ) {
        title = `Near supported building: ${locationStatus.suggestedBuildingId ?? locationStatus.matchedBuildingId}`;
        color = "#F97316";
        bg = "#FFEDD5";
      } else if (locationStatus.matchedBuildingName) {
        title = `Detected building: ${locationStatus.matchedBuildingName}`;
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
            Use location to suggest a pilot building, then confirm the exact floor and room with minimal input.
          </Text>
        </View>

        {renderLocationBanner()}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Text style={styles.sectionHint}>
            Detailed room selection is currently available only for supported pilot buildings.
          </Text>

          <Text style={styles.fieldLabel}>Building</Text>
          <Pressable onPress={() => setBuildingOpen(true)} style={styles.roomSelector}>
            <View style={styles.roomSelectorText}>
              <Text style={styles.roomCode}>{selectedBuildingLabel}</Text>
              {buildingSelectionSource !== "none" ? (
                <Text style={styles.roomName}>
                  {buildingSelectionSource === "auto"
                    ? "Auto-selected from your location"
                    : "Selected manually"}
                </Text>
              ) : null}
            </View>
            <Text style={styles.chevron}>▼</Text>
          </Pressable>

          <Text style={styles.fieldLabel}>Floor</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.floorList}
          >
            {floors.length === 0 ? (
              <Text style={styles.sectionHint}>Select a supported building first.</Text>
            ) : (
              floors.map((f) => {
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
              })
            )}
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
            At least one of the following is required: a photo or a written description.
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
          {isOtherRoomSelected ? (
            <Text style={styles.sectionHint}>
              If you selected Others, please clearly describe the exact location here (for example: stairwell, rooftop, corridor near Room 203).
            </Text>
          ) : null}
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
        visible={buildingOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setBuildingOpen(false)}
      >
        <Pressable
          onPress={() => {
            setBuildingOpen(false);
            setBuildingQuery("");
          }}
          style={styles.modalBackdrop}
        >
          <Pressable onPress={() => {}} style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select a supported building</Text>
              <Pressable
                onPress={() => {
                  setBuildingOpen(false);
                  setBuildingQuery("");
                }}
              >
                <Text style={styles.modalClose}>Close</Text>
              </Pressable>
            </View>

            <TextInput
              value={buildingQuery}
              onChangeText={setBuildingQuery}
              placeholder="Search building code or name..."
              style={styles.searchInput}
            />

            <ScrollView>
              {filteredBuildingOptions.length === 0 ? (
                <Text style={styles.emptySearchText}>
                  No matching supported buildings found.
                </Text>
              ) : (
                filteredBuildingOptions.map((buildingId) => (
                  <Pressable
                    key={buildingId}
                    onPress={() => selectBuilding(buildingId)}
                    style={styles.roomOption}
                  >
                    <Text style={styles.roomOptionCode}>{buildingId}</Text>
                    <Text style={styles.roomOptionName}>
                      {getSupportedBuildingName(buildingId)}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

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
                Select a room ({selectedBuildingId || "—"} · Level {floor || "—"})
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
