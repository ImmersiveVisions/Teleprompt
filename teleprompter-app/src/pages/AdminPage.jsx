// src/pages/AdminPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import fileSystemRepository from '../database/fileSystemRepository';
import { sendControlMessage, sendSearchPosition, registerMessageHandler } from '../services/websocket';
import { connectToBluetoothDevice, disconnectBluetoothDevice, getBluetoothDeviceName } from '../services/bluetoothService';
import ScriptViewer from '../components/ScriptViewer';
import ScriptPlayer from '../components/ScriptPlayer'; // Keep for backward compatibility
import ScriptEntryModal from '../components/ScriptEntryModal';
import ScriptUploadModal from '../components/ScriptUploadModal';
import SearchModal from '../components/SearchModal';
import '../styles.css';

const AdminPage = () => {
  const [scripts, setScripts] = useState([]);
  const [selectedScriptId, setSelectedScriptId] = useState(null);
  const [selectedScript, setSelectedScript] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
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
  const [storedNodeData, setStoredNodeData] = useState(null);
  // Removed currentChapter state
  // Removed currentPosition state since we're disabling position updates
  
  // State for tracking connected clients
  const [connectedClients, setConnectedClients] = useState({
    admin: 0,
    viewer: 0,
    remote: 0
  });
  
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
  const scriptPlayerRef = useRef(null);
  
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
        
        // Update stored node data for rollback functionality
        // This ensures the rollback button always has current position data
        if (positionData.text) {
          console.log('⭐ [POSITION DEBUG] Updating stored node data for rollback');
          
          // Enhance with rollback metadata
          const nodeDataForRollback = {
            ...positionData,
            fromRollback: true,
            timestamp: Date.now()
          };
          
          // Store for rollback
          setStoredNodeData(nodeDataForRollback);
        }
        
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
      console.log('⭐ [POSITION DEBUG] Setting position handler on scriptPlayerRef.current');
      // Support both new and legacy APIs
      if (typeof scriptPlayerRef.current.setPositionHandler === 'function') {
        scriptPlayerRef.current.setPositionHandler(handlePositionUpdate);
      } else {
        // Legacy API - assign method directly
        scriptPlayerRef.current.sendPosition = handlePositionUpdate;
      }
      
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
    
    // Set up a periodic position capture for rollback during playback
    let positionCaptureInterval = null;
    
    // Start or stop the position capture based on play state
    if (isPlaying && selectedScript) {
      console.log('⭐ [POSITION DEBUG] Starting periodic position capture for rollback during playback');
      
      // Capture the position every 3 seconds during playback
      positionCaptureInterval = setInterval(() => {
        try {
          // Only capture if still playing
          if (!isPlaying) return;
          
          // Get the iframe
          const iframe = document.querySelector('#html-script-frame');
          if (iframe && iframe.contentWindow && iframe.contentDocument) {
            // Try to find the current visible dialog
            const scrollTop = iframe.contentWindow.scrollY || iframe.contentDocument.documentElement.scrollTop || 0;
            const viewportHeight = iframe.contentWindow.innerHeight;
            const viewportCenter = scrollTop + (viewportHeight / 2);
            
            // Find dialog elements
            const dialogElements = iframe.contentDocument.querySelectorAll('[data-type="dialog"]');
            
            if (dialogElements.length > 0) {
              // Find the closest dialog to viewport center
              let closestElement = null;
              let closestDistance = Infinity;
              let closestIndex = -1;
              
              dialogElements.forEach((element, index) => {
                const rect = element.getBoundingClientRect();
                const elementTop = rect.top + scrollTop;
                const elementCenter = elementTop + (rect.height / 2);
                const distance = Math.abs(elementCenter - viewportCenter);
                
                if (distance < closestDistance && element.textContent.trim()) {
                  closestDistance = distance;
                  closestElement = element;
                  closestIndex = index;
                }
              });
              
              // If we found a dialog element close to viewport, store it
              if (closestElement && closestDistance < 500) {
                // For rollback, we want to go BACK one dialog if possible
                let rollbackElement = closestElement;
                let rollbackIndex = closestIndex;
                
                // If we're not at the first dialog, go back one
                if (closestIndex > 0) {
                  rollbackElement = dialogElements[closestIndex - 1];
                  rollbackIndex = closestIndex - 1;
                }
                
                // Create node data for the rollback target
                const nodeData = {
                  type: rollbackElement.getAttribute('data-type') || rollbackElement.tagName.toLowerCase(),
                  text: rollbackElement.textContent.trim().substring(0, 50),
                  parentTag: rollbackElement.parentElement ? rollbackElement.parentElement.tagName : null,
                  fromRollback: true,
                  index: rollbackIndex,
                  totalDialogs: dialogElements.length,
                  attributes: {
                    dataType: rollbackElement.getAttribute('data-type')
                  }
                };
                
                // Update the stored node data
                setStoredNodeData(nodeData);
              }
            }
          }
        } catch (e) {
          console.error('⭐ [POSITION DEBUG] Error in periodic position capture:', e);
        }
      }, 3000); // Every 3 seconds is frequent enough but not too CPU intensive
    }
    
    // Clean up when component unmounts
    return () => {
      // Clean up global callback
      delete window._sendPositionCallback;
      
      // Clean up interval
      if (positionCaptureInterval) {
        clearInterval(positionCaptureInterval);
      }
    };
  }, [selectedScript, isPlaying]);
  
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
      if (scriptPlayerRef.current) {
        // Use scrollToNode (new API) or jumpToPosition (old API) depending on what's available
        if (scriptPlayerRef.current.scrollToNode) {
          scriptPlayerRef.current.scrollToNode({ position, text: result.line });
        } else if (scriptPlayerRef.current.jumpToPosition) {
          scriptPlayerRef.current.jumpToPosition(position);
        }
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
    
    // Reset stored node for rollback
    setStoredNodeData(null);
    
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
        
        // Reset stored node for rollback
        setStoredNodeData(null);
        
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
      
      // Update connected clients state if it exists in the data
      if (data.connectedClients) {
        console.log('AdminPage: Updating connected clients:', data.connectedClients);
        setConnectedClients(data.connectedClients);
      }
      
      // No need to handle rollback button state anymore
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
            
            // Reset stored node for rollback
            setStoredNodeData(null);
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
            
            // Reset stored node for rollback
            setStoredNodeData(null);
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
    
    // Calculate new state before any operations
    const newState = !isPlaying;
    console.log('PLAY STATE CHANGE - setting isPlaying to:', newState, 'from:', isPlaying);
    
    // Always store the current node for rollback, regardless of play state
    // This ensures rollback button always works even during playback
    try {
      // Get the iframe or content container
      const iframe = document.querySelector('#html-script-frame');
      if (iframe && iframe.contentWindow && iframe.contentDocument) {
        console.log('Finding dialog node for rollback storage');
        
        // Get current scroll position for viewport calculations
        const scrollTop = iframe.contentWindow.scrollY || iframe.contentDocument.documentElement.scrollTop || 0;
        const viewportTop = scrollTop;
        const viewportHeight = iframe.contentWindow.innerHeight;
        const viewportCenter = viewportTop + (viewportHeight / 2);
        
        // Capture all dialog elements for context
        const dialogElements = iframe.contentDocument.querySelectorAll('[data-type="dialog"]');
        console.log(`Found ${dialogElements.length} dialog elements with data-type attribute`);
        
        // If we have dialog elements, find the best one to store
        if (dialogElements.length > 0) {
          // Find the currently visible dialog - the one closest to viewport center
          let currentDialogElement = null;
          let currentDialogDistance = Infinity;
          let currentDialogIndex = -1;
          
          // Find the current dialog closest to viewport center
          dialogElements.forEach((element, index) => {
            const rect = element.getBoundingClientRect();
            const elementTop = rect.top + scrollTop;
            const elementCenter = elementTop + (rect.height / 2);
            
            // Distance from element center to viewport center
            const distance = Math.abs(elementCenter - viewportCenter);
            
            if (distance < currentDialogDistance && element.textContent.trim()) {
              currentDialogDistance = distance;
              currentDialogElement = element;
              currentDialogIndex = index;
            }
          });
          
          // If we found a dialog element close to viewport, store it
          if (currentDialogElement && currentDialogDistance < 500) {
            console.log('[ROLLBACK] Found current dialog element:', {
              text: currentDialogElement.textContent.substring(0, 30).trim(),
              type: 'dialog element',
              distance: currentDialogDistance,
              index: currentDialogIndex
            });
            
            // For rollback, we want to go BACK one dialog if possible
            let rollbackElement = currentDialogElement;
            let rollbackIndex = currentDialogIndex;
            
            // If we're not at the first dialog, go back one
            if (currentDialogIndex > 0) {
              rollbackElement = dialogElements[currentDialogIndex - 1];
              rollbackIndex = currentDialogIndex - 1;
              console.log('[ROLLBACK] Using previous dialog for rollback');
            } else {
              // We're at the first dialog, so we'll stay here
              console.log('[ROLLBACK] Already at first dialog, using it for rollback');
            }
            
            // Create node data for the rollback target
            const nodeData = {
              type: rollbackElement.getAttribute('data-type') || rollbackElement.tagName.toLowerCase(),
              text: rollbackElement.textContent.trim().substring(0, 50),
              parentTag: rollbackElement.parentElement ? rollbackElement.parentElement.tagName : null,
              fromRollback: true,
              index: rollbackIndex, // Store the index of this dialog
              totalDialogs: dialogElements.length, // Store the total number of dialogs
              // Add additional attributes to help identify the element
              attributes: {
                class: rollbackElement.getAttribute('class'),
                id: rollbackElement.getAttribute('id'),
                style: rollbackElement.getAttribute('style'),
                dataType: rollbackElement.getAttribute('data-type')
              }
            };
            
            console.log('[ROLLBACK] Stored node data for rollback:', nodeData);
            setStoredNodeData(nodeData);
          } else {
            // If we couldn't find a dialog close to viewport, use the first dialog
            console.log('[ROLLBACK] No dialog close to viewport, using first dialog for rollback');
            const firstDialog = dialogElements[0];
            
            const nodeData = {
              type: firstDialog.getAttribute('data-type') || firstDialog.tagName.toLowerCase(),
              text: firstDialog.textContent.trim().substring(0, 50),
              parentTag: firstDialog.parentElement ? firstDialog.parentElement.tagName : null,
              fromRollback: true,
              index: 0, // First dialog
              totalDialogs: dialogElements.length,
              attributes: {
                class: firstDialog.getAttribute('class'),
                id: firstDialog.getAttribute('id'),
                style: firstDialog.getAttribute('style'),
                dataType: firstDialog.getAttribute('data-type')
              }
            };
            
            console.log('[ROLLBACK] Using first dialog for rollback:', nodeData);
            setStoredNodeData(nodeData);
          }
        } else {
          console.warn('[ROLLBACK] No dialog elements found, cannot create reliable rollback data');
          setStoredNodeData(null);
        }
        
        // If starting playback, explicitly store the current position
        if (newState === true) {
          try {
            console.log("[PLAYBACK] Attempting to store starting position for playback");
            // Find all dialog elements in the current view
            const allDialogs = iframe.contentDocument.querySelectorAll('[data-type="dialog"]');
            if (allDialogs.length > 0) {
              // Get the current scroll position
              const scrollY = iframe.contentWindow.scrollY || 0;
              
              // Find which dialog is closest to the current view
              let closestDialog = null;
              let closestDistance = Infinity;
              let dialogIndex = -1;
              
              allDialogs.forEach((dialog, idx) => {
                const rect = dialog.getBoundingClientRect();
                // Calculate absolute position
                const dialogTop = rect.top + scrollY;
                // Find distance to current scroll position
                const distance = Math.abs(dialogTop - scrollY - 100); // 100px buffer from top
                
                if (distance < closestDistance) {
                  closestDistance = distance;
                  closestDialog = dialog;
                  dialogIndex = idx;
                }
              });
              
              if (closestDialog) {
                console.log("[PLAYBACK] Explicitly storing position at playback start, dialog:", 
                  closestDialog.textContent.substring(0, 30));
                
                // Store the exact starting position data including the dialog index
                const startPositionData = {
                  type: 'dialog',
                  text: closestDialog.textContent.trim().substring(0, 50),
                  index: dialogIndex,
                  totalDialogs: allDialogs.length,
                  fromRollback: true,
                  attributes: {
                    dataType: 'dialog'
                  }
                };
                
                // Store it for rollback
                setStoredNodeData(startPositionData);
                console.log("[PLAYBACK] Stored starting position at index:", dialogIndex);
              }
            }
          } catch (posError) {
            console.error("[PLAYBACK] Error storing starting position:", posError);
          }
        }
      }
    } catch (e) {
      console.error('Error in rollback handling:', e);
      setStoredNodeData(null);
    }
    
    // Update local state next
    setIsPlaying(newState);
    
    // Inform the player that auto-scrolling is starting/stopping
    // This prevents user scroll events from being detected during auto-scroll
    if (scriptPlayerRef.current) {
      if (scriptPlayerRef.current.setScrollAnimating) {
        console.log('[ANIMATION] Notifying ScriptPlayer about animation state:', newState);
        scriptPlayerRef.current.setScrollAnimating(newState);
      }
    }
    
    // Send WebSocket message IMMEDIATELY after state update
    console.log('Sending control message:', newState ? 'PLAY' : 'PAUSE');
    sendControlMessage(newState ? 'PLAY' : 'PAUSE');
    
    // Log current state for debugging
    console.log('Play state after toggle:', {
      isPlaying: newState,
      scriptId: selectedScriptId,
      scriptTitle: selectedScript ? selectedScript.title : 'unknown'
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
  
  // Handle rollback to stored node
  const handleRollback = () => {
    // If we're playing, pause playback first
    if (isPlaying) {
      console.log('[ROLLBACK] Pausing playback before rollback');
      setIsPlaying(false);
      sendControlMessage('PAUSE');
    }
    
    // Add visual feedback first
    const previewHeader = document.querySelector('.preview-header h3');
    let originalText = '';
    if (previewHeader) {
      originalText = previewHeader.textContent;
      previewHeader.textContent = 'Rolling back to previous dialog...';
    }
    
    // Check if we have stored data to use for rollback
    if (storedNodeData) {
      console.log('[ROLLBACK] Using stored position data:', storedNodeData);
      
      // Create the rollback data with the rollback flag
      const rollbackData = {
        ...storedNodeData,
        fromRollback: true,
        timestamp: Date.now() // Add timestamp to ensure uniqueness 
      };
      
      // Apply to local preview first
      if (scriptPlayerRef.current) {
        console.log('[ROLLBACK] Applying to local preview via scriptPlayerRef');
        // Use scrollToNode (new API) or jumpToPosition (old API) depending on what's available
        if (scriptPlayerRef.current.scrollToNode) {
          scriptPlayerRef.current.scrollToNode(rollbackData);
        } else if (scriptPlayerRef.current.jumpToPosition) {
          scriptPlayerRef.current.jumpToPosition(rollbackData);
        }
      }
      
      // Send to all clients
      sendSearchPosition(rollbackData);
      
      // Reset visual feedback
      if (previewHeader) {
        setTimeout(() => {
          previewHeader.textContent = originalText;
        }, 800);
      }
      
      return;
    }
    
    // If no stored data is available, try to find the current dialog
    console.log('[ROLLBACK] No stored node data, finding first dialog');
    
    // Find the iframe
    const iframe = document.querySelector('#html-script-frame');
    if (iframe && iframe.contentDocument) {
      try {
        // Get all dialog elements
        const dialogElements = iframe.contentDocument.querySelectorAll('[data-type="dialog"]');
        console.log(`[ROLLBACK] Found ${dialogElements.length} dialog elements`);
        
        if (dialogElements.length > 0) {
          // Use the first dialog as a default
          const firstDialog = dialogElements[0];
          
          // Create node data
          const defaultData = {
            type: 'dialog',
            text: firstDialog.textContent.trim().substring(0, 50),
            index: 0,
            totalDialogs: dialogElements.length,
            fromRollback: true,
            attributes: {
              dataType: 'dialog'
            }
          };
          
          console.log('[ROLLBACK] Using first dialog:', defaultData);
          
          // Apply to local preview
          if (scriptPlayerRef.current) {
            // Use scrollToNode (new API) or jumpToPosition (old API) depending on what's available
            if (scriptPlayerRef.current.scrollToNode) {
              scriptPlayerRef.current.scrollToNode(defaultData);
            } else if (scriptPlayerRef.current.jumpToPosition) {
              scriptPlayerRef.current.jumpToPosition(defaultData);
            }
          } else {
            // Scroll directly if needed
            firstDialog.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
          }
          
          // Send to all clients
          sendSearchPosition(defaultData);
          
          // Store for future use
          setStoredNodeData(defaultData);
          
          // Reset visual feedback
          if (previewHeader) {
            setTimeout(() => {
              previewHeader.textContent = originalText;
            }, 800);
          }
          
          return;
        }
      } catch (error) {
        console.error('[ROLLBACK] Error finding dialogs:', error);
      }
    }
    
    // Absolute last resort - go to beginning
    console.log('[ROLLBACK] No dialogs found, going to beginning of script');
    
    const defaultData = {
      position: 0,
      fromRollback: true,
      text: "Beginning of script"
    };
    
    // Apply to local preview
    if (scriptPlayerRef.current) {
      // Use scrollToNode (new API) or jumpToPosition (old API) depending on what's available
      if (scriptPlayerRef.current.scrollToNode) {
        scriptPlayerRef.current.scrollToNode(defaultData);
      } else if (scriptPlayerRef.current.jumpToPosition) {
        scriptPlayerRef.current.jumpToPosition(defaultData);
      }
    }
    
    // Send to all clients
    sendSearchPosition(defaultData);
    
    // Reset visual feedback
    if (previewHeader) {
      setTimeout(() => {
        previewHeader.textContent = originalText;
      }, 800);
    }
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
      
      {/* Script Upload Modal */}
      <ScriptUploadModal 
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleFileUpload}
      />
      
      <div className="admin-content">
        <div className="scripts-panel">
          <div className="scripts-header">
            <h2>Scripts</h2>
            <div>
              <button onClick={handleAddScript} className="add-script-btn">New Script</button>
              <button onClick={handleUploadScript} className="add-script-btn" style={{marginLeft: "8px"}}>Add Script</button>
            </div>
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
                    className="rollback-btn large-btn active"
                    disabled={false}
                    style={{
                      backgroundColor: '#28a745',
                      color: 'white',
                      cursor: 'pointer',
                      opacity: 1,
                      transition: 'all 0.3s ease',
                      border: '2px solid #28a745',
                      boxShadow: '0 0 5px rgba(40, 167, 69, 0.5)',
                      fontWeight: 'bold'
                    }}
                    title="Click to return to a previous position"
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
          <div className="connected-clients-panel">
            <h3>Connected Clients</h3>
            <div className="connected-clients-list">
              <div className="client-item active">
                <div className="client-icon">💻</div>
                <div className="client-info">
                  <div className="client-name">Admin Panel</div>
                  <div className="client-status">Connected{connectedClients.admin > 0 ? ` (${connectedClients.admin})` : ''}</div>
                </div>
              </div>
              <div className={`client-item ${connectedClients.viewer > 0 ? 'active' : ''}`}>
                <div className="client-icon">📱</div>
                <div className="client-info">
                  <div className="client-name">Viewer Display</div>
                  <div className="client-status">
                    {connectedClients.viewer > 0 ? `Connected (${connectedClients.viewer})` : 'Waiting for connection...'}
                  </div>
                </div>
              </div>
              <div className={`client-item ${connectedClients.remote > 0 ? 'active' : ''}`}>
                <div className="client-icon">🎮</div>
                <div className="client-info">
                  <div className="client-name">Remote Control</div>
                  <div className="client-status">
                    {connectedClients.remote > 0 ? `Connected (${connectedClients.remote})` : 'Waiting for connection...'}
                  </div>
                </div>
              </div>
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