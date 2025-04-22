// src/services/pdfToFountainConverter.js

/**
 * Extracts formatted text from a PDF document
 * @param {Object} pdf - The PDF.js document object
 * @param {Function} [progressCallback] - Optional callback for progress updates
 * @returns {Promise<Array>} - Array of document content with page and line information
 */
async function extractFormattedTextFromPDF(pdf, progressCallback = null) {
  const numPages = pdf.numPages;
  let documentContent = [];
  
  // Process each page
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const pageWidth = viewport.width;
    
    // Get text content with positioning
    const textContent = await page.getTextContent();
    
    // Group text items into lines based on y-position
    const lines = groupTextItemsIntoLines(textContent.items, pageWidth);
    
    // Add page content to document content
    documentContent.push({
      pageNum,
      lines
    });
    
    // Update progress if callback is provided
    if (progressCallback && typeof progressCallback === 'function') {
      progressCallback(pageNum, numPages);
    }
  }
  
  return documentContent;
}

/**
 * Groups text items into lines based on their vertical position
 * @param {Array} textItems - Array of text items from PDF.js
 * @param {number} pageWidth - Width of the page
 * @returns {Array} - Array of lines with type information
 */
function groupTextItemsIntoLines(textItems, pageWidth) {
  // Sort items by their y-position (top to bottom), then x-position (left to right)
  const sortedItems = [...textItems].sort((a, b) => {
    if (Math.abs(a.transform[5] - b.transform[5]) <= 2) {
      // Same line (y-position within 2 units), sort by x-position
      return a.transform[4] - b.transform[4];
    }
    // Different lines, sort by y-position (descending as PDF coords start from bottom)
    return b.transform[5] - a.transform[5];
  });
  
  const lines = [];
  let currentLine = [];
  let lastY = null;
  
  // Group items into lines
  for (const item of sortedItems) {
    const currentY = item.transform[5];
    const x = item.transform[4];
    
    // If this is a new line or too far from the last item, start a new line
    if (lastY === null || Math.abs(currentY - lastY) > 2) {
      if (currentLine.length > 0) {
        lines.push(analyzeLineType(currentLine, pageWidth));
      }
      currentLine = [{ text: item.str, x }];
    } else {
      // Add to the current line
      currentLine.push({ text: item.str, x });
    }
    
    lastY = currentY;
  }
  
  // Add the last line if not empty
  if (currentLine.length > 0) {
    lines.push(analyzeLineType(currentLine, pageWidth));
  }
  
  return lines;
}

/**
 * Analyzes line type based on positioning and content
 * @param {Array} lineParts - Array of text parts in a line
 * @param {number} pageWidth - Width of the page
 * @returns {Object} - Line with text, type, and indent information
 */
function analyzeLineType(lineParts, pageWidth) {
  // Join line parts into a single string
  const text = lineParts.map(part => part.text).join(' ').trim();
  
  // Calculate indentation as percentage of page width
  const firstX = lineParts[0].x;
  const indentPercent = (firstX / pageWidth) * 100;
  
  // Calculate line width as percentage of page width
  const lastX = lineParts[lineParts.length - 1].x + (lineParts[lineParts.length - 1].text.length * 5); // Approximate width
  const widthPercent = ((lastX - firstX) / pageWidth) * 100;
  
  // Analyze line type based on positioning and content
  let type = 'action'; // Default type
  
  // Check for character names (centered, all caps, typically narrow)
  if (
    indentPercent > 35 && 
    indentPercent < 45 && 
    widthPercent < 30 && 
    text === text.toUpperCase() && 
    !text.endsWith(':')
  ) {
    type = 'character';
  } 
  // Check for dialogue (indented from left, not full width)
  else if (indentPercent > 15 && indentPercent < 35 && widthPercent < 60) {
    type = 'dialogue';
  }
  // Check for transitions (right-aligned, ends with TO:)
  else if (indentPercent > 55 && (/^[A-Z\s]+TO:$/.test(text) || text.includes('FADE') || text.includes('CUT'))) {
    type = 'transition';
  }
  // Check for scene headings (starts with INT./EXT., less indented)
  else if (
    indentPercent < 15 && 
    (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(text) || 
     /^[A-Z0-9\s\.\-]+$/.test(text) && text.length < 60)
  ) {
    type = 'scene_heading';
  }
  
  return {
    text,
    type,
    indent: indentPercent
  };
}

/**
 * Converts structured document content to Fountain format
 * @param {Array} documentContent - Array of document content with page and line information
 * @returns {string} - Fountain formatted text
 */
function convertToFountain(documentContent) {
  let fountainText = '';
  let lastLineType = null;
  
  // Process each page
  for (const page of documentContent) {
    for (const line of page.lines) {
      const { text, type } = line;
      
      // Skip empty lines
      if (!text.trim()) continue;
      
      // Format based on line type
      switch (type) {
        case 'scene_heading':
          // Add blank line before scene headings unless it's the first line
          if (fountainText) fountainText += '\n';
          // Add INT./EXT. if not already present
          if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(text)) {
            fountainText += text + '\n';
          } else {
            fountainText += '.' + text + '\n';
          }
          break;
          
        case 'character':
          // Add blank line before character unless after a scene heading
          if (lastLineType !== 'scene_heading' && fountainText) {
            fountainText += '\n';
          }
          fountainText += text + '\n';
          break;
          
        case 'dialogue':
          // No blank line before dialogue after character
          fountainText += text + '\n';
          break;
          
        case 'transition':
          // Add blank line before transitions
          if (fountainText) fountainText += '\n';
          fountainText += '>' + text + '\n';
          break;
          
        case 'action':
        default:
          // Add blank line before action unless it's the first line
          if (fountainText && lastLineType !== 'character') {
            fountainText += '\n';
          }
          fountainText += text + '\n';
          break;
      }
      
      lastLineType = type;
    }
  }
  
  return fountainText;
}

module.exports = {
  extractFormattedTextFromPDF,
  groupTextItemsIntoLines,
  analyzeLineType,
  convertToFountain
};