// electron-build.js - Helper script for building the Electron application
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Building React application...');
exec('npm run build', (error, stdout, stderr) => {
  if (error) {
    console.error(`Build error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Build stderr: ${stderr}`);
  }
  
  console.log(stdout);
  console.log('React build completed successfully.');
  
  console.log('Building Electron application...');
  try {
    // Create a dummy electron builder config to avoid display issues
    const builderConfigPath = path.join(__dirname, 'electron-builder.yml');
    fs.writeFileSync(builderConfigPath, `
appId: com.teleprompter.app
productName: Teleprompter
files:
  - build/**/*
  - node_modules/**/*
  - main.js
  - server-utils.js
win:
  target: portable
electronVersion: 29.0.0
    `);
    
    console.log('Running electron-builder...');
    exec('electron-builder --win portable --config electron-builder.yml', (error, stdout, stderr) => {
      if (error) {
        console.error(`Electron build error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`Electron build stderr: ${stderr}`);
      }
      
      console.log(stdout);
      console.log('Electron build completed successfully.');
      
      // Clean up
      fs.unlinkSync(builderConfigPath);
    });
  } catch (err) {
    console.error('Error building Electron application:', err);
  }
});