#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// Configure directories - use environment variables if provided, otherwise use defaults
const INTAKE_DIR = process.env.INTAKE_DIR || path.join(__dirname, 'intake');
const SCRIPTS_DIR = process.env.SCRIPTS_DIR || path.join(__dirname, 'public');

// Ensure directories exist
if (!fs.existsSync(INTAKE_DIR)) {
  fs.mkdirSync(INTAKE_DIR, { recursive: true });
}
if (!fs.existsSync(SCRIPTS_DIR)) {
  fs.mkdirSync(SCRIPTS_DIR, { recursive: true });
}

// Custom styles for script formatting
const customStyles = `
/* Base styles for teleprompter */
body, html {
  background-color: black !important;
  margin: 0 !important;
  padding: 0 !important;
  color: white !important;
  font-family: 'Courier New', monospace !important;
}

/* Character names */
p[style*="padding-left: 166pt"], 
p[style*="padding-left: 165pt"], 
p[style*="padding-left: 178pt"],
p[style*="padding-left: 142pt"],
p[style*="padding-left: 40pt"],
p[style*="padding-left: 84pt"],
p[style*="padding-left: 65pt"],
p[style*="padding-left: 77pt"],
p[style*="padding-left: 91pt"],
p[style*="padding-left: 104pt"],
p[style*="padding-left: 83pt"] {
  color: #FFD700 !important; /* Gold color for character names */
  font-weight: bold !important;
  margin-bottom: 0 !important;
  text-align: center !important;
}

/* Dialog text */
p[style*="padding-left: 94pt"],
p[style*="padding-left: 93pt"] {
  color: white !important;
  margin-top: 0 !important;
  margin-bottom: 1em !important;
  text-align: center !important;
}

/* Parentheticals in dialog */
p[style*="padding-left: 123pt"],
p[style*="padding-left: 129pt"],
p[style*="padding-left: 121pt"],
p[style*="padding-left: 122pt"],
p[style*="padding-left: 144pt"],
p[style*="padding-left: 157pt"],
p[style*="padding-left: 136pt"],
p[style*="padding-left: 150pt"],
p[style*="padding-left: 142pt"] {
  color: #BBBBBB !important; /* Light gray for parentheticals */
  font-style: italic !important;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  text-align: center !important;
}

/* Scene headings */
p[style*="padding-left: 22pt"] {
  color: #ADD8E6 !important; /* Light blue for scene headings */
  font-weight: bold !important;
  margin-top: 1.5em !important;
  margin-bottom: 0.5em !important;
  text-align: center !important;
}

/* Transitions */
p[style*="text-align: right"] {
  color: #FFA07A !important; /* Light salmon for transitions */
  font-weight: bold !important;
  text-transform: uppercase !important;
  margin-top: 1em !important;
  margin-bottom: 1em !important;
  text-align: center !important;
}

/* Film clip markers */
p:contains("FILM CLIP") {
  background-color: #007bff !important;
  color: white !important;
  padding: 0.5rem 1rem !important;
  margin: 1.5rem auto !important;
  font-weight: bold !important;
  border-radius: 4px !important;
  text-align: center !important;
  max-width: 80% !important;
  display: inline-block !important;
}

/* General paragraph and text styling */
p, .p {
  line-height: 1.5 !important;
  margin-bottom: 0.5em !important;
  color: white !important;
}

/* Empty paragraphs and line breaks */
p:empty, br {
  display: block;
  height: 1em;
}

/* Text styling */
b, strong {
  font-weight: bold !important;
}

i, em {
  font-style: italic !important;
}

u {
  text-decoration: underline !important;
}
`;

/**
 * Process an HTML file by adding teleprompter-specific styles
 * @param {string} sourceFile - Path to the source HTML file
 * @param {string} destinationFile - Path to save the processed file
 */
function processHtmlFile(sourceFile, destinationFile) {
  console.log(`Processing ${sourceFile} -> ${destinationFile}`);
  
  try {
    // Read the source file
    const htmlContent = fs.readFileSync(sourceFile, 'utf8');
    
    // Load HTML with cheerio
    const $ = cheerio.load(htmlContent);
    
    // Add our custom styles
    const existingStyle = $('head style').html() || '';
    $('head style').html(existingStyle + customStyles);
    
    // Make sure background and text colors are properly set
    $('body').attr('style', 'background-color: black !important; color: white !important;');
    
    // Write the processed file
    fs.writeFileSync(destinationFile, $.html());
    console.log(`Successfully processed ${path.basename(sourceFile)}`);
  } catch (error) {
    console.error(`Error processing ${sourceFile}:`, error.message);
  }
}

/**
 * Scan the intake directory and process new HTML files
 */
function processNewFiles() {
  console.log('Scanning for new files to process...');
  
  try {
    // Get all HTML files in the intake directory
    const intakeFiles = fs.readdirSync(INTAKE_DIR)
      .filter(file => 
        file.toLowerCase().endsWith('.html') && 
        file.toLowerCase() !== 'index.html'
      );
    
    if (intakeFiles.length === 0) {
      console.log('No HTML files found in the intake directory.');
      return;
    }
    
    // Check each file
    let processedCount = 0;
    intakeFiles.forEach(file => {
      const sourceFile = path.join(INTAKE_DIR, file);
      const destinationFile = path.join(SCRIPTS_DIR, file);
      
      // Check if the file already exists in the scripts directory
      if (!fs.existsSync(destinationFile)) {
        processHtmlFile(sourceFile, destinationFile);
        processedCount++;
      } else {
        console.log(`Skipping ${file} - already exists in scripts directory`);
      }
    });
    
    console.log(`Processed ${processedCount} new file(s)`);
  } catch (error) {
    console.error('Error scanning for files:', error.message);
  }
}

// Run the script
console.log('Script Converter Tool');
console.log('====================');
console.log(`Intake directory: ${INTAKE_DIR}`);
console.log(`Scripts directory: ${SCRIPTS_DIR}`);
console.log('--------------------');

// Check if cheerio is installed
try {
  require.resolve('cheerio');
} catch (e) {
  console.error('Error: cheerio package is not installed.');
  console.log('Please run: npm install cheerio --legacy-peer-deps');
  process.exit(1);
}

// Process files
processNewFiles();