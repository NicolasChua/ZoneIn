import proj4 from "proj4"; // handle coordinate conversions

/* EPSG:3435 (NAD83 / Illinois East (ftUS))
    ArcGIS Zoning Identify requires this.
    Required by proj4 to convert
    EPSG:4326 (WGS84) - global spherical coordinates (i.e. longitude/latitude aka degrees)
    to
    EPSG:3435 (NAD83 / Illinois East (ftUS) - local flat grid coordinates (i.e. U.S. survey feet)
    (required for Chicago's Zoning API)

    NB: EPSG:3435 is a StatePlane Transverse Mercator projection tailored for Illinois East zone.
        i.e. local grid system (in feet) that flattens the Illinois East zone using the Transverse
        Mercator projection, so Chicago can measure distances and areas accurately without distortion.
*/
export const EPSG_3435 =
  "+proj=tmerc +lat_0=36.6666666666667 +lon_0=-88.3333333333333 +k=0.999975 +x_0=300000 +y_0=0 +datum=NAD83 +units=us-ft +no_defs +type=crs";

/* Chicago Address Locator endpoint
    Will use /findAddressCandidates operation to turn text -> coordinates.
*/
const GEOCODER_BASE =
  "https://gisapps.chicago.gov/arcgis/rest/services/Chicago_Addresses/GeocodeServer";

// Extract ZIP code from user input string
/*
Look for 5 digits, then optional dash + 4 digits
Return the 5-digit part:
12345       => 12345
12345-6789  => 12345
*/
export function extractZip(address) {
  const m = address.match(/\b(\d{5})(?:-\d{4})?\b/);
  return m ? m[1] : null;
}

/* ---------- Geocoding ---------- */

/**
 * Geocode a single-line address using the City's ArcGIS Locator.
 * Returns { lon, lat, score, address, wkid, candidateMeta, allCandidates }
 *
 * Options:
 *   - maxLocations: how many candidates to consider (default 10)
 *
 * Note: ranking uses ONLY ArcGIS `score` (no custom bonuses).
 */
export async function geocodeAddress(address, { maxLocations = 10 } = {}) {
  const params = new URLSearchParams({
    f: "json",
    singleLine: address,
    outFields: "*", // includes Addr_type, Postal, etc.
    outSR: "4326",
    maxLocations: String(maxLocations),
    category: "Address",
  });

  const url = `${GEOCODER_BASE}/findAddressCandidates?${params.toString()}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Geocoder error: ${resp.status}`);
  const data = await resp.json();

  const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
  if (!candidates.length) throw new Error("No geocoding candidates found.");

  // use ArcGID built-in score to determine best match
  const ranked = candidates
    .map((c) => {
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
    wkid: 4326,              // EPSG:4326 = WGS84 (lat/lon in degrees)
    candidateMeta: ranked[0].meta,
    allCandidates: ranked,
  };
}

/** Projection
 * Convert lon/lat (degrees, EPSG:4326) → x/y (feet, EPSG:3435).
 * Uses proj4 with EPSG_3435 definition.
 */
export function projectTo3435(lon, lat) {
  const [x, y] = proj4(proj4.WGS84, EPSG_3435, [lon, lat]);
  return { x3435: x, y3435: y };
}
