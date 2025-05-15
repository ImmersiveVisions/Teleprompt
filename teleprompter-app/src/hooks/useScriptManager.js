import { useState, useEffect, useRef } from 'react';
import fileSystemRepository from '../database/fileSystemRepository';
import { sendControlMessage } from '../services/websocket';

const useScriptManager = () => {
  const [scripts, setScripts] = useState([]);
  const [selectedScriptId, setSelectedScriptId] = useState(null);
  const [selectedScript, setSelectedScript] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  
  // Load all scripts from the scripts directory
  const loadScripts = async () => {
    try {
      // Load the scripts using the repository
      const allScripts = await fileSystemRepository.getAllScripts();
      console.log(`AdminPage: loaded ${allScripts.length} scripts`);
      setScripts(allScripts);
      
      // If the currently selected script no longer exists, clear the selection
      if (selectedScriptId) {
        // Only check if we have scripts
        if (allScripts.length > 0) {
          const scriptExists = allScripts.some(script => String(script.id) === String(selectedScriptId));
          if (!scriptExists) {
            console.warn(`Selected script ID ${selectedScriptId} no longer exists in directory`);
            clearScriptSelection();
            return;
          }
        } else {
          // No scripts in directory, clear selection
          console.warn('No scripts found in directory, clearing selection');
          clearScriptSelection();
          return;
        }
      }
      
      // Select the first script by default if none is selected
      if (allScripts.length > 0 && !selectedScriptId) {
        console.log('AdminPage: auto-selecting first script:', allScripts[0].title);
        
        // Validate script before selecting
        if (allScripts[0].id && (allScripts[0].body || allScripts[0].content)) {
          handleScriptSelect(allScripts[0].id);
        } else {
          console.error('AdminPage: first script is invalid, not auto-selecting');
        }
      } else if (allScripts.length === 0) {
        console.warn('AdminPage: no scripts found in directory');
      }
    } catch (error) {
      console.error('Error loading scripts:', error);
      throw error;
    }
  };

  // Clear script selection
  const clearScriptSelection = () => {
    console.log('DEBUG Clearing script selection');
    
    // Clear local states
    setSelectedScriptId(null);
    setSelectedScript(null);
    
    // Notify other clients about clearing the script
    console.log('DEBUG Sending LOAD_SCRIPT control message with null scriptId');
    sendControlMessage('LOAD_SCRIPT', null);
  };

  // Handle script selection
  const handleScriptSelect = async (scriptId) => {
    console.log('AdminPage: handleScriptSelect called with scriptId:', scriptId, 'type:', typeof scriptId);
    
    // Handle "none" option or invalid script ID
    if (scriptId === 'none' || scriptId === null || scriptId === undefined) {
      clearScriptSelection();
      return;
    }
    
    // Avoid duplicate selection that might cause loops
    if (selectedScriptId !== null && String(selectedScriptId) === String(scriptId)) {
      console.log('Script already selected, ignoring duplicate selection');
      return;
    }
    
    try {
      // Check if we're selecting from the dropdown (string ID) or 
      // from the list (which might pass the script object directly)
      if (typeof scriptId === 'object' && scriptId !== null) {
        // We were passed a full script object
        console.log('Using script object directly:', scriptId.title);
        setSelectedScriptId(scriptId.id);
        setSelectedScript(scriptId);
        
        // Notify other clients about the script change
        console.log('AdminPage: Sending LOAD_SCRIPT control message with scriptId:', scriptId.id);
        sendControlMessage('LOAD_SCRIPT', scriptId.id);
        return;
      }
      
      // Get the script using the repository
      const script = await fileSystemRepository.getScriptById(scriptId);
      
      if (script) {
        // Ensure fountain status is correctly set with multiple checks
        // But don't create a new object on every render to avoid infinite loops
        // Instead, perform a simple check and only modify script if needed
        if (!script.isFountain && 
            (script.id.toLowerCase().endsWith('.fountain') || 
             (script.fileExtension && script.fileExtension.toLowerCase() === 'fountain'))) {
          // Only create a new object if the fountain flag needs to be changed
          const updatedScript = {
            ...script,
            isFountain: true
          };
          script = updatedScript;
        }
        
        console.log('Script loaded successfully:', script.title);
        console.log('Script details:', {
          id: script.id,
          title: script.title,
          isFountain: script.isFountain,
          fileExtension: script.fileExtension,
          size: script.body?.length || 0,
          endsWithFountain: script.id.toLowerCase().endsWith('.fountain')
        });
        
        setSelectedScriptId(script.id);
        setSelectedScript(script);
        
        // Notify other clients
        sendControlMessage('LOAD_SCRIPT', script.id);
      } else {
        console.error('Script not found with ID:', scriptId);
        clearScriptSelection();
        throw new Error(`Script with ID ${scriptId} was not found.`);
      }
    } catch (error) {
      console.error('Error selecting script:', error);
      clearScriptSelection();
      throw error;
    }
  };

  // Handle adding a new script
  const handleAddScript = () => {
    setSelectedScript(null);
    setIsModalOpen(true);
  };

  // Handle uploading a script file
  const handleUploadScript = () => {
    setIsUploadModalOpen(true);
  };

  // Handle script file upload submission
  const handleFileUpload = async (file) => {
    try {
      console.log("Uploading script file:", file.name);
      const uploadedScript = await fileSystemRepository.uploadScript(file);
      
      // Reload scripts to refresh the list
      await loadScripts();
      
      // Select the newly uploaded script
      if (uploadedScript && uploadedScript.id) {
        handleScriptSelect(uploadedScript.id);
      }
      
      return uploadedScript;
    } catch (error) {
      console.error("Error uploading script:", error);
      throw error;
    }
  };

  // Handle saving a script (new or edited)
  const handleSaveScript = async (scriptData) => {
    try {
      if (selectedScriptId && selectedScript) {
        // Update existing script
        console.log('Updating existing script with ID:', selectedScriptId);
        await fileSystemRepository.updateScript(selectedScriptId, {
          title: scriptData.title,
          body: scriptData.body
        });
        
        // Reload the updated script to ensure we have the latest version
        const updatedScript = await fileSystemRepository.getScriptById(selectedScriptId);
        console.log('Script updated:', updatedScript);
        setSelectedScript(updatedScript);
      } else {
        // Add new script
        console.log('Adding new script:', scriptData.title);
        const newScriptId = await fileSystemRepository.addScript({
          title: scriptData.title,
          body: scriptData.body
        });
        
        console.log('New script added with ID:', newScriptId);
        
        // Explicitly load the new script to make sure we have the complete object
        const newScript = await fileSystemRepository.getScriptById(newScriptId);
        console.log('Retrieved new script:', newScript);
        
        if (newScript) {
          // Select the new script
          setSelectedScriptId(newScriptId);
          setSelectedScript(newScript);
          
          // Notify other clients about the new script
          sendControlMessage('LOAD_SCRIPT', newScriptId);
        } else {
          console.error('Failed to retrieve newly created script with ID:', newScriptId);
        }
      }
      
      // Reload scripts to update the list
      await loadScripts();
      
      // Close the modal
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving script:', error);
      throw error;
    }
  };

  // Handle deleting a script
  const handleDeleteScript = async () => {
    if (!selectedScriptId) return;
    
    try {
      await fileSystemRepository.deleteScript(selectedScriptId);
      
      // Reload scripts
      const allScripts = await fileSystemRepository.getAllScripts();
      setScripts(allScripts);
      
      // Select the first script or clear the selection
      if (allScripts.length > 0) {
        handleScriptSelect(allScripts[0].id);
      } else {
        setSelectedScriptId(null);
        setSelectedScript(null);
      }
    } catch (error) {
      console.error('Error deleting script:', error);
      throw error;
    }
  };

  // For debugging - expose script details to window 
  // but using a ref to avoid unnecessary re-renders 
  const lastScriptIdRef = useRef(null);
  useEffect(() => {
    if (selectedScript && typeof window !== 'undefined') {
      // Only update when script ID changes to avoid unnecessary effects
      if (lastScriptIdRef.current !== selectedScript.id) {
        lastScriptIdRef.current = selectedScript.id;
        
        window._currentScriptDetails = {
          id: selectedScript.id,
          title: selectedScript.title,
          isFountain: selectedScript.isFountain,
          fileExtension: selectedScript.fileExtension || (selectedScript.id?.split('.').pop() || ''),
          endsWithFountain: selectedScript.id?.toLowerCase().endsWith('.fountain') || false
        };
        console.log('Set window._currentScriptDetails:', window._currentScriptDetails);
      }
    }
  }, [selectedScript]);

  // Load scripts on component mount
  useEffect(() => {
    loadScripts();
  }, []);

  return {
    scripts,
    selectedScriptId,
    selectedScript,
    isModalOpen,
    setIsModalOpen,
    isUploadModalOpen,
    setIsUploadModalOpen,
    loadScripts,
    handleScriptSelect,
    clearScriptSelection,
    handleAddScript,
    handleUploadScript,
    handleFileUpload,
    handleSaveScript,
    handleDeleteScript
  };
};

export default useScriptManager;