// server.js
const express = require('express');
const path = require('path');
const http = require('http');
const serverUtils = require('./server-utils');
const os = require('os');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const util = require('util');
// Helper function to convert plain text to HTML
function convertTextToHtml(text) {
  if (!text || typeof text !== 'string') {
    return '<div style="color: white;">No content available</div>';
  }
  
  // Simple conversion - wrap text with line breaks
  return `<div style="color: white; text-align: center; white-space: pre-wrap; line-height: 1.5;">${text.replace(/\n/g, '<br>')}</div>`;
}

// Log node version and module info for debugging
console.log('Node version:', process.version);
console.log('Server utils:', typeof serverUtils, 'initWebSocketServer:', typeof serverUtils.initWebSocketServer);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'build')));

// Serve files from the public directory at the root path
app.use(express.static(path.join(__dirname, 'public')));

// Add a diagnostic endpoint to check for server health
app.get('/api/status', (req, res) => {
  res.json({ status: 'running', timestamp: new Date() });
});

// Scripts directory - relative to the application root
const SCRIPTS_DIRECTORY = path.join(__dirname, 'scripts');
// Public directory for HTML files
const PUBLIC_DIRECTORY = path.join(__dirname, 'public');

// Create the scripts directory if it doesn't exist
try {
  if (!fs.existsSync(SCRIPTS_DIRECTORY)) {
    fs.mkdirSync(SCRIPTS_DIRECTORY, { recursive: true });
    console.log(`Created scripts directory at: ${SCRIPTS_DIRECTORY}`);
    
    // Create a sample text file if directory is empty
    const sampleFilePath = path.join(SCRIPTS_DIRECTORY, 'welcome.txt');
    if (!fs.existsSync(sampleFilePath)) {
      fs.writeFileSync(sampleFilePath, 'Welcome to the Teleprompter App!\n\nThis is a sample script file.\nYou can add your own scripts in this directory.');
      console.log('Created sample welcome script');
    }
  }
} catch (error) {
  console.error(`Error creating scripts directory: ${error.message}`);
}

// Add a test endpoint to view HTML scripts
app.get('/api/test-html', async (req, res) => {
  try {
    // Only check the public directory for HTML files
    let testFiles = [];
    
    if (fs.existsSync(PUBLIC_DIRECTORY)) {
      testFiles = fs.readdirSync(PUBLIC_DIRECTORY)
        .filter(file => file.toLowerCase().endsWith('.html') || file.toLowerCase().endsWith('.htm'));
      console.log(`Found ${testFiles.length} HTML files in public directory`);
    }
    
    if (testFiles.length === 0) {
      return res.json({ 
        message: 'No HTML files found in public directory', 
        dir: PUBLIC_DIRECTORY 
      });
    }
    
    const testFile = testFiles[0];
    const filePath = path.join(PUBLIC_DIRECTORY, testFile);
    const htmlContent = fs.readFileSync(filePath, 'utf8');
    
    // Return rendered HTML instead of plain text
    res.type('text/html').send(htmlContent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to list all scripts
app.get('/api/scripts', async (req, res) => {
  try {
    console.log(`Fetching HTML files from public directory: ${PUBLIC_DIRECTORY}`);
    
    // Initialize array to store files
    let htmlFiles = [];
    
    // Get HTML files from public directory
    if (fs.existsSync(PUBLIC_DIRECTORY)) {
      htmlFiles = fs.readdirSync(PUBLIC_DIRECTORY)
        .filter(file => file.endsWith('.html') || file.endsWith('.htm'))
        .map(filename => ({
          filename,
          directory: PUBLIC_DIRECTORY
        }));
      console.log(`Found ${htmlFiles.length} HTML files in public directory`);
    } else {
      console.error(`Public directory does not exist: ${PUBLIC_DIRECTORY}`);
    }
    
    // Use only HTML files from public directory
    const allFiles = htmlFiles;
    
    // If no files found, respond with empty array but valid JSON
    if (allFiles.length === 0) {
      console.log('No script files found - sending empty array');
      return res.json({ 
        message: 'No script files found',
        scripts: [] 
      });}
    
    // Process each file in parallel
    const scriptPromises = allFiles.map(async ({ filename, directory }) => {
      try {
        const filePath = path.join(directory, filename);
        const rawContent = fs.readFileSync(filePath, 'utf8');
        const stats = fs.statSync(filePath);
        
        // Process the content based on file type
        let processedContent;
        let isHtml = false;
        
        if (filename.toLowerCase().endsWith('.html') || filename.toLowerCase().endsWith('.htm')) {
          // For HTML files, use content directly
          processedContent = rawContent;
          isHtml = true;
          console.log(`Using HTML file directly: ${filename} from ${directory}`);
        } else {
          // For text files, wrap in div with line breaks
          processedContent = `<div>${rawContent.replace(/\n/g, '<br>')}</div>`;
          isHtml = true;
        }
        
        return {
          id: filename,
          title: filename.replace(/\.\w+$/, ''), // Remove file extension
          body: processedContent,
          content: processedContent, // For backward compatibility
          isHtml: isHtml, // Flag to indicate HTML content
          lastModified: stats.mtime,
          dateCreated: stats.ctime,
          sourceDirectory: directory // Add source directory information
        };
      } catch (readError) {
        console.error(`Error reading file ${filename} from ${directory}:`, readError);
        return {
          id: filename,
          title: `Error: ${filename}`,
          body: `Could not read file: ${readError.message}`,
          content: `Could not read file: ${readError.message}`,
          isHtml: false,
          lastModified: new Date(),
          dateCreated: new Date(),
          sourceDirectory: directory
        };
      }
    });
    
    // Wait for all script conversions to complete
    const scripts = await Promise.all(scriptPromises);
    
    res.json({ scripts });
  } catch (error) {
    console.error('Error listing scripts:', error);
    res.status(500).json({ error: error.message, scripts: [] });
  }
});

// API endpoint to get a specific script
app.get('/api/scripts/:id', async (req, res) => {
  try {
    const scriptId = req.params.id;
    
    // Only handle HTML files from public directory
    const filePath = path.join(PUBLIC_DIRECTORY, scriptId);
    console.log(`Looking for HTML file in public directory: ${scriptId}`);
    
    // Add a direct web URL for client-side access
    const publicUrl = `public/${scriptId}`;
    console.log(`Public URL for HTML file: ${publicUrl}`);
    
    // If file doesn't exist
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: `Script not found: ${scriptId}` });
    }
    
    const stats = fs.statSync(filePath);
    
    const script = {
      id: scriptId,
      title: scriptId.replace(/\.\w+$/, ''), // Remove file extension
      isHtml: true, // Flag to indicate HTML content
      publicUrl: publicUrl, // Direct URL for HTML files
      lastModified: stats.mtime,
      dateCreated: stats.ctime
    };
    
    res.json({ script });
  } catch (error) {
    console.error('Error getting script:', error);
    res.status(500).json({ error: error.message });
  }
});

// We're removing the endpoints for adding, updating, and deleting scripts
// as the application should only read scripts from the directory

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
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} and listening on all interfaces (0.0.0.0)`);
  
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
    
    console.log('\nIMPORTANT: If you see "Invalid Host header" errors when accessing from another device,');
    console.log('make sure you are using the "npm run dev" command which disables the host check.');
  } else {
    console.log('\nNo network interfaces found for remote access.');
  }
});