// radar.js
const axios = require("axios");

const RADAR_SECRET_KEY = process.env.RADAR_SECRET_KEY;

async function pollRadarForLocations(externalTripIds) {
  if (!RADAR_SECRET_KEY) {
    console.error("RADAR_SECRET_KEY is not set in environment variables.");
    return [];
  }

  if (!externalTripIds || externalTripIds.length === 0) {
    return [];
  }

  try {
    const headers = { Authorization: RADAR_SECRET_KEY };

    // ✅ Fetch all trips in a single request
    const response = await axios.get("https://api.radar.io/v1/trips", {
      headers,
      params: {
        externalId: externalTripIds.join(","), // comma-separated list
        includeLocations: true,
        status: "started", // optional filter
      },
    });

    const trips = response.data.trips || [];
    const locationData = [];

    for (const trip of trips) {
      if (trip.user && trip.user.lastLocation) {
        const loc = trip.user.lastLocation;

        locationData.push({
          userId: trip.user.externalId, // your salesman_login_id
          latitude: loc.coordinates[1],
          longitude: loc.coordinates[0],
          timestamp: loc.createdAt,
          accuracy: loc.accuracy ?? null,
          speed: loc.speed ?? null,
          heading: loc.heading ?? null,
          altitude: loc.altitude ?? null,
          batteryLevel: loc.battery?.level ?? null,
        });
      }
    }

    return locationData;
  } catch (err) {
    if (err.response) {
      console.error(
        `Radar API error: [${err.response.status}] ${err.response.data.message || err.response.statusText}`
      );
    } else {
      console.error("Radar request failed:", err.message);
    }
    return [];
  }
}

module.exports = { pollRadarForLocations };
