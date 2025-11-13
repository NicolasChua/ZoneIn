/**
 * @description
 * This library contains helper functions for interacting with the City of Chicago's
 * GIS (Geographic Information System) APIs. It's responsible for geocoding addresses
 * to coordinates, projecting coordinates between different spatial reference systems,
 * and querying the Zoning MapServer to identify the zoning class for a given location.
 *
 * @dependencies
 * - proj4: A library for converting between coordinate systems.
 *
 * @exports
 * - getZoningByAddress: The main high-level function that takes an address string and returns its zoning class.
 * - geocodeAddress: Converts a string address into geographic coordinates (longitude, latitude).
 * - projectTo3435: Converts standard WGS84 coordinates to the local EPSG:3435 system used by Chicago's APIs.
 * - identifyAtPoint: Performs a query on the city's Zoning MapServer.
 * - extractZoneClass: A helper to parse the ZONE_CLASS from the MapServer's response.
 */
import proj4 from "proj4";

// Define the EPSG:3435 projection for NAD83 / Illinois East (ftUS), which is required by Chicago's ArcGIS APIs.
export const EPSG_3435 =
  "+proj=tmerc +lat_0=36.6666666666667 +lon_0=-88.3333333333333 +k=0.999975 +x_0=300000 +y_0=0 +datum=NAD83 +units=us-ft +no_defs +type=crs";

// Base URL for the Chicago Address Locator API.
const GEOCODER_BASE =
  "<https://gisapps.chicago.gov/arcgis/rest/services/Chicago_Addresses/GeocodeServer>";

// Base URL for the Zoning MapServer API.
const ZONING_MAPSERVER_BASE =
  "<https://gisapps.chicago.gov/arcgis/rest/services/ExternalApps/Zoning/MapServer>";

// Type definitions for API responses and function arguments.
interface GeocodeCandidate {
  address: string;
  location: { x: number; y: number };
  score: number;
  attributes: Record<string, any>;
}

interface GeocodeResponse {
  candidates: GeocodeCandidate[];
}

interface GeocodeResult {
  lon: number;
  lat: number;
  score: number;
  address: string;
  wkid: number;
  candidateMeta: any;
  allCandidates: any[];
}

interface IdentifyResult {
  layerId: number;
  attributes: {
    ZONE_CLASS?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface IdentifyResponse {
  results?: IdentifyResult[];
}

/**
 * Geocodes a single-line address using the City's ArcGIS Locator.
 * @param address - The address string to geocode.
 * @param options - Geocoding options, such as maxLocations.
 * @returns A promise that resolves to the best geocoding result.
 * @throws Will throw an error if the geocoding request fails or finds no candidates.
 */
export async function geocodeAddress(
  address: string,
  { maxLocations = 10 } = {}
): Promise<GeocodeResult> {
  const params = new URLSearchParams({
    f: "json",
    singleLine: address,
    outFields: "*",
    outSR: "4326", // WGS84 (latitude/longitude)
    maxLocations: String(maxLocations),
    category: "Address",
  });

  const url = `${GEOCODER_BASE}/findAddressCandidates?${params.toString()}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Geocoder error: ${resp.status}`);
  const data: GeocodeResponse = await resp.json();

  const candidates = data?.candidates ?? [];
  if (!candidates.length) throw new Error("No geocoding candidates found.");

  // Rank candidates based on ArcGIS score
  const ranked = candidates
    .map(c => {
      const attrs = c.attributes || {};
      const addrType = String(attrs.Addr_type || "").toUpperCase();
      const zip = attrs.Postal || attrs.ZIP || attrs.Zip || null;
      const baseScore = Number(c.score || 0);

      return {
        cand: c,
        finalScore: baseScore,
        meta: { addrType, zip, baseScore },
      };
    })
    .sort((a, b) => b.finalScore - a.finalScore);

  const top = ranked[0]?.cand;
  if (!top) throw new Error("No usable geocoding candidate.");

  const { x: lon, y: lat } = top.location;
  return {
    lon,
    lat,
    score: top.score,
    address: top.address,
    wkid: 4326, // EPSG:4326 for WGS84
    candidateMeta: ranked[0].meta,
    allCandidates: ranked,
  };
}

/**
 * Projects WGS84 (lon/lat) coordinates to EPSG:3435 (x/y in feet).
 * @param lon - Longitude.
 * @param lat - Latitude.
 * @returns An object containing the projected x and y coordinates.
 */
export function projectTo3435(lon: number, lat: number): { x3435: number; y3435: number } {
  const [x, y] = proj4(proj4.WGS84, EPSG_3435, [lon, lat]);
  return { x3435: x, y3435: y };
}

/**
 * Creates an extent (bounding box) around a point for ArcGIS queries.
 * @param x - The x-coordinate in EPSG:3435.
 * @param y - The y-coordinate in EPSG:3435.
 * @param bufferFeet - The buffer size in feet around the point.
 * @returns An extent object.
 */
function makeExtentAroundPoint(x: number, y: number, bufferFeet = 500) {
  return {
    xmin: x - bufferFeet,
    ymin: y - bufferFeet,
    xmax: x + bufferFeet,
    ymax: y + bufferFeet,
    spatialReference: { wkid: 3435 },
  };
}

/**
 * Calls the ArcGIS MapServer /identify endpoint to get information at a specific point.
 * @param x3435 - The x-coordinate in EPSG:3435.
 * @param y3435 - The y-coordinate in EPSG:3435.
 * @param options - Options for the identify query, including layers and buffer size.
 * @returns A promise that resolves to the raw JSON response from the identify endpoint.
 */
export async function identifyAtPoint(
  x3435: number,
  y3435: number,
  { layers = [15], bufferFeet = 500 } = {}
): Promise<IdentifyResponse> {
  const geometry = { x: x3435, y: y3435, spatialReference: { wkid: 3435 } };

  const params = new URLSearchParams({
    f: "json",
    geometry: JSON.stringify(geometry),
    geometryType: "esriGeometryPoint",
    sr: "3435",
    tolerance: "2",
    returnGeometry: "false",
    mapExtent: JSON.stringify(makeExtentAroundPoint(x3435, y3435, bufferFeet)),
    imageDisplay: "800,600,96",
    layers: `ALL:${layers.join(",")}`,
  });

  const url = `${ZONING_MAPSERVER_BASE}/identify?${params.toString()}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Identify error: ${resp.status}`);
  return resp.json();
}

/**
 * Extracts the ZONE_CLASS attribute from the identify endpoint's JSON response.
 * @param identifyJson - The raw JSON response from `identifyAtPoint`.
 * @returns The zone class string, or null if not found.
 */
export function extractZoneClass(identifyJson: IdentifyResponse): string | null {
  const zoningHit = identifyJson?.results?.find(
    (r) => Number(r.layerId) === 15 // Layer 15 is the Zoning layer
  );
  return zoningHit?.attributes?.ZONE_CLASS ?? null;
}

/**
 * A high-level function that orchestrates the entire process from address to zoning class.
 * @param address - The address string to look up.
 * @returns A promise that resolves to an object containing the matched address and the zoning class.
 */
export async function getZoningByAddress(address: string): Promise<{ addressMatched: string; zoneClass: string | null }> {
  // 1. Geocode the address to get coordinates.
  const geo = await geocodeAddress(address);

  // 2. Project the coordinates to the required local system.
  const { x3435, y3435 } = projectTo3435(geo.lon, geo.lat);

  // 3. Identify zoning information at the projected point.
  const identifyRaw = await identifyAtPoint(x3435, y3435);

  // 4. Extract the specific zoning class from the response.
  const zoneClass = extractZoneClass(identifyRaw);

  return {
    addressMatched: geo.address,
    zoneClass,
  };
}
