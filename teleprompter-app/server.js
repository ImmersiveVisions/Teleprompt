// server.js
const express = require('express');
const path = require('path');
const http = require('http');
const serverUtils = require('./server-utils');
const os = require('os');
const qrcode = require('qrcode-terminal');

// Log node version and module info for debugging
console.log('Node version:', process.version);
console.log('Server utils:', typeof serverUtils, 'initWebSocketServer:', typeof serverUtils.initWebSocketServer);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'build')));

// Add a diagnostic endpoint to check for server health
app.get('/api/status', (req, res) => {
  res.json({ status: 'running', timestamp: new Date() });
});

// For any request that doesn't match one above, send back React's index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
console.log('Initializing WebSocket server...');
const wss = serverUtils.initWebSocketServer(server);
console.log('WebSocket server initialized');

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Get local IP addresses to display for easy access
  const networkInterfaces = os.networkInterfaces();
  const addresses = [];
  
  for (const name of Object.keys(networkInterfaces)) {
    for (const net of networkInterfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  
  console.log('\nAccess the teleprompter on this device at:');
  console.log(`http://localhost:${PORT}`);
  
  if (addresses.length > 0) {
    console.log('\nAccess from other devices on the same network at:');
    addresses.forEach(address => {
      const url = `http://${address}:${PORT}`;
      console.log(url);
      
      // Generate QR code in terminal for easy mobile access
      console.log('\nScan this QR code with your mobile device:');
      qrcode.generate(url, { small: true });
    });
  } else {
    console.log('\nNo network interfaces found for remote access.');
  }
});