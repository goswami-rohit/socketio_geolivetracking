// radar.js
const axios = require('axios');

const RADAR_SECRET_KEY = process.env.RADAR_SECRET_KEY; // use secret key

async function pollRadarForLocations(userIds) {
  if (!RADAR_SECRET_KEY) {
    console.error('RADAR_SECRET_KEY is not set in environment variables.');
    return [];
  }

  const locationData = [];
  const headers = {
    'Authorization': `${RADAR_SECRET_KEY}`,
    'Content-Type': 'application/json'
  };

  for (const userId of userIds) {
    try {
      const response = await axios.get(`https://api.radar.io/v1/trips/:id`, { headers });
      const user = response.data.user;
      if (user && user.lastLocation) {
        locationData.push({
          userId: user.externalId,
          latitude: user.lastLocation.coordinates[1],
          longitude: user.lastLocation.coordinates[0],
          timestamp: user.lastLocation.createdAt,
          accuracy: user.lastLocation.accuracy || null,
          speed: user.lastLocation.speed || null,
          heading: user.lastLocation.heading || null,
          altitude: user.lastLocation.altitude || null,
          batteryLevel: user.lastLocation.battery?.level || null,
        });
      }
    } catch (error) {
      console.error(`Failed to poll Radar for user ${userId}:`, error.message);
    }
  }

  return locationData;
}

module.exports = { pollRadarForLocations };