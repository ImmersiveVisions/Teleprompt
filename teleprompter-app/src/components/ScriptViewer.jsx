// src/components/ScriptViewer.jsx
import React, { useState, useEffect, useRef } from 'react';
import db from '../database/db';
import { registerMessageHandler } from '../services/websocket';
import '../styles.css';

const ScriptViewer = ({ fullScreen = false }) => {
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
      setIsPlaying(data.isPlaying);
      setDirection(data.direction);
      setSpeed(data.speed);
      setFontSize(data.fontSize);
      
      // If current script changed, load the new script
      if (data.currentScript && (!script || script.id !== data.currentScript)) {
        const loadedScript = await db.getScriptById(data.currentScript);
        if (loadedScript) {
          setScript(loadedScript);
          
          // Load chapters for this script
          const scriptChapters = await db.getChaptersForScript(data.currentScript);
          setChapters(scriptChapters);
        }
      }
      
      // If current chapter changed, scroll to that chapter
      if (data.currentChapter !== currentChapter) {
        setCurrentChapter(data.currentChapter);
        
        // Find chapter position
        if (chapters.length > 0 && chapters[data.currentChapter]) {
          setCurrentPosition(chapters[data.currentChapter].startPosition);
          scrollToPosition(chapters[data.currentChapter].startPosition);
        }
      } 
      // Otherwise update position
      else if (data.currentPosition !== currentPosition) {
        setCurrentPosition(data.currentPosition);
        scrollToPosition(data.currentPosition);
      }
    }
  };
  
  // Scroll the script to a specific position
  const scrollToPosition = (position) => {
    if (!scriptContentRef.current || !script) return;
    
    // Calculate the percentage of the script to scroll to
    const totalLength = script.content.length;
    const scrollPercentage = position / totalLength;
    
    // Get the total scroll height and set the scroll position
    const scrollHeight = scriptContentRef.current.scrollHeight - scriptContentRef.current.clientHeight;
    scriptContentRef.current.scrollTop = scrollHeight * scrollPercentage;
  };
  
  // Animation loop for smooth scrolling
  useEffect(() => {
    let lastTimestamp = 0;
    
    const animate = (timestamp) => {
      if (!lastTimestamp) lastTimestamp = timestamp;
      const elapsed = timestamp - lastTimestamp;
      
      if (scriptContentRef.current && isPlaying) {
        // Calculate how much to scroll based on speed and elapsed time
        const pixelsPerSecond = speed * 50; // Adjust this multiplier to control base speed
        const scrollAmount = (pixelsPerSecond * elapsed) / 1000;
        
        // Scroll in the appropriate direction
        if (direction === 'forward') {
          scriptContentRef.current.scrollTop += scrollAmount;
        } else {
          scriptContentRef.current.scrollTop -= scrollAmount;
        }
        
        // Calculate current position based on scroll
        if (script) {
          const scrollPercentage = scriptContentRef.current.scrollTop / 
            (scriptContentRef.current.scrollHeight - scriptContentRef.current.clientHeight);
          const newPosition = Math.floor(script.content.length * scrollPercentage);
          
          // Update current position if it has changed significantly
          if (Math.abs(newPosition - currentPosition) > 10) {
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
      }
      
      lastTimestamp = timestamp;
      animationRef.current = requestAnimationFrame(animate);
    };
    
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(animate);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, speed, direction, script, currentPosition, chapters, currentChapter]);
  
  // Parse script content to highlight film clips
  const renderScriptContent = () => {
    if (!script) return null;
    
    const content = script.content;
    const lines = content.split('\n');
    
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
          {line}
        </div>
      );
    });
  };
  
  return (
    <div 
      ref={viewerRef}
      className={`script-viewer ${fullScreen ? 'fullscreen' : ''}`}
    >
      {script ? (
        <>
          <div className="script-title">{script.title}</div>
          <div 
            ref={scriptContentRef}
            className="script-content"
            style={{ fontSize: `${fontSize}px` }}
          >
            {renderScriptContent()}
          </div>
        </>
      ) : (
        <div className="no-script-message">
          No script loaded. Please select a script from the admin panel.
        </div>
      )}
    </div>
  );
};

export default ScriptViewer;
