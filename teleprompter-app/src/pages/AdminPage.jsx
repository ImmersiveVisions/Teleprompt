// src/pages/AdminPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import fileSystemRepository from '../database/fileSystemRepository';
import { sendControlMessage, sendSearchPosition, registerMessageHandler } from '../services/websocket';
import { connectToBluetoothDevice, disconnectBluetoothDevice, getBluetoothDeviceName } from '../services/bluetoothService';
import ScriptViewer from '../components/ScriptViewer';
import ScriptPlayer from '../components/ScriptPlayer';
import QRCodeGenerator from '../components/QRCodeGenerator';
import ScriptEntryModal from '../components/ScriptEntryModal';
import SearchModal from '../components/SearchModal';
import '../styles.css';

const AdminPage = () => {
  const [scripts, setScripts] = useState([]);
  const [selectedScriptId, setSelectedScriptId] = useState(null);
  const [selectedScript, setSelectedScript] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  // Removed chapters state
  const [bluetoothStatus, setBluetoothStatus] = useState('disconnected');
  const [bluetoothDeviceName, setBluetoothDeviceName] = useState(null);
  // Directory handling removed for web version
  
  // Teleprompter control states
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [direction, setDirection] = useState('forward');
  const [fontSize, setFontSize] = useState(24);
  // Removed currentChapter state
  // Removed currentPosition state since we're disabling position updates
  
  // Load scripts on component mount
  useEffect(() => {
    loadScripts();
    
    // Register for state updates
    const unregisterHandler = registerMessageHandler(handleStateUpdate);
    
    return () => {
      unregisterHandler();
    };
  }, []);
  
  // Directory selection disabled for web version
  
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
      alert('Failed to load scripts: ' + error.message);
    }
  };
  
  // State for search
  const [searchResults, setSearchResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Handle script search
  const handleScriptSearch = (searchTerm) => {
    console.log('Search initiated for term:', searchTerm);
    setSearchTerm(searchTerm);
    
    if (!selectedScript || !searchTerm) {
      console.log('No script or search term provided');
      setSearchResults([]);
      return;
    }
    
    console.log('Selected script for search:', {
      id: selectedScript.id,
      title: selectedScript.title,
      isHtml: selectedScript.id && (
        selectedScript.id.toLowerCase().endsWith('.html') || 
        selectedScript.id.toLowerCase().endsWith('.htm')
      )
    });
    
    // Check if this is an HTML script
    const isHtmlScript = selectedScript.id && 
      (selectedScript.id.toLowerCase().endsWith('.html') || 
       selectedScript.id.toLowerCase().endsWith('.htm'));
    
    if (isHtmlScript) {
      // For HTML scripts, we need to search the iframe content
      const iframe = document.querySelector('#html-script-frame');
      console.log('Search in HTML: iframe element found:', !!iframe);
      
      if (!iframe) {
        console.error('Cannot search - iframe element not found');
        alert('Cannot search - iframe not found. Please try again after the content has loaded.');
        return;
      }
      
      // Check if iframe is loaded
      const isLoaded = iframe.dataset.loaded === 'true';
      console.log('Is iframe marked as loaded:', isLoaded);
      
      if (!isLoaded) {
        console.warn('Iframe not yet marked as fully loaded. Search might not work correctly.');
      }
      
      if (!iframe.contentDocument) {
        console.error('Cannot search - iframe contentDocument not accessible (possible cross-origin issue)');
        alert('Cannot search - cannot access iframe content. This may be due to security restrictions.');
        return;
      }
      
      if (!iframe.contentDocument.body) {
        console.error('Cannot search - iframe body not available');
        alert('Cannot search - iframe content not fully loaded. Please try again in a moment.');
        return;
      }
      
      console.log('HTML content accessible, searching for:', searchTerm);
      
      try {
        // Get all text nodes from the iframe
        const textNodes = [];
        
        // Function to collect all text nodes from a document
        const collectTextNodes = (element, nodes = []) => {
          if (!element) return nodes;
          
          // Process all child nodes
          for (let i = 0; i < element.childNodes.length; i++) {
            const node = element.childNodes[i];
            
            // If it's a text node with content
            if (node.nodeType === Node.TEXT_NODE) {
              const text = node.nodeValue.trim();
              if (text) {
                nodes.push({
                  text: text,
                  node: node,
                  index: nodes.length
                });
              }
            } 
            // If it's an element, recurse into its children
            else if (node.nodeType === Node.ELEMENT_NODE) {
              // Skip script and style elements
              if (node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
                collectTextNodes(node, nodes);
              }
            }
          }
          
          return nodes;
        };
        
        // Collect all text nodes in the document
        const allTextNodes = collectTextNodes(iframe.contentDocument.body);
        console.log(`Collected ${allTextNodes.length} text nodes using recursive approach`);
        
        // Try the TreeWalker approach as well
        try {
          const walkNodes = [];
          const walk = document.createTreeWalker(
            iframe.contentDocument.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
          );
          
          let node;
          let index = 0;
          while ((node = walk.nextNode())) {
            const text = node.nodeValue.trim();
            if (text) {
              walkNodes.push({
                text: text,
                node: node,
                index: index++
              });
            }
          }
          
          console.log(`TreeWalker found ${walkNodes.length} text nodes`);
          
          // Use the method that found more nodes
          if (walkNodes.length > allTextNodes.length) {
            console.log('Using TreeWalker results as it found more nodes');
            textNodes.push(...walkNodes);
          } else {
            console.log('Using recursive approach results');
            textNodes.push(...allTextNodes);
          }
        } catch (walkError) {
          console.warn('TreeWalker approach failed, using only recursive results:', walkError);
          textNodes.push(...allTextNodes);
        }
        
        console.log(`Found ${textNodes.length} text nodes in iframe content`);
        if (textNodes.length === 0) {
          console.warn('No text nodes found in iframe - iframe may not be fully loaded yet');
          
          // Fallback: If we can't find text nodes in the iframe, check if we have content in the script object
          const fallbackContent = selectedScript.body || selectedScript.content || '';
          if (fallbackContent) {
            console.log('Using fallback: searching in script.body/content instead of iframe');
            // Simple search implementation for fallback
            const lines = fallbackContent.split('\n');
            const fallbackResults = [];
            
            lines.forEach((line, index) => {
              if (line.toLowerCase().includes(searchTerm.toLowerCase())) {
                console.log(`Fallback match found in line ${index}: "${line.substring(0, 30)}..."`);
                fallbackResults.push({ 
                  line, 
                  index,
                  isHtml: false  // Mark as non-HTML since we're using the text content
                });
              }
            });
            
            console.log(`Fallback search complete. Found ${fallbackResults.length} matches`);
            
            setSearchResults(fallbackResults);
            
            // Open the search modal if we have results
            if (fallbackResults.length > 0) {
              setIsSearchModalOpen(true);
            } else {
              alert(`No results found for "${searchTerm}" in script content`);
            }
            return;
          } else {
            console.error('No fallback content available for search');
            alert('Unable to search: content not accessible. Try again after the script fully loads.');
            return;
          }
        }
        
        // Search in text nodes
        const results = [];
        const lowerSearchTerm = searchTerm.toLowerCase();
        
        textNodes.forEach((item) => {
          if (item.text.toLowerCase().includes(lowerSearchTerm)) {
            console.log(`Match found: "${item.text.substring(0, 30)}..."`);
            results.push({
              line: item.text,
              index: item.index,
              node: item.node,
              isHtml: true
            });
          }
        });
        
        console.log(`Search complete. Found ${results.length} matches for "${searchTerm}"`);
        
        setSearchResults(results);
        
        // Open the search modal if we have results
        if (results.length > 0) {
          setIsSearchModalOpen(true);
        } else {
          alert(`No results found for "${searchTerm}"`);
        }
      } catch (error) {
        console.error('Error searching in HTML content:', error);
        alert('Error searching in HTML content: ' + error.message);
      }
    } else {
      // Regular text search for non-HTML scripts
      // Get script content
      const scriptContent = selectedScript.body || selectedScript.content || '';
      if (!scriptContent) return;
      
      // Simple search implementation
      const lines = scriptContent.split('\n');
      const results = [];
      
      lines.forEach((line, index) => {
        if (line.toLowerCase().includes(searchTerm.toLowerCase())) {
          results.push({ line, index, isHtml: false });
        }
      });
      
      setSearchResults(results);
      
      // Open the search modal if we have results
      if (results.length > 0) {
        setIsSearchModalOpen(true);
      } else {
        alert(`No results found for "${searchTerm}"`);
      }
    }
  };
  
  // Handle executing a search
  const executeSearch = () => {
    if (searchTerm.trim()) {
      handleScriptSearch(searchTerm);
    }
  };
  
  // Reference to the script player component
  const scriptPlayerRef = React.useRef(null);
  
  // Jump to search result - handles both HTML and text content
  const jumpToSearchResult = (result) => {
    if (!selectedScript) {
      console.error('Cannot jump to search result - no script selected');
      alert('Please select a script first');
      return;
    }
    
    // Check if this is an HTML script result
    if (result.isHtml && result.node) {
      // For HTML content, we'll scroll the iframe to the node
      console.log(`Jumping to HTML node containing: "${result.line.substring(0, 30)}..."`);
      
      // Pause playback when jumping
      if (isPlaying) {
        setIsPlaying(false);
        sendControlMessage('PAUSE');
      }
      
      // Get the iframe
      const iframe = document.querySelector('#html-script-frame');
      if (!iframe || !iframe.contentWindow) {
        console.error('Cannot jump - iframe not accessible');
        return;
      }
      
      try {
        // Scroll the node into view within the iframe
        result.node.parentElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
        
        // Highlight the element for visibility
        const originalBackground = result.node.parentElement.style.backgroundColor;
        const originalColor = result.node.parentElement.style.color;
        
        // Flash the element to make it visible
        result.node.parentElement.style.backgroundColor = '#ff6600';
        result.node.parentElement.style.color = '#ffffff';
        
        // Reset after a delay
        setTimeout(() => {
          result.node.parentElement.style.backgroundColor = originalBackground;
          result.node.parentElement.style.color = originalColor;
        }, 2000);
        
        // Send a SCROLL_TO message with the node information
        try {
          // Get text content to identify the node
          const nodeText = result.node.textContent.trim();
          // Get parent node tag name
          const parentTag = result.node.parentElement.tagName;
          // Get index of node among siblings
          const siblings = Array.from(result.node.parentElement.childNodes);
          const nodeIndex = siblings.indexOf(result.node);
          
          // Calculate the approximate position as a percentage of the document
          const totalHeight = iframe.contentDocument.body.scrollHeight;
          const currentPos = result.node.parentElement.getBoundingClientRect().top;
          const viewportOffset = iframe.contentWindow.pageYOffset || iframe.contentDocument.documentElement.scrollTop;
          const absolutePosition = currentPos + viewportOffset;
          
          // Calculate percentage (0-1)
          const percentPos = Math.max(0, Math.min(1, absolutePosition / totalHeight));
          
          // Create a data object with multiple ways to identify the node
          const scrollData = {
            position: percentPos, // Normalized position (0-1)
            text: nodeText.substring(0, 50), // First 50 chars of text
            parentTag: parentTag, // Parent tag name
            nodeIndex: nodeIndex, // Index in parent's children
            absolutePosition: absolutePosition // Absolute pixel position
          };
          
          // Log the actual scrollData object being sent
          console.log('===== [ADMIN PAGE] Final scrollData object being sent:', JSON.stringify(scrollData));
          
          // Send WebSocket message with enhanced data using the new dedicated message type
          sendSearchPosition(scrollData);
        } catch (posError) {
          console.error('Error calculating scroll position for WebSocket:', posError);
        }
        
        // Close the search modal after jumping
        setIsSearchModalOpen(false);
      } catch (error) {
        console.error('Error jumping to HTML search result:', error);
        alert('Error scrolling to search result: ' + error.message);
      }
    } else {
      // For text content, use the original approach with position calculation
      const lineIndex = result.index;
      const scriptContent = selectedScript.body || selectedScript.content || '';
      if (!scriptContent) {
        console.error('Cannot jump to search result - script has no content');
        return;
      }
      
      // Calculate position in script
      const lines = scriptContent.split('\n');
      let position = 0;
      
      // Calculate the exact character position where the line starts
      for (let i = 0; i < lineIndex; i++) {
        position += lines[i].length + 1; // +1 for newline character
      }
      
      console.log(`Jumping to line ${lineIndex} at position ${position}`);
      
      // Pause playback when jumping
      if (isPlaying) {
        setIsPlaying(false);
        sendControlMessage('PAUSE');
      }
      
      // Highlight the clicked search result in the UI
      setSearchResults(prev => prev.map((item, idx) => ({
        ...item,
        active: item.index === lineIndex
      })));
      
      // If we have a direct reference to the player, use it
      if (scriptPlayerRef.current && scriptPlayerRef.current.jumpToPosition) {
        scriptPlayerRef.current.jumpToPosition(position);
      }
      
      // Calculate the position as a percentage of the total script length
      const totalLength = scriptContent.length;
      const percentPos = Math.max(0, Math.min(1, position / totalLength));
      
      // For regular position jumps, we can use the standard position control
      // This updates the shared state position for all clients
      sendControlMessage('JUMP_TO_POSITION', percentPos);
      
      // Optional: Add visual feedback
      const previewHeader = document.querySelector('.preview-header h3');
      if (previewHeader) {
        const originalText = previewHeader.textContent;
        previewHeader.textContent = 'Jumping to position...';
        setTimeout(() => {
          previewHeader.textContent = originalText;
        }, 1000);
      }
      
      // Close the search modal after jumping
      setIsSearchModalOpen(false);
    }
  };
  
  // Clear script selection
  const clearScriptSelection = () => {
    console.log('DEBUG Clearing script selection');
    
    // Clear local states
    setSelectedScriptId(null);
    setSelectedScript(null);
    
    // Pause if playing
    if (isPlaying) {
      setIsPlaying(false);
      sendControlMessage('PAUSE');
    }
    
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
        console.log('Script loaded successfully:', script.title);
        setSelectedScriptId(script.id);
        setSelectedScript(script);
        
        // Notify other clients
        sendControlMessage('LOAD_SCRIPT', script.id);
      } else {
        console.error('Script not found with ID:', scriptId);
        clearScriptSelection();
        alert(`Script with ID ${scriptId} was not found. It may have been deleted.`);
      }
    } catch (error) {
      console.error('Error selecting script:', error);
      clearScriptSelection();
    }
  };
  
  // Handle adding a new script
  const handleAddScript = () => {
    setSelectedScript(null);
    setIsModalOpen(true);
  };
  
  // Handle editing an existing script
  const handleEditScript = () => {
    if (selectedScript) {
      setIsModalOpen(true);
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
          
          // Removed chapters loading
          
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
      alert('Failed to save script: ' + error.message);
    }
  };
  
  // Handle deleting a script
  const handleDeleteScript = async () => {
    if (!selectedScriptId) return;
    
    if (window.confirm(`Are you sure you want to delete the script "${selectedScript?.title}"?`)) {
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
        alert('Failed to delete script: ' + error.message);
      }
    }
  };
  
  // Handle state updates from WebSocket
  const handleStateUpdate = async (message) => {
    if (message.type === 'STATE_UPDATE') {
      const { data } = message;
      console.log('AdminPage: Received state update:', data);
      
      // Update local control states
      setIsPlaying(data.isPlaying);
      setSpeed(data.speed);
      setDirection(data.direction);
      setFontSize(data.fontSize);
      // Removed currentChapter update
      
      // Handle script selection changes from WebSocket
      if (data.currentScript === null && selectedScriptId !== null) {
        console.log('AdminPage: Clearing script selection due to WebSocket state update');
        clearScriptSelection();
      } else if (data.currentScript && selectedScriptId === null) {
        // We have no script but should select one - load it directly
        console.log('AdminPage: Loading initial script from state update:', data.currentScript);
        try {
          // Get the script using the repository
          const script = await fileSystemRepository.getScriptById(data.currentScript);
          if (script) {
            console.log('Script found, setting as selected:', script.title);
            setSelectedScriptId(script.id);
            setSelectedScript(script);
          } else {
            console.error('AdminPage: Could not find script with ID:', data.currentScript);
          }
        } catch (error) {
          console.error('AdminPage: Error handling state update script selection:', error);
        }
      } else if (data.currentScript && 
                 selectedScriptId !== null && 
                 String(data.currentScript) !== String(selectedScriptId)) {
        // Script changed to a different one
        console.log('AdminPage: Changing script selection due to WebSocket state update');
        try {
          const script = await fileSystemRepository.getScriptById(data.currentScript);
          if (script) {
            setSelectedScriptId(script.id);
            setSelectedScript(script);
          }
        } catch (error) {
          console.error('AdminPage: Error loading new script from state update:', error);
        }
      }
    }
  };
  
  // Teleprompter control functions
  const togglePlay = () => {
    // Only toggle play if we have a script selected
    if (!selectedScript) {
      console.error('Cannot play - no script selected');
      alert('Please select a script first');
      return;
    }
    
    const newState = !isPlaying;
    console.log('PLAY STATE CHANGE - setting isPlaying to:', newState, 'from:', isPlaying);
    
    // Update local state first
    setIsPlaying(newState);
    
    // Log state after setting for debugging
    setTimeout(() => {
      console.log('Play state check after 100ms:', {
        isPlayingStateNow: isPlaying,
        shouldBe: newState
      });
    }, 100);
    
    // Then send message to all clients
    console.log('Sending control message:', newState ? 'PLAY' : 'PAUSE');
    sendControlMessage(newState ? 'PLAY' : 'PAUSE');
    
    // Log current state for debugging
    console.log('Play state after toggle:', {
      isPlaying: newState,
      scriptId: selectedScriptId,
      scriptTitle: selectedScript.title
    });
  };
  
  const changeSpeed = (newSpeed) => {
    setSpeed(newSpeed);
    sendControlMessage('SET_SPEED', newSpeed);
  };
  
  const toggleDirection = () => {
    const newDirection = direction === 'forward' ? 'backward' : 'forward';
    setDirection(newDirection);
    sendControlMessage('SET_DIRECTION', newDirection);
  };
  
  const changeFontSize = (newSize) => {
    setFontSize(newSize);
    sendControlMessage('SET_FONT_SIZE', newSize);
  };
  
  // Chapter functionality has been removed
  
  // Bluetooth connection handlers
  const handleConnectBluetooth = async () => {
    try {
      const connected = await connectToBluetoothDevice();
      if (connected) {
        setBluetoothStatus('connected');
        setBluetoothDeviceName(getBluetoothDeviceName());
      }
    } catch (error) {
      console.error('Error connecting to Bluetooth device:', error);
      setBluetoothStatus('error');
    }
  };
  
  const handleDisconnectBluetooth = () => {
    disconnectBluetoothDevice();
    setBluetoothStatus('disconnected');
    setBluetoothDeviceName(null);
  };
  
  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>Teleprompter Admin</h1>
        <div className="nav-links">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/viewer" className="nav-link">Open Viewer</Link>
          <Link to="/remote" className="nav-link">Open Remote</Link>
        </div>
      </header>
      
      {/* Script Entry Modal */}
      <ScriptEntryModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveScript}
        initialTitle={selectedScript ? selectedScript.title : ''}
        initialBody={selectedScript ? (selectedScript.body || selectedScript.content || '') : ''}
      />
      
      <div className="admin-content">
        <div className="scripts-panel">
          <div className="scripts-header">
            <h2>Scripts</h2>
            {/* Removed Add New Script button as we're only reading scripts from directory */}
          </div>
          
          <div className="scripts-list">
            {scripts.map(script => (
              <div 
                key={script.id}
                className={`script-item ${selectedScriptId === script.id ? 'selected' : ''}`}
                onClick={() => {
                  console.log('Script list item clicked:', script.id);
                  if (selectedScriptId === script.id) {
                    console.log('Clearing selection - same script clicked');
                    clearScriptSelection();
                  } else {
                    console.log('Selecting new script from list');
                    handleScriptSelect(script);
                  }
                }}
              >
                <div className="script-item-content">
                  <div>
                    <div className="script-item-title">{script.title}</div>
                    <div className="script-item-date">
                      Last modified: {new Date(script.lastModified).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="script-item-status">
                    {selectedScriptId === script.id && (
                      <span className="status-badge active">Active</span>
                    )}
                    {isPlaying && selectedScriptId === script.id && (
                      <span className="status-badge playing">Playing</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {scripts.length === 0 && (
              <div className="no-scripts-message">
                No scripts found. Click "Add New Script" to create one.
              </div>
            )}
          </div>
        </div>
        
        <div className="script-viewer-panel">
          {selectedScript ? (
            <>
              <div className="script-header">
                <h2>{selectedScript.title}</h2>
                {/* Removed edit and delete buttons as we're only reading scripts from directory */}
              </div>
              
              <div className="teleprompter-controls">
                <div className="control-group">
                  <button onClick={togglePlay} className={`play-btn large-btn ${isPlaying ? 'active' : ''}`}>
                    {isPlaying ? 'PAUSE' : 'PLAY'}
                  </button>
                  
                  <button onClick={toggleDirection} className="direction-btn">
                    Direction: {direction === 'forward' ? '⬇️ Forward' : '⬆️ Backward'}
                  </button>
                </div>
                
                <div className="control-group">
                  <label>Speed: {speed.toFixed(2)}x</label>
                  <div className="speed-control">
                    <button 
                      onClick={() => changeSpeed(Math.max(0.25, speed - 0.25))}
                      className="speed-btn"
                    >
                      -
                    </button>
                    <input
                      type="range"
                      min="0.25"
                      max="2.5"
                      step="0.25"
                      value={speed}
                      onChange={(e) => changeSpeed(parseFloat(e.target.value))}
                    />
                    <button 
                      onClick={() => changeSpeed(Math.min(2.5, speed + 0.25))}
                      className="speed-btn"
                    >
                      +
                    </button>
                  </div>
                  <div className="speed-info" style={{ fontSize: '0.8em', opacity: 0.7, marginTop: '2px' }}>
                    0.25 = very slow, 1.0 = moderate, 2.5 = fast
                  </div>
                </div>
                
                <div className="control-group">
                  <label>Font Size: {fontSize}px</label>
                  <div className="font-size-control">
                    <button 
                      onClick={() => changeFontSize(Math.max(16, fontSize - 1))}
                      className="font-size-btn"
                    >
                      A-
                    </button>
                    <input
                      type="range"
                      min="16"
                      max="48"
                      step="1"
                      value={fontSize}
                      onChange={(e) => changeFontSize(parseInt(e.target.value, 10))}
                    />
                    <button 
                      onClick={() => changeFontSize(Math.min(48, fontSize + 1))}
                      className="font-size-btn"
                    >
                      A+
                    </button>
                  </div>
                  <div className="font-size-info" style={{ fontSize: '0.8em', opacity: 0.7, marginTop: '2px' }}>
                    16px = small, 32px = medium, 48px = large
                  </div>
                </div>
              </div>
              
              <div className="search-navigation">
                <h3>Search Script</h3>
                <div className="search-container">
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search in script..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && executeSearch()}
                  />
                  <span className="search-icon">🔍</span>
                  <button className="search-button" onClick={executeSearch}>
                    Search
                    {searchResults.length > 0 && (
                      <span className="search-count">{searchResults.length}</span>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Search Results Modal */}
              <SearchModal 
                isOpen={isSearchModalOpen}
                onClose={() => setIsSearchModalOpen(false)}
                searchResults={searchResults}
                onResultSelect={jumpToSearchResult}
                searchTerm={searchTerm}
              />
              
              <div className="preview-container">
                <div className="preview-header">
                  <h3>Preview: {selectedScript?.title}</h3>
                </div>
                {selectedScript ? (
                  <>
                    <ScriptPlayer 
                      ref={scriptPlayerRef}
                      key={`preview-${selectedScript.id}`} 
                      script={selectedScript}
                      isPlaying={isPlaying}
                      speed={speed}
                      direction={direction}
                      fontSize={fontSize}
                      fullScreen={false}
                    />
                  </>
                ) : (
                  <div className="no-script-preview">No script selected</div>
                )}
              </div>
            </>
          ) : (
            <div className="no-script-selected">
              <p>No script selected. Please select a script from the list or add a new one.</p>
            </div>
          )}
        </div>
        
        <div className="admin-sidebar">
          <div className="script-selector-panel">
            <h3>Script Selection</h3>
            <div className="script-dropdown-container">
              <select 
                className="admin-script-dropdown"
                value={selectedScriptId || ''}
                onChange={(e) => {
                  // Convert to number if it looks like a number
                  const val = e.target.value;
                  const numVal = !isNaN(Number(val)) && val !== 'none' ? Number(val) : val;
                  handleScriptSelect(numVal);
                }}
              >
                <option value="" disabled>Select a script...</option>
                <option value="none">No script (clear selection)</option>
                {scripts.map(script => (
                  <option key={script.id} value={script.id}>
                    {script.title}
                  </option>
                ))}
              </select>
            </div>
            
          </div>
          
          <div className="connection-panel">
            <h3>Connections</h3>
            
            <div className="bluetooth-control">
              <h4>Bluetooth Remote</h4>
              <div className={`status-indicator ${bluetoothStatus}`}>
                Status: {bluetoothStatus}
                {bluetoothDeviceName && ` (${bluetoothDeviceName})`}
              </div>
              
              {bluetoothStatus === 'disconnected' ? (
                <button onClick={handleConnectBluetooth} className="connect-btn">
                  Connect Bluetooth Remote
                </button>
              ) : (
                <button onClick={handleDisconnectBluetooth} className="disconnect-btn">
                  Disconnect
                </button>
              )}
            </div>
            
            <div className="qr-code-panel">
              <h4>QR Codes for Quick Access</h4>
              <div className="qr-codes">
                <div className="qr-code-item">
                  <h5>Viewer Mode</h5>
                  <QRCodeGenerator path="/viewer" />
                </div>
                
                <div className="qr-code-item">
                  <h5>Remote Control</h5>
                  <QRCodeGenerator path="/remote" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="help-panel">
            <h3>Help</h3>
            <ul className="help-list">
              <li>
                <strong>QR Codes:</strong> Scan these with mobile devices for quick access to Viewer and Remote modes.
              </li>
              <li>
                <strong>Bluetooth Remote:</strong> Connect a compatible Bluetooth presentation remote to control the teleprompter.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;