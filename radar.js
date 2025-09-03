// radar.js
const crypto = require('crypto');
const WEBHOOK_SECRET = process.env.RADAR_WEBHOOK_SECRET;

/**
 * Validates and processes a Radar webhook payload.
 *
 * @param {object} req The Express request object.
 * @returns {object|null} The processed location data or null if validation fails.
 */
async function processRadarWebhook(req) {
  if (!WEBHOOK_SECRET) {
    console.error('RADAR_WEBHOOK_SECRET is not set in environment variables.');
    return null;
  }

  // 1. Verify the Radar webhook signature. This is a crucial security step.
  const signature = req.headers['x-radar-signature'];
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(req.body, Object.keys(req.body).sort()))
    .digest('hex');

  if (signature !== expectedSignature) {
    console.error('Radar webhook signature verification failed.');
    return null;
  }

  // 2. Extract location data from the Radar event.
  const event = req.body.event;

  // We are only interested in user location events.
  if (event.type !== 'user.location.updated') {
    return null;
  }
  
  // Extract key data points from the Radar event payload.
  const userId = req.body.user.externalId; // Radar's externalId is our userId
  const latitude = event.location.coordinates[1];
  const longitude = event.location.coordinates[0];
  const timestamp = event.location.updatedAt;

  // The externalId should correspond to a valid user in your database.
  if (!userId) {
    console.error('Radar webhook payload missing externalId (userId).');
    return null;
  }

  return { userId, latitude, longitude, timestamp };
}

module.exports = {
  processRadarWebhook,
};
