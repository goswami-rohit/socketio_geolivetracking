// index.js (Main Express Server)
require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { processRadarWebhook } = require('./radar');

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

/**
 * API route to receive real-time location updates via a webhook from Radar.
 * This endpoint will be configured in your Radar dashboard.
 */
app.post('/api/live-location', async (req, res) => {
  try {
    // Process and validate the incoming webhook payload using the radar.js file
    const locationData = await processRadarWebhook(req);
    if (!locationData) {
      return res.status(400).send('Invalid webhook signature or data.');
    }

    // Broadcast the new location to all connected clients via Socket.IO
    io.emit('locationUpdate', locationData);
    console.log(`Location updated and broadcasted for userId: ${locationData.userId}`);

    res.status(200).send('Location updated successfully.');
  } catch (error) {
    console.error('Error processing live location update:', error);
    res.status(500).send('Internal Server Error.');
  }
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

// Start the server
const port = process.env.PORT || 3001;
httpServer.listen(port, () => {
  console.log(`Express and Socket.IO server listening on port ${port}`);
});
