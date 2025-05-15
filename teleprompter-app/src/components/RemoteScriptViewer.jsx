// src/components/RemoteScriptViewer.jsx
// A simplified script viewer specifically for the Remote page
// This is a dedicated component that doesn't share code with the main ViewerComponent

import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import fileSystemRepository from '../database/fileSystemRepository';
import { sendSearchPosition } from '../services/websocket';

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
  const [scriptContent, setScriptContent] = useState(null);
  const [scriptTitle, setScriptTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  
  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    // Method to scroll to a specific node/position
    scrollToNode: (data) => {
      if (!containerRef.current || !scriptContent) {
        console.error('RemoteScriptViewer: Cannot scroll - container or content not available');
        return false;
      }

      try {
        const scrollContainer = containerRef.current;
        let targetPosition;
        
        // Clean up any existing animation
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        
        // Get container dimensions for calculations
        const containerHeight = scrollContainer.clientHeight;
        const containerScrollHeight = scrollContainer.scrollHeight;
        
        // Find the search text in the container if available
        let textPosition = -1;
        let targetElement = null;
        
        // Check if we have search text to find within the content
        if (data && typeof data === 'object' && data.text) {
          console.log(`RemoteScriptViewer: Searching for text: "${data.text.substring(0, 30)}..."`);
          
          // Try to find the text directly in the content
          // We're using a simple approach by creating temp divs for each line
          // and measuring their heights to estimate position
          const lines = scriptContent.split('\n');
          const searchText = data.text.trim().toLowerCase();
          
          // For more accurate positioning, use the lineIndex if available
          if (data.lineIndex !== undefined && data.lineIndex >= 0 && data.lineIndex < lines.length) {
            // We have the exact line index, so use that for most accurate positioning
            console.log(`RemoteScriptViewer: Using line index ${data.lineIndex} for positioning`);
            
            // Create a temporary container to measure text height
            const tempDiv = document.createElement('div');
            tempDiv.style.cssText = `
              position: absolute;
              top: -9999px;
              left: -9999px;
              width: ${scrollContainer.clientWidth}px;
              font-size: ${fontSize}px;
              font-family: ${window.getComputedStyle(scrollContainer).fontFamily};
              white-space: pre-wrap;
              visibility: hidden;
            `;
            document.body.appendChild(tempDiv);
            
            // Calculate height of preceding text
            let heightBefore = 0;
            for (let i = 0; i < data.lineIndex; i++) {
              tempDiv.textContent = lines[i];
              heightBefore += tempDiv.clientHeight;
            }
            
            // Now calculate the height of the target line
            tempDiv.textContent = lines[data.lineIndex];
            const lineHeight = tempDiv.clientHeight;
            
            // Clean up
            document.body.removeChild(tempDiv);
            
            // Position in the middle of the line
            textPosition = heightBefore + (lineHeight / 2);
            
            console.log(`RemoteScriptViewer: Calculated text position at ${textPosition}px`);
          } else {
            // If we don't have a specific line index, search through content
            console.log(`RemoteScriptViewer: Searching content for text: "${searchText}"`);
            
            // Find matching lines and their positions
            let currentHeight = 0;
            let foundMatch = false;
            
            // Create a temporary container to measure text height
            const tempDiv = document.createElement('div');
            tempDiv.style.cssText = `
              position: absolute;
              top: -9999px;
              left: -9999px;
              width: ${scrollContainer.clientWidth}px;
              font-size: ${fontSize}px;
              font-family: ${window.getComputedStyle(scrollContainer).fontFamily};
              white-space: pre-wrap;
              visibility: hidden;
            `;
            document.body.appendChild(tempDiv);
            
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              
              // Check if this line contains our search text
              if (!foundMatch && line.toLowerCase().includes(searchText)) {
                foundMatch = true;
                textPosition = currentHeight;
                console.log(`RemoteScriptViewer: Found matching text at line ${i}, height: ${currentHeight}px`);
                
                // Calculate the position in the middle of the line
                tempDiv.textContent = line;
                const lineHeight = tempDiv.clientHeight;
                textPosition += (lineHeight / 2);
              }
              
              // Add this line's height to our running total
              tempDiv.textContent = line;
              currentHeight += tempDiv.clientHeight;
            }
            
            // Clean up
            document.body.removeChild(tempDiv);
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
        scrollContainer.scrollTo({
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
          if (scrollContainer.style.position !== 'relative') {
            scrollContainer.style.position = 'relative';
          }
          scrollContainer.appendChild(highlight);
          
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
        const script = await fileSystemRepository.getScriptById(scriptId);
        if (script) {
          setScriptTitle(script.title);
          
          // Get script content safely
          let content = script.content || script.body || "";
          
          // If no content is available, try to get full content
          if (!content && script.id) {
            try {
              console.log(`RemoteScriptViewer: No content found, trying to load full content for ${script.id}`);
              const fullScript = await fileSystemRepository.getScriptContent(script.id);
              
              if (fullScript && (fullScript.content || fullScript.body)) {
                content = fullScript.content || fullScript.body;
                console.log(`RemoteScriptViewer: Loaded full content, length: ${content.length}`);
              }
            } catch (contentError) {
              console.error(`RemoteScriptViewer: Error loading full content: ${contentError}`);
            }
          }
          
          // Debug the script content
          console.log('RemoteScriptViewer: Loading script:', {
            id: script.id,
            title: script.title,
            contentLength: content.length,
            content: content.substring(0, 100) + "...",
            keys: Object.keys(script)
          });
          
          setScriptContent(content);
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
    if (!containerRef.current || !scriptContent) return;
    
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
      const scrollContainer = containerRef.current;
      
      // Calculate scrolling parameters
      const scrollHeight = scrollContainer.scrollHeight;
      const clientHeight = scrollContainer.clientHeight;
      
      // Get current position
      const startPos = scrollContainer.scrollTop || 0;
      
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
        scrollContainer.scrollTop = currentPos;
        
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
  }, [isPlaying, speed, direction, scriptContent]);
  
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
  
  if (!scriptContent) {
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
  
  // Use the same aspect ratio as the ViewerComponent (16:9)
  const aspectRatio = '16/9'; 
  const aspectRatioValue = 16/9;
  
  return (
    <div 
      className="teleprompter-viewer"
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
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100vh',
          aspectRatio: aspectRatio,
          overflow: 'auto',
          backgroundColor: 'black',
          padding: '20px',
          fontSize: `${fontSize}px`,
          lineHeight: '1.5',
          whiteSpace: 'pre-wrap',
          fontFamily: 'Courier New, monospace',
          color: 'white',
          textAlign: 'center',
          fontWeight: 'bold',
          margin: '0 auto',
          border: 'none',
          boxSizing: 'border-box'
        }}
        className="viewer-content-container"
        data-aspect-ratio={aspectRatio}
      >
        {scriptContent}
      </div>
    </div>
  );
});

export default RemoteScriptViewer;