import {
  geocodeAddress,
  projectTo3435
} from "./addressConverter.js";

/** Zoning MapServer endpoint */
const ZONING_MAPSERVER_BASE =
  "https://gisapps.chicago.gov/arcgis/rest/services/ExternalApps/Zoning/MapServer";

/* ---------- Identify helpers ---------- */

function makeExtentAroundPoint(x, y, bufferFeet = 500) {
  return {
    xmin: x - bufferFeet,
    ymin: y - bufferFeet,
    xmax: x + bufferFeet,
    ymax: y + bufferFeet,
    spatialReference: { wkid: 3435 },
  };
}

/**
 * Call ArcGIS MapServer /identify for one or more layers.
 * Returns the raw Identify JSON.
 *
 * Options:
 *   - layers: array of layer IDs (default [15] for Zoning)
 *   - bufferFeet: extent buffer size (default 500)
 */
export async function identifyAtPoint(
  x3435,
  y3435,
  { layers = [15], bufferFeet = 500 } = {}
) {
  const geometry = { x: x3435, y: y3435, spatialReference: { wkid: 3435 } };

  const params = new URLSearchParams({
    f: "json", // ask ArcGIS to return JSON
    geometry: JSON.stringify(geometry), // e.g. {"x":1171896.83,"y":1893284.14,"spatialReference":{"wkid":3435}}
    geometryType: "esriGeometryPoint",
    sr: "3435", // specify EPSG:3435
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

/* ---------- Extractors ---------- */

export function extractZoneClass(identifyJson) {
  const zoningHit = identifyJson?.results?.find(
    (r) => Number(r.layerId) === 15
  );
  return zoningHit?.attributes?.ZONE_CLASS ?? null;
}

/* ---------- High-level convenience ---------- */

/**
 * address -> geocode (ranked/strict) -> project -> identify -> ZONE_CLASS
 *
 * Options:
 *   - strict: throw if geocoder street-type differs from requested (default true)
 *   - layers: identify these layer IDs in one call (default [15])
 *   - bufferFeet: identify extent buffer (default 500)
 */
export async function getZoningByAddress(
  address,
  { strict = false, layers = [15], bufferFeet = 500 } = {}
) {
  // 1) Geocode (ranked)
  const geo = await geocodeAddress(address);

  // 2) Optional strict guard for street type (e.g., ST vs PL)
  if (strict) {
    const requested = extractStreetTypeToken(address);
    const got = geo.candidateMeta?.stType
      ? String(geo.candidateMeta.stType).toUpperCase()
      : null;

    if (requested && !streetTypeMatches(requested, got)) {
      throw new Error(
        `Geocoder returned a different street type (requested ${requested}, got ${got || "unknown"}). ` +
          `Include a ZIP or call getZoningByAddress(address, { strict: false }).`
      );
    }
  }

  // 3) Project to EPSG:3435
  const { x3435, y3435 } = projectTo3435(geo.lon, geo.lat);

  // 4) Identify
  const identifyRaw = await identifyAtPoint(x3435, y3435, {
    layers,
    bufferFeet,
  });

  // 5) Parse ZONE_CLASS
  const zoneClass = extractZoneClass(identifyRaw);

//   return {
//     addressMatched: geo.address,
//     lon: geo.lon,
//     lat: geo.lat,
//     x3435,
//     y3435,
//     zoneClass,
//     identifyRaw,
//     geocodeDebug: geo.candidateMeta,
//   };
// }
return {
    addressMatched: geo.address,
    zoneClass
  };
}

