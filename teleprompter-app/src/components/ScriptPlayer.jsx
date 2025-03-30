// ScriptPlayer.jsx
// An ultra-simple script player that just focuses on scrolling

import React, { useEffect, useRef } from 'react';
import { parseScript } from '../services/scriptParser';

const ScriptPlayer = ({ 
  script, 
  isPlaying,
  speed = 1,
  direction = 'forward',
  fontSize = 24,
  fullScreen = false
}, ref) => {
  // Log receipt of script prop for debugging
  console.log('ScriptPlayer received script:', 
    script ? 
      {
        id: script.id,
        title: script.title,
        idType: typeof script.id,
        hasBody: !!script.body,
        hasContent: !!script.content,
        bodyLength: script.body ? script.body.length : 0,
        contentLength: script.content ? script.content.length : 0
      } : 'null'
  );
  
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  
  // We only deal with HTML files now
  if (script) {
    console.log('HTML file will be loaded directly via iframe:', script.id);
  }
  

  // Simple scrolling animation - only cares about scrolling, nothing else
  useEffect(() => {
    // Don't do anything if no script or container
    if (!script || !containerRef.current) {
      console.log('ScriptPlayer: No script or container ref available yet');
      return;
    }
    
    console.log('ScriptPlayer: Setting up animation for script:', script.title);
    
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
      if (script.title && script.title.toLowerCase().endsWith('.html')) {
        // For HTML content, find the iframe and scroll it
        const iframe = container.querySelector('iframe');
        if (iframe && iframe.contentWindow) {
          // Using the contentWindow to scroll the iframe
          iframe.contentWindow.scrollBy(0, pixelsToScroll);
        } else {
          // Fallback to container scrolling
          container.scrollTop += pixelsToScroll;
        }
      } else {
        // For regular text content
        container.scrollTop += pixelsToScroll;
      }
      
      // Check if scroll actually happened
      if (Math.abs(container.scrollTop - beforeScroll) < 0.01 && pixelsToScroll > 0 && 
          !(script.title && script.title.toLowerCase().endsWith('.html'))) {
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
    if (!containerRef.current || !script || !scriptContent) return;
    
    const container = containerRef.current;
    
    // Calculate position as percentage
    const maxLength = Math.max(1, scriptContent.length);
    const percentage = Math.max(0, Math.min(position, maxLength)) / maxLength;
    
    // Apply the scroll
    if (script.title && script.title.toLowerCase().endsWith('.html')) {
      // For HTML content, find the iframe and scroll it
      const iframe = container.querySelector('iframe');
      if (iframe && iframe.contentWindow) {
        // Wait for iframe to load
        const checkIframeLoaded = () => {
          try {
            // Try to access contentDocument to check if loaded
            if (iframe.contentDocument && iframe.contentDocument.body) {
              const maxScroll = iframe.contentDocument.body.scrollHeight - iframe.clientHeight;
              const targetScroll = percentage * maxScroll;
              
              // Scroll the iframe content
              iframe.contentWindow.scrollTo({
                top: targetScroll,
                behavior: 'smooth'
              });
            } else {
              // Try again in a moment
              setTimeout(checkIframeLoaded, 100);
            }
          } catch (e) {
            console.error('Error accessing iframe content:', e);
          }
        };
        
        checkIframeLoaded();
      }
    } else {
      // For regular text content
      const maxScroll = container.scrollHeight - container.clientHeight;
      const targetScroll = percentage * maxScroll;
      
      // Use smooth scrolling for a better experience
      container.style.scrollBehavior = 'smooth';
      container.scrollTop = targetScroll;
      
      // Reset scroll behavior
      setTimeout(() => {
        container.style.scrollBehavior = 'auto';
      }, 500);
    }
  };
  
  // Expose jump method to parent
  React.useImperativeHandle(ref, () => ({
    jumpToPosition
  }), [script]);
  
  // Render the script viewer
  if (!script) {
    console.log('ScriptPlayer: No script provided to component');
    return <div className="no-script-message">No script selected</div>;
  }
  
  // Verify script has required properties
  if (!script.id) {
    console.warn('ScriptPlayer: Script is missing ID property');
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
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flex: 1,
          padding: '0 2rem'
        }}
      >
        <div
          ref={containerRef}
          style={{
            width: '100%',
            maxWidth: '100%',
            aspectRatio: '16/9',
            overflow: 'hidden',
            backgroundColor: 'black',
            border: '1px solid #333',
            boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)'
          }}
          className="script-content-container"
        >
          <iframe 
            src={`/${script.id}`}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              backgroundColor: 'black'
            }}
            sandbox="allow-scripts allow-same-origin"
            title={`${script.title} content`}
            loading="eager"
            id="html-script-frame"
            onLoad={() => console.log('HTML iframe loaded in ScriptPlayer')}
          />
        </div>
      </div>
    </div>
  );
};

export default React.forwardRef(ScriptPlayer);