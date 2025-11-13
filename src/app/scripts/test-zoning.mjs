import { getZoningByAddress } from "../api/chicagoCityAPI.js";

const addressFromArgv = process.argv.slice(2).join(" ") || "36 S Wabash Ave, Chicago, IL 60603";

(async () => {
  try {
    const result = await getZoningByAddress(addressFromArgv);
    console.log(result)
    // console.log("Matched Address:", result.addressMatched);
    // console.log("WGS84:", { lon: result.lon, lat: result.lat });
    // console.log("EPSG:3435:", { x: result.x3435, y: result.y3435 });
    // console.log("ZONE_CLASS:", result.zoneClass);

    // const layer15 = result.identifyRaw.results.find(r => Number(r.layerId) === 15); // Remove since we are only returning two things
    // console.log("Layer 15 attributes:", layer15?.attributes);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
