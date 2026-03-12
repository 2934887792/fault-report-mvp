import type { BuildingPolygon, LatLngPoint } from "./buildings";

export type BuildingRelation = "inside" | "near" | "far";

export type BuildingMatchResult = {
building: BuildingPolygon;
relation: BuildingRelation;
distanceMeters: number;
};

const EARTH_RADIUS_METERS = 6371000;

function toRadians(deg: number): number {
return (deg * Math.PI) / 180;
}

/**
* Haversine great-circle distance between two lat/lng points.
*/
export function haversineDistanceMeters(a: LatLngPoint, b: LatLngPoint): number {
const lat1 = toRadians(a.latitude);
const lat2 = toRadians(b.latitude);
const dLat = toRadians(b.latitude - a.latitude);
const dLng = toRadians(b.longitude - a.longitude);

const h =
Math.sin(dLat / 2) * Math.sin(dLat / 2) +
Math.cos(lat1) *
Math.cos(lat2) *
Math.sin(dLng / 2) *
Math.sin(dLng / 2);

return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
* Convert lat/lng to a local planar XY coordinate system in meters,
* relative to a chosen origin point.
*
* This is accurate enough for short campus/building-scale distances.
*/
function projectPointToLocalMeters(
point: LatLngPoint,
origin: LatLngPoint
): { x: number; y: number } {
const meanLatRad = toRadians((point.latitude + origin.latitude) / 2);

const metersPerDegLat = 111320;
const metersPerDegLng = 111320 * Math.cos(meanLatRad);

return {
x: (point.longitude - origin.longitude) * metersPerDegLng,
y: (point.latitude - origin.latitude) * metersPerDegLat,
};
}

/**
* Ray-casting point-in-polygon test.
*
* Assumes polygon is closed or open; both are supported.
* Returns true if the point is inside the polygon.
*/
export function isPointInPolygon(
point: LatLngPoint,
polygon: LatLngPoint[]
): boolean {
if (polygon.length < 3) return false;

let inside = false;

for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
const xi = polygon[i].longitude;
const yi = polygon[i].latitude;
const xj = polygon[j].longitude;
const yj = polygon[j].latitude;

const intersects =
yi > point.latitude !== yj > point.latitude &&
point.longitude <
((xj - xi) * (point.latitude - yi)) / (yj - yi) + xi;

if (intersects) {
inside = !inside;
}
}

return inside;
}

/**
* Distance from point P to segment AB in local XY meters.
*/
function distancePointToSegmentMeters(
point: LatLngPoint,
a: LatLngPoint,
b: LatLngPoint
): number {
const origin = point;

const p = { x: 0, y: 0 };
const aXY = projectPointToLocalMeters(a, origin);
const bXY = projectPointToLocalMeters(b, origin);

const abx = bXY.x - aXY.x;
const aby = bXY.y - aXY.y;
const apx = p.x - aXY.x;
const apy = p.y - aXY.y;

const abLenSq = abx * abx + aby * aby;

if (abLenSq === 0) {
const dx = aXY.x - p.x;
const dy = aXY.y - p.y;
return Math.sqrt(dx * dx + dy * dy);
}

let t = (apx * abx + apy * aby) / abLenSq;
t = Math.max(0, Math.min(1, t));

const closestX = aXY.x + t * abx;
const closestY = aXY.y + t * aby;

const dx = closestX - p.x;
const dy = closestY - p.y;

return Math.sqrt(dx * dx + dy * dy);
}

/**
* Minimum distance from a point to a polygon boundary.
*
* - Returns 0 if the point is inside the polygon.
* - Otherwise returns the shortest distance to any polygon edge, in meters.
*/
export function distancePointToPolygonMeters(
point: LatLngPoint,
polygon: LatLngPoint[]
): number {
if (polygon.length < 2) return Infinity;

if (isPointInPolygon(point, polygon)) {
return 0;
}

let minDistance = Infinity;

for (let i = 0; i < polygon.length - 1; i++) {
const dist = distancePointToSegmentMeters(point, polygon[i], polygon[i + 1]);
if (dist < minDistance) {
minDistance = dist;
}
}

// If polygon is not explicitly closed, also connect last -> first
const first = polygon[0];
const last = polygon[polygon.length - 1];
const isClosed =
first.latitude === last.latitude && first.longitude === last.longitude;

if (!isClosed) {
const closingDist = distancePointToSegmentMeters(point, last, first);
if (closingDist < minDistance) {
minDistance = closingDist;
}
}

return minDistance;
}

/**
* Classify a point relative to a building polygon.
*/
export function classifyPointAgainstBuilding(
point: LatLngPoint,
building: BuildingPolygon,
nearThresholdMeters = 20
): BuildingMatchResult {
const distanceMeters = distancePointToPolygonMeters(point, building.polygon);

let relation: BuildingRelation = "far";

if (distanceMeters === 0) {
relation = "inside";
} else if (distanceMeters <= nearThresholdMeters) {
relation = "near";
}

return {
building,
relation,
distanceMeters,
};
}

/**
* Find the best matching building for a point:
* - Prefer any building that contains the point ("inside")
* - Otherwise choose the nearest building by boundary distance
*/
export function findBestMatchingBuilding(
point: LatLngPoint,
buildings: BuildingPolygon[],
nearThresholdMeters = 20
): BuildingMatchResult | null {
if (buildings.length === 0) return null;

let best: BuildingMatchResult | null = null;

for (const building of buildings) {
const result = classifyPointAgainstBuilding(
point,
building,
nearThresholdMeters
);

if (result.relation === "inside") {
return result;
}

if (!best || result.distanceMeters < best.distanceMeters) {
best = result;
}
}

return best;
}