// src/components/RemoteScriptViewer.jsx
// A simplified script viewer specifically for the Remote page
// This is a dedicated component that doesn't share code with the main ViewerComponent

import React, { useRef, useState, useEffect } from 'react';
import fileSystemRepository from '../database/fileSystemRepository';

/**
 * RemoteScriptViewer - A simplified script viewer for the Remote page
 * This component provides a basic script viewing experience specifically for tablets/mobile
 */
const RemoteScriptViewer = ({ 
  scriptId, 
  isPlaying,
  speed = 1,
  direction = 'forward',
  fontSize = 24,
  isFlipped = false,
  isHighDPI = false // Add high DPI mode prop
}) => {
  const [scriptContent, setScriptContent] = useState(null);
  const [scriptTitle, setScriptTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  
  // Load script content
  useEffect(() => {
    const loadScript = async () => {
      if (!scriptId) return;
      
      setIsLoading(true);
      try {
        const script = await fileSystemRepository.getScriptById(scriptId);
        if (script) {
          setScriptTitle(script.title);
          setScriptContent(script.content);
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
};

export default RemoteScriptViewer;