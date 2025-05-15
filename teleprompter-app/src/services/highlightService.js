// src/services/highlightService.js
import { sendControlMessage } from './websocket';

/**
 * Service to manage character highlighting in scripts
 */
class HighlightService {
  constructor() {
    this.highlights = new Map(); // Map of scriptId -> array of highlights
    this.enabled = true;
    this.colors = {
      // Default color palette
      character1: '#FF5733', // Red-orange
      character2: '#33FF57', // Green
      character3: '#3357FF', // Blue
      character4: '#F3FF33', // Yellow
      character5: '#FF33F3', // Pink
      character6: '#33FFF3', // Cyan
      character7: '#F3F3F3', // White
      character8: '#9933FF', // Purple
      character9: '#FF9933', // Orange
      default: '#FFFFFF'     // White (default)
    };
    // Character-specific color mappings
    this.characterColors = new Map(); // Map of character name -> color
    
    // NEW: Character auto-highlighting settings
    this.enabledCharacters = new Map(); // Map of character name -> boolean (whether highlighting is enabled)
    this.scriptContent = new Map(); // Map of scriptId -> script content for auto-highlighting
  }

  /**
   * Initialize the highlight service
   * @param {Object} options Configuration options
   * @param {boolean} options.enabled Whether highlighting is enabled
   * @param {Object} options.colors Custom color palette
   */
  initialize({ enabled = true, colors = {} }) {
    this.enabled = enabled;
    this.colors = { ...this.colors, ...colors };
    
    console.log('Highlight service initialized:', {
      enabled,
      colorCount: Object.keys(this.colors).length
    });
  }

  /**
   * Get all highlight definitions for a script
   * @param {string} scriptId Script ID
   * @returns {Array} Array of highlight definitions
   */
  getHighlights(scriptId) {
    if (!this.enabled || !scriptId) return [];
    return this.highlights.get(scriptId) || [];
  }

  /**
   * Add a highlight to a script
   * @param {string} scriptId Script ID
   * @param {Object} highlight Highlight definition
   * @param {string} highlight.character Character name
   * @param {string} highlight.color Color (hex or name)
   * @param {number} highlight.startPos Start position (0-1)
   * @param {number} highlight.endPos End position (0-1)
   * @param {string} highlight.text Text to highlight (for text-based matching)
   * @returns {string} ID of the new highlight
   */
  addHighlight(scriptId, { character, color, startPos, endPos, text }) {
    if (!this.enabled || !scriptId) return null;
    
    // Create unique ID for this highlight
    const highlightId = `hl_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
    
    // Create highlight object
    const highlight = {
      id: highlightId,
      character: character || 'Unknown',
      color: color || this.colors.default,
      startPos: startPos || 0,
      endPos: endPos || 0,
      text: text || '',
      createdAt: Date.now()
    };
    
    // Get existing highlights for this script or create new array
    const scriptHighlights = this.highlights.get(scriptId) || [];
    
    // Add new highlight
    scriptHighlights.push(highlight);
    
    // Update map
    this.highlights.set(scriptId, scriptHighlights);
    
    // Broadcast update
    this._broadcastHighlightUpdate(scriptId);
    
    return highlightId;
  }

  /**
   * Update an existing highlight
   * @param {string} scriptId Script ID
   * @param {string} highlightId Highlight ID to update
   * @param {Object} updates Properties to update
   * @returns {boolean} Whether the update was successful
   */
  updateHighlight(scriptId, highlightId, updates) {
    if (!this.enabled || !scriptId || !highlightId) return false;
    
    // Get highlights for this script
    const scriptHighlights = this.highlights.get(scriptId) || [];
    
    // Find highlight by ID
    const index = scriptHighlights.findIndex(h => h.id === highlightId);
    if (index === -1) return false;
    
    // Update properties
    scriptHighlights[index] = {
      ...scriptHighlights[index],
      ...updates,
      updatedAt: Date.now()
    };
    
    // Update map
    this.highlights.set(scriptId, scriptHighlights);
    
    // Broadcast update
    this._broadcastHighlightUpdate(scriptId);
    
    return true;
  }

  /**
   * Remove a highlight
   * @param {string} scriptId Script ID
   * @param {string} highlightId Highlight ID to remove
   * @returns {boolean} Whether the removal was successful
   */
  removeHighlight(scriptId, highlightId) {
    if (!this.enabled || !scriptId || !highlightId) return false;
    
    // Get highlights for this script
    const scriptHighlights = this.highlights.get(scriptId) || [];
    
    // Filter out the highlight to remove
    const filteredHighlights = scriptHighlights.filter(h => h.id !== highlightId);
    
    // If no changes, return false
    if (filteredHighlights.length === scriptHighlights.length) return false;
    
    // Update map
    this.highlights.set(scriptId, filteredHighlights);
    
    // Broadcast update
    this._broadcastHighlightUpdate(scriptId);
    
    return true;
  }

  /**
   * Clear all highlights for a script
   * @param {string} scriptId Script ID
   * @returns {boolean} Whether the operation was successful
   */
  clearHighlights(scriptId) {
    if (!this.enabled || !scriptId) return false;
    
    // Check if script has highlights
    if (!this.highlights.has(scriptId)) return false;
    
    // Clear highlights
    this.highlights.set(scriptId, []);
    
    // Broadcast update
    this._broadcastHighlightUpdate(scriptId);
    
    return true;
  }

  /**
   * Find all highlights for a specific character
   * @param {string} scriptId Script ID
   * @param {string} character Character name
   * @returns {Array} Array of highlights for the character
   */
  findHighlightsByCharacter(scriptId, character) {
    if (!this.enabled || !scriptId || !character) return [];
    
    // Get highlights for this script
    const scriptHighlights = this.highlights.get(scriptId) || [];
    
    // Filter by character name (case insensitive)
    return scriptHighlights.filter(h => 
      h.character.toLowerCase() === character.toLowerCase()
    );
  }

  /**
   * Get highlight at a specific position
   * @param {string} scriptId Script ID
   * @param {number} position Position in the script (0-1)
   * @returns {Object|null} Highlight at the position or null
   */
  getHighlightAtPosition(scriptId, position) {
    if (!this.enabled || !scriptId || position === undefined) return null;
    
    // Get highlights for this script
    const scriptHighlights = this.highlights.get(scriptId) || [];
    
    // Find highlight that contains this position
    return scriptHighlights.find(h => 
      position >= h.startPos && position <= h.endPos
    ) || null;
  }

  /**
   * Export highlights to JSON
   * @param {string} scriptId Script ID
   * @returns {string} JSON string of highlights
   */
  exportHighlights(scriptId) {
    if (!scriptId) return '[]';
    
    const highlights = this.highlights.get(scriptId) || [];
    return JSON.stringify(highlights);
  }

  /**
   * Import highlights from JSON
   * @param {string} scriptId Script ID
   * @param {string} json JSON string of highlights
   * @returns {boolean} Whether the import was successful
   */
  importHighlights(scriptId, json) {
    if (!this.enabled || !scriptId || !json) return false;
    
    try {
      const highlights = JSON.parse(json);
      
      // Validate that this is an array of highlight objects
      if (!Array.isArray(highlights)) {
        console.error('Invalid highlights JSON: not an array');
        return false;
      }
      
      // Basic validation of each highlight
      const validHighlights = highlights.filter(h => 
        h && typeof h === 'object' && 
        (h.character || h.color || h.startPos !== undefined || h.endPos !== undefined)
      );
      
      // Add timestamp if missing
      const processedHighlights = validHighlights.map(h => ({
        ...h,
        id: h.id || `hl_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`,
        createdAt: h.createdAt || Date.now()
      }));
      
      // Update map
      this.highlights.set(scriptId, processedHighlights);
      
      // Broadcast update
      this._broadcastHighlightUpdate(scriptId);
      
      return true;
    } catch (error) {
      console.error('Error importing highlights:', error);
      return false;
    }
  }

  /**
   * Get available colors
   * @returns {Object} Map of color names to hex values
   */
  getColors() {
    return { ...this.colors };
  }

  /**
   * Set custom colors
   * @param {Object} colors Map of color names to hex values
   */
  setColors(colors) {
    this.colors = { ...this.colors, ...colors };
  }
  
  /**
   * Set a specific color for a character
   * @param {string} character Character name
   * @param {string} color Color in hex format (e.g., #33FF57)
   * @param {number} opacity Optional opacity value between 0 and 1
   * @returns {boolean} Whether the operation was successful
   */
  setCharacterColor(character, color, opacity = 1) {
    if (!character || !color) return false;
    
    // Validate color format
    if (!color.startsWith('#') || !(color.length === 4 || color.length === 7)) {
      console.error('Invalid color format. Use hex format (e.g., #33FF57)');
      return false;
    }
    
    // Validate opacity
    const validOpacity = Math.max(0, Math.min(1, opacity));
    
    // Convert hex color to rgba if opacity < 1
    let finalColor = color;
    if (validOpacity < 1) {
      // Convert hex to rgb components
      let r, g, b;
      if (color.length === 7) {
        r = parseInt(color.substr(1, 2), 16);
        g = parseInt(color.substr(3, 2), 16);
        b = parseInt(color.substr(5, 2), 16);
      } else {
        r = parseInt(color.substr(1, 1), 16) * 17;
        g = parseInt(color.substr(2, 1), 16) * 17;
        b = parseInt(color.substr(3, 1), 16) * 17;
      }
      
      // Create rgba color
      finalColor = `rgba(${r}, ${g}, ${b}, ${validOpacity})`;
    }
    
    // Store the character-specific color
    this.characterColors.set(character.toLowerCase(), finalColor);
    
    console.log(`Set color for character "${character}" to ${finalColor}`);
    
    // Update all highlights for this character across all scripts
    for (const [scriptId, highlights] of this.highlights.entries()) {
      let updated = false;
      
      // Find highlights for this character and update their color
      highlights.forEach(highlight => {
        if (highlight.character.toLowerCase() === character.toLowerCase()) {
          highlight.color = finalColor;
          updated = true;
        }
      });
      
      // Broadcast update if any highlights were updated
      if (updated) {
        this._broadcastHighlightUpdate(scriptId);
      }
    }
    
    return true;
  }
  
  /**
   * Get the color assigned to a specific character
   * @param {string} character Character name
   * @returns {string|null} Color assigned to the character or null if none
   */
  getCharacterColor(character) {
    if (!character) return null;
    
    return this.characterColors.get(character.toLowerCase()) || null;
  }
  
  /**
   * Get all character-specific color mappings
   * @returns {Object} Map of character names to colors
   */
  getAllCharacterColors() {
    const result = {};
    
    this.characterColors.forEach((color, character) => {
      result[character] = color;
    });
    
    return result;
  }
  
  /**
   * Set the script content for auto-highlighting
   * @param {string} scriptId Script ID
   * @param {string} content Full script content
   */
  setScriptContent(scriptId, content) {
    if (!this.enabled || !scriptId || !content) return;
    
    this.scriptContent.set(scriptId, content);
    console.log(`Set script content for scriptId ${scriptId}. Length: ${content.length} chars`);
    
    // Auto-generate highlights for enabled characters
    this.updateAutoHighlights(scriptId);
  }
  
  /**
   * Toggle character auto-highlighting
   * @param {string} character Character name
   * @param {boolean} [enabled=true] Whether highlighting is enabled
   * @returns {boolean} Whether the operation was successful
   */
  toggleCharacterHighlight(character, enabled = true) {
    if (!character) return false;
    
    const characterKey = character.toLowerCase();
    this.enabledCharacters.set(characterKey, enabled);
    
    console.log(`${enabled ? 'Enabled' : 'Disabled'} auto-highlighting for character "${character}"`);
    
    // Update highlights for all scripts
    for (const scriptId of this.scriptContent.keys()) {
      this.updateAutoHighlights(scriptId);
    }
    
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('characterHighlightToggled', {
      detail: {
        character,
        enabled
      }
    }));
    
    // Broadcast to all clients via WebSocket
    sendControlMessage('HIGHLIGHT_CHARACTER_TOGGLE', {
      character,
      enabled,
      color: this.getCharacterColor(character)
    });
    
    return true;
  }
  
  /**
   * Check if a character has highlighting enabled
   * @param {string} character Character name
   * @returns {boolean} Whether the character has highlighting enabled
   */
  isCharacterHighlightEnabled(character) {
    if (!character) return false;
    
    return !!this.enabledCharacters.get(character.toLowerCase());
  }
  
  /**
   * Get all characters with enabled highlighting
   * @returns {string[]} Array of character names with highlighting enabled
   */
  getEnabledCharacters() {
    const result = [];
    
    this.enabledCharacters.forEach((enabled, character) => {
      if (enabled) {
        result.push(character);
      }
    });
    
    return result;
  }
  
  /**
   * Update auto-highlights for a script
   * @param {string} scriptId Script ID
   * @private
   */
  updateAutoHighlights(scriptId) {
    if (!this.enabled || !scriptId) return;
    
    const content = this.scriptContent.get(scriptId);
    if (!content) return;
    
    // Get existing highlights
    let scriptHighlights = this.highlights.get(scriptId) || [];
    
    // Remove any auto-generated highlights
    scriptHighlights = scriptHighlights.filter(h => !h.autoGenerated);
    
    // Get enabled characters
    const enabledCharacters = [];
    this.enabledCharacters.forEach((enabled, character) => {
      if (enabled) {
        enabledCharacters.push(character);
      }
    });
    
    if (enabledCharacters.length === 0) {
      // No characters enabled, just update with filtered highlights
      this.highlights.set(scriptId, scriptHighlights);
      this._broadcastHighlightUpdate(scriptId);
      return;
    }
    
    // For each enabled character, find all instances in the script content
    for (const character of enabledCharacters) {
      // Get character color
      const color = this.characterColors.get(character) || 
                  this.colors[`character${enabledCharacters.indexOf(character) % 9 + 1}`] || 
                  this.colors.default;
      
      // Create case-insensitive regex to find all instances
      // Use word boundaries to match whole words only
      const regex = new RegExp(`\\b${character}\\b`, 'gi');
      
      let match;
      while ((match = regex.exec(content)) !== null) {
        // Calculate relative positions based on character index
        const startPos = match.index / content.length;
        const endPos = (match.index + match[0].length) / content.length;
        
        // Add highlight
        scriptHighlights.push({
          id: `auto_hl_${character}_${match.index}_${Date.now().toString(36)}`,
          character,
          color,
          startPos,
          endPos,
          text: match[0],
          createdAt: Date.now(),
          autoGenerated: true
        });
      }
    }
    
    // Update highlights
    this.highlights.set(scriptId, scriptHighlights);
    
    // Broadcast update
    this._broadcastHighlightUpdate(scriptId);
  }

  /**
   * Broadcast highlight updates to all connected clients
   * @param {string} scriptId Script ID
   * @private
   */
  _broadcastHighlightUpdate(scriptId) {
    if (!this.enabled || !scriptId) return;
    
    const highlights = this.highlights.get(scriptId) || [];
    
    sendControlMessage('HIGHLIGHT_UPDATE', {
      scriptId,
      highlights
    });
  }

  /**
   * Handle highlight update from WebSocket
   * @param {Object} data Highlight update data
   * @param {string} data.scriptId Script ID
   * @param {Array} data.highlights Array of highlights
   */
  handleHighlightUpdate(data) {
    if (!this.enabled || !data || !data.scriptId || !data.highlights) return;
    
    // Update local highlights for this script
    this.highlights.set(data.scriptId, data.highlights);
    
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('highlightsUpdated', {
      detail: {
        scriptId: data.scriptId,
        highlights: data.highlights
      }
    }));
  }
  
  /**
   * Handle character highlight toggle from WebSocket
   * @param {Object} data Character toggle data
   * @param {string} data.character Character name
   * @param {boolean} data.enabled Whether highlighting is enabled
   * @param {string} data.color Character color
   */
  handleCharacterToggle(data) {
    if (!this.enabled || !data || !data.character) return;
    
    console.log('Received character highlight toggle via WebSocket:', data);
    
    // Update character color if provided
    if (data.color) {
      const colorMatch = data.color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
      if (colorMatch) {
        const [_, r, g, b, a] = colorMatch;
        // Convert back to hex
        const hex = `#${parseInt(r).toString(16).padStart(2, '0')}${parseInt(g).toString(16).padStart(2, '0')}${parseInt(b).toString(16).padStart(2, '0')}`;
        this.setCharacterColor(data.character, hex, parseFloat(a));
      } else if (data.color.startsWith('#')) {
        this.setCharacterColor(data.character, data.color, 1);
      }
    }
    
    // Update enabled state without broadcasting back to avoid loops
    const characterKey = data.character.toLowerCase();
    this.enabledCharacters.set(characterKey, data.enabled);
    
    // Update highlights for all scripts
    for (const scriptId of this.scriptContent.keys()) {
      this.updateAutoHighlights(scriptId);
    }
    
    // Dispatch local event for UI updates
    window.dispatchEvent(new CustomEvent('characterHighlightToggled', {
      detail: {
        character: data.character,
        enabled: data.enabled
      }
    }));
  }
}

// Create and export a singleton instance
const highlightService = new HighlightService();
export default highlightService;