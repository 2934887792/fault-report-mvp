import { GENERATED_BUILDINGS } from "./buildings.generated";

export type LatLngPoint = {
  latitude: number;
  longitude: number;
};

export type BoundingBox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export type BuildingPolygon = {
  id: string;
  name: string;
  sourceName?: string;
  buildingType?: string;
  siteCampus?: string;
  buildingCluster?: string;
  bbox?: BoundingBox;
  polygon: LatLngPoint[];
};

export const BUILDINGS: BuildingPolygon[] = GENERATED_BUILDINGS;

export const BUILDINGS_BY_ID: Record<string, BuildingPolygon> = Object.fromEntries(
  BUILDINGS.map((building) => [building.id, building])
);

export const E5_BUILDING = BUILDINGS_BY_ID.E5;
