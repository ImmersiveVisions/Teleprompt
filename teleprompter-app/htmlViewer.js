#!/usr/bin/env node

/**
 * HTML Viewer Script
 * 
 * This script creates a dedicated HTML file with white text on black background
 * for viewing in the teleprompter app.
 */

const fs = require('fs');
const path = require('path');

// Check command line arguments
if (process.argv.length < 3) {
  console.error('Usage: node htmlViewer.js <html-file-path>');
  process.exit(1);
}

// Get input file path
const inputFile = process.argv[2];

// Validate input file exists
if (!fs.existsSync(inputFile)) {
  console.error(`Error: File not found: ${inputFile}`);
  process.exit(1);
}

// Read the HTML file
const htmlContent = fs.readFileSync(inputFile, 'utf8');

// Create a simple HTML wrapper that sets text to white on black background
const viewerHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Teleprompter Viewer</title>
  <style>
    /* Base styles */
    body, html {
      margin: 0;
      padding: 0;
      background-color: black;
      color: white;
      font-family: 'Courier New', monospace;
    }
    
    /* Content container */
    .content-wrapper {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    /* Preserve original HTML content */
    .original-content {
      color: white !important;
    }
    
    /* Ensure all text is white */
    .original-content * {
      color: white !important;
      background-color: transparent !important;
    }
  </style>
</head>
<body>
  <div class="content-wrapper">
    <div class="original-content">
      ${htmlContent}
    </div>
  </div>
  
  <script>
    // Simple script to make all text white on page load
    document.addEventListener('DOMContentLoaded', function() {
      const elements = document.querySelectorAll('*');
      elements.forEach(el => {
        if (el.style) {
          el.style.color = 'white';
        }
      });
    });
  </script>
</body>
</html>
`;

// Create output file path
const fileName = path.basename(inputFile);
const outputFile = path.join(process.cwd(), 'viewer_' + fileName);

// Write the file
fs.writeFileSync(outputFile, viewerHtml);

console.log(`
HTML Viewer created successfully!
Input file: ${inputFile}
Output file: ${outputFile}

Open the output file in your browser to view the HTML with white text on black background.
`);