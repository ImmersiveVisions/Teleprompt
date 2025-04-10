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

// Scripts directory for serving files
const scriptsDir = path.join(__dirname, 'public');
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
// Configure multer to only accept fountain files
const upload = multer({ 
  storage: storage,
  fileFilter: function(req, file, cb) {
    // Accept only .fountain extension files
    if (!file.originalname.toLowerCase().endsWith('.fountain')) {
      return cb(new Error('Only fountain files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'build')));

// Serve files from the public directory at the root path
app.use(express.static(path.join(__dirname, 'public')));

// Simple endpoint for testing fountain files - returns the raw fountain content
app.get('/api/test/fountain', (req, res) => {
  try {
    const samplePath = path.join(__dirname, 'public', 'sample_script.fountain');
    
    // Check if the file exists
    if (!fs.existsSync(samplePath)) {
      return res.status(404).send('Sample fountain script not found');
    }
    
    const content = fs.readFileSync(samplePath, 'utf8');
    
    console.log('Fountain test endpoint accessed', {
      fileSize: content.length,
      preview: content.substring(0, 100) + '...'
    });
    
    // Send the raw content as plain text
    res.type('text/plain').send(content);
  } catch (error) {
    console.error('Error serving test fountain file:', error);
    res.status(500).send('Error loading fountain file: ' + error.message);
  }
});

// Endpoint to serve the fountain.js module directly
app.get('/api/fountain-js-module', (req, res) => {
  try {
    const modulePath = path.join(__dirname, 'node_modules', 'fountain-js', 'dist', 'fountain.js');
    
    if (!fs.existsSync(modulePath)) {
      return res.status(404).send('Fountain.js module not found');
    }
    
    const moduleContent = fs.readFileSync(modulePath, 'utf8');
    
    // Serve as JavaScript
    res.type('application/javascript').send(moduleContent);
  } catch (error) {
    console.error('Error serving fountain.js module:', error);
    res.status(500).send('Error loading fountain.js module: ' + error.message);
  }
});

// Get a specific script by ID (filename) - note the available route
// comes before this route to avoid conflict
app.get('/api/scripts/:id', (req, res) => {
  try {
    const scriptId = req.params.id;
    
    // Validate the filename to prevent directory traversal
    if (!scriptId || scriptId.includes('..') || scriptId.includes('/') || scriptId.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid script ID'
      });
    }
    
    const scriptPath = path.join(__dirname, 'public', scriptId);
    
    // Check if file exists
    if (!fs.existsSync(scriptPath)) {
      return res.status(404).json({
        success: false,
        error: 'Script not found'
      });
    }
    
    // Read the file content
    const content = fs.readFileSync(scriptPath, 'utf8');
    const stats = fs.statSync(scriptPath);
    const ext = path.extname(scriptId).toLowerCase();
    
    // Create script object
    const script = {
      id: scriptId,
      title: path.basename(scriptId, ext),
      body: content,
      content: content, // For backward compatibility
      lastModified: stats.mtime,
      dateCreated: stats.ctime,
      fileExtension: ext.substring(1), // Remove the dot
      isFountain: ext === '.fountain',
      isHtml: ext === '.html' || ext === '.htm'
    };
    
    res.json({
      success: true,
      script
    });
  } catch (error) {
    console.error(`Error loading script: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add an API route to list available scripts
app.get('/api/scripts/available', (req, res) => {
  try {
    // Directory where scripts are stored
    const scriptsDir = path.join(__dirname, 'public');
    
    // Read all files in the directory
    const files = fs.readdirSync(scriptsDir);
    
    // Filter for script files (.fountain, .html, .txt)
    const scriptFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.fountain', '.html', '.htm', '.txt'].includes(ext);
    });
    
    // Convert to script objects
    const scripts = scriptFiles.map(filename => {
      const filePath = path.join(scriptsDir, filename);
      const stats = fs.statSync(filePath);
      const ext = path.extname(filename).toLowerCase();
      
      return {
        id: filename,
        title: path.basename(filename, ext),
        lastModified: stats.mtime,
        dateCreated: stats.ctime,
        fileExtension: ext.substring(1), // Remove the dot
        isFountain: ext === '.fountain',
        isHtml: ext === '.html' || ext === '.htm',
        size: stats.size
      };
    });
    
    res.json({
      success: true,
      scripts
    });
  } catch (error) {
    console.error('Error listing available scripts:', error);
    res.status(500).json({
      success: false, 
      error: error.message
    });
  }
});

// Add a diagnostic endpoint to check for server health and get server IP
app.get('/api/status', (req, res) => {
  // Get local IP addresses
  const networkInterfaces = os.networkInterfaces();
  const addresses = [];
  let primaryIp = 'localhost';
  
  // First, collect all non-internal IPv4 addresses
  for (const name of Object.keys(networkInterfaces)) {
    // Skip virtual interfaces like VirtualBox
    if (name.toLowerCase().includes('virtualbox') || 
        name.toLowerCase().includes('vboxnet') ||
        name.toLowerCase().includes('vmnet') ||
        name.startsWith('veth') ||
        name.startsWith('docker')) {
      continue;
    }
    
    for (const net of networkInterfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        // Skip VirtualBox and other virtual machine IP ranges
        if (net.address.startsWith('172.') && 
            !net.address.startsWith('172.16.') && 
            !net.address.startsWith('172.17.')) {
          console.log(`API: Skipping likely virtual interface IP: ${net.address} on ${name}`);
          continue;
        }
      
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

// Helper function to detect fountain files
function _isFountainFile(filename) {
  try {
    const filePath = path.join(scriptsDir, filename);
    if (!fs.existsSync(filePath)) return false;
    
    // Check file extension first
    if (filename.endsWith('.fountain')) return true;
    
    // If no obvious extension, read a small part of the content to check
    const content = fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r' }).substring(0, 500);
    const firstLines = content.split('\n').slice(0, 10).join('\n');
    
    // Look for typical fountain markers
    if (firstLines.includes('Title:') && 
        (firstLines.includes('Author:') || firstLines.includes('by')) &&
        /INT\.|EXT\./.test(content)) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking if file is fountain format:', error);
    return false;
  }
}

// API endpoint to list all scripts
app.get('/api/scripts', async (req, res) => {
  try {
    console.log(`Fetching HTML files from scripts directory: ${SCRIPTS_DIRECTORY}`);
    
    // Initialize array to store files
    let htmlFiles = [];
    
    // Get only Fountain files from scripts directory
    if (fs.existsSync(SCRIPTS_DIRECTORY)) {
      htmlFiles = fs.readdirSync(SCRIPTS_DIRECTORY)
        .filter(file => 
          // Include only .fountain files
          (file.endsWith('.fountain') || _isFountainFile(file))
        )
        .map(filename => ({
          filename,
          directory: SCRIPTS_DIRECTORY
        }));
      console.log(`Found ${htmlFiles.length} script files in scripts directory`);
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
        
        // We only process fountain files now
        let processedContent = rawContent;
        
        if (filename.toLowerCase().endsWith('.fountain')) {
          // For Fountain files, store raw content - actual parsing will happen client-side
          console.log(`Reading Fountain file: ${filename} from ${directory}`);
        } else if (_isFountainFile(filename)) {
          // If the file is detected as fountain format without the extension
          console.log(`Reading detected Fountain file: ${filename} from ${directory}`);
        } else {
          // Skip non-fountain files
          console.log(`Skipping non-fountain file: ${filename} from ${directory}`);
          return null;
        }
        
        return {
          id: filename,
          title: filename.replace(/\.\w+$/, ''), // Remove file extension
          body: processedContent,
          content: processedContent, // For backward compatibility
          isHtml: false, // Not HTML content
          isFountain: true, // Flag for Fountain files
          fileExtension: filename.split('.').pop().toLowerCase(), // Store file extension
          lastModified: stats.mtime,
          dateCreated: stats.ctime,
          sourceDirectory: directory // Add source directory information
        };
      } catch (readError) {
        console.error(`Error reading file ${filename} from ${directory}:`, readError);
        return null; // Skip files with errors
      }
    });
    
    // Wait for all script conversions to complete
    let scripts = await Promise.all(scriptPromises);
    
    // Filter out null values (non-fountain files or error files)
    scripts = scripts.filter(script => script !== null);
    
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
      isHtml: scriptId.toLowerCase().endsWith('.html') || scriptId.toLowerCase().endsWith('.htm'),
      isFountain: scriptId.toLowerCase().endsWith('.fountain'),
      fileExtension: scriptId.split('.').pop().toLowerCase(),
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
        (file.toLowerCase().endsWith('.html') || file.toLowerCase().endsWith('.fountain')) && 
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

// Endpoint for file uploads - accepts only fountain script files
app.post('/api/upload-script', upload.single('scriptFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Check if file is a fountain file
    const isFountain = req.file.filename.toLowerCase().endsWith('.fountain') || _isFountainFile(req.file.filename);
    
    if (!isFountain) {
      // Delete the non-fountain file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: 'Only fountain screenplay files (.fountain) are supported'
      });
    }

    console.log('Fountain script file uploaded successfully:', req.file.originalname);
    
    // Return script information
    const stats = fs.statSync(req.file.path);
    const script = {
      id: req.file.filename,
      title: req.file.filename.replace(/\.\w+$/, ''), // Remove file extension
      isHtml: false,
      isFountain: true,
      fileExtension: req.file.filename.split('.').pop().toLowerCase(),
      publicUrl: req.file.filename,
      lastModified: stats.mtime,
      dateCreated: stats.ctime
    };
    
    res.json({
      success: true,
      message: 'Fountain script uploaded successfully',
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

// Serve script files with proper formatting
app.get('/:script', (req, res) => {
  // Get the script filename from the request params
  const scriptName = req.params.script;
  
  // Check if this is a script file we should handle
  const scriptPath = path.join(scriptsDir, scriptName);
  if (!fs.existsSync(scriptPath)) {
    // Not a script file, let the React app handle it
    return res.sendFile(path.join(__dirname, 'build', 'index.html'));
  }
  
  console.log(`Serving script: ${scriptName}`);
  
  // Only handle fountain files
  if (scriptName.endsWith('.fountain') || _isFountainFile(scriptName)) {
    // For fountain files, serve the content rendered with fountain-browser.js
    console.log('Serving fountain script with special formatting');
    
    try {
      const content = fs.readFileSync(scriptPath, 'utf8');
      
      // Send the fountain content to be parsed on the client side
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${scriptName}</title>
          <script src="/teleprompter-font.js"></script>
          <script src="/fountain-browser.js"></script>
          <style>
            body {
              background-color: black;
              color: white;
              font-family: 'Courier New', monospace;
              margin: 0;
              padding: 20px;
              line-height: 1.5;
            }
            .fountain-container {
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            .title-page {
              text-align: center;
              margin-bottom: 50px;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 20px;
            }
            .author {
              font-size: 18px;
              margin-bottom: 10px;
            }
            .scene-heading {
              font-weight: bold;
              margin-top: 30px;
              margin-bottom: 10px;
              color: #ADD8E6; /* Light blue */
            }
            .action {
              margin-bottom: 10px;
            }
            .character {
              margin-left: 200px;
              margin-top: 20px;
              font-weight: bold;
              color: #FFD700; /* Gold */
            }
            .dialogue {
              margin-left: 100px;
              margin-right: 100px;
              margin-bottom: 20px;
            }
            .parenthetical {
              margin-left: 150px;
              font-style: italic;
              color: #BBBBBB; /* Light gray */
            }
            .transition {
              text-align: right;
              font-weight: bold;
              margin: 20px 0;
              color: #FFA07A; /* Light salmon */
            }
            .centered {
              text-align: center;
              margin: 20px 0;
            }
            .film-clip {
              background-color: #007bff;
              color: white;
              padding: 8px 16px;
              margin: 24px auto;
              font-weight: bold;
              border-radius: 4px;
              display: inline-block;
              text-align: center;
            }
            /* Add data-type attribute for dialog elements */
            .dialogue, .character, .parenthetical {
              data-type: "dialog";
            }
          </style>
        </head>
        <body>
          <div id="fountain-output" class="fountain-container">Loading fountain script...</div>
          
          <script>
            // Script content as a string
            const fountainContent = ${JSON.stringify(content)};
            
            // Parse the fountain content when the page loads
            document.addEventListener('DOMContentLoaded', function() {
              try {
                // Create a parser instance
                const parser = new FountainParser();
                // Parse the fountain content
                const result = parser.parse(fountainContent);
                
                // Get the output container
                const container = document.getElementById('fountain-output');
                
                // Create title page
                const titlePage = document.createElement('div');
                titlePage.className = 'title-page';
                
                const titleElem = document.createElement('div');
                titleElem.className = 'title';
                titleElem.textContent = result.title || 'Untitled Script';
                
                const authorElem = document.createElement('div');
                authorElem.className = 'author';
                authorElem.textContent = 'by ' + (result.author || 'Unknown Author');
                
                titlePage.appendChild(titleElem);
                titlePage.appendChild(authorElem);
                
                // Clear the container and add the title page
                container.innerHTML = '';
                container.appendChild(titlePage);
                
                // Add the script content from the parser
                const scriptDiv = document.createElement('div');
                scriptDiv.className = 'script-content';
                scriptDiv.innerHTML = result.html.script;
                container.appendChild(scriptDiv);
                
                // Mark each dialog element with data-type attribute
                const dialogElements = document.querySelectorAll('.dialogue, .character, .parenthetical');
                dialogElements.forEach(element => {
                  element.setAttribute('data-type', 'dialog');
                });
                
                console.log('Fountain script parsed and rendered successfully');
              } catch (error) {
                console.error('Error parsing fountain script:', error);
                document.getElementById('fountain-output').innerHTML = '<pre>' + fountainContent + '</pre>';
              }
              
              // Function that allows external control of font size
              window.setTeleprompterFontSize = function(size) {
                const fontSize = parseInt(size, 10) || 16;
                document.body.style.fontSize = fontSize + 'px';
                
                // Also set font sizes for specific elements
                const elements = {
                  '.title': Math.round(fontSize * 1.5),
                  '.author': Math.round(fontSize * 1.1),
                  '.scene-heading, .action, .character, .dialogue, .parenthetical, .transition, .centered, .film-clip': fontSize
                };
                
                let styleElement = document.getElementById('teleprompter-font-styles');
                if (!styleElement) {
                  styleElement = document.createElement('style');
                  styleElement.id = 'teleprompter-font-styles';
                  document.head.appendChild(styleElement);
                }
                
                let styleContent = '';
                for (const selector in elements) {
                  styleContent += selector + ' { font-size: ' + elements[selector] + 'px !important; }\n';
                }
                
                styleElement.textContent = styleContent;
              };
            });
          </script>
        </body>
        </html>
      `);
    } catch (error) {
      console.error(`Error serving fountain script ${scriptName}:`, error);
      res.status(500).send('Error reading fountain script file');
    }
  } else {
    // For non-fountain files, return an error
    console.log('Non-fountain file requested:', scriptName);
    res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Unsupported File Type</title>
        <style>
          body {
            background-color: black;
            color: white;
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 40px;
            line-height: 1.6;
          }
          .error-container {
            max-width: 600px;
            margin: 0 auto;
            text-align: center;
          }
          h1 {
            color: #ff5555;
          }
        </style>
      </head>
      <body>
        <div class="error-container">
          <h1>Unsupported File Type</h1>
          <p>This teleprompter application only supports Fountain screenplay files (.fountain).</p>
          <p>The requested file "${scriptName}" is not a supported format.</p>
        </div>
      </body>
      </html>
    `);
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
    // Skip virtual interfaces like VirtualBox
    if (name.toLowerCase().includes('virtualbox') || 
        name.toLowerCase().includes('vboxnet') ||
        name.toLowerCase().includes('vmnet') ||
        name.startsWith('veth') ||
        name.startsWith('docker')) {
      continue;
    }
    
    for (const net of networkInterfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        // Skip VirtualBox and other virtual machine IP ranges
        if (net.address.startsWith('172.') && 
            !net.address.startsWith('172.16.') && 
            !net.address.startsWith('172.17.')) {
          console.log(`Skipping likely virtual interface IP: ${net.address} on ${name}`);
          continue;
        }
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