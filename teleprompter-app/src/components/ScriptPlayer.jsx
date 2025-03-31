// ScriptPlayer.jsx
// An ultra-simple script player that just focuses on scrolling

import React, { useEffect, useRef } from 'react';
import { parseScript } from '../services/scriptParser';
import $ from 'jquery'; // Import jQuery for smooth scrolling

const ScriptPlayer = ({ 
  script, 
  isPlaying,
  speed = 1,
  direction = 'forward',
  fontSize = 24,
  fullScreen = false
}, ref) => {
  // Log receipt of script prop for debugging
  console.log('ScriptPlayer received script:', 
    script ? 
      {
        id: script.id,
        title: script.title,
        idType: typeof script.id,
        hasBody: !!script.body,
        hasContent: !!script.content,
        bodyLength: script.body ? script.body.length : 0,
        contentLength: script.content ? script.content.length : 0
      } : 'null'
  );
  
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  
  // When we receive a script, ensure the parent knows about it
  useEffect(() => {
    if (script) {
      console.log('ScriptPlayer received HTML script and is loading it in iframe:', script.id);
      
      // Ensure script is available in global scope for error recovery
      if (typeof window !== 'undefined') {
        window.__currentScript = script;
        console.log('Stored script reference in window.__currentScript for error recovery');
      }
    }
  }, [script]);
  

  // Apply font size to iframe content when it changes
  useEffect(() => {
    console.log(`FONT SIZE CHANGED to: ${fontSize}px`);
    
    // Only proceed if we have a script
    if (!script) {
      console.log('No script available, cannot apply font size');
      return;
    }
    
    // Try to find the iframe element directly
    const container = containerRef.current;
    if (!container) {
      console.log('No container ref available, cannot apply font size');
      return;
    }
    
    const iframe = container.querySelector('iframe');
    if (!iframe) {
      console.log('No iframe found in container, cannot apply font size');
      return;
    }
    
    console.log('Found iframe, attempting to apply font size:', fontSize);
    
    // Define our approaches to updating the font size
    const updateFontSizeMethods = [
      // Method 1: Use the exposed global function if available
      function useGlobalFunction() {
        try {
          if (iframe.contentWindow && typeof iframe.contentWindow.setTeleprompterFontSize === 'function') {
            console.log('Using exposed global function to set font size');
            iframe.contentWindow.setTeleprompterFontSize(fontSize);
            return true;
          }
        } catch (e) {
          console.warn('Error using global function:', e);
        }
        return false;
      },
      
      // Method 2: Direct DOM manipulation if same-origin
      function useDomManipulation() {
        try {
          if (iframe.contentDocument && iframe.contentDocument.body) {
            console.log('Using direct DOM manipulation to set font size');
            
            // Set directly on body
            iframe.contentDocument.body.style.fontSize = `${fontSize}px`;
            
            // Update or create style element
            const styleId = 'teleprompter-font-size-style';
            let styleEl = iframe.contentDocument.getElementById(styleId);
            
            if (!styleEl) {
              styleEl = iframe.contentDocument.createElement('style');
              styleEl.id = styleId;
              iframe.contentDocument.head.appendChild(styleEl);
            }
            
            // More specific CSS selectors for better specificity
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
            `;
            
            console.log('Successfully set font size via DOM manipulation:', fontSize);
            return true;
          }
        } catch (e) {
          console.warn('Error with DOM manipulation:', e);
        }
        return false;
      },
      
      // Method 3: postMessage API (works cross-origin)
      function usePostMessage() {
        try {
          console.log('Using postMessage to set font size');
          iframe.contentWindow.postMessage({
            type: 'SET_FONT_SIZE',
            fontSize: fontSize
          }, '*');
          return true;
        } catch (e) {
          console.error('Error with postMessage:', e);
        }
        return false;
      },
      
      // Method 4: URL parameter (requires reload)
      function useUrlParameter() {
        try {
          console.log('Using URL parameter to set font size (last resort)');
          // Get current src
          const currentSrc = iframe.src;
          // Parse current URL
          const url = new URL(currentSrc, window.location.origin);
          // Set/update font size parameter
          url.searchParams.set('fontSize', fontSize);
          // Only update if the URL actually changed
          if (url.toString() !== currentSrc) {
            iframe.src = url.toString();
            return true;
          }
        } catch (e) {
          console.error('Error with URL parameter:', e);
        }
        return false;
      }
    ];
    
    // Try each method in order until one succeeds
    let methodSucceeded = false;
    for (const method of updateFontSizeMethods) {
      methodSucceeded = method();
      if (methodSucceeded) {
        console.log('Font size update method succeeded');
        break;
      }
    }
    
    if (!methodSucceeded) {
      console.error('All font size update methods failed');
    }
  }, [fontSize, script]);

  // jQuery-based smooth scrolling approach
  useEffect(() => {
    // Don't do anything if no script or container
    if (!script || !containerRef.current) {
      console.log('ScriptPlayer: No script or container ref available yet');
      return;
    }
    
    console.log('ScriptPlayer: Setting up jQuery animation for script:', script.title);
    
    const container = containerRef.current;
    
    // Clean up any existing animation
    const cleanupAnimation = () => {
      // Stop any ongoing jQuery animation first
      try {
        // Use jQuery to stop the animation
        $(container).stop(true, false);
        
        // For iframe content
        const iframe = container.querySelector('iframe');
        if (iframe && iframe.contentWindow && iframe.contentDocument) {
          try {
            // Try to stop animation in iframe using jQuery
            // This might not work due to cross-origin restrictions
            const iframeJQuery = iframe.contentWindow.$;
            if (iframeJQuery) {
              iframeJQuery('html, body').stop(true, false);
            }
          } catch (e) {
            console.warn('Could not stop iframe jQuery animation');
          }
        }
      } catch (e) {
        console.error('Error stopping animation:', e);
      }
      
      // Clear any tracked timeouts or animation frames
      if (animationRef.current) {
        if (typeof animationRef.current === 'number') {
          cancelAnimationFrame(animationRef.current);
        } else if (animationRef.current.type === 'timeout') {
          clearTimeout(animationRef.current.id);
        }
        animationRef.current = null;
      }
    };
    
    // First, clean up existing animations
    cleanupAnimation();
    
    // If not playing, do nothing more
    if (!isPlaying) {
      console.log('Animation not started - isPlaying is false');
      return;
    }
    
    // DETERMINE SCROLL TARGET AND CONTAINER
    
    // For the main container
    let scrollTarget, scrollContainer;
    let scrollDuration;
    let isIframeContent = false;
    
    if (script.id && script.id.toLowerCase().endsWith('.html')) {
      // HTML content in iframe
      const iframe = container.querySelector('iframe');
      if (iframe && iframe.contentWindow) {
        try {
          // Check if we can access iframe content
          if (iframe.contentDocument && iframe.contentDocument.body) {
            isIframeContent = true;
            
            // Add an end marker to the iframe if not exists
            const addEndMarker = () => {
              try {
                // Try to add an end marker element to the iframe
                if (!iframe.contentDocument.getElementById('endoftext')) {
                  const endMarker = iframe.contentDocument.createElement('div');
                  endMarker.id = 'endoftext';
                  endMarker.style.height = '1px';
                  endMarker.style.width = '100%';
                  
                  // Add to the end of the body
                  iframe.contentDocument.body.appendChild(endMarker);
                  console.log('Added end marker to iframe');
                }
              } catch (e) {
                console.error('Error adding end marker to iframe:', e);
              }
            };
            
            // Calculate duration based on content length
            const contentLength = iframe.contentDocument.body.scrollHeight;
            
            // Base reading speed in pixels per second
            // We assume 200-250 words per minute which is about 20-25 characters per second
            // If we assume 1 pixel roughly equals 0.2 characters
            const baseReadingPixelsPerSecond = 100; // 20 chars per second / 0.2 chars per pixel
            
            // User speed modifier
            const adjustedPixelsPerSecond = baseReadingPixelsPerSecond * speed;
            
            // Calculate duration in milliseconds
            scrollDuration = Math.round((contentLength / adjustedPixelsPerSecond) * 1000);
            
            // Set minimum duration
            const minDuration = 1000; // 1 second minimum
            scrollDuration = Math.max(minDuration, scrollDuration);
            
            console.log('Iframe scroll parameters:', {
              contentLength,
              adjustedPixelsPerSecond,
              scrollDuration,
              speedFactor: speed
            });
            
            // Try to use jQuery inside the iframe
            try {
              addEndMarker();
              
              // Check if jQuery is available in the iframe
              if (iframe.contentWindow.$ || iframe.contentWindow.jQuery) {
                console.log('Using iframe jQuery for animation');
                // Get jQuery from iframe
                const $iframe = iframe.contentWindow.$ || iframe.contentWindow.jQuery;
                
                // If scrolling backward
                if (direction === 'backward') {
                  // Scroll to top
                  $iframe('html, body').animate({
                    scrollTop: 0
                  }, scrollDuration, 'linear');
                } else {
                  // Scroll to end marker
                  $iframe('html, body').animate({
                    scrollTop: $iframe('#endoftext').offset().top
                  }, scrollDuration, 'linear');
                }
                
                // Nothing more to do here
                return;
              } else {
                // Fallback to our own animation for cross-origin iframes
                console.log('jQuery not available in iframe, using custom animation');
                
                // We'll use our own animation approach for iframes
                // Start with current position
                const startTime = performance.now();
                const startPos = iframe.contentWindow.scrollY || 0;
                const targetPos = direction === 'forward' ? 
                  iframe.contentDocument.body.scrollHeight - iframe.contentWindow.innerHeight : 0;
                
                console.log('Custom iframe animation:', {
                  startPos,
                  targetPos,
                  scrollDuration
                });
                
                // Create animation function
                const animateIframe = (timestamp) => {
                  if (!isPlaying) {
                    console.log('Animation stopped - no longer playing');
                    return;
                  }
                  
                  const elapsed = timestamp - startTime;
                  const progress = Math.min(1, elapsed / scrollDuration);
                  
                  // Linear position calculation
                  const currentPos = startPos + (targetPos - startPos) * progress;
                  
                  // Set scroll position
                  iframe.contentWindow.scrollTo(0, currentPos);
                  
                  // Debug logging periodically
                  if (Math.round(progress * 100) % 10 === 0) {
                    console.log(`Iframe scroll progress: ${Math.round(progress * 100)}%`);
                  }
                  
                  // Continue if not done
                  if (progress < 1 && isPlaying) {
                    animationRef.current = requestAnimationFrame(animateIframe);
                  } else {
                    console.log('Custom iframe animation complete');
                    animationRef.current = null;
                  }
                };
                
                // Start animation
                animationRef.current = requestAnimationFrame(animateIframe);
                
                // Return cleanup function
                return;
              }
            } catch (e) {
              console.error('Error setting up iframe jQuery animation:', e);
              // Continue with outer container animation
            }
          }
        } catch (e) {
          console.warn('Cannot access iframe content directly:', e);
        }
      }
    }
    
    // If we get here, we need to animate the main container
    if (!isIframeContent) {
      console.log('Using jQuery to animate main container');
      
      // Calculate duration based on content length
      const contentLength = container.scrollHeight;
      
      // Base reading speed
      const baseReadingPixelsPerSecond = 100;
      const adjustedPixelsPerSecond = baseReadingPixelsPerSecond * speed;
      
      // Calculate duration
      scrollDuration = Math.round((contentLength / adjustedPixelsPerSecond) * 1000);
      
      // Set minimum duration
      const minDuration = 1000;
      scrollDuration = Math.max(minDuration, scrollDuration);
      
      console.log('Container scroll parameters:', {
        contentLength,
        adjustedPixelsPerSecond,
        scrollDuration,
        speedFactor: speed
      });
      
      // Animate the container with jQuery
      if (direction === 'backward') {
        $(container).animate({
          scrollTop: 0
        }, scrollDuration, 'linear');
      } else {
        // Add an end marker if needed
        if (!container.querySelector('#endoftext')) {
          const endMarker = document.createElement('div');
          endMarker.id = 'endoftext';
          endMarker.style.height = '1px';
          endMarker.style.width = '100%';
          container.appendChild(endMarker);
        }
        
        // Scroll to end of content
        $(container).animate({
          scrollTop: container.scrollHeight
        }, scrollDuration, 'linear');
      }
    }
    
    // Clean up on unmount or dependency change
    return cleanupAnimation;
  }, [isPlaying, speed, direction, script, fontSize]);
  
  // jQuery-based jump to position function
  const jumpToPosition = (position) => {
    console.log('===== [SCRIPT PLAYER] jumpToPosition called with position:', position);
    
    if (!containerRef.current || !script) {
      console.error('===== [SCRIPT PLAYER] Cannot jump - no container or script available');
      return;
    }
    
    const container = containerRef.current;
    
    // Stop any ongoing animations
    try {
      console.log('===== [SCRIPT PLAYER] Stopping ongoing animations');
      // Use jQuery to stop all animations
      $(container).stop(true, true);
      
      // For iframe content
      const iframe = container.querySelector('iframe');
      if (iframe && iframe.contentWindow) {
        try {
          if (iframe.contentWindow.$ || iframe.contentWindow.jQuery) {
            const $iframe = iframe.contentWindow.$ || iframe.contentWindow.jQuery;
            $iframe('html, body').stop(true, true);
          }
        } catch (e) {
          console.warn('===== [SCRIPT PLAYER] Could not stop iframe animations:', e);
        }
      }
    } catch (e) {
      console.error('===== [SCRIPT PLAYER] Error stopping animations:', e);
    }
    
    // Check if position is an object (from SEARCH_POSITION message)
    // or a simple number (from JUMP_TO_POSITION control)
    let percentage = 0;
    let isSearchPositionObject = false;
    
    if (typeof position === 'object' && position !== null) {
      console.log('===== [SCRIPT PLAYER] Position is an object:', position);
      // Enhanced position data - extract the normalized position value
      if (position.position !== undefined) {
        percentage = position.position;
        isSearchPositionObject = true;
        console.log('===== [SCRIPT PLAYER] Using object.position value:', percentage);
      } else {
        console.error('===== [SCRIPT PLAYER] Invalid position object - missing position property');
        return;
      }
    } else {
      // Simple number for position - calculate percentage
      console.log('===== [SCRIPT PLAYER] Position is a simple number');
      const scriptContent = script.body || script.content || '';
      const maxLength = Math.max(1, scriptContent.length);
      percentage = Math.max(0, Math.min(position, maxLength)) / maxLength;
    }
    
    // Ensure position is within bounds
    percentage = Math.max(0, Math.min(1, percentage));
    
    console.log(`===== [SCRIPT PLAYER] Jumping to position: ${position}, calculated percentage: ${percentage.toFixed(4)}`);
    
    // Apply the scroll
    if (script.id && script.id.toLowerCase().endsWith('.html')) {
      console.log('===== [SCRIPT PLAYER] Handling HTML content in iframe');
      // For HTML content, find the iframe and scroll it
      const iframe = container.querySelector('iframe');
      
      if (!iframe) {
        console.error('===== [SCRIPT PLAYER] Cannot find iframe in container');
        return;
      }
      
      if (!iframe.contentWindow) {
        console.error('===== [SCRIPT PLAYER] iframe.contentWindow not available');
        return;
      }
      
      console.log('===== [SCRIPT PLAYER] Found iframe, preparing to scroll');
      
      // If we have a search position object with text, try to find and highlight that text
      if (isSearchPositionObject && position.text) {
        console.log('===== [SCRIPT PLAYER] Enhanced scroll with text search:', position.text.substring(0, 30) + '...');
        
        // Create a function that will search for text in the iframe
        const findAndScrollToText = () => {
          try {
            if (!iframe.contentDocument || !iframe.contentDocument.body) {
              console.error('===== [SCRIPT PLAYER] Cannot access iframe content document or body');
              return false;
            }
            
            // Normalize the search text
            const searchText = position.text.trim().toLowerCase();
            console.log('===== [SCRIPT PLAYER] Normalized search text:', searchText);
            
            // Create a tree walker to search all text nodes
            const walker = document.createTreeWalker(
              iframe.contentDocument.body,
              NodeFilter.SHOW_TEXT,
              null,
              false
            );
            
            let foundNode = null;
            let node;
            let nodeCount = 0;
            
            // Walk through all text nodes
            while ((node = walker.nextNode())) {
              nodeCount++;
              
              // Only check nodes that have content
              const nodeText = node.textContent.trim();
              if (nodeText && nodeText.toLowerCase().includes(searchText)) {
                console.log('===== [SCRIPT PLAYER] Found matching text node:', nodeText.substring(0, 30) + '...');
                foundNode = node;
                break;
              }
              
              // Log progress periodically
              if (nodeCount % 100 === 0) {
                console.log(`===== [SCRIPT PLAYER] Searched ${nodeCount} nodes so far...`);
              }
            }
            
            // If no node found with exact match, try with a shorter substring
            if (!foundNode && searchText.length > 10) {
              console.log('===== [SCRIPT PLAYER] No exact match found, trying with shorter text...');
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
                  console.log('===== [SCRIPT PLAYER] Found matching text with shorter search:', nodeText.substring(0, 30) + '...');
                  foundNode = node;
                  break;
                }
              }
            }
            
            // If found, scroll directly to the node
            if (foundNode && foundNode.parentElement) {
              console.log('===== [SCRIPT PLAYER] Successfully found node, scrolling to it...');
              
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
              
              console.log('===== [SCRIPT PLAYER] scrollIntoView called for the found node');
              
              // Reset styles after delay
              setTimeout(() => {
                foundNode.parentElement.style.backgroundColor = originalBg;
                foundNode.parentElement.style.color = originalColor;
                console.log('===== [SCRIPT PLAYER] Node highlighting removed');
              }, 2000);
              
              return true; // Successfully found and scrolled
            }
            
            return false; // Text not found
          } catch (err) {
            console.error('===== [SCRIPT PLAYER] Error finding node by text:', err);
            return false;
          }
        };
        
        // Try to find and scroll to text, fall back to position-based if not found
        if (!findAndScrollToText()) {
          console.log('===== [SCRIPT PLAYER] Text search failed, falling back to position-based scrolling');
          // Continue with position-based scrolling below
        } else {
          return; // Successfully scrolled to text, don't need to do position-based
        }
      }
      
      // Wait for iframe to load and then scroll to position
      const checkIframeLoaded = () => {
        try {
          // Try to access contentDocument to check if loaded
          if (iframe.contentDocument && iframe.contentDocument.body) {
            const viewportHeight = iframe.contentWindow.innerHeight || iframe.clientHeight;
            const scrollHeight = iframe.contentDocument.body.scrollHeight;
            const maxScroll = Math.max(0, scrollHeight - viewportHeight);
            const targetScroll = percentage * maxScroll;
            
            console.log('===== [SCRIPT PLAYER] Jumping iframe to:', {
              targetScroll,
              maxScroll,
              scrollHeight,
              viewportHeight
            });
            
            // Try to use jQuery inside iframe if available
            try {
              if (iframe.contentWindow.$ || iframe.contentWindow.jQuery) {
                console.log('===== [SCRIPT PLAYER] Using jQuery to animate scroll');
                const $iframe = iframe.contentWindow.$ || iframe.contentWindow.jQuery;
                $iframe('html, body').animate({
                  scrollTop: targetScroll
                }, 500, 'swing');
                return;
              }
            } catch (e) {
              console.warn('===== [SCRIPT PLAYER] Could not use iframe jQuery for jumping:', e);
            }
            
            // Try to use teleprompterScrollTo if available
            try {
              if (typeof iframe.contentWindow.teleprompterScrollTo === 'function') {
                console.log('===== [SCRIPT PLAYER] Using teleprompterScrollTo function');
                iframe.contentWindow.teleprompterScrollTo(percentage);
                return;
              }
            } catch (e) {
              console.warn('===== [SCRIPT PLAYER] Could not use teleprompterScrollTo:', e);
            }
            
            // Fallback to basic scrollTo
            console.log('===== [SCRIPT PLAYER] Using basic scrollTo fallback');
            iframe.contentWindow.scrollTo({
              top: targetScroll,
              behavior: 'smooth'
            });
          } else {
            console.log('===== [SCRIPT PLAYER] Iframe not fully loaded, retrying...');
            // Try again in a moment
            setTimeout(checkIframeLoaded, 100);
          }
        } catch (e) {
          console.error('===== [SCRIPT PLAYER] Error accessing iframe content:', e);
          
          // Last resort: try using postMessage API
          try {
            console.log('===== [SCRIPT PLAYER] Using postMessage as last resort');
            iframe.contentWindow.postMessage({
              type: 'SCROLL_TO_POSITION',
              position: percentage
            }, '*');
          } catch (postMsgErr) {
            console.error('===== [SCRIPT PLAYER] Even postMessage failed:', postMsgErr);
          }
        }
      };
      
      checkIframeLoaded();
    } else {
      console.log('===== [SCRIPT PLAYER] Handling regular text content');
      // For regular text content
      const maxScroll = container.scrollHeight - container.clientHeight;
      const targetScroll = percentage * maxScroll;
      
      console.log('===== [SCRIPT PLAYER] Scrolling container to', targetScroll);
      
      // Use jQuery for smooth animation
      $(container).animate({
        scrollTop: targetScroll
      }, 500, 'swing');
    }
  };
  
  // Expose jump method to parent
  React.useImperativeHandle(ref, () => ({
    jumpToPosition
  }), [script, jumpToPosition]);
  
  // Render the script viewer
  if (!script) {
    console.log('ScriptPlayer: No script provided to component');
    return <div className="no-script-message">No script selected</div>;
  }
  
  // Verify script has required properties
  if (!script.id) {
    console.warn('ScriptPlayer: Script is missing ID property');
    return <div className="no-script-message">Script is missing ID property</div>;
  }
  
  // No content check needed - HTML files are loaded via iframe
  
  return (
    <div 
      className={`script-player ${fullScreen ? 'fullscreen' : ''}`}
      style={{ 
        backgroundColor: 'black',
        color: 'white',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      {fullScreen && (
        <div 
          style={{
            padding: '1rem',
            textAlign: 'center',
            borderBottom: '1px solid #333',
            fontWeight: 'bold',
            fontSize: '1.5rem',
            width: '100%'
          }}
        >
          {script.title}
        </div>
      )}
      
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flex: 1,
          padding: '0 2rem'
        }}
      >
        <div
          ref={containerRef}
          style={{
            width: '100%',
            maxWidth: '100%',
            aspectRatio: '16/9',
            overflow: 'hidden',
            backgroundColor: 'black',
            border: '1px solid #333',
            boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)'
          }}
          className="script-content-container"
        >
          <iframe 
            src={`/${script.id}`}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              backgroundColor: 'black'
            }}
            sandbox="allow-scripts allow-same-origin"
            title={`${script.title} content`}
            loading="eager"
            id="html-script-frame"
            onLoad={(e) => {
              console.log('HTML iframe loaded in ScriptPlayer');
              
              // Create and dispatch a custom event to notify the ViewerPage that the iframe is loaded
              const loadEvent = new CustomEvent('iframeLoaded', {
                detail: {
                  iframe: e.target,
                  scriptId: script.id
                },
                bubbles: true
              });
              e.target.dispatchEvent(loadEvent);
              
              // Make sure iframe is marked as loaded
              e.target.dataset.loaded = 'true';
              
              // Apply font size when iframe loads
              try {
                const iframe = e.target;
                
                // First, check if teleprompter-font.js is doing its job
                if (iframe.contentWindow && typeof iframe.contentWindow.setTeleprompterFontSize === 'function') {
                  console.log('teleprompter-font.js script detected, using the global function');
                  
                  // Using the exposed global function from teleprompter-font.js
                  iframe.contentWindow.setTeleprompterFontSize(fontSize);
                  
                  // Add event listener for custom event
                  iframe.contentDocument.addEventListener('fontSizeChanged', (event) => {
                    console.log('Received fontSizeChanged event from iframe:', event.detail);
                  });
                  
                  console.log('Successfully initialized font size via teleprompter-font.js');
                } 
                // If teleprompter-font.js isn't loaded, fall back to direct manipulation
                else if (iframe.contentDocument && iframe.contentDocument.body) {
                  console.log(`teleprompter-font.js not detected, using direct DOM manipulation for font size: ${fontSize}px`);
                  
                  // Direct DOM manipulation
                  // Make text color white by default
                  iframe.contentDocument.body.style.color = 'white';
                  iframe.contentDocument.body.style.backgroundColor = 'black';
                  
                  // Set font size on body element
                  iframe.contentDocument.body.style.fontSize = `${fontSize}px`;
                  
                  // Add a style element to the iframe head for more comprehensive font sizing
                  const style = iframe.contentDocument.createElement('style');
                  style.id = 'teleprompter-font-size-style';
                  style.textContent = `
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
                  `;
                  iframe.contentDocument.head.appendChild(style);
                  
                  // Set up a message listener in the iframe for font size changes 
                  const messageListener = (event) => {
                    console.log('Iframe received message:', event.data);
                    
                    if (event.data && event.data.type === 'SET_FONT_SIZE') {
                      const newSize = event.data.fontSize;
                      console.log(`Iframe received font size update: ${newSize}px`);
                      
                      // Update body font size
                      iframe.contentDocument.body.style.fontSize = `${newSize}px`;
                      
                      // Find and update our style element
                      const styleEl = iframe.contentDocument.getElementById('teleprompter-font-size-style');
                      if (styleEl) {
                        styleEl.textContent = `
                          /* Base styles */
                          body, html {
                            color: white !important;
                            background-color: black !important;
                            font-size: ${newSize}px !important;
                            font-family: 'Arial', sans-serif !important;
                          }
                          
                          /* Apply font size to all text elements */
                          body *, p, div, span, h1, h2, h3, h4, h5, h6, li, td, th, label, a {
                            font-size: ${newSize}px !important;
                          }
                          
                          /* Ensure specific selectors have the font size */
                          p[style*="padding-left"] {
                            font-size: ${newSize}px !important;
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
                            font-size: ${newSize}px !important;
                          }
                        `;
                        console.log('Updated style element with new font size');
                      }
                    }
                  };
                  
                  // We need to add the listener to the content window
                  if (iframe.contentWindow) {
                    iframe.contentWindow.addEventListener('message', messageListener);
                    console.log('Added message listener to iframe content window');
                  } else {
                    // Fall back to window-level listener
                    window.addEventListener('message', messageListener);
                    console.log('Added message listener to window (fallback)');
                  }
                  
                  console.log(`Applied font size ${fontSize}px to iframe content with direct style injection`);
                } else {
                  // If we can't access the iframe contentDocument, resort to postMessage
                  console.log('Cannot access iframe content directly, using postMessage');
                  iframe.contentWindow.postMessage({
                    type: 'SET_FONT_SIZE',
                    fontSize: fontSize
                  }, '*');
                }
              } catch (err) {
                console.error('Error setting font size on iframe:', err);
                
                // Last resort - try postMessage even after error
                try {
                  const iframe = e.target;
                  iframe.contentWindow.postMessage({
                    type: 'SET_FONT_SIZE',
                    fontSize: fontSize
                  }, '*');
                  console.log('Sent postMessage after error (last resort)');
                } catch (postMsgErr) {
                  console.error('Even postMessage failed:', postMsgErr);
                }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default React.forwardRef(ScriptPlayer);
