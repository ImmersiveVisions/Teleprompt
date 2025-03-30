// Electron main process
const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const { initWebSocketServer } = require('./server-utils');
const http = require('http');
const express = require('express');
const os = require('os');
const qrcode = require('qrcode-terminal');

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;
let server;

// Create the Express app
const expressApp = express();

// Set port
const PORT = process.env.PORT || 3000;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  // Serve static files in production
  if (app.isPackaged) {
    expressApp.use(express.static(path.join(__dirname, 'build')));
    expressApp.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'build', 'index.html'));
    });
  }

  // Create HTTP server
  server = http.createServer(expressApp);

  // Initialize WebSocket server
  const wss = initWebSocketServer(server);

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

  // Load the app
  if (app.isPackaged) {
    // In production, load from the build directory
    mainWindow.loadURL(url.format({
      pathname: 'localhost:3000',
      protocol: 'http:',
      slashes: true
    }));
  } else {
    // In development, connect to the React development server
    mainWindow.loadURL('http://localhost:3000');
    // Open the DevTools automatically
    mainWindow.webContents.openDevTools();
  }

  // Create a custom menu
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Toggle Full Screen',
          accelerator: 'F11',
          click: () => {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
          }
        },
        { type: 'separator' },
        { 
          label: 'Exit',
          accelerator: 'Alt+F4',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'resetZoom' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            // Show about dialog
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              title: 'About Teleprompter',
              message: 'Teleprompter App v1.0.0',
              detail: 'A desktop application for creating and controlling teleprompter scripts.'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Handle window closing
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create window when Electron has finished initialization
app.on('ready', createWindow);

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
  
  // Close the server when the app is closed
  if (server) {
    server.close();
  }
});

app.on('activate', () => {
  // On macOS, re-create a window when the dock icon is clicked and no windows are open
  if (mainWindow === null) {
    createWindow();
  }
});

// Handle IPC messages from renderer process
ipcMain.on('app-ready', () => {
  console.log('App is ready');
});