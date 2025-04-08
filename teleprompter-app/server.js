// server.js
const express = require('express');
const path = require('path');
const http = require('http');
const serverUtils = require('./server-utils');
const os = require('os');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const util = require('util');
const { execSync } = require('child_process');
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

// Parse JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add middleware for file uploads
const multer = require('multer');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'public'));
  },
  filename: function (req, file, cb) {
    // Preserve original filename but ensure it's safe
    const safeName = file.originalname.replace(/[^a-zA-Z0-9\-_.]/g, '_');
    cb(null, safeName);
  }
});
const upload = multer({ storage: storage });

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'build')));

// Serve files from the public directory at the root path
app.use(express.static(path.join(__dirname, 'public')));

// Add a diagnostic endpoint to check for server health and get server IP
app.get('/api/status', (req, res) => {
  // Get local IP addresses
  const networkInterfaces = os.networkInterfaces();
  const addresses = [];
  let primaryIp = 'localhost';
  
  // First, collect all non-internal IPv4 addresses
  for (const name of Object.keys(networkInterfaces)) {
    for (const net of networkInterfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
        
        // Prefer non-localhost addresses over localhost
        if (net.address !== '127.0.0.1' && primaryIp === 'localhost') {
          primaryIp = net.address;
        }
        
        // Prefer addresses that start with 192.168 (common home network)
        if (net.address.startsWith('192.168.')) {
          primaryIp = net.address;
        }
      }
    }
  }
  
  // If client is coming from a specific IP and it's different from localhost,
  // use that as a hint for the preferred interface
  const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  if (clientIp && clientIp !== '127.0.0.1' && clientIp !== '::1') {
    console.log(`Client request from IP: ${clientIp}`);
  }
  
  console.log('Status API - Found IP addresses:', addresses);
  console.log('Status API - Selected primary IP:', primaryIp);
  
  res.json({ 
    status: 'running', 
    timestamp: new Date(),
    ipAddresses: addresses,
    primaryIp: primaryIp,
    clientIp: clientIp
  });
});

// Scripts directory - relative to the application root
const SCRIPTS_DIRECTORY = path.join(__dirname, 'public');
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
    // Only check the scripts directory for HTML files
    let testFiles = [];
    
    if (fs.existsSync(SCRIPTS_DIRECTORY)) {
      testFiles = fs.readdirSync(SCRIPTS_DIRECTORY)
        .filter(file => 
          (file.toLowerCase().endsWith('.html') || file.toLowerCase().endsWith('.htm')) &&
          file.toLowerCase() !== 'index.html'
        );
      console.log(`Found ${testFiles.length} HTML files in scripts directory`);
    }
    
    if (testFiles.length === 0) {
      return res.json({ 
        message: 'No HTML files found in scripts directory', 
        dir: SCRIPTS_DIRECTORY 
      });
    }
    
    const testFile = testFiles[0];
    const filePath = path.join(SCRIPTS_DIRECTORY, testFile);
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
    console.log(`Fetching HTML files from scripts directory: ${SCRIPTS_DIRECTORY}`);
    
    // Initialize array to store files
    let htmlFiles = [];
    
    // Get HTML files from scripts directory
    if (fs.existsSync(SCRIPTS_DIRECTORY)) {
      htmlFiles = fs.readdirSync(SCRIPTS_DIRECTORY)
        .filter(file => 
          // Only include .html or .htm files, but exclude index.html
          (file.endsWith('.html') || file.endsWith('.htm')) && 
          file.toLowerCase() !== 'index.html'
        )
        .map(filename => ({
          filename,
          directory: SCRIPTS_DIRECTORY
        }));
      console.log(`Found ${htmlFiles.length} HTML files in scripts directory`);
    } else {
      console.error(`Scripts directory does not exist: ${SCRIPTS_DIRECTORY}`);
    }
    
    // Use HTML files from scripts directory
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
    
    // Only handle HTML files from public/scripts directory
    const filePath = path.join(SCRIPTS_DIRECTORY, scriptId);
    console.log(`Looking for HTML file in scripts directory: ${scriptId}`);
    
    // Add a direct web URL for client-side access
    const publicUrl = `${scriptId}`;
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

// API endpoint to convert scripts from intake to public/scripts directory
app.post('/api/convert-scripts', async (req, res) => {
  try {
    console.log('Running script conversion on demand...');
    
    // Define directories
    const intakeDir = path.join(__dirname, 'intake');
    const scriptsDir = path.join(__dirname, 'public');
    
    // Ensure directories exist
    if (!fs.existsSync(intakeDir)) {
      fs.mkdirSync(intakeDir, { recursive: true });
      console.log(`Created intake directory at: ${intakeDir}`);
    }
    
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true });
      console.log(`Created scripts directory at: ${scriptsDir}`);
    }
    
    // Get files from intake directory
    const intakeFiles = fs.readdirSync(intakeDir)
      .filter(file => 
        file.toLowerCase().endsWith('.html') && 
        file.toLowerCase() !== 'index.html'
      );
    
    console.log(`Found ${intakeFiles.length} HTML files in intake directory`);
    
    if (intakeFiles.length === 0) {
      return res.json({ 
        message: 'No HTML files found in the intake directory.',
        processedCount: 0
      });
    }
    
    // Check each file against the scripts directory
    let newFilesFound = false;
    let newFilesCount = 0;
    
    intakeFiles.forEach(file => {
      const destFile = path.join(scriptsDir, file);
      
      // If file doesn't exist in scripts directory, it needs to be processed
      if (!fs.existsSync(destFile)) {
        console.log(`New script file found: ${file}`);
        newFilesFound = true;
        newFilesCount++;
      }
    });
    
    // Run the conversion script if new files were found
    if (newFilesFound) {
      console.log('Running script converter for new files...');
      const scriptPath = path.join(__dirname, 'convertScripts.js');
      
      // Execute the conversion script
      const result = execSync(`node "${scriptPath}"`, { 
        env: {
          ...process.env,
          INTAKE_DIR: intakeDir,
          SCRIPTS_DIR: scriptsDir
        }
      });
      
      console.log('Script conversion completed:');
      console.log(result.toString());
      
      return res.json({ 
        message: 'Script conversion successful',
        processedCount: newFilesCount,
        output: result.toString()
      });
    } else {
      return res.json({ 
        message: 'No new scripts to convert',
        processedCount: 0
      });
    }
  } catch (error) {
    console.error('Error processing script files:', error);
    res.status(500).json({ 
      error: error.message,
      processedCount: 0
    });
  }
});

// Endpoint for file uploads - accepts script files
app.post('/api/upload-script', upload.single('scriptFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    console.log('Script file uploaded successfully:', req.file.originalname);
    
    // Return script information
    const stats = fs.statSync(req.file.path);
    const script = {
      id: req.file.filename,
      title: req.file.filename.replace(/\.\w+$/, ''), // Remove file extension
      isHtml: req.file.filename.toLowerCase().endsWith('.html') || req.file.filename.toLowerCase().endsWith('.htm'),
      publicUrl: req.file.filename,
      lastModified: stats.mtime,
      dateCreated: stats.ctime
    };
    
    res.json({
      success: true,
      message: 'File uploaded successfully',
      script: script
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
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

// Generate QR codes before starting the server
console.log('Generating QR codes...');
try {
  execSync('node generate-qrcodes.js', { stdio: 'inherit' });
  console.log('QR codes generated successfully');
} catch (error) {
  console.error('Error generating QR codes:', error.message);
}

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