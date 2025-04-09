/**
 * Simplified browser-friendly fountain.js parser
 * Based on the fountain-js npm package but bundled for direct browser use
 */

class FountainParser {
  constructor() {
    this.tokens = [];
  }

  parse(script) {
    if (!script) {
      throw new Error("Script is undefined or null.");
    }
    
    // Basic parsing of fountain format
    const lines = script.split('\n');
    let title = '';
    let author = '';
    const tokens = [];
    
    // Simple state tracking
    let inTitlePage = true;
    let isCharacter = false;
    let isDialogue = false;
    let isParenthetical = false;
    let isAction = false;
    let isTransition = false;
    
    // Process each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for blank line
      if (line === '') {
        inTitlePage = false;
        isCharacter = false;
        isDialogue = false;
        isParenthetical = false;
        isAction = false;
        continue;
      }
      
      // Title page extraction
      if (inTitlePage) {
        if (line.startsWith('Title:')) {
          title = line.replace('Title:', '').trim();
          tokens.push({ type: 'title', text: title });
          continue;
        }
        if (line.startsWith('Author:')) {
          author = line.replace('Author:', '').trim();
          tokens.push({ type: 'author', text: author });
          continue;
        }
        // End title page after a few blank lines or non-title page content
        if (i > 5 && !line.includes(':')) {
          inTitlePage = false;
        }
      }
      
      // Scene headings (INT./EXT.)
      if (line.match(/^(INT|EXT|INT\.\/EXT|INT\/EXT|I\/E)[\.\s]/i)) {
        tokens.push({ type: 'scene_heading', text: line });
        isAction = false;
        continue;
      }
      
      // Character names (all caps)
      if (line === line.toUpperCase() && line.length > 0 && !isDialogue && !isTransition) {
        tokens.push({ type: 'character', text: line });
        isCharacter = true;
        isAction = false;
        continue;
      }
      
      // Parentheticals
      if (line.startsWith('(') && line.endsWith(')') && isCharacter) {
        tokens.push({ type: 'parenthetical', text: line });
        isParenthetical = true;
        isAction = false;
        continue;
      }
      
      // Dialogue
      if (isCharacter || isParenthetical) {
        tokens.push({ type: 'dialogue', text: line });
        isDialogue = true;
        isAction = false;
        continue;
      }
      
      // Transitions
      if ((line.endsWith('TO:') || line === 'FADE OUT' || line === 'CUT TO BLACK') && line === line.toUpperCase()) {
        tokens.push({ type: 'transition', text: line });
        isTransition = true;
        isAction = false;
        continue;
      }
      
      // Film clips (special marker)
      if (line.includes('[[FILM CLIP]]')) {
        tokens.push({ type: 'film_clip', text: line });
        isAction = false;
        continue; 
      }
      
      // Default to action
      if (!isAction) {
        isAction = true;
      }
      tokens.push({ type: 'action', text: line });
    }
    
    this.tokens = tokens;
    
    return {
      title,
      author,
      tokens: this.tokens,
      html: {
        script: this.generateHTML()
      }
    };
  }
  
  generateHTML() {
    let html = '';
    
    this.tokens.forEach(token => {
      switch(token.type) {
        case 'scene_heading':
          html += `<div class="scene-heading">${token.text}</div>`;
          break;
        case 'action':
          html += `<div class="action">${token.text}</div>`;
          break;
        case 'character':
          html += `<div class="character">${token.text}</div>`;
          break;
        case 'parenthetical':
          html += `<div class="parenthetical">${token.text}</div>`;
          break;
        case 'dialogue':
          html += `<div class="dialogue">${token.text}</div>`;
          break;
        case 'transition':
          html += `<div class="transition">${token.text}</div>`;
          break;
        case 'film_clip':
          const clipText = token.text.replace('[[FILM CLIP]]', '').trim();
          html += `<div class="film-clip">FILM CLIP${clipText ? ': ' + clipText : ''}</div>`;
          break;
        default:
          html += `<div>${token.text}</div>`;
      }
    });
    
    return html;
  }
}

// Make it globally available
window.FountainParser = FountainParser;