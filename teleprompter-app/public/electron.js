// Electron entry point - redirects to main.js
const path = require('path');

// First check if we're in a packaged app (Electron executable) or development mode
if (process.env.NODE_ENV === 'production') {
  // In production/packaged app the relative paths are different
  // We need to find the main.js at the root of the app
  try {
    // Try to determine the root directory
    const appRoot = process.resourcesPath || __dirname;
    const mainPath = path.resolve(appRoot, 'main.js');
    console.log(`Loading main.js from: ${mainPath}`);
    require(mainPath);
  } catch (error) {
    console.error('Failed to load main.js:', error);
    process.exit(1);
  }
} else {
  // In development, the structure is as expected
  const mainPath = path.resolve(__dirname, '../main.js');
  console.log(`Loading main.js from: ${mainPath}`);
  require(mainPath);
}