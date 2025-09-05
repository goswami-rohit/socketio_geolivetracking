// radar.js
const axios = require("axios");

const RADAR_SECRET_KEY = process.env.RADAR_SECRET_KEY;

async function pollRadarForLocations(externalTripIds) {
  if (!RADAR_SECRET_KEY) {
    console.error("RADAR_SECRET_KEY is not set in environment variables.");
    return [];
  }

  if (!externalTripIds || externalTripIds.length === 0) {
    console.log("No externalTripIds provided to pollRadarForLocations.");
    return [];
  }

  const headers = {
    Authorization: RADAR_SECRET_KEY,
    "Content-Type": "application/json",
  };

  try {
    const response = await axios.get("https://api.radar.io/v1/trips", {
      headers,
      params: {
        externalId: externalTripIds.join(","), // pass salesman_login_id values
        includeLocations: true,
      },
    });

    if (!response.data || !response.data.trips) {
      console.log("Radar returned no trips:", response.data);
      return [];
    }

    const trips = response.data.trips;

    return trips
      .filter((t) => t.user && t.user.lastLocation) // only keep trips with location
      .map((t) => {
        const loc = t.user.lastLocation;
        return {
          userId: t.externalId, // 👈 this is salesman_login_id in your DB
          latitude: loc.coordinates[1],
          longitude: loc.coordinates[0],
          timestamp: loc.createdAt,
          accuracy: loc.accuracy ?? null,
          speed: loc.speed ?? null,
          heading: loc.heading ?? null,
          altitude: loc.altitude ?? null,
          batteryLevel: loc.battery?.level ?? null,
        };
      });
  } catch (err) {
    console.error(
      "Radar poll failed:",
      err.response?.data || err.message
    );
    return [];
  }
}

module.exports = { pollRadarForLocations };
