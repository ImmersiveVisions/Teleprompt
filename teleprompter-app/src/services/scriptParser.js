// src/services/scriptParser.js

/**
 * Parses a script to identify chapters based on 'FILM CLIP' markers
 * @param {string} content - The script content to parse
 * @param {number|string} scriptId - The ID of the script
 * @returns {Array} - Array of chapter objects
 */
export const parseChapters = (content, scriptId) => {
  const lines = content.split('\n');
  const chapters = [];
  let currentPosition = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Check if line contains 'FILM CLIP' marker
    if (trimmedLine.includes('FILM CLIP')) {
      chapters.push({
        scriptId,
        title: trimmedLine,
        startPosition: currentPosition,
        endPosition: currentPosition + line.length
      });
    }
    
    currentPosition += line.length + 1; // +1 for the newline character
  }
  
  return chapters;
};

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
  parseChapters,
  highlightFilmClips
};