// electron-build.js - Helper script for building the Electron application
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  console.log('Creating electron-builder configuration...');
  
  // Create a temporary config file 
  const configPath = path.join(__dirname, 'electron-builder.yml');
  
  // Define a complete configuration
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
  - "!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}"
  - "!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}"
directories:
  buildResources: public
  output: dist
asar: true
win:
  target: portable
  icon: public/favicon.ico
electronVersion: 29.0.0
extraMetadata:
  main: "main.js"
`;

  // Write the configuration to a file
  fs.writeFileSync(configPath, config);
  
  // Execute the build command
  console.log('Running React build...');
  execSync('npm run build', { stdio: 'inherit' });
  
  console.log('Building Electron Windows portable...');
  execSync('npx electron-builder --win portable', { stdio: 'inherit' });
  
  // Log the output path
  console.log('Build complete!');
  console.log('Output path: ' + path.join(__dirname, 'dist'));
  
  // Clean up the temporary file
  fs.unlinkSync(configPath);
  
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}