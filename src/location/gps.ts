import * as Location from "expo-location";

export type ReferenceLocation = {
  latitude: number;
  longitude: number;
  name?: string;
};

export type LocationStatusType =
  | "idle"
  | "loading"
  | "denied"
  | "error"
  | "success";

export type LocationStatusState = {
  type: LocationStatusType;
  message: string;
  distanceMeters?: number;
  accuracyMeters?: number;
  coords?: {
    latitude: number;
    longitude: number;
  };
  proximityLabel?: "near" | "medium" | "far";
};

export const REFERENCE_HOME: ReferenceLocation = {
  latitude: 1.319668,
  longitude: 103.754303,
  name: "Home",
};

export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dPhi = toRad(lat2 - lat1);
  const dLambda = toRad(lon2 - lon1);

  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const d = R * c;
  return d;
}

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
  } catch (e) {
    return { ok: false, reason: "error", error: e };
  }
}

export async function getLocationComparedToReference(
  ref: ReferenceLocation
): Promise<LocationStatusState> {
  const baseName = ref.name ?? "reference location";

  const pos = await getCurrentPositionSafe();

  if (!pos.ok) {
    if (pos.reason === "denied") {
      return {
        type: "denied",
        message:
          `Location permission was not granted, so we cannot estimate whether you are near "${baseName}". ` +
          "You can still select floor and room manually.",
      };
    }

    return {
      type: "error",
      message: `There was an error while fetching your location, so we cannot estimate whether you are near "${baseName}".`,
    };
  }

  const { latitude, longitude, accuracy } = pos.coords;
  console.log(
    "DEBUG current coords:",
    latitude,
    longitude,
    "accuracy:",
    accuracy
  );

  const distance = haversineDistanceMeters(
    latitude,
    longitude,
    ref.latitude,
    ref.longitude
  );

  let proximityLabel: "near" | "medium" | "far" = "far";
  let summary = "";

  if (distance < 100) {
    proximityLabel = "near";
    summary = `You are very likely near "${baseName}".`;
  } else if (distance < 300) {
    proximityLabel = "medium";
    summary = `You might be in the area around "${baseName}".`;
  } else {
    proximityLabel = "far";
    summary = `You do not appear to be near "${baseName}". Please double-check your location.`;
  }

  const roundedDistance = Math.round(distance);
  const roundedAccuracy = accuracy != null ? Math.round(accuracy) : undefined;

  let detail = `Approx. distance to reference point: ${roundedDistance} m`;
  if (roundedAccuracy != null) {
    detail += ` (GPS accuracy ±${roundedAccuracy} m)`;
  }

  return {
    type: "success",
    message: `${summary}\n${detail}`,
    distanceMeters: distance,
    accuracyMeters: accuracy ?? undefined,
    coords: { latitude, longitude },
    proximityLabel,
  };
}

