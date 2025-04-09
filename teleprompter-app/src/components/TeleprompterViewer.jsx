// TeleprompterViewer.jsx
// A dedicated component for displaying teleprompter content using node-based navigation

import React, { useRef } from 'react';
import useTeleprompterScroll from '../hooks/useTeleprompterScroll';
import useTeleprompterFontSize from '../hooks/useTeleprompterFontSize';
import useIframeLoading from '../hooks/useIframeLoading';
import useNodeNavigation from '../hooks/useNodeNavigation';
import ViewerFrame from './ui/ViewerFrame';

const TeleprompterViewer = ({ 
  script, 
  isPlaying,
  speed = 1,
  direction = 'forward',
  fontSize = 24,
  aspectRatio = '16/9'
}) => {
  const containerRef = useRef(null);
  
  // Custom hooks to handle different aspects of the viewer
  const { isIframeLoaded, handleIframeLoad } = useIframeLoading(script, fontSize);
  const { animationRef } = useTeleprompterScroll(containerRef, isPlaying, speed, direction, script, isIframeLoaded);
  useTeleprompterFontSize(containerRef, fontSize, script, isIframeLoaded);
  
  if (!script) {
    return <div className="no-script-message">No script loaded</div>;
  }
  
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
        alignItems: 'center'
      }}
    >
      <ViewerFrame
        script={script}
        containerRef={containerRef}
        aspectRatio={aspectRatio}
        isIframeLoaded={isIframeLoaded}
        handleIframeLoad={handleIframeLoad}
        fontSize={fontSize}
      />
    </div>
  );
};

// Create a forwardRef wrapper to enable parent components to access the scrollToNode method
export default React.forwardRef((props, ref) => {
  // Get navigation methods from the hook
  const { scrollToNode, jumpToPosition } = useNodeNavigation();
  
  // Expose methods via ref
  React.useImperativeHandle(ref, () => {
    // Log debug info when the ref methods are created
    console.log('⭐ [POSITION DEBUG] Creating ref methods in TeleprompterViewer');
    
    // Create a unique ID for this ref creation to track persistence
    const refId = Date.now().toString(36);
    
    return {
      scrollToNode,
      jumpToPosition,
      
      // Add getCurrentTopElement method - returns default data since we don't track it
      getCurrentTopElement: () => ({ 
        textContent: 'Current position in teleprompter', 
        type: 'teleprompter-position' 
      }),
      
      // Store position handler for compatibility with AdminPage
      setPositionHandler(handler) {
        console.log('⭐ [POSITION DEBUG] Setting position handler in TeleprompterViewer');
        // Make the handler available globally to maintain compatibility
        window._teleprompterPositionHandler = handler;
        // Override sendPosition to use this handler
        this.sendPosition = handler;
      },
      
      // Flag to indicate animation is running (prevents user scroll events)
      setScrollAnimating(isAnimating) {
        // Direct access to module-scoped state for compatibility with ScriptPlayer
        if (!window._scrollState) {
          window._scrollState = {};
        }
        window._scrollState.isScrollAnimating = isAnimating;
        console.log('📋 [DEBUG] TeleprompterViewer: Set animation state to', isAnimating);
      },
      
      // This is just a placeholder that will be overwritten by the parent
      sendPosition: (data) => {
        console.log('⭐ [POSITION DEBUG] TeleprompterViewer: Default sendPosition called', data);
        // Try to use the handler if available
        if (window._teleprompterPositionHandler) {
          window._teleprompterPositionHandler(data);
        }
      },
      
      // For debugging - add a ref ID and timestamp
      _debugInfo: {
        refId: refId,
        createdAt: new Date().toISOString(),
        component: 'TeleprompterViewer'
      }
    };
  }, [scrollToNode, jumpToPosition]);
  
  // Render the component - don't pass ref as it would create circular reference
  return <TeleprompterViewer {...props} />;
});