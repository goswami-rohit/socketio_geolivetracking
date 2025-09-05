// index.js (Main Express Server)
require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { Client } = require('pg');
const cors = require('cors');
const { pollRadarForLocations } = require('./radar');

const app = express();
const httpServer = createServer(app);

// Configure CORS for both Express and Socket.IO
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
app.use(express.json()); // For parsing application/json payloads

// Setup Socket.IO server
const io = new Server(httpServer, {
  cors: corsOptions,
});

// A simple Express route to confirm the server is running
app.get('/', (req, res) => {
  res.send(`
    <html style="background-color: #121212; color: #E0E0E0; font-family: sans-serif; text-align: center; padding-top: 50px;">
      <h1>Socket.IO server is running</h1>
    </html>
  `);
});

// This is where the real-time logic will live
io.on('connection', (socket) => {
  console.log('A client has connected with ID:', socket.id);
  socket.on('disconnect', () => {
    console.log('A client has disconnected');
  });
});

// ----------------- DATABASE AND POLLING IMPLEMENTATION ---------------------
// Create a single database client instance for the entire application lifetime.
const dbClient = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function fetchActiveSalesmenIds() {
  try {
    if (!dbClient._connected) {
      await dbClient.connect();
    }
    const result = await dbClient.query(`
      SELECT "id" FROM "users" WHERE status = 'active'
    `);

    // Use the actual `id` column
    return result.rows.map(row => row.id);
  } catch (error) {
    console.error('Error fetching active salesmen from database:', error);
    return [];
  }
}

// Start the polling process
setInterval(async () => {
  const activeSalesmenUserIds = await fetchActiveSalesmenIds();
  
  if (activeSalesmenUserIds.length > 0) {
    try {
      const locations = await pollRadarForLocations(activeSalesmenUserIds);
      if (locations && locations.length > 0) {
        locations.forEach(location => {
          // Broadcast each location to all connected clients
          io.emit('locationUpdate', location);
          console.log(`Polled and broadcasted location for userId: ${location.userId}`);
        });
      }
    } catch (error) {
      console.error('Error during polling:', error);
    }
  } else {
    console.log('No active salesmen found. Polling skipped.');
  }
}, 10000); // Polls every 10 seconds

// Start the server
const port = process.env.PORT || 3001;
httpServer.listen(port, () => {
  console.log(`Express and Socket.IO server listening on port ${port}`);
});
