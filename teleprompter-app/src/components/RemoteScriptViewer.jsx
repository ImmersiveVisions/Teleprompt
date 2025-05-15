// src/components/RemoteScriptViewer.jsx
// A simplified script viewer specifically for the Remote page
// This is a dedicated component that doesn't share code with the main ViewerComponent

import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import fileSystemRepository from '../database/fileSystemRepository';
import { sendSearchPosition } from '../services/websocket';
import ViewerFrame from './ui/ViewerFrame';
import HighlightRenderer from './HighlightRenderer';

/**
 * RemoteScriptViewer - A simplified script viewer for the Remote page
 * This component provides a basic script viewing experience specifically for tablets/mobile
 */
const RemoteScriptViewer = forwardRef(({ 
  scriptId, 
  isPlaying,
  speed = 1,
  direction = 'forward',
  fontSize = 24,
  isFlipped = false,
  isHighDPI = false, // Add high DPI mode prop
  onPositionChange // Callback for position changes
}, ref) => {
  const [script, setScript] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const isUserScrollingRef = useRef(false);
  const lastScrollPositionRef = useRef(0);
  
  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    // Method to scroll to a specific node/position using line-based navigation
    scrollToNode: (data) => {
      if (!containerRef.current || !script) {
        return false;
      }

      try {
        // Get the iframe element directly
        const iframe = document.getElementById('teleprompter-frame');
        if (!iframe || !iframe.contentWindow || !iframe.contentDocument) {
          return false;
        }
        
        // Get scroll container
        const scrollContainer = iframe.contentDocument.body || iframe.contentDocument.documentElement;
        const containerScrollHeight = scrollContainer.scrollHeight;
        
        // Determine if we have line index information
        if (data && typeof data === 'object' && data.lineIndex !== undefined && data.totalLines) {
          // Calculate position as pure ratio of document height
          const lineRatio = data.lineIndex / data.totalLines;
          const targetPosition = lineRatio * containerScrollHeight;
          
          // Method 1: Direct scrolling for immediate positioning
          scrollContainer.scrollTop = targetPosition;
          
          // Method 2: Use window scrollTo for backup
          iframe.contentWindow.scrollTo({
            top: targetPosition,
            behavior: 'auto'
          });
          
          // Add a subtle highlight marker
          try {
            // Clean up any existing markers
            const existingMarkers = iframe.contentDocument.querySelectorAll('.search-position-marker');
            existingMarkers.forEach(el => {
              if (el.parentNode) el.parentNode.removeChild(el);
            });
            
            // Create a subtle highlight
            const marker = document.createElement('div');
            marker.className = 'search-position-marker';
            marker.style.cssText = `
              position: absolute;
              left: 0;
              width: 100%;
              height: 80px;
              background-color: rgba(255, 165, 0, 0.3);
              border-top: 2px solid orange;
              border-bottom: 2px solid orange;
              top: ${targetPosition - 40}px;
              z-index: 1000;
              pointer-events: none;
            `;
            scrollContainer.appendChild(marker);
            
            // Position the target in the top 20% of the viewport
            setTimeout(() => {
              const viewportHeight = iframe.contentWindow.innerHeight;
              // Calculate position to show result in top 20% of screen
              const topPosition = targetPosition - (viewportHeight * 0.2);
              
              iframe.contentWindow.scrollTo({
                top: topPosition > 0 ? topPosition : 0,
                behavior: 'smooth'
              });
            }, 50);
            
            // Remove marker after a delay
            setTimeout(() => {
              if (marker.parentNode) marker.parentNode.removeChild(marker);
            }, 3000);
          } catch (markErr) {
            // Silently ignore marker errors
          }
          
          return true;
        } else {
          return false;
        }
      } catch (error) {
        return false;
      }
    }
  }));
  
  // Load script content
  useEffect(() => {
    const loadScript = async () => {
      if (!scriptId) return;
      
      setIsLoading(true);
      try {
        const scriptObj = await fileSystemRepository.getScriptById(scriptId);
        if (scriptObj) {
          // Get script content safely
          let content = scriptObj.content || scriptObj.body || "";
          
          // If no content is available, try to get full content
          if (!content && scriptObj.id) {
            try {
              const fullScript = await fileSystemRepository.getScriptContent(scriptObj.id);
              
              if (fullScript && (fullScript.content || fullScript.body)) {
                scriptObj.content = fullScript.content || fullScript.body;
                content = scriptObj.content;
              }
            } catch (contentError) {
              // Silently handle content loading errors
            }
          }
          
          // Check if this is a fountain or HTML file
          const isFountain = scriptObj.id.toLowerCase().endsWith('.fountain') ||
                            (scriptObj.fileExtension && scriptObj.fileExtension.toLowerCase() === 'fountain');
          const isHtml = scriptObj.id.toLowerCase().endsWith('.html') || 
                         scriptObj.id.toLowerCase().endsWith('.htm');
          
          // Add these properties to the script object
          scriptObj.isFountain = isFountain;
          scriptObj.isHtml = isHtml;
          
          setScript(scriptObj);
        }
      } catch (error) {
        // Silently handle script loading errors
      } finally {
        setIsLoading(false);
      }
    };
    
    loadScript();
  }, [scriptId]);
  
  // Add effect to update font size when it changes
  useEffect(() => {
    if (!script || !isIframeLoaded) return;
    
    const iframe = document.getElementById('teleprompter-frame');
    if (!iframe || !iframe.contentDocument) return;
    
    try {
      console.log('RemoteScriptViewer: Updating font size to', fontSize);
      
      // Apply font size to existing style element
      const styleElement = iframe.contentDocument.getElementById('responsive-font-style') || 
                         iframe.contentDocument.createElement('style');
      styleElement.id = 'responsive-font-style';
      styleElement.textContent = `
        body {
          background-color: black !important;
          color: white !important;
          font-family: 'Courier New', monospace !important;
          font-size: ${fontSize}px !important;
          line-height: 1.5 !important;
          padding: 20px !important;
          font-weight: bold !important;
          margin: 0 !important;
          scroll-behavior: smooth !important;
        }
        
        /* Apply font size to all text elements */
        body *, p, div, span, h1, h2, h3, h4, h5, h6, li, td, th, label, a {
          font-size: ${fontSize}px !important;
        }
      `;
      
      if (!styleElement.parentNode) {
        iframe.contentDocument.head.appendChild(styleElement);
      }
      
      // Also set direct style for immediate effect
      if (iframe.contentDocument.body) {
        iframe.contentDocument.body.style.fontSize = `${fontSize}px`;
      }
    } catch (error) {
      console.error('Error updating font size:', error);
    }
  }, [fontSize, script, isIframeLoaded]);

  // Handle scrolling animation - matching ViewerComponent's scrolling implementation
  useEffect(() => {
    if (!containerRef.current || !script || !isIframeLoaded) return;
    
    // Get the iframe
    const iframe = document.getElementById('teleprompter-frame');
    if (!iframe || !iframe.contentWindow || !iframe.contentDocument) {
      return;
    }
    
    // Cleanup previous animation
    const cleanupAnimation = () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
    
    // First, clean up any existing animation
    cleanupAnimation();
    
    // If not playing, do nothing more
    if (!isPlaying) {
      return cleanupAnimation;
    }
    
    try {
      const scrollContainer = iframe.contentDocument.documentElement;
      
      // Calculate scrolling parameters
      const scrollHeight = scrollContainer.scrollHeight;
      const clientHeight = iframe.contentWindow.innerHeight;
      
      // Get current position
      const startPos = iframe.contentWindow.scrollY || 0;
      
      // Calculate target position based on direction
      const targetPos = direction === 'forward' ? 
        scrollHeight - clientHeight : 0;
      
      // Base reading speed in pixels per second (match ViewerComponent)
      const baseScrollSpeed = 100; // pixels per second
      
      // Apply high DPI multiplier if enabled (increases the scroll speed by 50%)
      const dpiMultiplier = isHighDPI ? 1.5 : 1.0;
      const adjustedSpeed = baseScrollSpeed * speed * dpiMultiplier;
      
      // Calculate duration in milliseconds based on content length
      const remainingScroll = Math.abs(targetPos - startPos);
      const scrollDuration = Math.max(1000, Math.round((remainingScroll / adjustedSpeed) * 1000));
      
      // Start the animation with smooth interpolation
      const startTime = performance.now();
      
      const animateScroll = (timestamp) => {
        // Check if we're still supposed to be playing
        if (!isPlaying) {
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
          animationRef.current = null;
        }
      };
      
      // Start the animation
      animationRef.current = requestAnimationFrame(animateScroll);
      
    } catch (error) {
      // Silently handle animation errors
    }
    
    // Return cleanup function
    return cleanupAnimation;
  }, [isPlaying, speed, direction, script, isIframeLoaded, isHighDPI]);
  
  // Calculate the current line position based on scrolling
  const calculateLinePosition = () => {
    try {
      if (!script || !isIframeLoaded) return null;
      
      const iframe = document.getElementById('teleprompter-frame');
      if (!iframe || !iframe.contentDocument) return null;
      
      const scrollContainer = iframe.contentDocument.documentElement || iframe.contentDocument.body;
      const scrollTop = scrollContainer.scrollTop;
      const scrollHeight = scrollContainer.scrollHeight;
      const clientHeight = iframe.contentWindow.innerHeight;
      
      // If the script content is available, calculate line position
      const scriptContent = script.content || script.body || "";
      if (scriptContent) {
        const lines = scriptContent.split("\n");
        const totalLines = lines.length;
        
        // Calculate the current line index based on scroll position
        const scrollRatio = scrollTop / (scrollHeight - clientHeight);
        const estimatedLineIndex = Math.round(scrollRatio * totalLines);
        
        // Find the actual visible line at the top of the viewport
        let topLine = null;
        try {
          // Try to find elements that intersect with the top of the viewport
          const paragraphs = Array.from(iframe.contentDocument.querySelectorAll('p, div, span, h1, h2, h3, h4, h5, h6'));
          
          if (paragraphs.length > 0) {
            // Sort by their vertical position
            const visibleElements = paragraphs
              .filter(el => {
                const rect = el.getBoundingClientRect();
                // Element must be visible in the viewport (adjusted for iframe)
                return rect.top >= 0 && rect.top <= clientHeight && rect.height > 0;
              })
              .sort((a, b) => {
                const rectA = a.getBoundingClientRect();
                const rectB = b.getBoundingClientRect();
                return rectA.top - rectB.top;
              });
            
            // Get the topmost visible element
            if (visibleElements.length > 0) {
              topLine = {
                element: visibleElements[0],
                text: visibleElements[0].textContent,
                index: estimatedLineIndex
              };
            }
          }
        } catch (elemErr) {
          console.error("Error finding visible elements:", elemErr);
        }
        
        return {
          lineIndex: estimatedLineIndex,
          totalLines: totalLines,
          position: scrollRatio,
          topText: topLine ? topLine.text : null,
          scrollTop,
          scrollHeight,
          lineBasedNavigation: true
        };
      }
    } catch (error) {
      console.error("Error calculating line position:", error);
    }
    
    return null;
  };
  
  // Handle scrolling events in the iframe content
  useEffect(() => {
    if (!isIframeLoaded || !script) return;
    
    const iframe = document.getElementById('teleprompter-frame');
    if (!iframe || !iframe.contentWindow) return;
    
    // Handler for scroll events
    const handleScroll = () => {
      // Skip position updates during playback
      if (isPlaying) return;
      
      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Mark that user is scrolling
      isUserScrollingRef.current = true;
      
      // Set a timeout to detect when scrolling stops
      scrollTimeoutRef.current = setTimeout(() => {
        isUserScrollingRef.current = false;
        
        // Calculate current line position
        const positionData = calculateLinePosition();
        if (positionData) {
          // Add metadata for routing
          const data = {
            ...positionData,
            origin: 'remote',
            fromRemote: true,
            manualScroll: true,
            timestamp: Date.now()
          };
          
          // Only send if the position has changed significantly
          const newScrollTop = positionData.scrollTop;
          if (Math.abs(newScrollTop - lastScrollPositionRef.current) > 50) {
            lastScrollPositionRef.current = newScrollTop;
            console.log('RemoteScriptViewer: Sending position update after manual scroll', data);
            
            // Add more debugging information to help trace the issue
            console.log('🚀 RemoteScriptViewer: Sending SEARCH_POSITION with data:', {
              lineIndex: data.lineIndex,
              totalLines: data.totalLines,
              position: data.position,
              origin: data.origin,
              fromRemote: data.fromRemote,
              lineBasedNavigation: data.lineBasedNavigation,
              timestamp: data.timestamp
            });
            
            // Send position via WebSocket - ensure this happens
            try {
              sendSearchPosition(data);
              console.log('✅ RemoteScriptViewer: Successfully called sendSearchPosition');
            } catch (error) {
              console.error('❌ RemoteScriptViewer: Error sending position update:', error);
            }
            
            // Call the callback if provided
            if (typeof onPositionChange === 'function') {
              onPositionChange(data);
            }
          }
        }
      }, 200); // Wait 200ms after scrolling stops
    };
    
    // Add scroll listener to iframe content
    try {
      iframe.contentWindow.addEventListener('scroll', handleScroll, { passive: true });
    } catch (error) {
      console.error('Error adding scroll listener to iframe:', error);
    }
    
    // Cleanup
    return () => {
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.removeEventListener('scroll', handleScroll);
        } catch (error) {
          // Silently handle cleanup errors
        }
      }
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [isIframeLoaded, script, isPlaying, onPositionChange]);
  
  // Handler for iframe load event
  const handleIframeLoad = () => {
    setIsIframeLoaded(true);
    
    // Apply consistent styling to match the ViewerComponent
    try {
      const iframe = document.getElementById('teleprompter-frame');
      if (iframe && iframe.contentDocument) {
        // Apply styles to iframe body for consistency
        if (iframe.contentDocument.body) {
          // Add a style element to ensure consistent styling with ViewerPage
          const styleElement = document.createElement('style');
          styleElement.id = 'responsive-font-style'; // Add ID for easier updates
          styleElement.textContent = `
            body {
              background-color: black !important;
              color: white !important;
              font-family: 'Courier New', monospace !important;
              font-size: ${fontSize}px !important;
              line-height: 1.5 !important;
              padding: 20px !important;
              font-weight: bold !important;
              margin: 0 !important;
              /* Add smooth scrolling for better search experience */
              scroll-behavior: smooth !important;
            }
            
            /* CRITICAL FIX: Do NOT set text-align: center on body to prevent conflicting styles.
               Instead, we'll set it element by element only where needed */
            
            /* SCRIPT ELEMENTS - Specific selectors with highest specificity
               to override any other styles already present in the DOM */
            
            /* CHARACTER NAMES - SCRIPT ELEMENTS */
            body p[style*="padding-left: 166pt"],
            body p[style*="padding-left: 165pt"],
            body p[style*="padding-left: 178pt"],
            body p[style*="padding-left: 142pt"],
            body p[style*="padding-left: 40pt"],
            body p[style*="padding-left: 84pt"],
            body p[style*="padding-left: 65pt"],
            body p[style*="padding-left: 77pt"] {
              color: #FFD700 !important; /* Gold color for character names */
              font-weight: bold !important;
              text-align: center !important; 
              margin-bottom: 0 !important;
              background-color: rgba(255, 215, 0, 0.1) !important; /* Subtle highlight for debugging */
            }
            
            /* DIALOG TEXT - SCRIPT ELEMENTS */
            body p[style*="padding-left: 94pt"],
            body p[style*="padding-left: 93pt"] {
              color: white !important;
              text-align: center !important;
              margin-top: 0 !important;
              margin-bottom: 1em !important;
            }
            
            /* PARENTHETICALS - SCRIPT ELEMENTS */
            body p[style*="padding-left: 123pt"],
            body p[style*="padding-left: 129pt"],
            body p[style*="padding-left: 121pt"],
            body p[style*="padding-left: 122pt"],
            body p[style*="padding-left: 136pt"] {
              color: #BBBBBB !important; /* Light gray for parentheticals */
              font-style: italic !important;
              text-align: center !important;
              margin-top: 0 !important;
              margin-bottom: 0 !important;
            }
            
            /* SCENE HEADINGS - SCRIPT ELEMENTS */
            body p[style*="padding-left: 22pt"] {
              color: #ADD8E6 !important; /* Light blue for scene headings */
              font-weight: bold !important;
              text-align: center !important;
              margin-top: 1.5em !important;
              margin-bottom: 0.5em !important;
            }
            
            /* TRANSITIONS - SCRIPT ELEMENTS */
            body p[style*="text-align: right"],
            body p:contains("CUT TO:"),
            body p:contains("FADE TO:"),
            body p:contains("DISSOLVE TO:") {
              color: #FFA07A !important; /* Light salmon for transitions */
              font-weight: bold !important;
              text-transform: uppercase !important;
              text-align: center !important;
              margin-top: 1em !important;
              margin-bottom: 1em !important;
            }
            
            /* Additional catch-all selectors for common screenplay elements
               - Adding maximum specificity with body prefix */
            body p[style*="margin-left"],
            body [class*="character"],
            body [class*="Character"], 
            body [data-type="dialog"],
            body [data-type="character"],
            body [class*="dialog"], 
            body [class*="scene"] { 
              text-align: center !important;
            }
          `;
          
          iframe.contentDocument.head.appendChild(styleElement);
          
          // Also set direct styles for immediate effect, but DO NOT set textAlign globally
          iframe.contentDocument.body.style.backgroundColor = 'black';
          iframe.contentDocument.body.style.color = 'white';
          iframe.contentDocument.body.style.fontFamily = 'Courier New, monospace';
          iframe.contentDocument.body.style.fontSize = `${fontSize}px`;
          iframe.contentDocument.body.style.lineHeight = '1.5';
          iframe.contentDocument.body.style.padding = '20px';
          iframe.contentDocument.body.style.fontWeight = 'bold';
          iframe.contentDocument.body.style.margin = '0';
          
          // Apply styling directly to script elements based on their attributes
          setTimeout(() => {
            try {
              const allParagraphs = iframe.contentDocument.querySelectorAll('p');
              
              allParagraphs.forEach(p => {
                const style = p.getAttribute('style') || '';
                
                // Character names
                if (style.includes('padding-left: 166pt') || 
                    style.includes('padding-left: 165pt') ||
                    style.includes('padding-left: 178pt') ||
                    style.includes('padding-left: 142pt') ||
                    style.includes('padding-left: 40pt') ||
                    style.includes('padding-left: 84pt') ||
                    style.includes('padding-left: 65pt') ||
                    style.includes('padding-left: 77pt')) {
                  p.style.color = '#FFD700';
                  p.style.fontWeight = 'bold';
                  p.style.textAlign = 'center';
                  p.style.marginBottom = '0';
                  p.style.backgroundColor = 'rgba(255, 215, 0, 0.1)';
                }
                
                // Dialog text
                else if (style.includes('padding-left: 94pt') || 
                         style.includes('padding-left: 93pt')) {
                  p.style.color = 'white';
                  p.style.textAlign = 'center';
                  p.style.marginTop = '0';
                  p.style.marginBottom = '1em';
                }
                
                // Parentheticals
                else if (style.includes('padding-left: 123pt') ||
                         style.includes('padding-left: 129pt') ||
                         style.includes('padding-left: 121pt') ||
                         style.includes('padding-left: 122pt') ||
                         style.includes('padding-left: 136pt')) {
                  p.style.color = '#BBBBBB';
                  p.style.fontStyle = 'italic';
                  p.style.textAlign = 'center';
                  p.style.marginTop = '0';
                  p.style.marginBottom = '0';
                }
                
                // Scene headings
                else if (style.includes('padding-left: 22pt')) {
                  p.style.color = '#ADD8E6';
                  p.style.fontWeight = 'bold';
                  p.style.textAlign = 'center';
                  p.style.marginTop = '1.5em';
                  p.style.marginBottom = '0.5em';
                }
                
                // Transitions
                else if (style.includes('text-align: right') ||
                         p.textContent.includes('CUT TO:') ||
                         p.textContent.includes('FADE TO:') ||
                         p.textContent.includes('DISSOLVE TO:')) {
                  p.style.color = '#FFA07A';
                  p.style.fontWeight = 'bold';
                  p.style.textTransform = 'uppercase';
                  p.style.textAlign = 'center';
                  p.style.marginTop = '1em';
                  p.style.marginBottom = '1em';
                }
                
                // Default text alignment for other elements
                else {
                  p.style.textAlign = 'left';
                }
              });
              
            } catch (err) {
              // Silently ignore styling errors
            }
          }, 1500); // Delay to ensure content is fully loaded
          
          // Mark the iframe as loaded with a data attribute
          iframe.dataset.loaded = 'true';
        }
      }
    } catch (error) {
      // Silently ignore errors
    }
  };
  
  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <div className="loading-message">Loading script...</div>
        </div>
      </div>
    );
  }
  
  if (!script) {
    return (
      <div className="no-script-message" style={{ 
        color: 'white', 
        textAlign: 'center',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%'
      }}>
        No script selected
      </div>
    );
  }
  
  // Always use 16:9 aspect ratio with no option to change
  const aspectRatio = '16/9';
  
  return (
    <div 
      className="teleprompter-viewer screenplay-container"
      style={{ 
        backgroundColor: 'black',
        color: 'white',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        margin: 0,
        padding: 0,
        border: 'none',
        boxSizing: 'border-box',
        transform: isFlipped ? 'scaleX(-1)' : 'none'
      }}
    >
      {/* Apply similar styles as ViewerPage for consistency */}
      <div style={{
        width: '100%',
        height: '100%',
        maxWidth: '100vw',
        maxHeight: '100vh',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <ViewerFrame
          script={script}
          containerRef={containerRef}
          aspectRatio={aspectRatio}
          isIframeLoaded={isIframeLoaded}
          handleIframeLoad={handleIframeLoad}
          fontSize={fontSize}
        />
        
        {/* Character highlighting */}
        {script && script.id && isIframeLoaded && (
          <HighlightRenderer
            scriptId={script.id}
            containerId="teleprompter-frame"
            contentSelector="body"
            enabled={true}
          />
        )}
      </div>
    </div>
  );
});

export default RemoteScriptViewer;