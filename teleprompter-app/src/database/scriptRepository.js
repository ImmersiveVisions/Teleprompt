// src/database/scriptRepository.js
import db from './db';
// Removed parseChapters import

/**
 * Provides methods for working with scripts in the database
 * This is a more reliable abstraction layer over the direct database access
 */
const scriptRepository = {
  /**
   * Get all scripts from the database
   * @returns {Promise<Array>} Array of script objects
   */
  async getAllScripts() {
    try {
      console.log('Repository: getAllScripts called');
      const scripts = await db.getAllScripts();
      
      // Normalize all scripts to ensure consistent format
      scripts.forEach(script => this.normalizeScript(script));
      
      return scripts;
    } catch (error) {
      console.error('Repository error in getAllScripts:', error);
      return [];
    }
  },
  
  /**
   * Get a script by its ID with consistent handling of ID types
   * @param {number|string} id - The script ID
   * @returns {Promise<Object>} The script object
   */
  async getScriptById(id) {
    try {
      console.log(`Repository: getScriptById called with ${id} (${typeof id})`);
      
      // Special cases
      if (id === null || id === undefined || id === 'none') {
        console.log('Repository: Returning null for null/undefined/none ID');
        return null;
      }
      
      // If we got an object, just normalize and return it
      if (typeof id === 'object' && id !== null && id.id) {
        console.log('Repository: ID is actually a script object');
        this.normalizeScript(id);
        return id;
      }
      
      // Try to get the script with numeric ID if possible
      const normalizedId = !isNaN(Number(id)) ? Number(id) : id;
      console.log(`Repository: Normalized ID to ${normalizedId} (${typeof normalizedId})`);
      
      const script = await db.getScriptById(normalizedId);
      
      if (script) {
        // Make sure the script has all required fields
        this.normalizeScript(script);
        return script;
      }
      
      console.warn(`Repository: Script with ID ${id} not found`);
      return null;
    } catch (error) {
      console.error(`Repository error in getScriptById(${id}):`, error);
      return null;
    }
  },
  
  /**
   * Add a new script
   * @param {Object} script - The script to add
   * @returns {Promise<number|string>} The ID of the new script
   */
  async addScript(script) {
    try {
      console.log('Repository: addScript called with:', script.title);
      
      // Ensure the script is properly formatted before adding
      this.normalizeScript(script);
      
      const id = await db.addScript(script);
      console.log(`Repository: Script added with ID ${id}`);
      
      // Verify the script was added successfully
      const addedScript = await db.getScriptById(id);
      if (!addedScript) {
        console.error('Repository: Script was not found immediately after adding!');
      }
      
      return id;
    } catch (error) {
      console.error('Repository error in addScript:', error);
      throw error;
    }
  },
  
  /**
   * Update an existing script
   * @param {number|string} id - The script ID
   * @param {Object} scriptChanges - The changes to apply
   * @returns {Promise<number|string>} The script ID
   */
  async updateScript(id, scriptChanges) {
    try {
      console.log(`Repository: updateScript called for ID ${id}`);
      
      // Normalize the ID to ensure consistency
      const normalizedId = !isNaN(Number(id)) ? Number(id) : id;
      
      // Ensure the changes are properly formatted
      this.normalizeScript(scriptChanges);
      
      await db.updateScript(normalizedId, scriptChanges);
      
      return normalizedId;
    } catch (error) {
      console.error(`Repository error in updateScript(${id}):`, error);
      throw error;
    }
  },
  
  /**
   * Delete a script
   * @param {number|string} id - The script ID
   * @returns {Promise<void>}
   */
  async deleteScript(id) {
    try {
      console.log(`Repository: deleteScript called for ID ${id}`);
      
      // Normalize the ID to ensure consistency
      const normalizedId = !isNaN(Number(id)) ? Number(id) : id;
      
      await db.deleteScript(normalizedId);
    } catch (error) {
      console.error(`Repository error in deleteScript(${id}):`, error);
      throw error;
    }
  },
  
  // Removed getChaptersForScript function
  
  /**
   * Normalize a script object to ensure it has all required fields
   * @param {Object} script - The script to normalize
   */
  normalizeScript(script) {
    if (!script) return;
    
    // Ensure title exists
    if (!script.title) {
      console.warn(`Normalizing script: Missing title for script ${script.id || 'unknown'}`);
      script.title = `Untitled Script ${script.id || ''}`;
    }
    
    // Ensure content fields are consistent
    if (script.content && !script.body) {
      script.body = script.content;
    } else if (script.body && !script.content) {
      script.content = script.body;
    } else if (!script.body && !script.content) {
      console.warn(`Normalizing script: Missing content for script ${script.id || 'unknown'}`);
      script.body = "";
      script.content = "";
    }
    
    // Ensure dates exist
    const now = new Date();
    if (!script.dateCreated) {
      script.dateCreated = now;
    }
    if (!script.lastModified) {
      script.lastModified = now;
    }
    
    // Ensure file extension and format flags are set
    if (script.id && !script.fileExtension) {
      const parts = script.id.split('.');
      if (parts.length > 1) {
        script.fileExtension = parts.pop().toLowerCase();
        
        // Set format flags based on extension
        script.isHtml = ['html', 'htm'].includes(script.fileExtension);
        script.isFountain = script.fileExtension === 'fountain';
      } else {
        script.fileExtension = 'txt';
        script.isHtml = false;
        script.isFountain = false;
      }
    }
  }
};

export default scriptRepository;