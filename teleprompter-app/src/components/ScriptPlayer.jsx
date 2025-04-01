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
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  
  // When we receive a script, ensure the parent knows about it
  useEffect(() => {
    if (script && typeof window !== 'undefined') {
      // Ensure script is available in global scope for error recovery
      window.__currentScript = script;
    }
  }, [script]);
  

  // Apply font size to iframe content when it changes
  useEffect(() => {
    // Only proceed if we have a script and container
    if (!script || !containerRef.current) return;
    
    const container = containerRef.current;
    const iframe = container.querySelector('iframe');
    if (!iframe) return;
    
    // Define our approaches to updating the font size
    const updateFontSizeMethods = [
      // Method 1: Use the exposed global function if available
      function useGlobalFunction() {
        try {
          if (iframe.contentWindow && typeof iframe.contentWindow.setTeleprompterFontSize === 'function') {
            iframe.contentWindow.setTeleprompterFontSize(fontSize);
            return true;
          }
        } catch (e) {
          return false;
        }
        return false;
      },
      
      // Method 2: Direct DOM manipulation if same-origin
      function useDomManipulation() {
        try {
          if (iframe.contentDocument && iframe.contentDocument.body) {
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
            return true;
          }
        } catch (e) {
          return false;
        }
        return false;
      },
      
      // Method 3: postMessage API (works cross-origin)
      function usePostMessage() {
        try {
          iframe.contentWindow.postMessage({
            type: 'SET_FONT_SIZE',
            fontSize: fontSize
          }, '*');
          return true;
        } catch (e) {
          return false;
        }
        return false;
      },
      
      // Method 4: URL parameter (requires reload)
      function useUrlParameter() {
        try {
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
          return false;
        }
        return false;
      }
    ];
    
    // Try each method in order until one succeeds
    for (const method of updateFontSizeMethods) {
      if (method()) break;
    }
  }, [fontSize, script]);

  // jQuery-based smooth scrolling approach
  useEffect(() => {
    // Don't do anything if no script or container
    if (!script || !containerRef.current) {
      return;
    }
    
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
            // Silent fail for cross-origin restrictions
          }
        }
      } catch (e) {
        // Silent fail
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
                }
              } catch (e) {
                // Silent fail
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
            
            // Try to use jQuery inside the iframe
            try {
              addEndMarker();
              
              // Check if jQuery is available in the iframe
              if (iframe.contentWindow.$ || iframe.contentWindow.jQuery) {
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
                
                // We'll use our own animation approach for iframes
                // Start with current position
                const startTime = performance.now();
                const startPos = iframe.contentWindow.scrollY || 0;
                const targetPos = direction === 'forward' ? 
                  iframe.contentDocument.body.scrollHeight - iframe.contentWindow.innerHeight : 0;
                
                // Create animation function
                const animateIframe = (timestamp) => {
                  if (!isPlaying) {
                    return;
                  }
                  
                  const elapsed = timestamp - startTime;
                  const progress = Math.min(1, elapsed / scrollDuration);
                  
                  // Linear position calculation
                  const currentPos = startPos + (targetPos - startPos) * progress;
                  
                  // Set scroll position
                  iframe.contentWindow.scrollTo(0, currentPos);
                  
                  // Continue if not done
                  if (progress < 1 && isPlaying) {
                    animationRef.current = requestAnimationFrame(animateIframe);
                  } else {
                    animationRef.current = null;
                  }
                };
                
                // Start animation
                animationRef.current = requestAnimationFrame(animateIframe);
                
                // Return cleanup function
                return;
              }
            } catch (e) {
              // Continue with outer container animation
            }
          }
        } catch (e) {
          // Cannot access iframe content directly
        }
      }
    }
    
    // If we get here, we need to animate the main container
    if (!isIframeContent) {
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
    if (!containerRef.current || !script) {
      return;
    }
    
    const container = containerRef.current;
    
    // Stop any ongoing animations
    try {
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
          // Silent fail
        }
      }
    } catch (e) {
      // Silent fail
    }
    
    // Check if position is an object (from SEARCH_POSITION message)
    // or a simple number (from JUMP_TO_POSITION control)
    let percentage = 0;
    let isSearchPositionObject = false;
    
    if (typeof position === 'object' && position !== null) {
      // Enhanced position data - extract the normalized position value
      if (position.position !== undefined) {
        percentage = position.position;
        isSearchPositionObject = true;
      } else {
        return;
      }
    } else {
      // Simple number for position - calculate percentage
      const scriptContent = script.body || script.content || '';
      const maxLength = Math.max(1, scriptContent.length);
      percentage = Math.max(0, Math.min(position, maxLength)) / maxLength;
    }
    
    // Ensure position is within bounds
    percentage = Math.max(0, Math.min(1, percentage));
    
    // Apply the scroll
    if (script.id && script.id.toLowerCase().endsWith('.html')) {
      // For HTML content, find the iframe and scroll it
      const iframe = container.querySelector('iframe');
      
      if (!iframe || !iframe.contentWindow) {
        return;
      }
      
      // If we have a search position object with text, try to find and highlight that text
      if (isSearchPositionObject && position.text) {
        // Create a function that will search for text in the iframe
        const findAndScrollToText = () => {
          try {
            if (!iframe.contentDocument || !iframe.contentDocument.body) {
              return false;
            }
            
            // Normalize the search text
            const searchText = position.text.trim().toLowerCase();
            
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
            
            // If no node found with exact match, try with a shorter substring
            if (!foundNode && searchText.length > 10) {
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
                  foundNode = node;
                  break;
                }
              }
            }
            
            // If found, scroll directly to the node
            if (foundNode && foundNode.parentElement) {
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
              
              return true; // Successfully found and scrolled
            }
            
            return false; // Text not found
          } catch (err) {
            return false;
          }
        };
        
        // Try to find and scroll to text, fall back to position-based if not found
        if (findAndScrollToText()) {
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
            
            // Try to use jQuery inside iframe if available
            try {
              if (iframe.contentWindow.$ || iframe.contentWindow.jQuery) {
                const $iframe = iframe.contentWindow.$ || iframe.contentWindow.jQuery;
                $iframe('html, body').animate({
                  scrollTop: targetScroll
                }, 500, 'swing');
                return;
              }
            } catch (e) {
              // Silent fail
            }
            
            // Try to use teleprompterScrollTo if available
            try {
              if (typeof iframe.contentWindow.teleprompterScrollTo === 'function') {
                iframe.contentWindow.teleprompterScrollTo(percentage);
                return;
              }
            } catch (e) {
              // Silent fail
            }
            
            // Fallback to basic scrollTo
            iframe.contentWindow.scrollTo({
              top: targetScroll,
              behavior: 'smooth'
            });
          } else {
            // Try again in a moment
            setTimeout(checkIframeLoaded, 100);
          }
        } catch (e) {
          // Last resort: try using postMessage API
          try {
            iframe.contentWindow.postMessage({
              type: 'SCROLL_TO_POSITION',
              position: percentage
            }, '*');
          } catch (postMsgErr) {
            // Silent fail
          }
        }
      };
      
      checkIframeLoaded();
    } else {
      // For regular text content
      const maxScroll = container.scrollHeight - container.clientHeight;
      const targetScroll = percentage * maxScroll;
      
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
    return <div className="no-script-message">No script selected</div>;
  }
  
  // Verify script has required properties
  if (!script.id) {
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
                  // Using the exposed global function from teleprompter-font.js
                  iframe.contentWindow.setTeleprompterFontSize(fontSize);
                  
                  // Add event listener for custom event
                  iframe.contentDocument.addEventListener('fontSizeChanged', (event) => {
                    // Handle font size change event silently
                  });
                } 
                // If teleprompter-font.js isn't loaded, fall back to direct manipulation
                else if (iframe.contentDocument && iframe.contentDocument.body) {
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
                    if (event.data && event.data.type === 'SET_FONT_SIZE') {
                      const newSize = event.data.fontSize;
                      
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
                      }
                    }
                  };
                  
                  // We need to add the listener to the content window
                  if (iframe.contentWindow) {
                    iframe.contentWindow.addEventListener('message', messageListener);
                  } else {
                    // Fall back to window-level listener
                    window.addEventListener('message', messageListener);
                  }
                } else {
                  // If we can't access the iframe contentDocument, resort to postMessage
                  iframe.contentWindow.postMessage({
                    type: 'SET_FONT_SIZE',
                    fontSize: fontSize
                  }, '*');
                }
              } catch (err) {
                // Last resort - try postMessage even after error
                try {
                  const iframe = e.target;
                  iframe.contentWindow.postMessage({
                    type: 'SET_FONT_SIZE',
                    fontSize: fontSize
                  }, '*');
                } catch (postMsgErr) {
                  // Silent fail
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
