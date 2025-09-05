// index.js (Main Express Server)
require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const cors = require('cors');
const { pollRadarForLocations } = require('./radar');
const { z } = require('zod');

const app = express();
const httpServer = createServer(app);

// ----------------- ZOD SCHEMA -----------------
const liveLocationSchema = z.object({
  userId: z.number(),
  salesmanName: z.string(),
  employeeId: z.string().nullable(),
  role: z.string(),
  region: z.string().nullable(),
  area: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  recordedAt: z.string(),
  isActive: z.boolean(),
  accuracy: z.number().nullable(),
  speed: z.number().nullable(),
  heading: z.number().nullable(),
  altitude: z.number().nullable(),
  batteryLevel: z.number().nullable(),
});

// ----------------- CORS -----------------
const corsOptions = {
  origin: [
    process.env.NEXT_PUBLIC_APP_URL,
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:8000",
    "http://13.201.132.230", // AWS EC2 IPV4 port
    "https://salesmancms-dashboard.onrender.com",
    "https://telesalesside.onrender.com",
    "https://socketio-geolivetracking.onrender.com"
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());

// ----------------- SOCKET.IO -----------------
const io = new Server(httpServer, { cors: corsOptions });

app.get('/', (req, res) => {
  res.send(`<html style="background-color:#121212;color:#E0E0E0;font-family:sans-serif;text-align:center;padding-top:50px;">
    <h1>Socket.IO GeoLiveTracking server is running</h1>
  </html>`);
});

io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);
  socket.on('disconnect', () => console.log('A client disconnected'));
});

// ----------------- DATABASE -----------------
const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function fetchActiveSalesmenIds() {
  try {
    const result = await dbPool.query(`
      SELECT id,
             first_name,
             last_name,
             role,
             region,
             area,
             salesman_login_id
      FROM users
      WHERE status = 'active'
    `);
    return result.rows;
  } catch (error) {
    console.error('Error fetching active salesmen from database:', error);
    return [];
  }
}

// ----------------- POLLING -----------------
setInterval(async () => {
  const activeUsers = await fetchActiveSalesmenIds();
  if (activeUsers.length === 0) {
    console.log('No active salesmen found. Polling skipped.');
    return;
  }

  try {
    const userIds = activeUsers.map(u => u.id);
    const locations = await pollRadarForLocations(userIds);

    for (const loc of locations) {
      const user = activeUsers.find(u => u.id.toString() === loc.userId.toString());
      if (!user) continue;

      try {
        const normalized = liveLocationSchema.parse({
          userId: user.id,
          salesmanName: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A',
          employeeId: user.salesman_login_id || null,
          role: user.role || 'junior-executive',
          region: user.region || null,
          area: user.area || null,
          latitude: loc.latitude,
          longitude: loc.longitude,
          recordedAt: loc.timestamp,
          isActive: true,
          accuracy: loc.accuracy ?? null,
          speed: loc.speed ?? null,
          heading: loc.heading ?? null,
          altitude: loc.altitude ?? null,
          batteryLevel: loc.batteryLevel ?? null,
        });

        io.emit('locationUpdate', normalized);
        console.log(`Broadcasted live location for userId ${normalized.userId}`);
      } catch (parseErr) {
        console.error('Schema validation failed:', parseErr.errors);
      }
    }
  } catch (error) {
    console.error('Error during polling:', error);
  }
}, 10000); // every 10s

// ----------------- START SERVER -----------------
const port = process.env.PORT || 3001;
httpServer.listen(port, () => {
  console.log(`GeoLiveTracking server running on port ${port}`);
});
