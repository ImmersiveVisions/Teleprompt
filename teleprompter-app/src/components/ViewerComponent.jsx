// src/components/ViewerComponent.jsx
// A dedicated one-way viewer component that only receives messages
// and doesn't send anything back to the server

import React, { useRef, useState, useEffect } from 'react';
import ViewerFrame from './ui/ViewerFrame';
import useTeleprompterScroll from '../hooks/useTeleprompterScroll';
import useTeleprompterFontSize from '../hooks/useTeleprompterFontSize';
import useIframeLoading from '../hooks/useIframeLoading';
import useNodeNavigation from '../hooks/useNodeNavigation';
import HighlightRenderer from './HighlightRenderer';
import highlightService from '../services/highlightService';

/**
 * ViewerComponent - A dedicated viewer that only receives control messages
 * This component never sends WebSocket messages back to maintain a one-way
 * communication model where only the Admin controls the Viewer.
 */
const ViewerComponent = React.forwardRef((props, ref) => {
  const {
    script, 
    isPlaying,
    speed = 1,
    direction = 'forward',
    fontSize = 36, // Larger size for teleprompter display
    aspectRatio = '16/9',
    isFlipped = false
  } = props;
  
  const containerRef = useRef(null);
  const { scrollToNode, jumpToPosition } = useNodeNavigation();

  // Custom hooks to handle different aspects of the viewer
  const { isIframeLoaded, handleIframeLoad } = useIframeLoading(script, fontSize);
  const { animationRef } = useTeleprompterScroll(containerRef, isPlaying, speed, direction, script, isIframeLoaded);
  useTeleprompterFontSize(containerRef, fontSize, script, isIframeLoaded);
  
  // Set script content for auto-highlighting when script and iframe are loaded
  useEffect(() => {
    if (script && script.id && isIframeLoaded) {
      const scriptFrame = document.getElementById('teleprompter-frame');
      if (scriptFrame && scriptFrame.contentDocument) {
        const content = scriptFrame.contentDocument.body.innerText || '';
        if (content) {
          highlightService.setScriptContent(script.id, content);
        }
      }
    }
  }, [script, isIframeLoaded]);
  
  // Log on render to debug ref issues
  console.log('ViewerComponent: Rendering with script =', script?.id || 'none');
  
  // Expose methods via ref (but never send anything back to server)
  React.useImperativeHandle(ref, () => {
    console.log('Creating ref methods in ViewerComponent');
    
    return {
      // Passthrough navigation without sending position updates
      scrollToNode: (data) => {
        console.log('ViewerComponent.scrollToNode called with data:', 
          typeof data === 'object' ? JSON.stringify(data).substring(0, 100) + '...' : data);
        
        try {
          const result = scrollToNode(data);
          console.log('scrollToNode result:', result);
          return result;
        } catch (err) {
          console.error('Error in scrollToNode:', err);
          return false;
        }
      },
      
      // Direct position navigation
      jumpToPosition,
      
      // Flag to indicate animation is running
      setScrollAnimating(isAnimating) {
        if (!window._scrollState) {
          window._scrollState = {};
        }
        window._scrollState.isScrollAnimating = isAnimating;
        console.log('ViewerComponent: Set animation state to', isAnimating);
      },
      
      // No-op sendPosition method - never sends anything
      sendPosition: (data) => {
        console.log('ViewerComponent: Position sending disabled', data);
        // Store for debugging if needed
        window._lastViewerPosition = data;
      }
    };
  }, [scrollToNode, jumpToPosition]);
  
  if (!script) {
    return <div className="no-script-message">No script loaded</div>;
  }
  
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
        transition: 'transform 0.3s ease'
        // Removed transform: isFlipped ? 'scaleX(-1)' : 'none' to prevent double transformation
      }}
    >
      {/* Mirror mode indicator - parent component controls isFlipped state */}
      {isFlipped && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '5px 10px',
          borderRadius: '4px',
          zIndex: 100,
          fontSize: '12px'
        }}>
          MIRROR MODE
        </div>
      )}
      
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
  );
});

export default ViewerComponent;