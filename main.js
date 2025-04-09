const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');
const http = require('http');
const { initWebSocketServer } = require('./websocket-service');
const os = require('os');

let mainWindow;

// Start Express server
const startServer = () => {
  const expressApp = express();
  const server = http.createServer(expressApp);
  const PORT = 43210; // Use a fixed port
  
  // Serve static files from the React app
  expressApp.use(express.static(path.join(__dirname, 'build')));
  
  // Health check endpoint for debugging
  expressApp.get('/api/status', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  // For any request that doesn't match one above
  expressApp.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
  
  // Initialize WebSocket server with /ws path
  console.log('Initializing WebSocket server on path /ws');
  const wss = initWebSocketServer(server);
  console.log('WebSocket server initialized');
  
  // Start the server
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
    // Open the application window
    mainWindow.loadURL(`http://localhost:${PORT}`);
    
    // Log access URLs
    const networkInterfaces = os.networkInterfaces();
    const addresses = [];
    
    for (const name of Object.keys(networkInterfaces)) {
      for (const net of networkInterfaces[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          addresses.push(net.address);
        }
      }
    }
    
    if (addresses.length > 0) {
      console.log('\nAccess from other devices on the same network at:');
      addresses.forEach(address => {
        console.log(`http://${address}:${PORT}`);
      });
    }
  });
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  
  // Start server and then load the app
  startServer();
  
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});
