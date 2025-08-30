const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
// Use the port provided by the environment, or default to 3001
const port = process.env.PORT || 3001;

// Enable CORS for all routes and origins
app.use(cors());

// Create a standard HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with the HTTP server
const io = new Server(server, {
  cors: {
    origin: [ 
        "http://localhost:3000", "http://localhost:3001", "http://localhost:8000",
        "http://13.201.132.230", //aws EC2 IPV4 port
        "https://salesmancms-dashboard.onrender.com",
        "https://telesalesside.onrender.com",
    ],
    methods: ["GET", "POST"]
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

  // This is the event listener for incoming location updates from your webapp
  socket.on('sendLocationUpdate', (data) => {
    // You can add validation or database saving here.
    console.log(`Received location update from user ${data.userId}: ${data.latitude}, ${data.longitude}`);
    
    // Broadcast the update to all other connected clients (i.e., your dashboards)
    io.emit('locationUpdate', data);
  });

  socket.on('disconnect', () => {
    console.log('A client has disconnected');
  });
});

// Start the server
server.listen(port, () => {
  console.log(`Express and Socket.IO server listening on port ${port}`);
});