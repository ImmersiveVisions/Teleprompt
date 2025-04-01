// src/pages/AdminPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import fileSystemRepository from '../database/fileSystemRepository';
import { sendControlMessage, sendSearchPosition, registerMessageHandler } from '../services/websocket';
import { connectToBluetoothDevice, disconnectBluetoothDevice, getBluetoothDeviceName } from '../services/bluetoothService';
import ScriptViewer from '../components/ScriptViewer';
import ScriptPlayer from '../components/ScriptPlayer';
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
  
  // QR code URL state
  const [qrUrls, setQrUrls] = useState({
    viewer: null,
    remote: null
  });
  
  // Teleprompter control states
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [direction, setDirection] = useState('forward');
  const [fontSize, setFontSize] = useState(24);
  const [aspectRatio, setAspectRatio] = useState('16/9'); // Default to 16:9
  const [storedPosition, setStoredPosition] = useState(null);
  const [canRollback, setCanRollback] = useState(false);
  // Removed currentChapter state
  // Removed currentPosition state since we're disabling position updates
  
  // Load scripts and QR code URLs on component mount
  useEffect(() => {
    loadScripts();
    loadQrCodeUrls();
    
    // Register for state updates
    const unregisterHandler = registerMessageHandler(handleStateUpdate);
    
    return () => {
      unregisterHandler();
    };
  }, []);
  
  // Load QR code URLs from the server
  const loadQrCodeUrls = async () => {
    try {
      // Read pre-generated URL text files from the server
      const responses = await Promise.all([
        fetch('/qr/url-viewer.txt'),
        fetch('/qr/url-remote.txt')
      ]);
      
      const [viewerText, remoteText] = await Promise.all([
        responses[0].ok ? responses[0].text() : null,
        responses[1].ok ? responses[1].text() : null
      ]);
      
      setQrUrls({
        viewer: viewerText || 'http://[server-ip]/viewer',
        remote: remoteText || 'http://[server-ip]/remote'
      });
      
      console.log('Loaded QR URLs from text files:', { viewerText, remoteText });
    } catch (error) {
      console.error('Error loading QR code URLs:', error);
      
      // Fallback: Try the API status endpoint
      try {
        const response = await fetch('/api/status');
        const data = await response.json();
        
        if (data && data.primaryIp) {
          const ip = data.primaryIp;
          const port = window.location.port ? `:${window.location.port}` : '';
          
          setQrUrls({
            viewer: `http://${ip}${port}/viewer`,
            remote: `http://${ip}${port}/remote`
          });
          
          console.log('Used fallback method to get QR URLs:', {
            ip, port,
            viewer: `http://${ip}${port}/viewer`,
            remote: `http://${ip}${port}/remote`
          });
        }
      } catch (fallbackError) {
        console.error('Error in fallback QR URL loading:', fallbackError);
      }
    }
  };
  
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
  
  // Set up the position sending functionality
  useEffect(() => {
    console.log('⭐ [POSITION DEBUG] AdminPage: Setting up sendPosition function on scriptPlayerRef. Current ref:', scriptPlayerRef);
    
    // Create a position handler function and make it available globally
    const handlePositionUpdate = (positionData) => {
      console.log('⭐ [POSITION DEBUG] AdminPage: Sending manual scroll position to clients:', 
        typeof positionData === 'object' ? positionData : { position: positionData });
      
      // If we received enhanced position data (object), use sendSearchPosition for better accuracy
      if (typeof positionData === 'object' && positionData !== null) {
        console.log('⭐ [POSITION DEBUG] Using enhanced SEARCH_POSITION message with text content:', 
          positionData.text ? positionData.text.substring(0, 30) + '...' : 'none');
        sendSearchPosition(positionData);
      } else {
        // Fallback to simple position value if we somehow got a number instead of an object
        console.log('⭐ [POSITION DEBUG] Fallback: Using simple JUMP_TO_POSITION message');
        sendControlMessage('JUMP_TO_POSITION', positionData);
      }
      
      // Visual feedback to show we're syncing position
      const previewHeader = document.querySelector('.preview-header h3');
      if (previewHeader) {
        const originalText = previewHeader.textContent;
        previewHeader.textContent = 'Syncing position to viewers...';
        setTimeout(() => {
          previewHeader.textContent = originalText;
        }, 800);
      }
    };
    
    // Set global callback for direct access from any component
    window._sendPositionCallback = handlePositionUpdate;
    
    // Also set the callback on the ref if it's available
    if (scriptPlayerRef.current) {
      console.log('⭐ [POSITION DEBUG] Setting sendPosition on scriptPlayerRef.current');
      scriptPlayerRef.current.sendPosition = handlePositionUpdate;
      
      // Debug current state of the ref
      console.log('⭐ [POSITION DEBUG] AdminPage: Current ref state:', {
        hasRef: !!scriptPlayerRef,
        hasRefCurrent: !!scriptPlayerRef.current,
        hasSendPosition: !!(scriptPlayerRef.current && scriptPlayerRef.current.sendPosition),
        refProperties: Object.keys(scriptPlayerRef.current || {})
      });
    } else {
      console.warn('⭐ [POSITION DEBUG] scriptPlayerRef.current is not available, only using global callback');
    }
    
    // Clean up when component unmounts
    return () => {
      // Clean up global callback
      delete window._sendPositionCallback;
    };
  }, [selectedScript]);
  
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
    
    // Reset rollback state
    setStoredPosition(null);
    setCanRollback(false);
    
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
        
        // Reset rollback state when loading a new script
        setStoredPosition(null);
        setCanRollback(false);
        
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
      if (data.aspectRatio) setAspectRatio(data.aspectRatio);
      
      // If we are now in a paused state and have a stored position, enable rollback
      if (!data.isPlaying && storedPosition !== null) {
        console.log('State update: activating rollback button from paused state');
        // Small delay to ensure other state updates complete first
        setTimeout(() => {
          setCanRollback(true);
        }, 100);
      } else if (data.isPlaying) {
        setCanRollback(false);
      }
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
            
            // Reset rollback state when loading a new script
            setStoredPosition(null);
            setCanRollback(false);
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
            
            // Reset rollback state when loading a new script
            setStoredPosition(null);
            setCanRollback(false);
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
    
    // Store current position when starting playback
    if (newState === true) {
      // Get the iframe or content container
      const iframe = document.querySelector('#html-script-frame');
      if (iframe && iframe.contentWindow) {
        try {
          // Capture the current scroll position
          const scrollTop = iframe.contentWindow.scrollY || iframe.contentDocument.documentElement.scrollTop || 0;
          const scrollHeight = iframe.contentDocument.body.scrollHeight;
          const viewportHeight = iframe.contentWindow.innerHeight;
          
          // Calculate the scroll position as a percentage
          const percentage = Math.max(0, Math.min(1, scrollTop / (scrollHeight - viewportHeight || 1)));
          
          console.log('Storing scroll position for rollback:', {
            scrollTop,
            scrollHeight,
            viewportHeight,
            percentage
          });
          
          // Store the position
          setStoredPosition(percentage);
          
          // Rollback button will be active when paused
          setCanRollback(false);
        } catch (e) {
          console.error('Error storing scroll position:', e);
        }
      }
    } else {
      // When pausing, enable the rollback button if we have a stored position
      if (storedPosition !== null) {
        console.log('Activating rollback button');
        // Use a small timeout to ensure the state is updated *after* the pause action is complete
        setTimeout(() => {
          setCanRollback(true);
        }, 100);
      }
    }
    
    // Update local state first
    setIsPlaying(newState);
    
    // Inform the ScriptPlayer that auto-scrolling is starting/stopping
    // This prevents user scroll events from being detected during auto-scroll
    if (scriptPlayerRef.current && scriptPlayerRef.current.setScrollAnimating) {
      scriptPlayerRef.current.setScrollAnimating(newState);
    }
    
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
  
  const changeAspectRatio = (newRatio) => {
    setAspectRatio(newRatio);
    sendControlMessage('SET_ASPECT_RATIO', newRatio);
  };
  
  // Handle rollback to stored position
  const handleRollback = () => {
    if (!storedPosition || storedPosition === null) {
      console.error('Cannot rollback - no stored position');
      return;
    }
    
    // Verify that rollback is allowed
    if (!canRollback) {
      console.log('Rollback button clicked but rollback is not active');
      return;
    }
    
    console.log('Rolling back to stored position:', storedPosition);
    
    // Add visual feedback first
    const previewHeader = document.querySelector('.preview-header h3');
    let originalText = '';
    if (previewHeader) {
      originalText = previewHeader.textContent;
      previewHeader.textContent = 'Rolling back to previous position...';
    }
    
    // Use a small timeout to ensure the visual feedback is shown before the actual rollback
    setTimeout(() => {
      // If we have a direct reference to the player, use it
      if (scriptPlayerRef.current && scriptPlayerRef.current.jumpToPosition) {
        scriptPlayerRef.current.jumpToPosition(storedPosition);
      }
      
      // Send WebSocket message to update all clients
      sendControlMessage('JUMP_TO_POSITION', storedPosition);
      
      // Reset the visual feedback after a delay
      if (previewHeader) {
        setTimeout(() => {
          previewHeader.textContent = originalText;
        }, 800);
      }
      
      // Optional: Disable rollback button after use to prevent multiple clicks
      // Uncomment the following to disable the rollback button after use
      // setTimeout(() => {
      //   setCanRollback(false);
      // }, 1000);
    }, 200);
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
                <div className="aspect-ratio-selector">
                  <div className="radio-group">
                    <label className={aspectRatio === '16/9' ? 'selected' : ''}>
                      <input 
                        type="radio" 
                        name="aspectRatio" 
                        value="16/9" 
                        checked={aspectRatio === '16/9'} 
                        onChange={() => changeAspectRatio('16/9')}
                      />
                      <span>16:9</span>
                    </label>
                    <label className={aspectRatio === '4/3' ? 'selected' : ''}>
                      <input 
                        type="radio" 
                        name="aspectRatio" 
                        value="4/3" 
                        checked={aspectRatio === '4/3'} 
                        onChange={() => changeAspectRatio('4/3')}
                      />
                      <span>4:3</span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="teleprompter-controls">
                <div className="control-group">
                  <button onClick={togglePlay} className={`play-btn large-btn ${isPlaying ? 'active' : ''}`}>
                    {isPlaying ? 'PAUSE' : 'PLAY'}
                  </button>
                  
                  <button 
                    onClick={handleRollback} 
                    className={`rollback-btn large-btn ${canRollback ? 'active' : 'disabled'}`}
                    disabled={!canRollback}
                    style={{
                      backgroundColor: canRollback ? '#28a745' : '#6c757d',
                      color: 'white',
                      cursor: canRollback ? 'pointer' : 'not-allowed',
                      opacity: canRollback ? 1 : 0.5,
                      transition: 'all 0.3s ease',
                      border: canRollback ? '2px solid #28a745' : '2px solid transparent',
                      boxShadow: canRollback ? '0 0 5px rgba(40, 167, 69, 0.5)' : 'none',
                      fontWeight: 'bold'
                    }}
                    title={canRollback ? 
                      "Click to return to the position when playback started" : 
                      "First press play to set a position, then pause to activate rollback"
                    }
                  >
                    ROLLBACK
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
                      fontSize={Math.round(fontSize * 0.5)} // Reduce font size to 50% for preview
                      aspectRatio={aspectRatio}
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
              <h4>Network Access</h4>
              <p className="qr-code-instruction">Scan these QR codes with your mobile device:</p>
              <div className="qr-codes">
                <div className="qr-code-item">
                  <h5>Viewer Mode <span className="qr-code-label">(Teleprompter Display)</span></h5>
                  <div className="qr-code-container">
                    <div className="qr-code">
                      <img src="/qr/qr-viewer.png" alt="Viewer QR Code" width="160" height="160" />
                    </div>
                    <div className="qr-url">
                      {qrUrls.viewer || 'Loading URL...'}
                    </div>
                  </div>
                </div>
                
                <div className="qr-code-item">
                  <h5>Remote Control <span className="qr-code-label">(Control Panel)</span></h5>
                  <div className="qr-code-container">
                    <div className="qr-code">
                      <img src="/qr/qr-remote.png" alt="Remote QR Code" width="160" height="160" />
                    </div>
                    <div className="qr-url">
                      {qrUrls.remote || 'Loading URL...'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="help-panel">
            <h3>Help</h3>
            <ul className="help-list">
              <li>
                <strong>Network Access:</strong> Use the QR codes to connect other devices to your teleprompter over your local network. The Viewer displays the script, while the Remote controls playback.
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