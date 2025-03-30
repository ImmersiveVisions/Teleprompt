// src/hooks/useScripts.js
import { useState, useEffect } from 'react';
import db from '../database/db';

/**
 * Hook for working with scripts
 * @returns {Object} Scripts and methods for working with them
 */
const useScripts = () => {
  const [scripts, setScripts] = useState([]);
  const [selectedScriptId, setSelectedScriptId] = useState(null);
  const [selectedScript, setSelectedScript] = useState(null);
  // Removed chapters state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Load all scripts on mount
  useEffect(() => {
    const loadScripts = async () => {
      try {
        setLoading(true);
        const allScripts = await db.getAllScripts();
        setScripts(allScripts);
        
        // Select the first script by default if available
        if (allScripts.length > 0 && !selectedScriptId) {
          handleSelectScript(allScripts[0].id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading scripts:', error);
        setError('Failed to load scripts');
        setLoading(false);
      }
    };
    
    loadScripts();
  }, []);
  
  // Handle selecting a script
  const handleSelectScript = async (scriptId) => {
    try {
      setLoading(true);
      const script = await db.getScriptById(scriptId);
      
      if (script) {
        setSelectedScriptId(scriptId);
        setSelectedScript(script);
        
        // Removed chapters loading
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error selecting script:', error);
      setError('Failed to load script');
      setLoading(false);
    }
  };
  
  // Add a new script
  const addScript = async (scriptData) => {
    try {
      const id = await db.addScript(scriptData);
      const newScript = await db.getScriptById(id);
      setScripts([...scripts, newScript]);
      return id;
    } catch (error) {
      console.error('Error adding script:', error);
      setError('Failed to add script');
      throw error;
    }
  };
  
  // Update an existing script
  const updateScript = async (id, scriptChanges) => {
    try {
      await db.updateScript(id, scriptChanges);
      
      // Update the scripts list
      const updatedScript = await db.getScriptById(id);
      setScripts(scripts.map(script => 
        script.id === id ? updatedScript : script
      ));
      
      // Update selected script if it's the one being edited
      if (selectedScriptId === id) {
        setSelectedScript(updatedScript);
        // Removed chapters loading
      }
      
      return id;
    } catch (error) {
      console.error('Error updating script:', error);
      setError('Failed to update script');
      throw error;
    }
  };
  
  // Delete a script
  const deleteScript = async (id) => {
    try {
      await db.deleteScript(id);
      
      // Update the scripts list
      setScripts(scripts.filter(script => script.id !== id));
      
      // Clear selected script if it's the one being deleted
      if (selectedScriptId === id) {
        setSelectedScriptId(null);
        setSelectedScript(null);
        // Removed setChapters call
      }
    } catch (error) {
      console.error('Error deleting script:', error);
      setError('Failed to delete script');
      throw error;
    }
  };
  
  return {
    scripts,
    selectedScriptId,
    selectedScript,
    // Removed chapters,
    loading,
    error,
    selectScript: handleSelectScript,
    addScript,
    updateScript,
    deleteScript
  };
};

export default useScripts;