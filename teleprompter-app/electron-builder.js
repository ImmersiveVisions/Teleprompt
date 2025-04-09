// electron-builder.js configuration
const fs = require('fs');
const path = require('path');

// Create a temporary config file
const configPath = path.join(__dirname, 'electron-builder.yml');

// Define the configuration
const config = `
appId: com.teleprompter.app
productName: Teleprompter
files:
  - build/**/*
  - node_modules/**/*
  - main.js
  - server-utils.js
  - server.js
  - src/services/websocket.js
  - convertScripts.js
  - intake/**/*
  - public/**/*
directories:
  buildResources: public
electronVersion: 29.0.0
`;

// Write the configuration to a file
fs.writeFileSync(configPath, config);

// Execute the build command
const { execSync } = require('child_process');
console.log('Building Electron app...');
execSync('electron-builder --win portable --config electron-builder.yml');

// Clean up the temporary file
fs.unlinkSync(configPath);
console.log('Build complete.');