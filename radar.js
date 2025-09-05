// radar.js
const axios = require("axios");

const RADAR_SECRET_KEY = process.env.RADAR_SECRET_KEY; // Secret key must be set

async function pollRadarForLocations(externalTripIds) {
  if (!RADAR_SECRET_KEY) {
    console.error("RADAR_SECRET_KEY is not set in environment variables.");
    return [];
  }

  const locationData = [];
  const headers = {
    Authorization: RADAR_SECRET_KEY,
    "Content-Type": "application/json",
  };

  for (const tripId of externalTripIds) {
    try {
      // Fetch trip details by externalId
      const response = await axios.get(
        `https://api.radar.io/v1/trips/${encodeURIComponent(tripId)}`,
        {
          headers,
          params: {
            externalId: activeUserExternalIds.join(","), // list of your salesman_login_id or similar
            status: "started",
            includeLocations: true,
          },
        }
      );

      const trip = response.data.trip;

      if (trip && trip.user && trip.user.lastLocation) {
        const loc = trip.user.lastLocation;

        locationData.push({
          userId: trip.user.externalId, // use externalId (your DB’s salesman_login_id, etc.)
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
    } catch (error) {
      if (error.response) {
        console.error(
          `Failed to poll Radar for trip ${tripId}: [${error.response.status}] ${error.response.data.message || error.response.statusText}`
        );
      } else {
        console.error(`Failed to poll Radar for trip ${tripId}:`, error.message);
      }
    }
  }

  return locationData;
}

module.exports = { pollRadarForLocations };
