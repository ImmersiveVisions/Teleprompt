// src/database/scriptRepository.js
import db from './db';
import { parseChapters } from '../services/scriptParser';

/**
 * Provides methods for working with scripts in the database
 */
const scriptRepository = {
  /**
   * Get all scripts from the database
   * @returns {Promise<Array>} Array of script objects
   */
  async getAllScripts() {
    return await db.getAllScripts();
  },
  
  /**
   * Get a script by its ID
   * @param {number|string} id - The script ID
   * @returns {Promise<Object>} The script object
   */
  async getScriptById(id) {
    return await db.getScriptById(id);
  },
  
  /**
   * Add a new script
   * @param {Object} script - The script to add
   * @returns {Promise<number|string>} The ID of the new script
   */
  async addScript(script) {
    return await db.addScript(script);
  },
  
  /**
   * Update an existing script
   * @param {number|string} id - The script ID
   * @param {Object} scriptChanges - The changes to apply
   * @returns {Promise<number|string>} The script ID
   */
  async updateScript(id, scriptChanges) {
    return await db.updateScript(id, scriptChanges);
  },
  
  /**
   * Delete a script and its chapters
   * @param {number|string} id - The script ID
   * @returns {Promise<void>}
   */
  async deleteScript(id) {
    await db.deleteScript(id);
  },
  
  /**
   * Get chapters for a script
   * @param {number|string} scriptId - The script ID
   * @returns {Promise<Array>} Array of chapter objects
   */
  async getChaptersForScript(scriptId) {
    return await db.getChaptersForScript(scriptId);
  }
};

export default scriptRepository;