// src/services/scriptParser.js
import { Fountain } from 'fountain-js';

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
    case 'fountain':
      return parseFountain(content);
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
    // Check if line contains 'FILM CLIP' or Fountain format marker [[FILM CLIP]]
    if (line.includes('FILM CLIP') || line.includes('[[FILM CLIP]]')) {
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

/**
 * Extract tokens from a Fountain script
 * @param {string} content - The fountain script content
 * @returns {Array} - Array of tokens from the script
 */
export const extractFountainTokens = (content) => {
  if (!content) return [];
  
  // Create a new instance of the Fountain parser
  const fountainParser = new Fountain();
  
  // Parse the fountain content with getTokens=true to include tokens in output
  const output = fountainParser.parse(content, true);
  
  // Return the tokens array which has detailed information about each element
  return output.tokens || [];
};

/**
 * Parse a Fountain-formatted screenplay
 * @param {string} fountainContent - Raw fountain screenplay content
 * @returns {string} HTML content styled for teleprompter
 */
function parseFountain(fountainContent) {
  if (!fountainContent) return '';
  
  try {
    // Try to use the proper Fountain parser
    const fountainParser = new Fountain();
    const parsed = fountainParser.parse(fountainContent, true);
    
    // Generate styled HTML with proper formatting for screenplay elements
    const css = `
      <style>
        .fountain-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background-color: black;
          color: white;
          font-family: 'Courier New', monospace;
          font-size: 16px;
          line-height: 1.5;
        }
        
        /* Title page */
        .title { 
          text-align: center;
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 20px;
          color: white;
        }
        
        .author, .date {
          text-align: center;
          color: #999;
          margin-bottom: 10px;
          font-size: 18px;
        }
        
        /* Scene elements */
        .scene-heading {
          color: #ADD8E6; /* Light blue */
          font-weight: bold;
          margin-top: 30px;
          margin-bottom: 10px;
          text-transform: uppercase;
        }
        
        .character {
          color: #FFD700; /* Gold */
          font-weight: bold;
          margin-top: 20px;
          margin-bottom: 0;
          margin-left: 200px;
        }
        
        .dialogue {
          margin-top: 0;
          margin-bottom: 20px;
          margin-left: 100px;
          margin-right: 100px;
        }
        
        .parenthetical {
          color: #BBBBBB; /* Light gray */
          font-style: italic;
          margin-left: 150px;
        }
        
        .transition {
          color: #FFA07A; /* Light salmon */
          text-align: right;
          font-weight: bold;
          margin: 20px 0;
          text-transform: uppercase;
        }
        
        .action {
          margin-bottom: 10px;
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
          text-align: center;
          display: inline-block;
        }
        
        /* General formatting */
        pre {
          white-space: pre-wrap;
          font-family: 'Courier New', monospace;
          font-size: 16px;
          line-height: 1.5;
        }
        
        hr {
          border: none;
          border-top: 1px solid #333;
          margin: 24px 0;
        }
      </style>
    `;
    
    // Build HTML content
    let html = `
      <div class="fountain-container">
        ${css}
        <div class="title-page">
          <div class="title">${parsed.title || 'Untitled Script'}</div>
          <div class="author">by ${parsed.author || 'Unknown Author'}</div>
        </div>
        <div class="script">
    `;
    
    // Process each token in the script
    if (parsed.tokens && parsed.tokens.length > 0) {
      parsed.tokens.forEach(token => {
        let text = token.text || '';
        
        // Special handling for film clip markers
        if (text.includes('[[FILM CLIP]]')) {
          text = text.replace('[[FILM CLIP]]', '');
          html += `<div class="film-clip">FILM CLIP${text}</div>`;
          return;
        }
        
        switch (token.type) {
          case 'scene_heading':
            html += `<div class="scene-heading">${text}</div>`;
            break;
          case 'action':
            html += `<div class="action">${text}</div>`;
            break;
          case 'character':
            html += `<div class="character">${text}</div>`;
            break;
          case 'dialogue':
            html += `<div class="dialogue">${text}</div>`;
            break;
          case 'parenthetical':
            html += `<div class="parenthetical">${text}</div>`;
            break;
          case 'transition':
            html += `<div class="transition">${text}</div>`;
            break;
          case 'centered':
            html += `<div class="centered">${text}</div>`;
            break;
          case 'page_break':
            html += `<div class="page-break"></div>`;
            break;
          default:
            html += `<div>${text}</div>`;
        }
      });
    } else {
      console.warn('No tokens found in parsed fountain content');
    }
    
    html += `
        </div>
      </div>
    `;
    
    return html;
  } catch (error) {
    console.error('Error parsing fountain content:', error);
    
    // Fallback to simple pre-formatted display if parsing fails
    const css = `
      <style>
        .fountain-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background-color: black;
          color: white;
          font-family: 'Courier New', monospace;
          font-size: 16px;
          line-height: 1.5;
        }
        pre {
          white-space: pre-wrap;
          font-family: 'Courier New', monospace;
          font-size: 16px;
          line-height: 1.5;
        }
      </style>
    `;
    
    return `
      <div class="fountain-container">
        ${css}
        <pre>${fountainContent}</pre>
      </div>
    `;
  }
}

export default {
  parseScript,
  // Removed parseChapters reference
  highlightFilmClips,
  extractFountainTokens
};