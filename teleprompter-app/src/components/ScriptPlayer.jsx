// ScriptPlayer.jsx
// An ultra-simple script player that just focuses on scrolling

import React, { useEffect, useRef } from 'react';

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
  const scriptContent = script ? (script.body || script.content || '') : '';
  
  // Simple scrolling animation - only cares about scrolling, nothing else
  useEffect(() => {
    // Don't do anything if no script or container
    if (!script || !containerRef.current) return;
    
    const container = containerRef.current;
    let lastTimestamp = 0;
    
    // Basic animation function
    const scroll = (timestamp) => {
      // Initialize timestamp on first call
      if (!lastTimestamp) {
        lastTimestamp = timestamp;
        console.log('Animation starting, first frame');
        animationRef.current = requestAnimationFrame(scroll);
        return;
      }
      
      // Calculate elapsed time (with safety cap)
      const elapsed = Math.min(timestamp - lastTimestamp, 100);
      lastTimestamp = timestamp;
      
      // Calculate pixels to scroll this frame
      const baseSpeed = 80; // pixels per second - doubled for more visible movement
      const pixelsToScroll = direction === 'forward' 
        ? (baseSpeed * speed * elapsed) / 1000 
        : -(baseSpeed * speed * elapsed) / 1000;
      
      // Simple boundary check
      const maxScroll = container.scrollHeight - container.clientHeight;
      
      // Debug scroll state
      if (Math.floor(timestamp) % 60 === 0) { // Log only occasionally to avoid console spam
        console.log(`Scrolling: ${container.scrollTop.toFixed(2)}/${maxScroll.toFixed(2)} by ${pixelsToScroll.toFixed(2)}px`);
      }
      
      if ((direction === 'forward' && container.scrollTop >= maxScroll) ||
          (direction === 'backward' && container.scrollTop <= 0)) {
        console.log('Reached end of scroll');
        animationRef.current = null;
        return;
      }
      
      // Store previous value for debugging
      const beforeScroll = container.scrollTop;
      
      // Do the actual scrolling
      container.scrollTop += pixelsToScroll;
      
      // Check if scroll actually happened
      if (Math.abs(container.scrollTop - beforeScroll) < 0.01 && pixelsToScroll > 0) {
        console.log('WARNING: Scroll not changing despite request!', {
          before: beforeScroll,
          after: container.scrollTop,
          requested: pixelsToScroll
        });
      }
      
      // Continue the animation loop
      animationRef.current = requestAnimationFrame(scroll);
    };
    
    // Clean up any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
      lastTimestamp = 0;
    }
    
    // Start or stop animation based on isPlaying
    if (isPlaying) {
      console.log('Starting scroll animation', { 
        speed, 
        direction, 
        fontSize,
        container: {
          scrollHeight: container.scrollHeight,
          clientHeight: container.clientHeight,
          hasScroll: container.scrollHeight > container.clientHeight
        }
      });
      animationRef.current = requestAnimationFrame(scroll);
    } else {
      console.log('Animation not started - isPlaying is false');
    }
    
    // Clean up on unmount
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying, speed, direction, script]);
  
  // Simple jump to position function
  const jumpToPosition = (position) => {
    if (!containerRef.current || !script) return;
    
    const container = containerRef.current;
    
    // Calculate position as percentage
    const maxLength = Math.max(1, scriptContent.length);
    const percentage = Math.max(0, Math.min(position, maxLength)) / maxLength;
    
    // Apply the scroll
    const maxScroll = container.scrollHeight - container.clientHeight;
    const targetScroll = percentage * maxScroll;
    
    // Use smooth scrolling for a better experience
    container.style.scrollBehavior = 'smooth';
    container.scrollTop = targetScroll;
    
    // Reset scroll behavior
    setTimeout(() => {
      container.style.scrollBehavior = 'auto';
    }, 500);
  };
  
  // Expose jump method to parent
  React.useImperativeHandle(ref, () => ({
    jumpToPosition
  }), [script]);
  
  // Render the script viewer
  if (!script) {
    return <div className="no-script-message">No script selected</div>;
  }
  
  return (
    <div 
      className={`script-player ${fullScreen ? 'fullscreen' : ''}`}
      style={{ 
        backgroundColor: 'black',
        color: 'white',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}
    >
      {fullScreen && (
        <div 
          style={{
            padding: '1rem',
            textAlign: 'center',
            borderBottom: '1px solid #333',
            fontWeight: 'bold',
            fontSize: '1.5rem'
          }}
        >
          {script.title}
        </div>
      )}
      
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '2rem',
          fontSize: `${fontSize}px`,
          lineHeight: 1.8,
          fontFamily: 'Courier New, monospace',
          whiteSpace: 'pre-wrap',
          paddingBottom: '150vh' // Extra padding for smooth scrolling
        }}
      >
        {scriptContent}
      </div>
    </div>
  );
};

export default React.forwardRef(ScriptPlayer);