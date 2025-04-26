#!/usr/bin/env node
// electron-builder.js - Build script for Electron application
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create log file
const logFile = path.join(__dirname, 'electron-build.log');
fs.writeFileSync(logFile, `Build started at: ${new Date().toISOString()}\n\n`);

// Log function
function log(message) {
  const entry = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(logFile, entry);
  console.log(message);
}

try {
  log('Creating electron-builder configuration...');
  
  // Create a temporary config file
  const configPath = path.join(__dirname, 'electron-builder.yml');
  
  // Define the configuration with ASAR disabled for easier debugging
  const config = `
appId: com.teleprompter.app
productName: Teleprompter
author: Immersive Visions
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
  output: dist
asar: false
win:
  target: portable
  icon: public/favicon.ico
electronVersion: 29.0.0
`;

  // Write the configuration to a file
  fs.writeFileSync(configPath, config);
  log('Configuration file created');
  
  // Execute the build command
  log('Building Electron app...');
  log('Running: npx electron-builder --win portable --config electron-builder.yml');
  
  execSync('npx electron-builder --win portable --config electron-builder.yml', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_OPTIONS: '--max-old-space-size=4096' // Increase memory limit
    }
  });
  
  // Clean up the temporary file
  fs.unlinkSync(configPath);
  log('Temporary configuration file removed');
  
  log('Build complete. Check the dist directory for output files.');
} catch (error) {
  log(`ERROR: Build failed: ${error.message}`);
  if (error.stdout) log(`STDOUT: ${error.stdout}`);
  if (error.stderr) log(`STDERR: ${error.stderr}`);
  log(`Check the log file at: ${logFile}`);
  
  // Exit with error code
  process.exit(1);
}