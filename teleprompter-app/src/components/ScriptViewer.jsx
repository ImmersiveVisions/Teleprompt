// src/components/ScriptViewer.jsx
import React, { useState, useEffect, useRef } from 'react';
import db from '../database/db';
import { registerMessageHandler } from '../services/websocket';
import '../styles.css';

const ScriptViewer = ({ fullScreen = false, currentScript = null }) => {
  const [script, setScript] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [direction, setDirection] = useState('forward');
  const [speed, setSpeed] = useState(1);
  const [fontSize, setFontSize] = useState(24);
  const [currentChapter, setCurrentChapter] = useState(0);
  
  const viewerRef = useRef(null);
  const scriptContentRef = useRef(null);
  const animationRef = useRef(null);
  
  // Update script when currentScript prop changes
  useEffect(() => {
    if (currentScript && (!script || script.id !== currentScript.id)) {
      setScript(currentScript);
      
      // Load chapters for this script
      const loadChapters = async () => {
        try {
          const scriptChapters = await db.getChaptersForScript(currentScript.id);
          setChapters(scriptChapters);
        } catch (error) {
          console.error('Error loading chapters:', error);
        }
      };
      
      loadChapters();
      
      // Reset scroll position and position when script changes
      setCurrentPosition(0);
      if (scriptContentRef.current) {
        scriptContentRef.current.scrollTop = 0;
      }
    }
  }, [currentScript, script]);
  
  // Load script from state update
  useEffect(() => {
    const unregisterHandler = registerMessageHandler(handleStateUpdate);
    
    return () => {
      unregisterHandler();
      // Cancel any ongoing animations
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);
  
  // Handle state updates from WebSocket
  const handleStateUpdate = async (message) => {
    if (message.type === 'STATE_UPDATE') {
      const { data } = message;
      
      // Update local state based on the received state
      if (data.isPlaying !== undefined) setIsPlaying(data.isPlaying);
      if (data.direction !== undefined) setDirection(data.direction);
      if (data.speed !== undefined) setSpeed(data.speed);
      if (data.fontSize !== undefined) setFontSize(data.fontSize);
      
      // If current script changed, load the new script (only if not controlled by prop)
      if (!currentScript && data.currentScript && (!script || script.id !== data.currentScript)) {
        try {
          const loadedScript = await db.getScriptById(data.currentScript);
          if (loadedScript) {
            setScript(loadedScript);
            
            // Load chapters for this script
            const scriptChapters = await db.getChaptersForScript(data.currentScript);
            setChapters(scriptChapters);
            
            console.log('Loaded script via WebSocket:', loadedScript.title);
          }
        } catch (error) {
          console.error('Error loading script from WebSocket update:', error);
        }
      }
      
      // If current chapter changed, scroll to that chapter
      if (data.currentChapter !== undefined && data.currentChapter !== currentChapter) {
        setCurrentChapter(data.currentChapter);
        
        // Find chapter position
        if (chapters.length > 0 && chapters[data.currentChapter]) {
          const newPosition = chapters[data.currentChapter].startPosition;
          setCurrentPosition(newPosition);
          scrollToPosition(newPosition);
          console.log('Scrolling to chapter:', data.currentChapter, 'position:', newPosition);
        }
      } 
      // Otherwise update position
      else if (data.currentPosition !== undefined && Math.abs(data.currentPosition - currentPosition) > 5) {
        setCurrentPosition(data.currentPosition);
        scrollToPosition(data.currentPosition);
        console.log('Scrolling to position from state update:', data.currentPosition);
      }
    }
  };
  
  // Scroll the script to a specific position
  const scrollToPosition = (position) => {
    if (!scriptContentRef.current || !script) return;
    
    // Calculate the percentage of the script to scroll to
    // Use script.body or fall back to script.content for backwards compatibility
    const totalLength = (script.body || script.content || '').length;
    const scrollPercentage = position / totalLength;
    
    // Get the total scroll height and set the scroll position
    const scrollHeight = scriptContentRef.current.scrollHeight - scriptContentRef.current.clientHeight;
    if (scrollHeight > 0) { // Make sure we don't have a zero or negative height
      scriptContentRef.current.scrollTop = scrollHeight * scrollPercentage;
      console.log('Scrolling to position:', position, 'percentage:', scrollPercentage, 'scrollTop:', scriptContentRef.current.scrollTop);
    }
  };
  
  // Animation loop for smooth scrolling
  useEffect(() => {
    let lastTimestamp = 0;
    
    const animate = (timestamp) => {
      if (!lastTimestamp) lastTimestamp = timestamp;
      const elapsed = timestamp - lastTimestamp;
      
      if (scriptContentRef.current && isPlaying && script) {
        try {
          // Calculate how much to scroll based on speed and elapsed time
          const baseSpeedMultiplier = 50; // Same speed for all views
          const pixelsPerSecond = speed * baseSpeedMultiplier;
          const scrollAmount = (pixelsPerSecond * elapsed) / 1000;
          
          // Get the max scroll position to prevent scrolling too far
          const maxScroll = scriptContentRef.current.scrollHeight - scriptContentRef.current.clientHeight;
          
          // Current scroll position
          let currentScroll = scriptContentRef.current.scrollTop;
          
          // Scroll in the appropriate direction
          if (direction === 'forward') {
            // Prevent scrolling beyond the end
            if (currentScroll < maxScroll) {
              scriptContentRef.current.scrollTop += scrollAmount;
            }
          } else {
            // Prevent scrolling beyond the beginning
            if (currentScroll > 0) {
              scriptContentRef.current.scrollTop -= scrollAmount;
            }
          }
          
          // Calculate current position based on scroll
          currentScroll = scriptContentRef.current.scrollTop; // Update after scrolling
          
          if (maxScroll > 0) { // Make sure we don't divide by zero
            const scrollPercentage = currentScroll / maxScroll;
            
            // Use script.body or fall back to script.content for backwards compatibility
            const contentLength = (script.body || script.content || '').length;
            const newPosition = Math.floor(contentLength * scrollPercentage);
            
            // Always update position to ensure WebSocket sync
            if (newPosition !== currentPosition) {
              setCurrentPosition(newPosition);
              
              // Check if we've reached a new chapter
              const newChapter = chapters.findIndex((chapter, index) => {
                const nextChapter = chapters[index + 1];
                return newPosition >= chapter.startPosition && 
                      (!nextChapter || newPosition < nextChapter.startPosition);
              });
              
              if (newChapter !== -1 && newChapter !== currentChapter) {
                setCurrentChapter(newChapter);
              }
            }
          }
        } catch (error) {
          console.error('Error in animation loop:', error);
        }
      }
      
      lastTimestamp = timestamp;
      animationRef.current = requestAnimationFrame(animate);
    };
    
    if (isPlaying) {
      console.log('Starting animation loop, isPlaying:', isPlaying, 'fullScreen:', fullScreen, 'script:', script?.title);
      animationRef.current = requestAnimationFrame(animate);
    } else if (animationRef.current) {
      console.log('Stopping animation loop, isPlaying:', isPlaying);
      cancelAnimationFrame(animationRef.current);
    }
    
    // Clean up animation frame on unmount or when dependencies change
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying, speed, direction, script, currentPosition, chapters, currentChapter, fullScreen]);
  
  // Parse script body to highlight film clips
  const renderScriptContent = () => {
    if (!script) return null;
    
    // Use body if available, fall back to content for backwards compatibility
    const body = script.body || script.content;
    if (!body) return null;
    
    const lines = body.split('\n');
    
    return lines.map((line, index) => {
      // Check if line contains 'FILM CLIP'
      if (line.includes('FILM CLIP')) {
        return (
          <div key={index} className="film-clip-marker">
            {line}
          </div>
        );
      }
      
      return (
        <div key={index} className="script-line">
          {line || ' '} {/* Use space for empty lines to preserve line breaks */}
        </div>
      );
    });
  };
  
  // For debugging, log when component renders
  useEffect(() => {
    console.log('ScriptViewer rendered with fullScreen:', fullScreen, 'script:', script ? script.title : 'none');
    
    // Reset scroll position when script changes
    if (scriptContentRef.current) {
      scriptContentRef.current.scrollTop = 0;
    }
  }, [script, fullScreen]);
  
  return (
    <div 
      ref={viewerRef}
      className={`script-viewer ${fullScreen ? 'fullscreen' : ''}`}
      style={{ zIndex: 5 }} // Lower z-index so the header dropdown remains visible
    >
      {script ? (
        <>
          <div className="script-title">
            {!fullScreen ? `Preview: ${script.title}` : script.title}
          </div>
          <div 
            ref={scriptContentRef}
            className="script-content"
            style={{ 
              fontSize: `${fontSize}px`,
              backgroundColor: '#000',
              color: '#fff'
            }}
          >
            {renderScriptContent()}
          </div>
        </>
      ) : (
        <div className="no-script-message">
          No script loaded. Please select a script from the dropdown.
        </div>
      )}
    </div>
  );
};

export default ScriptViewer;
