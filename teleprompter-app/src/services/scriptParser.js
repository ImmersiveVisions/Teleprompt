// src/services/scriptParser.js

/**
 * Parses script content based on its file extension
 * @param {string} content - The raw script content
 * @param {string} fileExtension - The file extension (rtf, html, etc.)
 * @returns {string} Processed script content
 */
export function parseScript(content, fileExtension) {
  if (!content) return '';
  
  switch (fileExtension.toLowerCase()) {
    case 'rtf':
      return parseRTF(content);
    case 'html':
      return parseHTML(content);
    default:
      // For unknown types, return plain text
      return content;
  }
}

/**
 * Parses RTF content into plain text
 * @param {string} rtfContent - The raw RTF content
 * @returns {string} Plain text content
 */
function parseRTF(rtfContent) {
  // Simple RTF parsing - remove RTF control sequences
  // This is a basic implementation that should be enhanced for production
  let plainText = rtfContent;
  
  // Remove RTF headers
  plainText = plainText.replace(/{\\rtf1.*?(?=\\)}/g, '');
  
  // Remove control sequences
  plainText = plainText.replace(/\\[a-zA-Z0-9]+/g, '');
  
  // Remove curly braces
  plainText = plainText.replace(/{|}/g, '');
  
  // Replace escaped characters
  plainText = plainText.replace(/\\\\/g, '\\');
  plainText = plainText.replace(/\\'/g, "'");
  
  // Preserve newlines
  plainText = plainText.replace(/\\par/g, '\n');
  
  return plainText;
}

/**
 * Parse HTML content into teleprompter-friendly format
 * @param {string} htmlContent - The raw HTML content
 * @returns {string} HTML content styled for teleprompter
 */
function parseHTML(htmlContent) {
  if (!htmlContent) return '';

  // Make sure we're passing HTML content through properly
  console.log('Parsing HTML content with length:', htmlContent.length);

  // Ensure we have valid doctype and content type (adding if not present)
  if (!htmlContent.trim().toLowerCase().startsWith('<!doctype html>')) {
    console.log('Adding doctype declaration to HTML');
    htmlContent = '<!DOCTYPE html>\n' + htmlContent;
  }

  // For direct rendering, we can just add the styles to the existing content
  // without extracting the body - this ensures all HTML tags are preserved
  return processScriptHTML(htmlContent);
}

/**
 * Processes HTML content specifically for film scripts
 * @param {string} htmlContent - The HTML content to process
 * @returns {string} - Processed HTML ready for teleprompter display
 */
function processScriptHTML(htmlContent) {
  if (!htmlContent) return '';

  // Add teleprompter-specific styles
  const teleprompterStyles = `
    <style>
    /* Base styles for teleprompter */
    body, html {
      background-color: black !important;
      margin: 0;
      padding: 0;
      color: white !important;
      font-family: 'Courier New', monospace;
      display: block !important;
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
    </style>
  `;

  // For direct embedding in the main document, we're just going to 
  // extract the body content and add back the styles at the top level
  
  // Extract the body content if it exists
  let bodyContent = htmlContent;
  const bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(htmlContent);
  if (bodyMatch) {
    bodyContent = bodyMatch[1];
  }
  
  // Return the body content with styles
  return `
    <div class="script-html-wrapper">
      ${teleprompterStyles}
      ${bodyContent}
    </div>
  `;
}

// Removed parseChapters function

/**
 * Highlights film clip markers in script content
 * @param {string} content - The script content to highlight
 * @returns {Array} - Array of React elements with highlighting
 */
export const highlightFilmClips = (content) => {
  if (!content) return [];
  
  const lines = content.split('\n');
  
  return lines.map((line, index) => {
    // Check if line contains 'FILM CLIP'
    if (line.includes('FILM CLIP')) {
      return {
        type: 'film-clip',
        content: line,
        index
      };
    }
    
    return {
      type: 'text',
      content: line,
      index
    };
  });
};

export default {
  parseScript,
  // Removed parseChapters reference
  highlightFilmClips
};