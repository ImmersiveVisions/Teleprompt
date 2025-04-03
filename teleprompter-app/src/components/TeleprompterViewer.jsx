// TeleprompterViewer.jsx
// A dedicated component for displaying teleprompter content using node-based navigation

import React, { useEffect, useRef, useState } from 'react';

const TeleprompterViewer = ({ 
  script, 
  isPlaying,
  speed = 1,
  direction = 'forward',
  fontSize = 24,
  aspectRatio = '16/9'
}) => {
  // Calculate aspect ratio value as a number for calculations
  const aspectRatioValue = aspectRatio === '16/9' ? 16/9 : 4/3;
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  
  // Auto-scrolling logic - uses requestAnimationFrame for smooth scrolling
  useEffect(() => {
    if (!script || !containerRef.current || !isIframeLoaded) {
      return;
    }
    
    console.log(`TeleprompterViewer: Playback state updated - isPlaying: ${isPlaying}, speed: ${speed}`);
    
    // Get the iframe reference
    const iframe = containerRef.current.querySelector('iframe');
    if (!iframe || !iframe.contentWindow || !iframe.contentDocument) {
      console.error('TeleprompterViewer: Cannot find iframe or access content');
      return;
    }
    
    // Clean up any existing animation
    const cleanupAnimation = () => {
      try {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
      } catch (e) {
        console.error('TeleprompterViewer: Error cleaning up animation:', e);
      }
    };
    
    // First, clean up existing animations
    cleanupAnimation();
    
    // If not playing, do nothing more
    if (!isPlaying) {
      return cleanupAnimation;
    }
    
    try {
      // For HTML content - exactly mirroring ScriptPlayer's implementation
      // HTML content in iframe
      if (iframe.contentDocument && iframe.contentDocument.body) {
        try {
          // Calculate scrolling parameters
          const scrollHeight = iframe.contentDocument.body.scrollHeight;
          const clientHeight = iframe.contentWindow.innerHeight;
          
          // Get current position
          const startPos = iframe.contentWindow.scrollY || 
            iframe.contentDocument.documentElement.scrollTop || 0;
          
          // Calculate target position based on direction
          const targetPos = direction === 'forward' ? 
            scrollHeight - clientHeight : 0;
          
          // Base reading speed in pixels per second
          const baseScrollSpeed = 100; // Same as ScriptPlayer
          const adjustedSpeed = baseScrollSpeed * speed;
          
          // Calculate duration in milliseconds based on content length
          const remainingScroll = Math.abs(targetPos - startPos);
          const scrollDuration = Math.max(1000, Math.round((remainingScroll / adjustedSpeed) * 1000));
          
          console.log('TeleprompterViewer: Starting auto-scroll:', {
            startPos,
            targetPos,
            scrollHeight,
            duration: scrollDuration,
            speed
          });
          
          // Start the animation - exactly like ScriptPlayer's implementation
          const startTime = performance.now();
          
          const animateScroll = (timestamp) => {
            // Check if we're still supposed to be playing - check actual prop value,
            // not the captured value from closure
            if (!isPlaying) {
              console.log("TeleprompterViewer: Animation stopped - isPlaying is now false");
              cleanupAnimation();
              return;
            }
            
            const elapsed = timestamp - startTime;
            const progress = Math.min(1, elapsed / scrollDuration);
            
            // Calculate current position using linear interpolation
            const currentPos = startPos + (targetPos - startPos) * progress;
            
            // Set scroll position
            iframe.contentWindow.scrollTo(0, currentPos);
            
            // Continue if not done and still playing
            if (progress < 1 && isPlaying) {
              animationRef.current = requestAnimationFrame(animateScroll);
            } else {
              console.log('TeleprompterViewer: Auto-scroll animation complete or stopped');
              animationRef.current = null;
            }
          };
          
          // Force a small delay before starting animation to ensure React state is settled
          setTimeout(() => {
            // Double-check we're still supposed to be playing before starting animation
            if (isPlaying) {
              console.log('TeleprompterViewer: Starting scroll animation after delay');
              animationRef.current = requestAnimationFrame(animateScroll);
            } else {
              console.log('TeleprompterViewer: Not starting animation - isPlaying changed to false during delay');
            }
          }, 50);
        } catch (error) {
          console.error('TeleprompterViewer: Error setting up iframe auto-scroll:', error);
        }
      }
    } catch (error) {
      console.error('TeleprompterViewer: Error in auto-scroll effect:', error);
    }
    
    // Return cleanup function
    return cleanupAnimation;
  }, [isPlaying, script, speed, direction, isIframeLoaded]);
  
  // Font size effect - applies font size changes to the iframe
  useEffect(() => {
    if (!script || !containerRef.current || !isIframeLoaded) {
      return;
    }
    
    console.log('TeleprompterViewer: Applying font size:', fontSize);
    
    const iframe = containerRef.current.querySelector('iframe');
    if (!iframe || !iframe.contentWindow) {
      return;
    }
    
    try {
      // Try using the teleprompter global function
      if (iframe.contentWindow.setTeleprompterFontSize) {
        iframe.contentWindow.setTeleprompterFontSize(fontSize);
        return;
      }
      
      // Try direct DOM manipulation
      if (iframe.contentDocument && iframe.contentDocument.head) {
        // Find or create style element
        let styleEl = iframe.contentDocument.getElementById('teleprompter-font-style');
        if (!styleEl) {
          styleEl = iframe.contentDocument.createElement('style');
          styleEl.id = 'teleprompter-font-style';
          iframe.contentDocument.head.appendChild(styleEl);
        }
        
        // Update styles - same as ScriptPlayer
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
        `;
      }
    } catch (error) {
      console.error('TeleprompterViewer: Error applying font size:', error);
    }
  }, [fontSize, script, isIframeLoaded]);

  // Function to scroll to a specific node by data
  const scrollToNode = (nodeData) => {
    if (!nodeData) {
      console.error('TeleprompterViewer: scrollToNode called with null/undefined data');
      return false;
    }
    
    console.log('TeleprompterViewer: scrollToNode called with data:', 
      typeof nodeData === 'object' ? 
        `position: ${nodeData.position}, text: ${nodeData.text ? nodeData.text.substring(0, 20) + '...' : 'none'}` : 
        nodeData);
    
    try {
      // Get iframe directly using the ID - this is more reliable than container ref
      const iframe = document.getElementById('teleprompter-frame');
      if (!iframe || !iframe.contentDocument || !iframe.contentDocument.body) {
        console.error('TeleprompterViewer: Cannot access iframe content for scrolling');
        return false;
      }
      
      // Stop any ongoing animations
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      
      console.log('TeleprompterViewer: Successfully found iframe and stopped animations');
      
      // If we have an index and it's a rollback, prioritize that
      if (typeof nodeData.index === 'number' && nodeData.fromRollback === true) {
        console.log('TeleprompterViewer: Processing rollback with index:', nodeData.index);
        const dialogElements = iframe.contentDocument.querySelectorAll('[data-type="dialog"]');
        console.log('TeleprompterViewer: Found', dialogElements.length, 'dialog elements');
        
        if (dialogElements.length > 0 && nodeData.index < dialogElements.length) {
          console.log('TeleprompterViewer: Scrolling to dialog at index:', nodeData.index);
          dialogElements[nodeData.index].scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
          return true;
        }
      }
      
      // If we have text, search for that
      if (nodeData.text) {
        console.log('TeleprompterViewer: Searching for text:', nodeData.text.substring(0, 20) + '...');
        const dialogElements = iframe.contentDocument.querySelectorAll('[data-type="dialog"]');
        const searchText = nodeData.text.trim().toLowerCase();
        
        // Try to find an exact match first
        for (const element of dialogElements) {
          if (element.textContent.toLowerCase().includes(searchText)) {
            console.log('TeleprompterViewer: Found matching dialog element');
            element.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
            return true;
          }
        }
        
        console.log('TeleprompterViewer: No dialog match, trying TreeWalker');
        
        // Try TreeWalker as fallback
        try {
          const walker = document.createTreeWalker(
            iframe.contentDocument.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
          );
          
          let node;
          while ((node = walker.nextNode())) {
            if (node.textContent.trim() && node.textContent.toLowerCase().includes(searchText)) {
              console.log('TeleprompterViewer: Found matching text node');
              node.parentElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
              });
              return true;
            }
          }
        } catch (walkErr) {
          console.error('TeleprompterViewer: Error in TreeWalker:', walkErr);
        }
      }
      
      // If we have a position, use that as a fallback
      if (typeof nodeData.position === 'number') {
        console.log('TeleprompterViewer: Falling back to position-based scrolling:', nodeData.position);
        const scrollHeight = iframe.contentDocument.body.scrollHeight;
        const clientHeight = iframe.contentWindow.innerHeight;
        const maxScroll = Math.max(1, scrollHeight - clientHeight);
        const scrollTarget = Math.floor(nodeData.position * maxScroll);
        
        console.log('TeleprompterViewer: Calculated scroll target:', scrollTarget, 
          'from scrollHeight:', scrollHeight, 'clientHeight:', clientHeight);
        
        iframe.contentWindow.scrollTo({
          top: scrollTarget,
          behavior: 'smooth'
        });
        return true;
      }
      
      console.log('TeleprompterViewer: No scrolling method worked');
      return false;
    } catch (error) {
      console.error('TeleprompterViewer: Error in scrollToNode:', error);
      return false;
    }
  };

  if (!script) {
    return <div className="no-script-message">No script loaded</div>;
  }
  
  return (
    <div 
      className={`teleprompter-viewer`}
      style={{ 
        backgroundColor: 'black',
        color: 'white',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: aspectRatio === '16/9' ? '100%' : 'calc(100vh * ' + aspectRatioValue + ')',
          height: '100vh',
          aspectRatio: aspectRatio,
          overflow: 'hidden',
          backgroundColor: 'black',
          border: 'none',
          boxSizing: 'border-box',
          position: 'relative',
          margin: '0 auto'
        }}
        className="viewer-content-container"
        data-aspect-ratio={aspectRatio}
      >
        <iframe 
          src={`/${script.id}`}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            backgroundColor: 'black',
            display: 'block'
          }}
          sandbox="allow-scripts allow-same-origin"
          title={`${script.title || 'Script'} content`}
          loading="eager"
          id="teleprompter-frame"
          onLoad={(e) => {
            console.log('TeleprompterViewer: iframe loaded');
            setIsIframeLoaded(true);
            
            // Mark iframe as loaded
            e.target.dataset.loaded = 'true';
            
            // Apply initial font size
            try {
              const iframe = e.target;
              
              // Try the exposed global function
              if (iframe.contentWindow && iframe.contentWindow.setTeleprompterFontSize) {
                iframe.contentWindow.setTeleprompterFontSize(fontSize);
              } 
              // Fall back to direct manipulation
              else if (iframe.contentDocument && iframe.contentDocument.head) {
                // Create style element
                const style = iframe.contentDocument.createElement('style');
                style.id = 'teleprompter-font-style';
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
                `;
                iframe.contentDocument.head.appendChild(style);
                
                // Set body styles directly
                if (iframe.contentDocument.body) {
                  iframe.contentDocument.body.style.color = 'white';
                  iframe.contentDocument.body.style.backgroundColor = 'black';
                  iframe.contentDocument.body.style.fontSize = `${fontSize}px`;
                }
              }
            } catch (err) {
              console.error('TeleprompterViewer: Error setting initial font size:', err);
            }
          }}
        />
      </div>
    </div>
  );
};

// Create a forwardRef wrapper to enable parent components to access the scrollToNode method
export default React.forwardRef((props, ref) => {
  // Expose scrollToNode method via ref
  React.useImperativeHandle(ref, () => ({
    scrollToNode(nodeData) {
      // Simple accessor to the iframe which sometimes gets undefined
      const getIframe = () => document.getElementById('teleprompter-frame');
      
      if (!nodeData) {
        console.error('scrollToNode: Missing nodeData');
        return false;
      }
      
      try {
        const iframe = getIframe();
        if (!iframe) {
          console.error('scrollToNode: Iframe not found');
          return false;
        }
        
        if (!iframe.contentDocument || !iframe.contentDocument.body) {
          console.error('scrollToNode: Cannot access iframe content');
          return false;
        }
        
        // Get current scroll position for context
        const currentScrollTop = iframe.contentWindow.scrollY || 
          iframe.contentDocument.documentElement.scrollTop || 0;
          
        // Search logic based on nodeData type
        
        // If we have an index, try to use that first (most reliable)
        if (typeof nodeData.index === 'number') {
          const dialogElements = iframe.contentDocument.querySelectorAll('[data-type="dialog"]');
          if (dialogElements.length > 0 && nodeData.index < dialogElements.length) {
            dialogElements[nodeData.index].scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
            return true;
          }
        }
        
        // If we have text content, search for it
        if (nodeData.text) {
          // First try dialog elements
          const dialogElements = iframe.contentDocument.querySelectorAll('[data-type="dialog"]');
          const searchText = nodeData.text.trim().toLowerCase();
          
          // Collect matches
          const matchingElements = [];
          dialogElements.forEach(element => {
            if (element.textContent.toLowerCase().includes(searchText)) {
              matchingElements.push(element);
            }
          });
          
          if (matchingElements.length > 0) {
            // If rollback, use first match
            // Otherwise find closest to current position
            let targetElement;
            
            if (nodeData.fromRollback) {
              targetElement = matchingElements[0];
            } else {
              // Find closest to current position
              targetElement = matchingElements.reduce((closest, element) => {
                const elementPos = element.getBoundingClientRect().top + currentScrollTop;
                const closestPos = closest ? 
                  closest.getBoundingClientRect().top + currentScrollTop : 0;
                  
                const closestDist = Math.abs(currentScrollTop - closestPos);
                const elementDist = Math.abs(currentScrollTop - elementPos);
                
                return elementDist < closestDist ? element : closest;
              }, null);
            }
            
            if (targetElement) {
              targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
              });
              return true;
            }
          }
          
          // Try text nodes as fallback
          try {
            const walker = document.createTreeWalker(
              iframe.contentDocument.body,
              NodeFilter.SHOW_TEXT,
              null,
              false
            );
            
            const textMatches = [];
            let node;
            
            while ((node = walker.nextNode())) {
              if (node.textContent && node.textContent.toLowerCase().includes(searchText)) {
                textMatches.push(node);
              }
            }
            
            if (textMatches.length > 0) {
              // Use first match for simplicity
              const firstMatch = textMatches[0];
              if (firstMatch.parentElement) {
                firstMatch.parentElement.scrollIntoView({
                  behavior: 'smooth',
                  block: 'center'
                });
                return true;
              }
            }
          } catch (err) {
            console.error('Error in text node search:', err);
          }
        }
        
        // If we have a position value as fallback
        if (typeof nodeData.position === 'number') {
          const scrollHeight = iframe.contentDocument.body.scrollHeight;
          const clientHeight = iframe.contentWindow.innerHeight;
          const maxScroll = Math.max(1, scrollHeight - clientHeight);
          const targetPosition = Math.floor(nodeData.position * maxScroll);
          
          iframe.contentWindow.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
          return true;
        }
        
        return false;
      } catch (err) {
        console.error('Error in scrollToNode:', err);
        return false;
      }
    },
    
    // Method aliases
    jumpToPosition(positionData) {
      return this.scrollToNode(positionData);
    },
    
    // No-op method required by some components
    setScrollAnimating(isAnimating) {
      console.log(`scrollAnimating set to ${isAnimating}`);
    }
  }));
  
  // Render the component - don't pass ref as it would create circular reference
  return <TeleprompterViewer {...props} />;
});