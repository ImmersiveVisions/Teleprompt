// Electron main process
const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const url = require('url');
const { initWebSocketServer } = require('./server-utils');
const http = require('http');
const express = require('express');
const os = require('os');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

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
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'public', 'electron-bridge.js'),
      webSecurity: true
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

// Function to ensure a directory exists
const ensureDirectoryExists = (directoryPath) => {
  try {
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
      console.log(`Created directory: ${directoryPath}`);
    }
    return true;
  } catch (error) {
    console.error(`Error creating directory ${directoryPath}:`, error);
    return false;
  }
};

// Validate file paths and enforce file system boundaries
// This is a second layer of validation in addition to renderer-side checks
const isPathValid = (basePath, requestedPath, filename = null) => {
  try {
    // Convert both paths to absolute and normalized form
    const absoluteBasePath = path.resolve(basePath);
    let absoluteRequestedPath = path.resolve(requestedPath);
    
    // Ensure the requested path is within the allowed base path
    if (!absoluteRequestedPath.startsWith(absoluteBasePath)) {
      // Special case for relative paths to the app
      if (requestedPath.startsWith('./') || requestedPath.startsWith('../')) {
        absoluteRequestedPath = path.resolve(__dirname, requestedPath);
      } else {
        console.error(`Security violation: ${requestedPath} is outside allowed directory ${basePath}`);
        return false;
      }
    }
    
    // If a filename is provided, check filename validity
    if (filename) {
      // Don't allow path traversal through filenames
      if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
        console.error(`Security violation: Invalid filename ${filename}`);
        return false;
      }
      
      // Only allow specific file extensions
      const validExtensions = ['.txt', '.html', '.htm', '.rtf'];
      const hasValidExt = validExtensions.some(ext => filename.toLowerCase().endsWith(ext));
      if (!hasValidExt) {
        console.error(`Security violation: Invalid file extension for ${filename}`);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error validating path:', error);
    return false;
  }
};

// Store the last validated scripts directory path to use as an allowed base
let scriptsDirectoryPath = path.join(__dirname, 'scripts');

// Handle directory selection dialog
ipcMain.handle('select-directory', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Scripts Directory'
    });
    
    if (result.canceled) {
      return null;
    }
    
    const selectedPath = result.filePaths[0];
    console.log(`Selected directory: ${selectedPath}`);
    
    // Ensure the selected directory exists
    if (!fs.existsSync(selectedPath)) {
      fs.mkdirSync(selectedPath, { recursive: true });
      console.log(`Created directory: ${selectedPath}`);
    }
    
    // Update the allowed scripts directory path
    scriptsDirectoryPath = selectedPath;
    
    return selectedPath;
  } catch (error) {
    console.error('Error selecting directory:', error);
    return null;
  }
});

// IPC handler for listing scripts
ipcMain.handle('list-scripts', async (event, directoryPath) => {
  try {
    // Validate directory path
    if (!isPathValid(scriptsDirectoryPath, directoryPath)) {
      throw new Error('Invalid directory path');
    }
    
    // Ensure the directory exists
    ensureDirectoryExists(directoryPath);
    
    // Read the directory contents
    const files = fs.readdirSync(directoryPath);
    
    // Filter for allowed script files and get their stats
    const validExtensions = ['.txt', '.html', '.htm', '.rtf'];
    const scriptFiles = files
      .filter(file => validExtensions.some(ext => file.toLowerCase().endsWith(ext)))
      .map(file => {
        const filePath = path.join(directoryPath, file);
        const stats = fs.statSync(filePath);
        
        // Read file content for preview (first 1000 chars only for safety)
        let content = '';
        let isHtml = file.toLowerCase().endsWith('.html') || file.toLowerCase().endsWith('.htm');
        try {
          // Read file content with appropriate handling
          const buffer = fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r' });
          
          if (isHtml) {
            // For HTML files, provide a preview note
            content = buffer.toString().substring(0, 300) + '... [HTML content truncated for preview]';
          } else {
            // For text files, get a reasonable preview
            content = buffer.toString().substring(0, 1000); // Limit preview size
          }
        } catch (readError) {
          console.error(`Error reading file ${filePath}:`, readError);
        }
        
        return {
          name: file,
          path: filePath,
          size: stats.size,
          mtime: stats.mtime,
          ctime: stats.ctime,
          content: content,
          isHtml: isHtml
        };
      });
    
    return scriptFiles;
  } catch (error) {
    console.error(`Error listing scripts in ${directoryPath}:`, error);
    throw error;
  }
});

// IPC handler for reading a script
ipcMain.handle('read-script', async (event, directoryPath, filename) => {
  try {
    // Validate paths
    if (!isPathValid(scriptsDirectoryPath, directoryPath, filename)) {
      throw new Error('Invalid path parameters');
    }
    
    const filePath = path.join(directoryPath, filename);
    
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      console.error(`File ${filePath} not found`);
      return null;
    }
    
    // Read the file content
    const content = fs.readFileSync(filePath, 'utf8');
    const stats = fs.statSync(filePath);
    
    return {
      name: filename,
      path: filePath,
      content: content,
      size: stats.size,
      mtime: stats.mtime,
      ctime: stats.ctime
    };
  } catch (error) {
    console.error(`Error reading script ${filename} from ${directoryPath}:`, error);
    throw error;
  }
});

// IPC handler for writing a script
ipcMain.handle('write-script', async (event, directoryPath, filename, content) => {
  try {
    // Validate paths
    if (!isPathValid(scriptsDirectoryPath, directoryPath, filename)) {
      throw new Error('Invalid path parameters');
    }
    
    // Ensure the directory exists
    ensureDirectoryExists(directoryPath);
    
    const filePath = path.join(directoryPath, filename);
    
    // Write the file content
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`File ${filePath} written successfully`);
    
    return true;
  } catch (error) {
    console.error(`Error writing script ${filename} to ${directoryPath}:`, error);
    throw error;
  }
});

// IPC handler for deleting a script
ipcMain.handle('delete-script', async (event, directoryPath, filename) => {
  try {
    // Validate paths
    if (!isPathValid(scriptsDirectoryPath, directoryPath, filename)) {
      throw new Error('Invalid path parameters');
    }
    
    const filePath = path.join(directoryPath, filename);
    
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      console.error(`File ${filePath} not found`);
      return false;
    }
    
    // Delete the file
    fs.unlinkSync(filePath);
    console.log(`File ${filePath} deleted successfully`);
    
    return true;
  } catch (error) {
    console.error(`Error deleting script ${filename} from ${directoryPath}:`, error);
    throw error;
  }
});