// src/pages/ViewerPage.jsx
import React, { useEffect, useState, useRef } from 'react';
import ScriptPlayer from '../components/ScriptPlayer';
import { registerMessageHandler } from '../services/websocket';
import fileSystemRepository from '../database/fileSystemRepository';
import '../styles.css';

const ViewerPage = () => {
  // HTML scroll helper function to handle search position messages
  const handleHtmlScroll = (searchData) => {
    try {
      // Try multiple selector approaches to find the iframe
      let iframe = document.querySelector('.script-content-container iframe');
      
      if (!iframe) {
        iframe = document.querySelector('#html-script-frame');
        
        if (!iframe) {
          iframe = document.querySelector('.viewer-page iframe');
          
          if (!iframe) {
            iframe = document.querySelector('iframe');
          }
        }
      }
      
      if (!iframe || !iframe.contentWindow) {
        console.error('===== [VIEWER PAGE] Cannot find accessible iframe for HTML scrolling');
        return;
      }
      
      // Check if we can access the iframe content
      if (!iframe.contentDocument || !iframe.contentDocument.body) {
        console.error('===== [VIEWER PAGE] Cannot access iframe content document');
        return;
      }
      
      // If we have text context, try to find the matching node
      if (searchData.text) {
        // Create a tree walker to find text nodes
        try {
          // Normalize the search text
          const searchText = searchData.text.trim().toLowerCase();
          
          // Create a tree walker to search all text nodes
          const walker = document.createTreeWalker(
            iframe.contentDocument.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
          );
          
          let foundNode = null;
          let node;
          
          // Walk through all text nodes
          while ((node = walker.nextNode())) {
            // Only check nodes that have content
            const nodeText = node.textContent.trim();
            if (nodeText && nodeText.toLowerCase().includes(searchText)) {
              foundNode = node;
              break;
            }
          }
          
          // If found, scroll directly to the node
          if (foundNode && foundNode.parentElement) {
            // Highlight for visibility
            const originalBg = foundNode.parentElement.style.backgroundColor;
            const originalColor = foundNode.parentElement.style.color;
            
            foundNode.parentElement.style.backgroundColor = '#ff6600';
            foundNode.parentElement.style.color = '#ffffff';
            
            // Scroll to the element
            foundNode.parentElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
            
            // Reset styles after delay
            setTimeout(() => {
              foundNode.parentElement.style.backgroundColor = originalBg;
              foundNode.parentElement.style.color = originalColor;
            }, 2000);
            
            return; // Successfully scrolled
          }
        } catch (err) {
          console.error('===== [VIEWER PAGE] Error finding node by text:', err);
        }
      }
      
      // Fallback: Use normalized position if text search failed
      const position = searchData.position;
      const totalHeight = iframe.contentDocument.body.scrollHeight;
      const scrollPosition = Math.floor(position * totalHeight);
      
      // Fall back to position-based scrolling
      
      // Try with teleprompterScrollTo if available
      if (iframe.contentWindow && typeof iframe.contentWindow.teleprompterScrollTo === 'function') {
        iframe.contentWindow.teleprompterScrollTo(position);
      } else {
        // Direct scrollTo fallback
        iframe.contentWindow.scrollTo({
          top: scrollPosition,
          behavior: 'smooth'
        });
      }
    } catch (error) {
      console.error('===== [VIEWER PAGE] Error in handleHtmlScroll:', error);
    }
  };
  // Error handling setup kept for production troubleshooting
  useEffect(() => {
    const originalError = console.error;
    console.error = function() {
      // Call original first
      originalError.apply(console, arguments);
    };
    
    return () => {
      console.error = originalError;
    };
  }, []);
  
  const [connected, setConnected] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [currentScript, setCurrentScript] = useState(null);
  
  // Teleprompter control states
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [direction, setDirection] = useState('forward');
  const [fontSize, setFontSize] = useState(32);
  const [currentPosition, setCurrentPosition] = useState(0);
  
  // Reference to the script player component
  const scriptPlayerRef = useRef(null);
  const viewerContainerRef = useRef(null);
  
  // This effect injects CSS directly into iframes to control font size
  useEffect(() => {
    console.log('Setting up iframe style observer with font size:', fontSize);
    
    // Function to update iframe styling
    const updateIframeStyles = () => {
      // Find all iframes in the viewer page
      const iframes = document.querySelectorAll('.viewer-page iframe');
      console.log(`Found ${iframes.length} iframes in the viewer page`);
      
      // For each iframe, set up a load handler to inject CSS
      iframes.forEach(iframe => {
        console.log('Setting up iframe load handler');
        
        // Handle iframe load to inject styles or communicate with teleprompter-font.js
        iframe.onload = () => {
          try {
            console.log('iframe loaded, attempting to set font size to', fontSize);
            
            // First check if the iframe has the teleprompter-font.js script loaded
            if (iframe.contentWindow && typeof iframe.contentWindow.setTeleprompterFontSize === 'function') {
              console.log('teleprompter-font.js detected in iframe, using its API');
              iframe.contentWindow.setTeleprompterFontSize(fontSize);
              
              // Also listen for the custom fontSizeChanged event from the script
              if (iframe.contentDocument) {
                iframe.contentDocument.addEventListener('fontSizeChanged', (event) => {
                  console.log('Received fontSizeChanged event from iframe:', event.detail);
                });
              }
            } 
            // Otherwise fall back to direct DOM manipulation
            else if (iframe.contentDocument) {
              console.log('No teleprompter-font.js detected, using direct style injection');
              
              // Check if our style element exists
              let styleEl = iframe.contentDocument.getElementById('viewer-font-style');
              
              if (!styleEl) {
                // Create a style element
                styleEl = iframe.contentDocument.createElement('style');
                styleEl.id = 'viewer-font-style';
                iframe.contentDocument.head.appendChild(styleEl);
              }
              
              // Update the style content
              styleEl.textContent = `
                /* Base styles */
                body, html {
                  color: white !important;
                  background-color: black !important;
                  font-size: ${fontSize}px !important;
                  font-family: 'Arial', sans-serif !important;
                }
                
                /* Apply font size to all text elements */
                body *, p, div, span, h1, h2, h3, h4, h5, h6, li, td, th, label, a {
                  font-size: ${fontSize}px !important;
                }
                
                /* Ensure specific selectors have the font size */
                p[style*="padding-left"] {
                  font-size: ${fontSize}px !important;
                }

                /* Character names */
                p[style*="padding-left: 166pt"], 
                p[style*="padding-left: 165pt"], 
                p[style*="padding-left: 178pt"],
                p[style*="padding-left: 142pt"],
                p[style*="padding-left: 40pt"],
                p[style*="padding-left: 84pt"],
                p[style*="padding-left: 65pt"],
                p[style*="padding-left: 77pt"],
                p[style*="padding-left: 91pt"],
                p[style*="padding-left: 104pt"],
                p[style*="padding-left: 83pt"] {
                  font-size: ${fontSize}px !important;
                }
                
                /* Make links visible but not distracting */
                a {
                  color: #ADD8E6 !important;
                }
              `;
              console.log('Successfully injected styles into iframe');
              
              // Also attempt to handle HTML content specifically
              if (iframe.contentDocument.body) {
                // Set background and text color directly on the body
                iframe.contentDocument.body.style.backgroundColor = 'black';
                iframe.contentDocument.body.style.color = 'white';
                iframe.contentDocument.body.style.fontSize = `${fontSize}px`;
                
                // Remove any blockers to rendering
                iframe.contentDocument.documentElement.style.display = 'block';
                iframe.contentDocument.body.style.display = 'block';
                
                console.log('Applied direct styles to iframe body element');
              }
            } else {
              console.warn('Could not access iframe contentDocument - may be cross-origin restricted');
              
              // Last resort: try using postMessage API
              try {
                console.log('Attempting to use postMessage as fallback');
                iframe.contentWindow.postMessage({
                  type: 'SET_FONT_SIZE',
                  fontSize: fontSize
                }, '*');
              } catch (postMsgErr) {
                console.error('Error sending postMessage to iframe:', postMsgErr);
              }
            }
          } catch (e) {
            console.error('Error injecting styles into iframe:', e);
            
            // Try postMessage as a fallback after error
            try {
              iframe.contentWindow.postMessage({
                type: 'SET_FONT_SIZE',
                fontSize: fontSize
              }, '*');
              console.log('Sent postMessage after error (fallback)');
            } catch (postMsgErr) {
              console.error('Even postMessage fallback failed:', postMsgErr);
            }
          }
        };
        
        // If already loaded, try to inject now
        try {
          if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
            console.log('Iframe already loaded, running onload handler now');
            iframe.onload();
          } else {
            console.log('Iframe not yet loaded, waiting for load event');
          }
        } catch (e) {
          console.error('Error checking iframe load status:', e);
          
          // Try postMessage for loaded iframes that we can't check
          try {
            iframe.contentWindow.postMessage({
              type: 'SET_FONT_SIZE',
              fontSize: fontSize
            }, '*');
          } catch (postMsgErr) {
            console.error('Error with postMessage for loaded iframe:', postMsgErr);
          }
        }
      });
    };
    
    // Run the update function
    updateIframeStyles();
    
    // Set up a mutation observer to detect when new iframes are added
    const observer = new MutationObserver((mutations) => {
      console.log('DOM mutation detected, checking for new iframes');
      // When DOM changes, check for new iframes
      updateIframeStyles();
    });
    
    // Start observing the viewport container
    if (viewerContainerRef.current) {
      observer.observe(viewerContainerRef.current, { 
        childList: true,
        subtree: true 
      });
      console.log('Mutation observer started on viewer container');
    } else {
      console.warn('viewerContainerRef.current not available for observer');
    }
    
    return () => {
      // Clean up observer
      observer.disconnect();
      console.log('Mutation observer disconnected');
    };
  }, [fontSize]); // Re-run when fontSize changes
  
  // Status logging removed for production
  
  useEffect(() => {
    // Register for state updates
    const unregisterHandler = registerMessageHandler(handleStateUpdate);
    console.log('===============================================================');
    console.log('||  VIEWER PAGE REGISTERED MESSAGE HANDLER  ||');
    console.log('===============================================================');
    
    // Request fullscreen when component mounts
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('Error attempting to enable fullscreen:', err);
      });
    }
    
    // Listen for fullscreen change
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        console.log('Fullscreen mode exited');
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      unregisterHandler();
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      
      // Exit fullscreen when component unmounts
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(err => {
          console.warn('Error attempting to exit fullscreen:', err);
        });
      }
    };
  }, []);
  
  // Handle state updates from WebSocket
  const handleStateUpdate = async (message) => {
    // Handle different message types based on message.type
    
    // Handle dedicated search position messages
    if (message.type === 'SEARCH_POSITION') {
      // Handle search position message
      
      if (message.data && currentScript) {
        // Extract search position data
        const searchData = message.data;
        const position = searchData.position;
        
        // Use enhanced scrolling logic for HTML content
        if (currentScript.isHtml) {
          handleHtmlScroll(searchData);
        } else {
          // For text content, use the scriptPlayer's jumpToPosition method
          if (scriptPlayerRef.current) {
            scriptPlayerRef.current.jumpToPosition(position);
          }
        }
      }
      return; // Skip the rest of the state update handling
    }
    
    if (message.type === 'STATE_UPDATE') {
      setConnected(true);
      console.log('===== [VIEWER PAGE] Received state update:', message.data);
      
      // Extra explicit logging for position updates
      if (message.data && message.data.currentPosition) {
        console.log('');
        console.log('===============================================================');
        console.log('||  VIEWER POSITION UPDATE DETECTED: ' + message.data.currentPosition + '  ||');
        console.log('===============================================================');
        console.log('');
      }
      
      // Special logging for position updates
      if (message.data && message.data.currentPosition !== undefined) {
        console.log(`===== [VIEWER PAGE] Position update received: ${message.data.currentPosition}`);
      }
      
      const data = message.data || {};
      
      // Update control states
      if (data.isPlaying !== undefined) setIsPlaying(data.isPlaying);
      if (data.speed !== undefined) setSpeed(data.speed);
      if (data.direction !== undefined) setDirection(data.direction);
      if (data.fontSize !== undefined) setFontSize(data.fontSize);
      
      // Handle jumping to position (simple position only in STATE_UPDATE now)
      if (data.currentPosition !== undefined && scriptPlayerRef.current) {
        const position = data.currentPosition;
        
        // Handle position command for regular scrolling
                
        // If script is HTML, we'll calculate the scroll position
        if (currentScript && currentScript.isHtml) {
          console.log('Trying to scroll HTML content for script:', currentScript.id);
          
          // Try multiple selector approaches to find the iframe
          console.log('===== [VIEWER PAGE] Searching for iframe in document...');
          let iframe = document.querySelector('.script-content-container iframe');
          console.log('===== [VIEWER PAGE] .script-content-container iframe:', !!iframe);
          
          if (!iframe) {
            console.log('===== [VIEWER PAGE] First selector failed, trying alternate selectors');
            iframe = document.querySelector('#html-script-frame');
            console.log('===== [VIEWER PAGE] #html-script-frame:', !!iframe);
            
            if (!iframe) {
              iframe = document.querySelector('.viewer-page iframe');
              console.log('===== [VIEWER PAGE] .viewer-page iframe:', !!iframe);
              
              if (!iframe) {
                iframe = document.querySelector('iframe');
                console.log('===== [VIEWER PAGE] Any iframe:', !!iframe);
              }
            }
          }
          
          console.log('===== [VIEWER PAGE] Found iframe element:', !!iframe);
          if (iframe) {
            console.log('===== [VIEWER PAGE] Iframe ID:', iframe.id);
            console.log('===== [VIEWER PAGE] Iframe src:', iframe.src);
          }
          
          if (iframe && iframe.contentWindow) {
            console.log('Found iframe with content window, checking if content is accessible');
            
            try {
              // Check if we can access the iframe content
              if (iframe.contentDocument && iframe.contentDocument.body) {
                console.log('iframe content is accessible, proceeding with scroll');
                
                // Get the total height of the content
                const totalHeight = iframe.contentDocument.body.scrollHeight;
                // Calculate the absolute position
                const scrollPosition = Math.floor(position * totalHeight);
                
                console.log(`Scrolling iframe to ${scrollPosition}px of ${totalHeight}px total (height: ${iframe.contentDocument.body.scrollHeight}px)`);
                
                // Check if any scripts are loaded in the iframe
                if (iframe.contentDocument && iframe.contentDocument.scripts) {
                  console.log(`===== [VIEWER PAGE] Iframe has ${iframe.contentDocument.scripts.length} scripts:`)
                  Array.from(iframe.contentDocument.scripts).forEach((script, index) => {
                    console.log(`===== [VIEWER PAGE] Script ${index+1}: ${script.src || '[inline script]'}`);
                  });
                }
                
                // If we have enhanced data with text content, try to find the matching node
                if (data.scrollData && data.scrollData.text) {
                  console.log('');
                  console.log('===============================================================');
                  console.log('||  VIEWER SEARCHING FOR TEXT: ' + data.scrollData.text.substring(0, 30) + '...  ||');
                  console.log('===============================================================');
                  console.log('');
                  
                  // Create a tree walker to find text nodes
                  try {
                    console.log('===== [VIEWER PAGE] Starting text node search with TreeWalker');
                    
                    // Normalize the search text by trimming and converting to lowercase
                    const searchText = data.scrollData.text.trim().toLowerCase();
                    console.log('===== [VIEWER PAGE] Normalized search text:', searchText);
                    
                    // Log the iframe and body access
                    console.log('===== [VIEWER PAGE] iframe.contentDocument exists:', !!iframe.contentDocument);
                    console.log('===== [VIEWER PAGE] iframe.contentDocument.body exists:', !!iframe.contentDocument.body);
                    console.log('===== [VIEWER PAGE] iframe.contentDocument.body.childNodes count:', iframe.contentDocument.body.childNodes.length);
                    
                    // Create a tree walker to search all text nodes
                    const walker = document.createTreeWalker(
                      iframe.contentDocument.body,
                      NodeFilter.SHOW_TEXT,
                      null,
                      false
                    );
                    
                    // Additional log for the TreeWalker
                    console.log('===== [VIEWER PAGE] TreeWalker created successfully');
                    
                    let foundNode = null;
                    let node;
                    let nodeCount = 0;
                    let matchAttempts = 0;
                    
                    // Walk through all text nodes
                    while ((node = walker.nextNode())) {
                      nodeCount++;
                      
                      // Periodically log progress
                      if (nodeCount % 10 === 0) {
                        console.log(`===== [VIEWER PAGE] Searched ${nodeCount} text nodes so far...`);
                      }
                      
                      // Only check nodes that have content
                      const nodeText = node.textContent.trim();
                      if (nodeText.length > 0) {
                        matchAttempts++;
                        
                        // Try exact match first
                        if (nodeText.toLowerCase().includes(searchText)) {
                          console.log('===== [VIEWER PAGE] Found EXACT matching text node:', nodeText.substring(0, 50));
                          foundNode = node;
                          break;
                        }
                        
                        // If exact match fails, try a more lenient approach for partial matches
                        // (only if search text is longer than 15 chars to avoid false positives)
                        if (searchText.length > 15) {
                          // Take first 15 characters as a fingerprint
                          const searchFingerprint = searchText.substring(0, 15);
                          if (nodeText.toLowerCase().includes(searchFingerprint)) {
                            console.log('===== [VIEWER PAGE] Found PARTIAL matching text node (first 15 chars):', nodeText.substring(0, 50));
                            foundNode = node;
                            break;
                          }
                        }
                      }
                    }
                    
                    // Log search results
                    console.log(`===== [VIEWER PAGE] Text node search complete: examined ${nodeCount} nodes, made ${matchAttempts} match attempts`);
                    console.log(`===== [VIEWER PAGE] Found matching node: ${!!foundNode}`);
                    
                    // If no node found, try a more aggressive approach
                    if (!foundNode && searchText.length > 10 && nodeCount > 0) {
                      console.log('===== [VIEWER PAGE] Trying more aggressive search with shorter text...');
                      
                      // Create a new tree walker for the second pass
                      const walker2 = document.createTreeWalker(
                        iframe.contentDocument.body,
                        NodeFilter.SHOW_TEXT,
                        null,
                        false
                      );
                      
                      // Take just first 10 characters
                      const shorterSearch = searchText.substring(0, 10);
                      console.log('===== [VIEWER PAGE] Searching with shorter text:', shorterSearch);
                      
                      // Second pass with shorter text
                      while ((node = walker2.nextNode())) {
                        const nodeText = node.textContent.trim().toLowerCase();
                        if (nodeText && nodeText.includes(shorterSearch)) {
                          console.log('===== [VIEWER PAGE] Found matching text with shorter search:', nodeText.substring(0, 50));
                          foundNode = node;
                          break;
                        }
                      }
                    }
                    
                    // If found, scroll directly to the node
                    if (foundNode && foundNode.parentElement) {
                      console.log('');
                      console.log('===============================================================');
                      console.log('||  VIEWER FOUND MATCHING NODE - USING DIRECT DOM SCROLL  ||');
                      console.log('===============================================================');
                      console.log('');
                      
                      // Highlight the node for visibility
                      const originalBg = foundNode.parentElement.style.backgroundColor;
                      const originalColor = foundNode.parentElement.style.color;
                      
                      foundNode.parentElement.style.backgroundColor = '#ff6600';
                      foundNode.parentElement.style.color = '#ffffff';
                      
                      // Use direct DOM method to scroll to the element
                      foundNode.parentElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                      });
                      
                      // Reset styles after delay
                      setTimeout(() => {
                        foundNode.parentElement.style.backgroundColor = originalBg;
                        foundNode.parentElement.style.color = originalColor;
                      }, 2000);
                      
                      console.log('===== [VIEWER PAGE] Direct DOM scroll completed');
                      
                      // Skip other scroll methods - we've already scrolled directly
                      return;
                    } else {
                      console.log('');
                      console.log('===============================================================');
                      console.log('||  VIEWER COULD NOT FIND TEXT NODE - USING POSITION SCROLL  ||');
                      console.log('===============================================================');
                      console.log('');
                    }
                  } catch (err) {
                    console.error('===== [VIEWER PAGE] Error finding node by text:', err);
                  }
                }
                
                // Try different scroll methods in order of preference
                try {
                  // Method 1: Check if the teleprompter-font.js global function is available
                  console.log('===== [VIEWER PAGE] Checking for teleprompterScrollTo function...');
                  console.log('===== [VIEWER PAGE] iframe.contentWindow available:', !!iframe.contentWindow);
                  
                  if (iframe.contentWindow) {
                    // Check what functions are available on the content window
                    console.log('===== [VIEWER PAGE] Functions on contentWindow:');
                    try {
                      const functions = [];
                      for (const key in iframe.contentWindow) {
                        if (typeof iframe.contentWindow[key] === 'function') {
                          functions.push(key);
                        }
                      }
                      console.log('===== [VIEWER PAGE] Available functions:', functions.slice(0, 20).join(', ') + (functions.length > 20 ? '...' : ''));
                      console.log('===== [VIEWER PAGE] teleprompterScrollTo exists:', 
                        typeof iframe.contentWindow.teleprompterScrollTo === 'function');
                      console.log('===== [VIEWER PAGE] setTeleprompterFontSize exists:', 
                        typeof iframe.contentWindow.setTeleprompterFontSize === 'function');
                    } catch (e) {
                      console.log('===== [VIEWER PAGE] Error checking contentWindow functions:', e.message);
                    }
                  }
                  
                  // Check if teleprompter script is loaded, inject it if not
                  if (iframe.contentDocument && 
                      iframe.contentWindow && 
                      typeof iframe.contentWindow.teleprompterScrollTo !== 'function') {
                    
                    console.log('===== [VIEWER PAGE] teleprompterScrollTo not found, checking if script is loaded...');
                    
                    // Check if teleprompter-font.js script tag exists
                    const scriptExists = Array.from(iframe.contentDocument.scripts)
                      .some(script => script.src && script.src.includes('teleprompter-font.js'));
                    
                    if (!scriptExists) {
                      console.log('===== [VIEWER PAGE] teleprompter-font.js not found, injecting it...');
                      
                      try {
                        // Create script element
                        const script = iframe.contentDocument.createElement('script');
                        script.src = '/teleprompter-font.js';
                        script.onload = () => {
                          console.log('===== [VIEWER PAGE] teleprompter-font.js loaded successfully');
                          // After script loads, try to use the function
                          if (typeof iframe.contentWindow.teleprompterScrollTo === 'function') {
                            console.log('===== [VIEWER PAGE] Now calling teleprompterScrollTo after script injection');
                            iframe.contentWindow.teleprompterScrollTo(position);
                          }
                        };
                        
                        // Add to document
                        iframe.contentDocument.head.appendChild(script);
                        console.log('===== [VIEWER PAGE] Script injection attempted');
                      } catch (scriptError) {
                        console.error('===== [VIEWER PAGE] Error injecting teleprompter script:', scriptError);
                      }
                    } else {
                      console.log('===== [VIEWER PAGE] teleprompter-font.js script exists but function not available');
                    }
                  }
                  
                  // Try direct function call if available
                  if (iframe.contentWindow && typeof iframe.contentWindow.teleprompterScrollTo === 'function') {
                    console.log('===== [VIEWER PAGE] Using teleprompterScrollTo global function (best method)');
                    iframe.contentWindow.teleprompterScrollTo(position); // Pass normalized position
                    console.log('===== [VIEWER PAGE] teleprompterScrollTo called successfully');
                  } 
                  // Method 2: Direct scrollTo
                  else {
                    console.log('===== [VIEWER PAGE] Using basic scrollTo as fallback');
                    
                    // Add a visual indicator to show the target position
                    try {
                      // Create a visual indicator element
                      const indicator = iframe.contentDocument.createElement('div');
                      indicator.style.position = 'absolute';
                      indicator.style.left = '0';
                      indicator.style.width = '100%';
                      indicator.style.height = '5px';
                      indicator.style.top = scrollPosition + 'px';
                      indicator.style.backgroundColor = '#ff6600';
                      indicator.style.zIndex = '9999';
                      indicator.id = 'viewer-scroll-indicator';
                      
                      // Add message
                      const message = iframe.contentDocument.createElement('div');
                      message.textContent = 'Scroll Target';
                      message.style.position = 'absolute';
                      message.style.left = '10px';
                      message.style.top = (scrollPosition - 30) + 'px';
                      message.style.padding = '5px 10px';
                      message.style.backgroundColor = '#ff6600';
                      message.style.color = 'white';
                      message.style.fontWeight = 'bold';
                      message.style.zIndex = '9999';
                      message.id = 'viewer-scroll-message';
                      
                      // Remove any existing indicators
                      const oldIndicator = iframe.contentDocument.getElementById('viewer-scroll-indicator');
                      const oldMessage = iframe.contentDocument.getElementById('viewer-scroll-message');
                      if (oldIndicator) oldIndicator.remove();
                      if (oldMessage) oldMessage.remove();
                      
                      // Add to document
                      iframe.contentDocument.body.appendChild(indicator);
                      iframe.contentDocument.body.appendChild(message);
                      
                      console.log('===== [VIEWER PAGE] Added visual indicators at position', scrollPosition);
                      
                      // Remove after a delay
                      setTimeout(() => {
                        if (indicator.parentNode) indicator.remove();
                        if (message.parentNode) message.remove();
                      }, 3000);
                    } catch (indErr) {
                      console.error('===== [VIEWER PAGE] Error adding visual indicators:', indErr);
                    }
                    
                    // Perform the scroll
                    iframe.contentWindow.scrollTo({
                      top: scrollPosition,
                      behavior: 'smooth'
                    });
                    
                    // Method 3: Check if scroll worked and apply fallback if needed
                    setTimeout(() => {
                      try {
                        // Check if scroll worked (approximately)
                        const currentScroll = iframe.contentWindow.scrollY || iframe.contentDocument.documentElement.scrollTop;
                        console.log(`Current scroll position after scrollTo: ${currentScroll}px`);
                        
                        // If scroll didn't work, try again with basic method
                        if (Math.abs(currentScroll - scrollPosition) > 50) {
                          console.log('Scroll may not have worked, trying alternative method');
                          iframe.contentWindow.scroll(0, scrollPosition);
                        }
                      } catch (e) {
                        console.warn('Error checking scroll position:', e);
                      }
                    }, 500);
                  }
                } catch (scrollError) {
                  console.error('Error with primary scroll methods, using basic fallback:', scrollError);
                  // Method 4: Basic scroll as final fallback
                  try {
                    iframe.contentWindow.scroll(0, scrollPosition);
                  } catch (e) {
                    console.error('All scroll methods failed:', e);
                  }
                }
              } else {
                console.warn('iframe contentDocument or body not accessible');
              }
            } catch (error) {
              console.error('Error accessing iframe content for scrolling:', error);
              
              // Fallback: Try using postMessage to communicate with the iframe
              try {
                console.log('Trying postMessage fallback for scrolling');
                iframe.contentWindow.postMessage({
                  type: 'SCROLL_TO_POSITION',
                  position: position
                }, '*');
              } catch (postMsgError) {
                console.error('postMessage fallback also failed:', postMsgError);
              }
            }
          } else {
            console.warn('Cannot scroll iframe - not found or content window not accessible');
          }
        } else {
          // For text content, use the scriptPlayer's jumpToPosition method
          console.log('Using scriptPlayer to jump to position');
          
          // Find the absolute position in the script content if we have content
          if (currentScript && (currentScript.body || currentScript.content)) {
            const content = currentScript.body || currentScript.content;
            const absolutePosition = Math.floor(position * content.length);
            scriptPlayerRef.current.jumpToPosition(absolutePosition);
          } else {
            // If we don't have content, just pass the normalized position
            scriptPlayerRef.current.jumpToPosition(position);
          }
        }
      }
      
      // Check if a script selection state has changed
      console.log('Processing script selection state. Current script ID:', data.currentScript);
      
      if (data.currentScript === null) {
        // Clear script selection
        console.log('Viewer received instruction to clear script');
        setScriptLoaded(false);
        setCurrentScript(null);
      } else if (data.currentScript) {
        console.log('Script to load:', data.currentScript);
        
        // Check if this is the same script we already have loaded
        const isSameScript = currentScript && currentScript.id === data.currentScript;
        if (isSameScript) {
          console.log('Same script already loaded, skipping reload:', data.currentScript);
          // Make sure script is marked as loaded
          setScriptLoaded(true);
        } else {
          // New script to load
          console.log('New script to load, different from current:', data.currentScript);
          setScriptLoaded(true);
          
          // Load the current script data
          try {
            // Check if it's an HTML file that we can load directly
            if (typeof data.currentScript === 'string' && 
                (data.currentScript.toLowerCase().endsWith('.html') || 
                 data.currentScript.toLowerCase().endsWith('.htm'))) {
              console.log('HTML file detected, creating script object for direct loading:', data.currentScript);
              // Create a simple script object that points to the HTML file
              const htmlScript = {
                id: data.currentScript,
                title: data.currentScript.replace(/\.(html|htm)$/i, ''),
                isHtml: true,
                lastModified: new Date()
              };
              setCurrentScript(htmlScript);
            } else {
              // Get the script using the file system repository
              console.log('Loading script from file system repository:', data.currentScript);
              const script = await fileSystemRepository.getScriptById(data.currentScript);
              if (script) {
                console.log('Viewer loaded script successfully:', script.title);
                setCurrentScript(script);
              } else {
                // Script was not found
                console.error(`Script with ID ${data.currentScript} not found`);
                setScriptLoaded(false);
                setCurrentScript(null);
              }
            }
          } catch (error) {
            console.error('Error loading script:', error);
            setScriptLoaded(false);
            setCurrentScript(null);
          }
        }
      } else {
        console.log('No script in state update (undefined)');
        setScriptLoaded(false);
        setCurrentScript(null);
      }
    }
  };
  
  return (
    <div className="viewer-page" ref={viewerContainerRef}>
      {!connected && (
        <div className="connection-overlay">
          <div className="connection-message">
            Connecting to teleprompter...
          </div>
        </div>
      )}
      
      {connected && !scriptLoaded && (
        <div className="no-script-overlay">
          <div className="no-script-message">
            No script loaded. Please select a script from the Admin panel.
          </div>
        </div>
      )}
      
      <ScriptPlayer 
        ref={scriptPlayerRef}
        script={currentScript}
        isPlaying={isPlaying}
        speed={speed}
        direction={direction}
        fontSize={fontSize}
        fullScreen={true}
      />
    </div>
  );
};

export default ViewerPage;
