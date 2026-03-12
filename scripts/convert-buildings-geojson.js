const fs = require('fs');
const path = require('path');

const SOURCE_PATH = process.argv[2] || 'C:\\Users\\29348\\Downloads\\Buildings_Structure_2020.geojson';
const OUTPUT_PATH = process.argv[3] || path.join(__dirname, '..', 'src', 'location', 'buildings.generated.ts');

const EXCLUDED_BUILDING_TYPES = new Set(['Infrastructure']);
const EXCLUDED_IDS = new Set(['', '...', null, undefined]);
const EXCLUDED_NAME_KEYWORDS = [
  'BIN CENTER',
  'COMPACTOR BIN',
  'STRUCTURE ',
  'PUB SS',
  'SUBSTATION',
  'BOOSTER PUMP',
];

function cleanText(value) {
  if (value == null) return '';
  return String(value).trim();
}

function normalizeName(name, id) {
  if (id === 'IT') return 'Information Technology';
  if (id === 'HSS') return 'Hon Sui Sen Memorial Library';
  return cleanText(name) || cleanText(id) || 'Unknown Building';
}

function shouldKeepFeature(properties = {}) {
  const buildingType = cleanText(properties.BuildingType) || null;
  const id = cleanText(properties.BuildingID) || null;
  const name = cleanText(properties.Building) || null;

  if (EXCLUDED_BUILDING_TYPES.has(buildingType)) return false;
  if (EXCLUDED_IDS.has(id) && !name) return false;
  if (!id && !name) return false;

  const text = `${id || ''} ${name || ''}`.toUpperCase();
  if (EXCLUDED_NAME_KEYWORDS.some((keyword) => text.includes(keyword))) {
    return false;
  }

  return true;
}

function extractOuterRing(geometry) {
  if (!geometry || !geometry.type || !geometry.coordinates) return null;

  if (geometry.type === 'Polygon') {
    return geometry.coordinates[0] || null;
  }

  if (geometry.type === 'MultiPolygon') {
    const polygons = geometry.coordinates;
    if (!Array.isArray(polygons) || polygons.length === 0) return null;

    let bestRing = null;
    let bestSize = -1;

    for (const polygon of polygons) {
      const ring = polygon?.[0];
      if (!Array.isArray(ring) || ring.length < 4) continue;
      if (ring.length > bestSize) {
        bestRing = ring;
        bestSize = ring.length;
      }
    }

    return bestRing;
  }

  return null;
}

function ringToLatLng(ring) {
  return ring.map(([longitude, latitude]) => ({ latitude, longitude }));
}

function computeBoundingBox(polygon) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const point of polygon) {
    if (point.latitude < minLat) minLat = point.latitude;
    if (point.latitude > maxLat) maxLat = point.latitude;
    if (point.longitude < minLng) minLng = point.longitude;
    if (point.longitude > maxLng) maxLng = point.longitude;
  }

  return { minLat, maxLat, minLng, maxLng };
}

function featureToBuilding(feature) {
  const properties = feature.properties || {};
  const outerRing = extractOuterRing(feature.geometry);
  if (!outerRing) return null;

  const polygon = ringToLatLng(outerRing);
  const id = cleanText(properties.BuildingID) || cleanText(properties.Building);
  const sourceName = cleanText(properties.Building) || undefined;
  const buildingType = cleanText(properties.BuildingType) || undefined;
  const siteCampus = cleanText(properties.Site_Campus) || undefined;
  const buildingCluster = cleanText(properties.BuildingCluster) || undefined;

  return {
    id,
    name: normalizeName(sourceName, id),
    sourceName,
    buildingType,
    siteCampus,
    buildingCluster,
    bbox: computeBoundingBox(polygon),
    polygon,
  };
}

function toTsModule(buildings) {
  return `import type { BuildingPolygon } from "./buildings";\n\nexport const GENERATED_BUILDINGS: BuildingPolygon[] = ${JSON.stringify(buildings, null, 2)};\n`;
}

function main() {
  const raw = fs.readFileSync(SOURCE_PATH, 'utf8');
  const geojson = JSON.parse(raw);
  const features = Array.isArray(geojson.features) ? geojson.features : [];

  const buildings = features
    .filter((feature) => shouldKeepFeature(feature.properties))
    .map(featureToBuilding)
    .filter(Boolean)
    .sort((a, b) => a.id.localeCompare(b.id));

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, toTsModule(buildings), 'utf8');

  console.log(`Generated ${buildings.length} buildings -> ${OUTPUT_PATH}`);
}

main();
