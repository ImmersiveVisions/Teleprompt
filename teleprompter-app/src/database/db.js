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
    return await db.scripts.toArray();
  },
  
  async getScriptById(id) {
    return await db.scripts.get(id);
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
    return await db.chapters.where({ scriptId }).toArray();
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

// Add methods to the db object
Object.assign(db, scriptMethods);

export default db;
