// src/database/db.js
import Dexie from 'dexie';

// Create the database
const db = new Dexie('TeleprompterDB');

// Define the database schema
db.version(2).stores({
  scripts: '++id, title, body, dateCreated, lastModified'
  // Removed chapters table
});

// Define upgrade function for migrating data from v1 to v2
db.version(2).upgrade(tx => {
  return tx.table('scripts').toCollection().modify(script => {
    // If this is a v1 script with content but no body, migrate it
    if (script.content && !script.body) {
      script.body = script.content;
      delete script.content;
    }
  });
});

// Add some methods to the database
const scriptMethods = {
  async getAllScripts() {
    try {
      const scripts = await db.scripts.toArray();
      console.log(`getAllScripts: Found ${scripts.length} scripts`);
      
      // Debug output for all scripts
      scripts.forEach((script, i) => {
        console.log(`Script ${i}: ID=${script.id} (${typeof script.id}), Title=${script.title}, Has Content=${!!(script.body || script.content)}`);
      });
      
      // Normalize all scripts to ensure consistency
      scripts.forEach(script => {
        if (!script.body && script.content) {
          script.body = script.content;
        } else if (!script.content && script.body) {
          script.content = script.body;
        }
      });
      
      return scripts;
    } catch (error) {
      console.error('Error in getAllScripts:', error);
      return [];
    }
  },
  
  async getScriptById(id) {
    console.log('=== getScriptById CALLED WITH:', id, 'type:', typeof id);

    // For direct debugging - log the entire database contents
    const allDbScripts = await db.scripts.toArray();
    console.log(`ALL SCRIPTS IN DATABASE (${allDbScripts.length} total):`);
    allDbScripts.forEach(s => {
      console.log(`- Script ID: ${s.id} (${typeof s.id}), Title: ${s.title || 'NO TITLE'}, Body: ${s.body ? 'YES' : 'NO'}, Content: ${s.content ? 'YES' : 'NO'}`);
    });

    // CRITICAL FIX: If the database is empty or scripts table doesn't exist, handle gracefully
    if (allDbScripts.length === 0) {
      console.error('No scripts found in database. Database might be empty or not properly initialized.');
      return null;
    }

    // Handle already-loaded script objects being passed in
    if (typeof id === 'object' && id !== null && id.id) {
      console.log('getScriptById received a script object instead of an ID:', id.title);
      return id; // Just return the object as-is
    }
    
    // Make sure we have a valid ID
    if (id === undefined || id === null) {
      console.error('Invalid script ID provided to getScriptById:', id, 'typeof:', typeof id);
      return null;
    }

    // Check for the 'none' special case
    if (id === 'none') {
      console.log("Special 'none' ID detected - returning null to clear selection");
      return null;
    }
    
    try {
      // Standardize ID format - try both numeric and string versions
      const numericId = Number(id);
      const stringId = String(id);
      
      console.log(`Looking for script with ID: ${id}, trying as numeric: ${numericId}, and as string: "${stringId}"`);
      
      // First, check if any script has this exact ID
      console.log('PRIMARY LOOKUP STRATEGY:');
      
      // Try all scripts using direct database access
      let script = null;
      
      // Try numeric ID first (most common case)
      console.log(`Method 1: Direct lookup with numeric ID ${numericId}`);
      script = await db.scripts.get(numericId);
      
      // If numeric ID fails, try string ID
      if (!script) {
        console.log(`Method 2: Direct lookup with string ID "${stringId}"`);
        script = await db.scripts.get(stringId);
      }
      
      // If still no match, try searching all scripts manually
      if (!script) {
        console.log('FALLBACK STRATEGY: Linear search through all scripts');
        
        // Get all scripts again to ensure we have the latest data
        const scripts = await db.scripts.toArray();
        
        // First try exact match
        script = scripts.find(s => s.id === numericId || s.id === stringId);
        
        // If that fails, try string comparison
        if (!script) {
          script = scripts.find(s => {
            const match = String(s.id) === stringId;
            console.log(`Comparing script ID ${s.id} (${typeof s.id}) with ${id} (${typeof id}): ${match}`);
            return match;
          });
        }
      }
      
      // If we found a script, normalize it
      if (script) {
        console.log(`SUCCESS: Found script with ID ${script.id}, title: "${script.title || 'NO TITLE'}"`);
        
        // CRITICAL: Ensure the script has required fields
        if (!script.title) {
          console.warn(`Script with ID ${script.id} has no title! This may cause issues.`);
          script.title = `Untitled Script ${script.id}`;
        }
        
        // Normalize content fields if needed
        if (!script.body && script.content) {
          console.log(`Normalizing script ${script.id}: Setting body from content field`);
          script.body = script.content;
        } else if (!script.content && script.body) {
          console.log(`Normalizing script ${script.id}: Setting content from body field`);
          script.content = script.body;
        } else if (!script.body && !script.content) {
          console.warn(`Script ${script.id} has neither body nor content! Setting empty content.`);
          script.body = "";
          script.content = "";
        }
        
        return script;
      } else {
        console.error(`FAILED: Script with ID ${id} not found in database after trying all methods`);
        return null;
      }
    } catch (error) {
      console.error('Error in getScriptById:', error);
      return null;
    }
  },
  
  async addScript(script) {
    const now = new Date();
    const scriptToAdd = {
      ...script,
      dateCreated: now,
      lastModified: now
    };
    
    // Ensure we're using body instead of content
    if (scriptToAdd.content && !scriptToAdd.body) {
      scriptToAdd.body = scriptToAdd.content;
      delete scriptToAdd.content;
    }
    
    console.log('Adding new script:', scriptToAdd.title);
    
    // Add the script to get an auto-generated ID
    const id = await db.scripts.add(scriptToAdd);
    console.log('Script added with auto-generated ID:', id, 'type:', typeof id);
    
    // Retrieve the full script with the assigned ID
    const addedScript = await db.scripts.get(id);
    console.log('Full script after adding:', addedScript);
    
    // Removed chapter parsing and creation
    
    return id;
  },
  
  async updateScript(id, scriptChanges) {
    const now = new Date();
    const updates = {
      ...scriptChanges,
      lastModified: now
    };
    
    // Ensure we're using body instead of content
    if (updates.content && !updates.body) {
      updates.body = updates.content;
      delete updates.content;
    }
    
    await db.scripts.update(id, updates);
    
    // Removed chapter updates
    
    return id;
  },
  
  async deleteScript(id) {
    // Delete the script
    await db.scripts.delete(id);
  },
  
  // Removed getChaptersForScript function
};

// Removed parseChapters function

// Add a method to validate all scripts in the database and remove invalid ones
const validateScriptsDatabase = async () => {
  try {
    const allScripts = await db.scripts.toArray();
    console.log(`Validating ${allScripts.length} scripts in database`);
    
    let invalidScriptIds = [];
    
    // Check for scripts with missing required fields
    for (const script of allScripts) {
      if (!script.title || (!script.body && !script.content)) {
        console.warn(`Found invalid script with ID ${script.id} - missing required fields`);
        invalidScriptIds.push(script.id);
      }
    }
    
    // Delete invalid scripts if any were found
    if (invalidScriptIds.length > 0) {
      console.warn(`Removing ${invalidScriptIds.length} invalid scripts from database`);
      for (const id of invalidScriptIds) {
        await db.scripts.delete(id);
        // Also delete associated chapters
        await db.chapters.where({ scriptId: id }).delete();
      }
      return true; // Database was modified
    }
    
    return false; // No changes were needed
  } catch (error) {
    console.error('Error validating scripts database:', error);
    return false;
  }
};

// Add the validation method to our script methods
scriptMethods.validateScriptsDatabase = validateScriptsDatabase;

// Add methods to the db object
Object.assign(db, scriptMethods);

export default db;
