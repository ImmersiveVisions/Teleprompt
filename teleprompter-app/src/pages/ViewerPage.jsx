// src/pages/ViewerPage.jsx
import React, { useEffect, useState, useRef } from 'react';
import ScriptPlayer from '../components/ScriptPlayer';
import { registerMessageHandler } from '../services/websocket';
import fileSystemRepository from '../database/fileSystemRepository';
import '../styles.css';

const ViewerPage = () => {
  // State for storing pending search position data until the iframe is ready
  const [pendingSearchPosition, setPendingSearchPosition] = useState(null);
  
  // HTML scroll helper function to handle search position messages
  const handleHtmlScroll = (searchData) => {
    try {
      console.log('===== [VIEWER PAGE] handleHtmlScroll called with data:', JSON.stringify(searchData));
      
      // Get every possible script reference - we MUST have a script by this point
      const effectiveScript = latestScriptRef.current || currentScript || window.__currentScript || 
        (() => {
          console.log('===== [VIEWER PAGE] CRITICAL: Creating emergency script reference from search data');
          return { id: 'emergency-script', isHtml: true };
        })();
        
      console.log('===== [VIEWER PAGE] Using script reference in handleHtmlScroll:', effectiveScript.id);
      
      // Get direct reference to iframe - it ABSOLUTELY MUST exist at this point  
      const iframe = document.querySelector('#html-script-frame') || 
                     document.querySelector('.script-content-container iframe') || 
                     document.querySelector('iframe');
      
      if (!iframe) {
        console.error('===== [VIEWER PAGE] FATAL ERROR: No iframe found in document');
        console.error('===== [VIEWER PAGE] EMERGENCY: Document structure -', 
          document.body.innerHTML.substring(0, 100) + '...');
        throw new Error('No iframe found in document');
      }
      
      // Verify iframe has accessible content
      if (!iframe.contentDocument || !iframe.contentDocument.body) {
        console.error('===== [VIEWER PAGE] FATAL ERROR: iframe content not accessible');
        throw new Error('iframe content not accessible');
      }
      
      console.log('===== [VIEWER PAGE] Found iframe with ID:', iframe.id || 'no-id');
      
      // If we have text content in the search data, try to find that text in the document
      if (searchData.text) {
        console.log('===== [VIEWER PAGE] Searching for text in content:', 
          searchData.text.substring(0, 30) + (searchData.text.length > 30 ? '...' : ''));
        
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
          
          // Walk through text nodes
          while ((node = walker.nextNode())) {
            // Only check nodes that have content
            const nodeText = node.textContent.trim();
            if (nodeText && nodeText.toLowerCase().includes(searchText)) {
              console.log('===== [VIEWER PAGE] Found matching text node');
              foundNode = node;
              break;
            }
          }
          
          // If no node found with exact match, try with a shorter substring
          if (!foundNode && searchText.length > 10) {
            console.log('===== [VIEWER PAGE] No exact match found, trying with shorter text');
            const shorterSearch = searchText.substring(0, 10);
            
            // Create a new tree walker for the second pass
            const walker2 = document.createTreeWalker(
              iframe.contentDocument.body,
              NodeFilter.SHOW_TEXT,
              null,
              false
            );
            
            // Second pass with shorter text
            while ((node = walker2.nextNode())) {
              const nodeText = node.textContent.trim().toLowerCase();
              if (nodeText && nodeText.includes(shorterSearch)) {
                console.log('===== [VIEWER PAGE] Found match with shorter search');
                foundNode = node;
                break;
              }
            }
          }
          
          // If found, scroll directly to the node
          if (foundNode && foundNode.parentElement) {
            console.log('===== [VIEWER PAGE] Node found, scrolling to it');
            
            // Highlight for visibility
            const originalBg = foundNode.parentElement.style.backgroundColor;
            const originalColor = foundNode.parentElement.style.color;
            
            // Apply highlight
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
            
            return; // Successfully scrolled, exit function
          }
        } catch (err) {
          console.error('===== [VIEWER PAGE] Error in text search:', err);
          // Fall through to position-based scrolling
        }
      }
      
      // Fallback to position-based scrolling (when text search fails or no text provided)
      console.log('===== [VIEWER PAGE] Using position-based scrolling with position:', searchData.position);
      
      const position = searchData.position;
      const totalHeight = iframe.contentDocument.body.scrollHeight;
      const scrollPosition = Math.floor(position * totalHeight);
      
      // Try teleprompterScrollTo if available, otherwise use basic scrollTo
      if (iframe.contentWindow && typeof iframe.contentWindow.teleprompterScrollTo === 'function') {
        iframe.contentWindow.teleprompterScrollTo(position);
      } else {
        iframe.contentWindow.scrollTo({
          top: scrollPosition,
          behavior: 'smooth'
        });
      }
      
      console.log('===== [VIEWER PAGE] Scroll completed');
      
    } catch (error) {
      console.error('===== [VIEWER PAGE] Fatal error in handleHtmlScroll:', error);
      
      // Do a simple retry after a short delay
      setTimeout(() => {
        try {
          console.log('===== [VIEWER PAGE] Emergency retry of scroll operation');
          // Try to get any iframe
          const anyIframe = document.querySelector('iframe');
          if (anyIframe && anyIframe.contentWindow) {
            // Try position only in emergency mode
            const position = searchData.position || 0;
            const scrollHeight = anyIframe.contentDocument?.body?.scrollHeight || 1000;
            const scrollPosition = Math.floor(position * scrollHeight);
            
            anyIframe.contentWindow.scrollTo({
              top: scrollPosition,
              behavior: 'auto' // Use instant scroll in emergency mode
            });
          }
        } catch (retryError) {
          console.error('===== [VIEWER PAGE] Emergency retry also failed:', retryError);
        }
      }, 500);
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
  
  // Track the latest currentScript in a ref to solve the "forgetting" issue
  const latestScriptRef = useRef(null);
  
  // This effect logs when script reference changes for debugging
  useEffect(() => {
    if (latestScriptRef.current) {
      console.log('===== [VIEWER PAGE] Script reference updated:', {
        id: latestScriptRef.current.id,
        title: latestScriptRef.current.title,
        isHtml: !!latestScriptRef.current.isHtml
      });
    }
  }, [latestScriptRef.current]);
  
  // Apply pending search position immediately when we get it - without waiting for any loads
  useEffect(() => {
    // CRITICAL: The iframe is ALREADY LOADED by the time we get search positions
    // so we should apply them immediately and not wait
    
    // Check if we have a pending search position
    if (pendingSearchPosition) {
      console.log('===== [VIEWER PAGE] Applying pending search position immediately:', 
        JSON.stringify(pendingSearchPosition));
      
      // Get the current script reference - prioritize the stable reference
      const effectiveScript = latestScriptRef.current || currentScript;
      
      if (!effectiveScript) {
        console.log('===== [VIEWER PAGE] No script reference available yet, keeping pendingSearchPosition');
        return; // Keep the pending position until we have a script
      }
      
      console.log('===== [VIEWER PAGE] Using script:', effectiveScript.id);
      
      // For non-HTML content, use scriptPlayer ref
      if (!effectiveScript.isHtml && scriptPlayerRef.current) {
        console.log('===== [VIEWER PAGE] Applying position to text content');
        const position = pendingSearchPosition.position || 0;
        scriptPlayerRef.current.jumpToPosition(position);
        setPendingSearchPosition(null);
      } 
      // For HTML content, apply IMMEDIATELY - we know it's already loaded
      else if (effectiveScript.isHtml) {
        console.log('===== [VIEWER PAGE] HTML content - applying search position IMMEDIATELY without waiting');
        
        // Apply the position directly without checking iframe load state
        handleHtmlScroll(pendingSearchPosition);
        setPendingSearchPosition(null);
      }
    }
  }, [pendingSearchPosition]);
  
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
  
  // Update the ref whenever currentScript changes
  useEffect(() => {
    if (currentScript) {
      latestScriptRef.current = currentScript;
      console.log('===== [VIEWER PAGE] Updated latestScriptRef with current script:', latestScriptRef.current.id);
    }
  }, [currentScript]);
  
  const handleStateUpdate = async (message) => {
    // Handle different message types based on message.type
    console.log('===== [VIEWER PAGE] handleStateUpdate called with message type:', message.type);
    
    // Handle dedicated search position messages
    if (message.type === 'SEARCH_POSITION') {
      console.log('===== [VIEWER PAGE] Processing SEARCH_POSITION message:', message.data);
      
      // Find the current script reference by checking all possible sources:
      // 1. Our maintained reference (most reliable)
      // 2. Current React state
      // 3. Globally stored reference as last resort
      let effectiveScript = latestScriptRef.current || currentScript || (window.__currentScript || null);
      
      // If we absolutely cannot find a script reference, create a default HTML script based on the iframe src
      if (!effectiveScript) {
        // Emergency fallback - check for iframe src
        const iframe = document.querySelector('iframe');
        if (iframe && iframe.src) {
          const scriptId = iframe.src.split('/').pop();
          console.log('===== [VIEWER PAGE] EMERGENCY: Created script reference from iframe.src:', scriptId);
          effectiveScript = {
            id: scriptId,
            title: scriptId.replace(/\.(html|htm)$/i, ''),
            isHtml: true
          };
          // Store it in our reference for future use
          latestScriptRef.current = effectiveScript;
        }
      }
      
      // Debug the script reference we're using 
      console.log('===== [VIEWER PAGE] Using script reference:', effectiveScript ? {
        id: effectiveScript.id,
        title: effectiveScript.title,
        isHtml: !!effectiveScript.isHtml,
        source: effectiveScript === latestScriptRef.current ? 'ref' : 
                effectiveScript === currentScript ? 'state' : 
                effectiveScript === window.__currentScript ? 'global' : 'emergency'
      } : 'null');
      
      if (!message.data) {
        console.error('===== [VIEWER PAGE] Received SEARCH_POSITION message without data');
        return;
      }
      
      const searchData = message.data;
      
      // IMPORTANT: We received this SEARCH_POSITION message from a search operation,
      // which means the content MUST already be loaded in the iframe. The iframe
      // is loaded directly when the script is selected.
      
      // If we don't have a script reference after all our attempts, log and fail
      if (!effectiveScript) {
        console.error('===== [VIEWER PAGE] CRITICAL ERROR: Cannot find any script reference');
        console.error('===== [VIEWER PAGE] Cannot process SEARCH_POSITION: missing data or no current script');
        // We'll store the position but it likely won't be useful
        setPendingSearchPosition(searchData);
        return;
      }
      
      // Process the search position IMMEDIATELY without any iframe load checks
      console.log('===== [VIEWER PAGE] Script reference available, processing search position IMMEDIATELY:', 
        JSON.stringify(searchData));
      
      // Use correct handling based on content type
      if (effectiveScript.isHtml) {
        console.log('===== [VIEWER PAGE] HTML content - calling handleHtmlScroll directly');
        handleHtmlScroll(searchData);
      } else {
        // For text content, use scriptPlayer's jumpToPosition
        console.log('===== [VIEWER PAGE] Text content - using scriptPlayer.jumpToPosition');
        if (scriptPlayerRef.current) {
          const position = searchData.position || 0;
          scriptPlayerRef.current.jumpToPosition(position);
        } else {
          console.error('===== [VIEWER PAGE] scriptPlayerRef.current not available, storing for later');
          setPendingSearchPosition(searchData);
        }
      }
      
      return; // Skip the rest of the state update handling
    }
    
    if (message.type === 'STATE_UPDATE') {
      setConnected(true);
      console.log('===== [VIEWER PAGE] Received state update:', message.data);
      
      // Use the persistent ref for reliable script access
      const effectiveScript = currentScript || latestScriptRef.current;
      
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
        if (effectiveScript && effectiveScript.isHtml) {
          console.log('Trying to scroll HTML content for script:', effectiveScript.id);
          
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
          if (effectiveScript && (effectiveScript.body || effectiveScript.content)) {
            const content = effectiveScript.body || effectiveScript.content;
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
        // Clear script selection but MOST IMPORTANTLY don't clear the reference
        console.log('Viewer received instruction to clear script');
        console.log('===== [VIEWER PAGE] Preserving script reference for search position handling:',
          latestScriptRef.current ? latestScriptRef.current.id : 'none available');
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
              
              // CRITICAL: Update the reference FIRST, then the state
              latestScriptRef.current = htmlScript;
              console.log('===== [VIEWER PAGE] Updated latestScriptRef with new HTML script:', data.currentScript);
              
              // The React state update
              setCurrentScript(htmlScript);
            } else {
              // Get the script using the file system repository
              console.log('Loading script from file system repository:', data.currentScript);
              const script = await fileSystemRepository.getScriptById(data.currentScript);
              if (script) {
                console.log('Viewer loaded script successfully:', script.title);
                
                // CRITICAL: Update the reference FIRST, then the state
                latestScriptRef.current = script;
                console.log('===== [VIEWER PAGE] Updated latestScriptRef with repository script:', script.id);
                
                // The React state update
                setCurrentScript(script);
              } else {
                // Script was not found
                console.error(`Script with ID ${data.currentScript} not found`);
                setScriptLoaded(false);
                setCurrentScript(null);
                // Don't update the ref for null scripts
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
        console.log('===== [VIEWER PAGE] Preserving script reference for search position handling:',
          latestScriptRef.current ? latestScriptRef.current.id : 'none available');
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
