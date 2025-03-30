// src/database/db.js
import Dexie from 'dexie';

// Create the database
const db = new Dexie('TeleprompterDB');

// Define the database schema
db.version(2).stores({
  scripts: '++id, title, body, dateCreated, lastModified',
  chapters: '++id, scriptId, title, startPosition, endPosition'
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
    const scripts = await db.scripts.toArray();
    console.log(`getAllScripts: Found ${scripts.length} scripts`);
    scripts.forEach((script, i) => {
      console.log(`Script ${i}: ID=${script.id} (${typeof script.id}), Title=${script.title}, Has Content=${!!(script.body || script.content)}`);
    });
    return scripts;
  },
  
  async getScriptById(id) {
    // Handle already-loaded script objects being passed in
    if (typeof id === 'object' && id !== null && id.id) {
      console.log('getScriptById received a script object instead of an ID:', id.title);
      return id; // Just return the object as-is
    }
    
    // Make sure we have a valid ID
    if (id === undefined || id === null || isNaN(parseInt(String(id), 10))) {
      console.error('Invalid script ID provided to getScriptById:', id, 'typeof:', typeof id);
      return null;
    }
    
    // Convert to integer if it's a string
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    
    try {
      console.log(`Getting script with ID: ${numericId} (original type: ${typeof id})`);
      
      // Strategy 1: Direct get by ID
      let script = await db.scripts.get(numericId);
      
      // Strategy 2: If not found, try as a string ID
      if (!script && typeof numericId === 'number') {
        console.log('Trying string ID lookup as fallback');
        script = await db.scripts.get(String(numericId));
      }
      
      // Strategy 3: If still not found, try to find by ID in a full collection
      if (!script) {
        console.log('Trying collection search as fallback');
        const allScripts = await db.scripts.toArray();
        script = allScripts.find(s => 
          s.id === numericId || 
          s.id === String(numericId) || 
          String(s.id) === String(numericId)
        );
      }
      
      if (!script) {
        console.warn(`Script with ID ${numericId} not found in database after all attempts`);
      } else {
        console.log(`Found script: ID ${script.id} (${typeof script.id}), title: ${script.title}`);
        
        // Normalize the script object
        if (!script.body && script.content) {
          script.body = script.content;
        } else if (!script.content && script.body) {
          script.content = script.body;
        }
      }
      
      return script;
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
    
    const id = await db.scripts.add(scriptToAdd);
    
    // Parse chapters and add them
    if (scriptToAdd.body) {
      const chapters = parseChapters(scriptToAdd.body, id);
      for (const chapter of chapters) {
        await db.chapters.add(chapter);
      }
    }
    
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
    
    // If body is updated, update chapters
    if (updates.body) {
      // Delete old chapters
      await db.chapters.where({ scriptId: id }).delete();
      
      // Add new chapters
      const chapters = parseChapters(updates.body, id);
      for (const chapter of chapters) {
        await db.chapters.add(chapter);
      }
    }
    
    return id;
  },
  
  async deleteScript(id) {
    // Delete all chapters for this script
    await db.chapters.where({ scriptId: id }).delete();
    
    // Delete the script
    await db.scripts.delete(id);
  },
  
  async getChaptersForScript(scriptId) {
    // Handle script object being passed in
    if (typeof scriptId === 'object' && scriptId !== null && scriptId.id) {
      scriptId = scriptId.id;
      console.log('getChaptersForScript: converted script object to ID:', scriptId);
    }
    
    // Make sure we have a valid ID
    if (scriptId === undefined || scriptId === null) {
      console.error('Invalid script ID provided to getChaptersForScript:', scriptId);
      return [];
    }
    
    try {
      // Convert to integer if it's a string, for compatibility
      const numericId = typeof scriptId === 'string' ? parseInt(scriptId, 10) : scriptId;
      
      console.log(`Getting chapters for script ID: ${numericId} (original type: ${typeof scriptId})`);
      
      // Try both numeric and string versions of the ID
      let chapters = await db.chapters.where({ scriptId: numericId }).toArray();
      
      // If no chapters found with numeric ID, try with string ID
      if (chapters.length === 0 && typeof numericId === 'number') {
        console.log('No chapters found with numeric ID, trying string ID...');
        chapters = await db.chapters.where({ scriptId: String(numericId) }).toArray();
      }
      
      console.log(`Found ${chapters.length} chapters for script ID ${scriptId}`);
      return chapters;
    } catch (error) {
      console.error('Error in getChaptersForScript:', error);
      return [];
    }
  }
};

// Helper function to parse chapters from script body
function parseChapters(body, scriptId) {
  const lines = body.split('\n');
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
}

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
