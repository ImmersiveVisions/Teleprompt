// ScriptPlayer.jsx
// An ultra-simple script player that just focuses on scrolling

import React, { useEffect, useRef, useState } from 'react';
import { parseScript } from '../services/scriptParser';
import $ from 'jquery'; // Import jQuery for smooth scrolling

const ScriptPlayer = ({ 
  script, 
  isPlaying,
  speed = 1,
  direction = 'forward',
  fontSize = 24,
  fullScreen = false,
  aspectRatio = '16/9'  // Default to 16:9, but can be '4/3' or '16/9'
}, ref) => {
  // Calculate aspect ratio value as a number for calculations
  const aspectRatioValue = aspectRatio === '16/9' ? 16/9 : 4/3;
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  const [currentTopElement, setCurrentTopElement] = useState(null);
  
  // When we receive a script, ensure the parent knows about it
  useEffect(() => {
    if (script && typeof window !== 'undefined') {
      // Ensure script is available in global scope for error recovery
      window.__currentScript = script;
    }
  }, [script]);
  
  // Function to find the element closest to the top of the viewport
  const findElementAtViewportTop = () => {
    console.log('📋 [DEBUG] findElementAtViewportTop called');
    
    try {
      const iframe = containerRef.current?.querySelector('iframe');
      if (!iframe || !iframe.contentDocument || !iframe.contentDocument.body) {
        console.log('📋 [DEBUG] Cannot find iframe or access its content');
        return null;
      }
      
      console.log('📋 [DEBUG] iframe found:', iframe.id || 'no-id');
      
      // Get all paragraph elements and other text blocks
      const textElements = iframe.contentDocument.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div:not(:has(*))');
      console.log('📋 [DEBUG] Found', textElements ? textElements.length : 0, 'text elements');
      
      if (!textElements || textElements.length === 0) {
        console.log('📋 [DEBUG] No text elements found, returning null');
        return null;
      }
      
      // Get current scroll position
      const scrollTop = iframe.contentWindow.scrollY || 
        iframe.contentDocument.documentElement.scrollTop || 0;
      
      console.log('📋 [DEBUG] Current scroll position:', scrollTop);
      
      // Add a small offset from top to find element that's actually visible (not just at the boundary)
      const viewportTopPosition = scrollTop + 50; // 50px down from the top edge
      
      // Find the element whose top edge is closest to the viewport top position
      let closestElement = null;
      let closestDistance = Infinity;
      
      textElements.forEach(element => {
        const rect = element.getBoundingClientRect();
        const elementTop = rect.top + scrollTop;
        
        // Calculate distance between element's top and viewport top
        const distance = Math.abs(elementTop - viewportTopPosition);
        
        // If this element is closer to the top of the viewport than any found so far
        if (distance < closestDistance && element.textContent.trim()) {
          closestDistance = distance;
          closestElement = element;
        }
      });
      
      console.log('📋 [DEBUG] Found closest element:', 
        closestElement ? {
          tag: closestElement.tagName,
          text: closestElement.textContent.substring(0, 30).trim(),
          distance: closestDistance
        } : 'none found');
      
      return closestElement;
    } catch (error) {
      console.error('Error finding element at viewport top:', error);
      return null;
    }
  };
  

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
  
  // Track user interaction with the iframe scrollbar
  useEffect(() => {
    if (!script || !containerRef.current) {
      return;
    }
    
    const iframe = containerRef.current.querySelector('iframe');
    if (!iframe || !iframe.contentWindow) {
      return;
    }
    
    // Create a variable in module scope that persists between renders
    if (!window._scrollState) {
      window._scrollState = {
        isUserScrolling: false,
        userScrollTimeout: null,
        isScrollAnimating: false
      };
    }
    
    // Use the persistent state object
    const scrollState = window._scrollState;
    
    // Function to update the current top element
    const updateTopElement = (isUserInitiated = false) => {
      console.log('📋 [DEBUG] updateTopElement called with isUserInitiated:', isUserInitiated);
      
      const topElement = findElementAtViewportTop();
      console.log('📋 [DEBUG] findElementAtViewportTop returned:', topElement ? 'Element found' : 'No element found');
      
      if (topElement && (topElement !== currentTopElement || isUserInitiated)) {
        console.log('📋 [DEBUG] Setting currentTopElement and processing position');
        setCurrentTopElement(topElement);
        
        // Only broadcast position if this was from user interaction (not from auto-scrolling)
        if (isUserInitiated) {
          console.log('📋 [DEBUG] Processing user-initiated update (preparing to broadcast)');
          
          try {
            // Get the normalized position as percentage
            const scrollTop = iframe.contentWindow.scrollY || 
              iframe.contentDocument.documentElement.scrollTop || 0;
            const scrollHeight = iframe.contentDocument.body.scrollHeight;
            const viewportHeight = iframe.contentWindow.innerHeight;
            const maxScroll = Math.max(0, scrollHeight - viewportHeight);
            const percentage = maxScroll > 0 ? scrollTop / maxScroll : 0;
            
            console.log('📋 [DEBUG] Calculated position values:', {
              scrollTop,
              scrollHeight,
              viewportHeight,
              maxScroll,
              percentage: percentage.toFixed(4)
            });
            
            // Log the user-initiated position change
            console.log('User scrolled to position:', {
              text: topElement.textContent.substring(0, 50).trim(),
              tag: topElement.tagName,
              position: percentage.toFixed(4),
              scrollTop: scrollTop
            });
            
            // Create enhanced position data similar to search functionality
            const enhancedPositionData = {
              position: percentage,
              text: topElement.textContent.trim(),
              tag: topElement.tagName,
              parentTag: topElement.parentElement ? topElement.parentElement.tagName : null,
              absolutePosition: scrollTop
            };
            
            // Send the enhanced position data to other clients
            console.log('⭐ [POSITION DEBUG] Checking ref for sendPosition function:', { 
              hasRef: !!ref,
              hasRefCurrent: !!(ref && ref.current), 
              hasSendPosition: !!(ref && ref.current && ref.current.sendPosition),
              refContent: ref ? JSON.stringify(ref.current, (key, value) => {
                if (typeof value === 'function') return 'Function';
                return value;
              }) : 'null'
            });
            
            // CRITICAL FIX: Use direct access to a window-level function
            // to bypass any potential ref issues
            if (window._sendPositionCallback) {
              console.log('⭐ [POSITION DEBUG] Using global position callback');
              window._sendPositionCallback(enhancedPositionData);
            } else if (ref.current && ref.current.sendPosition) {
              console.log('⭐ [POSITION DEBUG] Using ref.sendPosition');
              ref.current.sendPosition(enhancedPositionData);
            } else {
              console.error('⭐ [POSITION DEBUG] No position sending mechanism available! Saving to window._lastPosition');
              window._lastPosition = enhancedPositionData;
              
              // Try to use websocket directly if available
              try {
                if (window.sendSearchPosition || window.websocketService?.sendSearchPosition) {
                  const sendFn = window.sendSearchPosition || window.websocketService.sendSearchPosition;
                  console.log('⭐ [POSITION DEBUG] Using global sendSearchPosition function');
                  sendFn(enhancedPositionData);
                }
              } catch (e) {
                console.error('⭐ [POSITION DEBUG] Error using direct websocket access:', e);
              }
            }
          } catch (e) {
            console.error('Error calculating scroll position:', e);
          }
        }
      }
    };
    
    // Detect when a scroll is due to user interaction vs. animation
    const handleScrollStart = () => {
      console.log('📋 [DEBUG] handleScrollStart called, current states:', {
        isScrollAnimating: scrollState.isScrollAnimating, 
        isPlaying,
        isUserScrolling: scrollState.isUserScrolling,
        hasTimeout: !!scrollState.userScrollTimeout
      });
      
      // If not currently auto-scrolling, mark this as user-initiated
      if (!scrollState.isScrollAnimating && !isPlaying) {
        console.log('📋 [DEBUG] Setting isUserScrolling to TRUE');
        scrollState.isUserScrolling = true;
        
        // Clear any existing timeout
        if (scrollState.userScrollTimeout) {
          console.log('📋 [DEBUG] Clearing existing timeout in handleScrollStart');
          clearTimeout(scrollState.userScrollTimeout);
          scrollState.userScrollTimeout = null;
        }
      } else {
        console.log('📋 [DEBUG] Not treating as user scroll because:', 
          scrollState.isScrollAnimating ? 'animation is running' : 'playback is active');
      }
    };
    
    const handleScrollEnd = () => {
      console.log('📋 [DEBUG] handleScrollEnd called, isUserScrolling:', scrollState.isUserScrolling);
      
      if (scrollState.isUserScrolling) {
        // Clear any existing timeout to prevent multiple calls
        if (scrollState.userScrollTimeout) {
          console.log('📋 [DEBUG] Clearing existing timeout');
          clearTimeout(scrollState.userScrollTimeout);
        }
        
        console.log('📋 [DEBUG] Setting timeout to call updateTopElement');
        
        // Update only after scrolling has completely stopped
        console.log('📋 [DEBUG] Setting new scroll end timeout - current ref state:', { 
          hasRef: !!ref,
          hasRefCurrent: !!(ref && ref.current),
          hasSendPosition: !!(ref && ref.current && ref.current.sendPosition)
        });
        
        scrollState.userScrollTimeout = setTimeout(() => {
          console.log('📋 [DEBUG] Timeout fired! Scroll has settled, calling updateTopElement(true)');
          console.log('📋 [DEBUG] Current ref state at timeout firing:', {
            hasRef: !!ref,
            hasRefCurrent: !!(ref && ref.current),
            hasSendPosition: !!(ref && ref.current && ref.current.sendPosition),
            refKeys: ref && ref.current ? Object.keys(ref.current) : 'none'
          });
          
          updateTopElement(true); // true = user initiated
          console.log('📋 [DEBUG] updateTopElement(true) completed');
          scrollState.isUserScrolling = false;
        }, 500); // Longer delay to ensure scrolling has completely settled
      } else {
        console.log('📋 [DEBUG] Not processing scroll end - isUserScrolling is false');
      }
    };
    
    // Add scroll event listeners to the iframe
    const addScrollListeners = () => {
      try {
        if (iframe.contentWindow) {
          // ALWAYS set isUserScrolling to true on ANY scroll event if not auto-scrolling
          const checkAndMarkUserScroll = (e) => {
            if (!scrollState.isScrollAnimating && !isPlaying) {
              console.log('📋 [DEBUG] Setting isUserScrolling to TRUE from', e.type);
              scrollState.isUserScrolling = true;
              
              // Clear any previous timeout
              if (scrollState.userScrollTimeout) {
                clearTimeout(scrollState.userScrollTimeout);
                scrollState.userScrollTimeout = null;
              }
            }
          };
          
          // Use wheel event to detect user scrolling (mouse wheel)
          iframe.contentWindow.addEventListener('wheel', (e) => {
            console.log('📋 [DEBUG] Wheel event detected');
            checkAndMarkUserScroll(e);
            handleScrollStart();
          }, { passive: true });
          
          // Detect scrollbar clicks specifically for better drag detection
          iframe.contentDocument.addEventListener('mousedown', (e) => {
            // Check if click is near the right edge of the iframe (where scrollbar usually is)
            const isNearScrollbar = (e.clientX > (iframe.clientWidth - 30));
            if (isNearScrollbar) {
              console.log('📋 [DEBUG] Detected scrollbar click');
            }
            checkAndMarkUserScroll(e);
            handleScrollStart();
          }, { passive: true });

          // Watch for mouseup events to detect end of scrollbar drag
          iframe.contentDocument.addEventListener('mouseup', (e) => {
            if (scrollState.isUserScrolling) {
              console.log('📋 [DEBUG] Mouse up event - will check if scroll needs to be finalized');
            }
          }, { passive: true });
          
          // Detect touch interactions
          iframe.contentDocument.addEventListener('touchstart', (e) => {
            console.log('📋 [DEBUG] Touch event detected');
            checkAndMarkUserScroll(e);
            handleScrollStart();
          }, { passive: true });
          
          // Detect ALL scrolling - this is critical for detecting scrollbar drags
          iframe.contentWindow.addEventListener('scroll', (e) => {
            console.log('📋 [DEBUG] Scroll event detected');
            checkAndMarkUserScroll(e);
            handleScrollEnd();  // Every scroll event can potentially end scrolling
            
            // Throttle UI updates during active scrolling
            const now = Date.now();
            if (!window._lastUIUpdate || now - window._lastUIUpdate > 100) {
              window._lastUIUpdate = now;
              updateTopElement(false); // false = not user initiated (no broadcast)
            }
          }, { passive: true });
          
          return true;
        }
      } catch (e) {
        console.error('Error adding scroll listeners to iframe:', e);
      }
      return false;
    };
    
    // Set flag when animation starts/stops
    const setScrollAnimating = (animating) => {
      scrollState.isScrollAnimating = animating;
      console.log('📋 [DEBUG] Set isScrollAnimating to', animating);
    };
    
    // Expose the function to the ref so we can tell when animations start/end
    if (ref.current) {
      ref.current.setScrollAnimating = setScrollAnimating;
    }
    
    // Try to add listeners once the iframe is loaded
    iframe.addEventListener('load', () => {
      console.log('📋 [DEBUG] iframe loaded, adding scroll listeners');
      if (!addScrollListeners()) {
        // If direct listener fails, try a simpler approach as fallback
        console.log('📋 [DEBUG] Falling back to interval-based position updates');
        const intervalId = setInterval(() => updateTopElement(false), 500);
        return () => clearInterval(intervalId);
      }
    });
    
    // If iframe is already loaded, add listeners now
    if (iframe.contentDocument && iframe.contentWindow) {
      console.log('📋 [DEBUG] iframe already loaded, adding scroll listeners now');
      addScrollListeners();
    }
    
    // Clean up
    return () => {
      try {
        if (scrollState.userScrollTimeout) {
          clearTimeout(scrollState.userScrollTimeout);
        }
        
        if (iframe.contentWindow) {
          try {
            // We can't properly remove the anonymous function listeners,
            // but we can try to remove some of them to avoid memory leaks
            iframe.contentWindow.removeEventListener('wheel', null);
            iframe.contentDocument.removeEventListener('mousedown', null);
            iframe.contentDocument.removeEventListener('touchstart', null);
            iframe.contentDocument.removeEventListener('mouseup', null);
            iframe.contentWindow.removeEventListener('scroll', null);
            console.log('📋 [DEBUG] Attempted to clean up event listeners');
          } catch (error) {
            console.log('📋 [DEBUG] Could not clean up some event listeners:', error.message);
          }
        }
      } catch (e) {
        console.error('Clean up error:', e);
      }
    };
  }, [script, currentTopElement, isPlaying]);
  
  // Expose methods to parent component
  React.useImperativeHandle(ref, () => {
    // Log debug info when the ref methods are created
    console.log('⭐ [POSITION DEBUG] Creating ref methods in useImperativeHandle');
    
    // Create a unique ID for this ref creation to track persistence
    const refId = Date.now().toString(36);
    
    const refObject = {
      // Jump to a specific position
      jumpToPosition,
      
      // Get the current element at viewport top
      getCurrentTopElement: () => currentTopElement,
      
      // Flag to indicate animation is running (prevents user scroll events)
      setScrollAnimating: (animating) => {
        // Direct access to module-scoped state
        if (window._scrollState) {
          window._scrollState.isScrollAnimating = animating;
          console.log('📋 [DEBUG] Set animation state to', animating);
        }
      },
      
      // This is just a placeholder that will be overwritten by the parent
      // But we provide a default implementation for safety
      sendPosition: (data) => {
        console.log('⭐ [POSITION DEBUG] Default sendPosition called - this should be overridden by parent!', data);
      },
      
      // For debugging - add a ref ID and timestamp
      _debugInfo: {
        refId: refId,
        createdAt: new Date().toISOString(),
        componentId: containerRef.current ? containerRef.current.id : 'unknown'
      }
    };
    
    console.log('⭐ [POSITION DEBUG] Created ref object:', {
      refId: refId,
      hasJumpToPosition: !!refObject.jumpToPosition,
      hasGetCurrentTopElement: !!refObject.getCurrentTopElement,
      hasSetScrollAnimating: !!refObject.setScrollAnimating,
      hasSendPosition: !!refObject.sendPosition
    });
    
    return refObject;
  }, [script, jumpToPosition, currentTopElement]);
  
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
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          flex: 1,
          padding: fullScreen ? '0' : '0 2rem',
          boxSizing: 'border-box'
        }}
      >
        {!fullScreen && currentTopElement && (
          <div
            style={{
              width: '100%',
              padding: '5px 10px',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: '#aaffaa',
              fontSize: '12px',
              textAlign: 'center',
              borderRadius: '4px',
              margin: '0 0 10px 0',
              maxHeight: '40px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            Current: {currentTopElement.textContent.substring(0, 60).trim()}{currentTopElement.textContent.length > 60 ? '...' : ''}
          </div>
        )}
        <div
          ref={containerRef}
          style={{
            width: fullScreen ? (aspectRatio === '16/9' ? '100%' : 'calc(100vh * ' + aspectRatioValue + ')') : '100%',
            height: fullScreen ? '100vh' : '100%',
            minHeight: fullScreen ? 'auto' : '500px',
            maxWidth: '100vw',
            maxHeight: fullScreen ? '100vh' : '80vh',
            aspectRatio: aspectRatio,
            overflow: 'hidden',
            backgroundColor: 'black',
            border: fullScreen ? 'none' : '1px solid #333',
            boxShadow: fullScreen ? 'none' : '0 0 10px rgba(0, 0, 0, 0.5)',
            boxSizing: 'border-box',
            position: 'relative',
            margin: '0 auto',
            flex: '1'
          }}
          className="script-content-container"
          data-aspect-ratio={aspectRatio}
        >
          <iframe 
            src={`/${script.id}`}
            style={{
              width: '100%',
              height: '100%',
              minHeight: '500px',
              border: 'none',
              backgroundColor: 'black',
              display: 'block'
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
