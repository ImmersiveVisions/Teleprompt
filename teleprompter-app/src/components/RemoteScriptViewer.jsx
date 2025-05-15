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
  isHighDPI = false // Add high DPI mode prop
}, ref) => {
  const [script, setScript] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  
  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    // Method to scroll to a specific node/position
    scrollToNode: (data) => {
      if (!containerRef.current || !script) {
        console.error('RemoteScriptViewer: Cannot scroll - container or content not available');
        return false;
      }

      try {
        // Get the iframe element directly
        const iframe = document.getElementById('teleprompter-frame');
        if (!iframe || !iframe.contentWindow || !iframe.contentDocument) {
          console.error('RemoteScriptViewer: Cannot scroll - iframe not accessible');
          return false;
        }
        
        const scrollContainer = iframe.contentDocument.body || iframe.contentDocument.documentElement;
        let targetPosition;
        
        // Clean up any existing animation
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        
        // Get container dimensions for calculations
        const containerHeight = scrollContainer.clientHeight;
        const containerScrollHeight = scrollContainer.scrollHeight;
        
        let textPosition = -1;
        
        // Check if we have search text to find within the content
        if (data && typeof data === 'object' && data.text) {
          console.log(`RemoteScriptViewer: Searching for text: "${data.text.substring(0, 30)}..."`);
          
          // For more accurate positioning, use the lineIndex if available
          if (data.lineIndex !== undefined && data.lineIndex >= 0) {
            // We have a line index, so we need to find the line
            console.log(`RemoteScriptViewer: Using line index ${data.lineIndex} for positioning`);
            
            // Find all text nodes in the document
            const textNodes = [];
            const walk = document.createTreeWalker(
              scrollContainer,
              NodeFilter.SHOW_TEXT,
              null,
              false
            );
            
            let node;
            let allText = '';
            while (node = walk.nextNode()) {
              const text = node.nodeValue.trim();
              if (text) {
                allText += text + '\n';
                textNodes.push({
                  node: node,
                  text: text
                });
              }
            }
            
            // Split text into lines
            const lines = allText.split('\n');
            
            // Ensure we have the line
            if (data.lineIndex < lines.length) {
              // Find the line in the DOM
              let foundNode = null;
              for (const nodeInfo of textNodes) {
                if (nodeInfo.text.includes(data.text) || 
                    (data.lineContent && nodeInfo.text.includes(data.lineContent))) {
                  foundNode = nodeInfo.node;
                  break;
                }
              }
              
              if (foundNode) {
                // Get the element position
                const range = document.createRange();
                range.selectNodeContents(foundNode);
                const rect = range.getBoundingClientRect();
                const nodePosition = rect.top + iframe.contentWindow.scrollY;
                
                // Position the text at the center of the viewport
                textPosition = nodePosition;
              }
            }
          }
          
          // If we didn't find using line index, try searching for the text
          if (textPosition === -1) {
            // Fallback: Search through text nodes for the given content
            const searchText = data.text.trim().toLowerCase();
            const allElements = iframe.contentDocument.body.querySelectorAll('*');
            let foundElement = null;
            
            for (let i = 0; i < allElements.length; i++) {
              const element = allElements[i];
              if (element.innerText && element.innerText.toLowerCase().includes(searchText)) {
                foundElement = element;
                break;
              }
            }
            
            if (foundElement) {
              const rect = foundElement.getBoundingClientRect();
              textPosition = rect.top + iframe.contentWindow.scrollY;
            }
          }
        }
        
        // Now determine the final target position
        if (textPosition >= 0) {
          // We found a matching text position - center it in the viewport
          targetPosition = Math.max(0, textPosition - (containerHeight / 2));
          console.log(`RemoteScriptViewer: Using text position ${textPosition}px, centering to ${targetPosition}px`);
        } else {
          // Use normal position calculation as a fallback
          if (typeof data === 'number') {
            // Simple percentage position (0-1)
            targetPosition = data * containerScrollHeight;
          } else if (data && typeof data === 'object') {
            // Complex position object
            if (data.position !== undefined) {
              // Normalized position (0-1)
              targetPosition = data.position * containerScrollHeight;
            } else if (data.absolutePosition !== undefined) {
              // Absolute pixel position
              targetPosition = data.absolutePosition;
            } else if (data.characterPosition !== undefined && data.totalChars) {
              // Character position scaled to container height
              targetPosition = (data.characterPosition / data.totalChars) * containerScrollHeight;
            } else {
              console.error('RemoteScriptViewer: Invalid position data:', data);
              return false;
            }
          } else {
            console.error('RemoteScriptViewer: Invalid scroll data:', data);
            return false;
          }
        }
        
        // Ensure position is within bounds
        targetPosition = Math.max(0, Math.min(containerScrollHeight - containerHeight, targetPosition));
        
        console.log(`RemoteScriptViewer: Scrolling to position ${targetPosition}px/${containerScrollHeight}px`);
        
        // Smooth scroll to position
        iframe.contentWindow.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
        
        // Send this position to viewers (broadcast)
        const normalizedPosition = targetPosition / (containerScrollHeight > 0 ? containerScrollHeight : 1);
        console.log(`RemoteScriptViewer: Broadcasting position ${normalizedPosition.toFixed(4)} to viewers`);
        
        // Create a more comprehensive position object to ensure accurate positioning in viewers
        const searchData = {
          // Standard normalized position (always include for backward compatibility)
          position: normalizedPosition,
          
          // Enhanced positioning information
          absolutePosition: targetPosition,
          containerHeight: containerHeight,
          containerScrollHeight: containerScrollHeight,
          
          // Text content for searching
          text: data?.text?.substring(0, 100),
          lineIndex: data?.lineIndex,
          lineContent: data?.lineContent,
          
          // Special flags
          fromSearch: true,
          fromRemote: true, // Flag to identify as coming from remote
          origin: 'remote', // Identify source clearly
          remoteSearch: true, // Additional flag for filtering
          
          // Debugging information
          timestamp: Date.now(),
          source: 'remote-search'
        };
        
        sendSearchPosition(searchData);
        
        // Highlight the area for better visibility
        try {
          // Create a temporary highlight element
          const highlight = document.createElement('div');
          highlight.className = 'search-result-highlight';
          highlight.style.cssText = `
            position: absolute;
            left: 0;
            width: 100%;
            height: 50px;
            background-color: rgba(255, 165, 0, 0.3);
            border-top: 2px solid orange;
            border-bottom: 2px solid orange;
            z-index: 1000;
            pointer-events: none;
            animation: pulse-highlight 2s ease-in-out;
          `;
          
          // Add animation if it doesn't exist
          if (!document.getElementById('highlight-keyframes')) {
            const keyframes = document.createElement('style');
            keyframes.id = 'highlight-keyframes';
            keyframes.textContent = `
              @keyframes pulse-highlight {
                0% { opacity: 0; }
                25% { opacity: 1; }
                75% { opacity: 1; }
                100% { opacity: 0; }
              }
            `;
            document.head.appendChild(keyframes);
          }
          
          // Position it at the target scroll position - centered in the viewport
          const highlightPosition = textPosition >= 0 ? textPosition - 25 : targetPosition;
          highlight.style.top = `${highlightPosition}px`;
          
          // Append it to the container
          if (iframe.contentDocument.body.style.position !== 'relative') {
            iframe.contentDocument.body.style.position = 'relative';
          }
          iframe.contentDocument.body.appendChild(highlight);
          
          // Remove after animation completes
          setTimeout(() => {
            if (highlight.parentNode) {
              highlight.parentNode.removeChild(highlight);
            }
          }, 2000);
        } catch (highlightErr) {
          console.error('Error creating highlight:', highlightErr);
          // Non-critical error, continue
        }
        
        return true;
      } catch (error) {
        console.error('RemoteScriptViewer: Error scrolling to position:', error);
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
              console.log(`RemoteScriptViewer: No content found, trying to load full content for ${scriptObj.id}`);
              const fullScript = await fileSystemRepository.getScriptContent(scriptObj.id);
              
              if (fullScript && (fullScript.content || fullScript.body)) {
                scriptObj.content = fullScript.content || fullScript.body;
                content = scriptObj.content;
                console.log(`RemoteScriptViewer: Loaded full content, length: ${content.length}`);
              }
            } catch (contentError) {
              console.error(`RemoteScriptViewer: Error loading full content: ${contentError}`);
            }
          }
          
          // Debug the script content
          console.log('RemoteScriptViewer: Loading script:', {
            id: scriptObj.id,
            title: scriptObj.title,
            contentLength: content.length,
            content: content.substring(0, 100) + "...",
            keys: Object.keys(scriptObj)
          });
          
          // Check if this is a fountain or HTML file
          const isFountain = scriptObj.id.toLowerCase().endsWith('.fountain') ||
                            (scriptObj.fileExtension && scriptObj.fileExtension.toLowerCase() === 'fountain');
          const isHtml = scriptObj.id.toLowerCase().endsWith('.html') || 
                         scriptObj.id.toLowerCase().endsWith('.htm');
          
          // Add these properties to the script object
          scriptObj.isFountain = isFountain;
          scriptObj.isHtml = isHtml;
          
          setScript(scriptObj);
        } else {
          console.error('Script not found with ID:', scriptId);
        }
      } catch (error) {
        console.error('Error loading script:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadScript();
  }, [scriptId]);
  
  // Handle scrolling animation - matching ViewerComponent's scrolling implementation
  useEffect(() => {
    if (!containerRef.current || !script || !isIframeLoaded) return;
    
    // Get the iframe
    const iframe = document.getElementById('teleprompter-frame');
    if (!iframe || !iframe.contentWindow || !iframe.contentDocument) {
      console.error('RemoteScriptViewer: Cannot find iframe for animation');
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
      
      console.log('RemoteScriptViewer: Starting auto-scroll:', {
        startPos,
        targetPos,
        scrollHeight,
        duration: scrollDuration,
        speed
      });
      
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
      console.error('RemoteScriptViewer: Error in auto-scroll effect:', error);
    }
    
    // Return cleanup function
    return cleanupAnimation;
  }, [isPlaying, speed, direction, script, isIframeLoaded, isHighDPI]);
  
  // Handler for iframe load event
  const handleIframeLoad = () => {
    console.log('RemoteScriptViewer: Iframe loaded');
    setIsIframeLoaded(true);
    
    // Apply consistent styling to match the ViewerComponent
    try {
      const iframe = document.getElementById('teleprompter-frame');
      if (iframe && iframe.contentDocument) {
        // Apply styles to iframe body for consistency
        if (iframe.contentDocument.body) {
          // Set up script inspection function to log what script elements are present
          setTimeout(() => {
            try {
              const doc = iframe.contentDocument;
              // Find paragraphs with padding-left or text-align to identify potential script elements
              const scriptElements = doc.querySelectorAll('p[style*="padding-left"], p[style*="text-align"]');
              console.log(`RemoteScriptViewer: Found ${scriptElements.length} potential script elements`);
              
              if (scriptElements.length > 0) {
                // Log a few examples
                const examples = Array.from(scriptElements).slice(0, 5);
                examples.forEach((el, i) => {
                  console.log(`Element ${i}:`, {
                    style: el.getAttribute('style'),
                    textContent: el.textContent.substring(0, 30) + (el.textContent.length > 30 ? '...' : ''),
                    classList: Array.from(el.classList)
                  });
                });
              }
            } catch (err) {
              console.error('Error inspecting script elements:', err);
            }
          }, 1000);
          
          // Add a style element to ensure consistent styling with ViewerPage
          const styleElement = document.createElement('style');
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
          // REMOVED: iframe.contentDocument.body.style.textAlign = 'center';
          iframe.contentDocument.body.style.padding = '20px';
          iframe.contentDocument.body.style.fontWeight = 'bold';
          iframe.contentDocument.body.style.margin = '0';
          
          // Create a function to apply script element styling directly
          setTimeout(() => {
            try {
              // Apply styling directly to script elements based on their attributes
              const allParagraphs = iframe.contentDocument.querySelectorAll('p');
              console.log(`RemoteScriptViewer: Found ${allParagraphs.length} paragraphs to check for script elements`);
              
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
                  console.log('Applied CHARACTER NAME styling to:', p.textContent.substring(0, 30));
                }
                
                // Dialog text
                else if (style.includes('padding-left: 94pt') || 
                         style.includes('padding-left: 93pt')) {
                  p.style.color = 'white';
                  p.style.textAlign = 'center';
                  p.style.marginTop = '0';
                  p.style.marginBottom = '1em';
                  console.log('Applied DIALOG styling to:', p.textContent.substring(0, 30));
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
                  console.log('Applied PARENTHETICAL styling to:', p.textContent.substring(0, 30));
                }
                
                // Scene headings
                else if (style.includes('padding-left: 22pt')) {
                  p.style.color = '#ADD8E6';
                  p.style.fontWeight = 'bold';
                  p.style.textAlign = 'center';
                  p.style.marginTop = '1.5em';
                  p.style.marginBottom = '0.5em';
                  console.log('Applied SCENE HEADING styling to:', p.textContent.substring(0, 30));
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
                  console.log('Applied TRANSITION styling to:', p.textContent.substring(0, 30));
                }
                
                // Default text alignment for other elements
                else {
                  p.style.textAlign = 'left';
                }
              });
              
            } catch (err) {
              console.error('Error applying direct styling to script elements:', err);
            }
          }, 1500); // Delay to ensure content is fully loaded
          
          // Mark the iframe as loaded with a data attribute
          iframe.dataset.loaded = 'true';
        }
      }
    } catch (error) {
      console.error('RemoteScriptViewer: Error applying styles to iframe:', error);
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