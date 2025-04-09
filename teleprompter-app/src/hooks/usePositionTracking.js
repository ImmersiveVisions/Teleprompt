import { useEffect, useState } from 'react';

const usePositionTracking = (containerRef, isPlaying, script, ref) => {
  const [currentTopElement, setCurrentTopElement] = useState(null);
  
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
        // Make sure we're not playing (isPlaying) and not in animation (scrollState.isScrollAnimating)
        if (isUserInitiated && !isPlaying && !scrollState.isScrollAnimating) {
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
        // Ensure user scrolling is false when auto-scrolling
        scrollState.isUserScrolling = false;
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
          // Check if this is user scrolling or auto-scrolling
          const checkAndMarkUserScroll = (e) => {
            if (!scrollState.isScrollAnimating && !isPlaying) {
              console.log('📋 [DEBUG] Setting isUserScrolling to TRUE from', e.type);
              scrollState.isUserScrolling = true;
              
              // Clear any previous timeout
              if (scrollState.userScrollTimeout) {
                clearTimeout(scrollState.userScrollTimeout);
                scrollState.userScrollTimeout = null;
              }
            } else {
              // Make sure we explicitly mark as NOT user scrolling when auto-scrolling
              scrollState.isUserScrolling = false;
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
  }, [script, currentTopElement, isPlaying, containerRef, ref]);

  return {
    currentTopElement,
    findElementAtViewportTop
  };
};

export default usePositionTracking;