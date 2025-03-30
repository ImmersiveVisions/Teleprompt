// src/database/db.js
import Dexie from 'dexie';

// Create the database
const db = new Dexie('TeleprompterDB');

// Define the database schema
db.version(1).stores({
  scripts: '++id, title, content, dateCreated, lastModified',
  chapters: '++id, scriptId, title, startPosition, endPosition'
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
    
    const id = await db.scripts.add(scriptToAdd);
    
    // Parse chapters and add them
    if (script.content) {
      const chapters = parseChapters(script.content, id);
      for (const chapter of chapters) {
        await db.chapters.add(chapter);
      }
    }
    
    return id;
  },
  
  async updateScript(id, scriptChanges) {
    const now = new Date();
    await db.scripts.update(id, {
      ...scriptChanges,
      lastModified: now
    });
    
    // If content is updated, update chapters
    if (scriptChanges.content) {
      // Delete old chapters
      await db.chapters.where({ scriptId: id }).delete();
      
      // Add new chapters
      const chapters = parseChapters(scriptChanges.content, id);
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

// Helper function to parse chapters from script content
function parseChapters(content, scriptId) {
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
}

// Add methods to the db object
Object.assign(db, scriptMethods);

export default db;
