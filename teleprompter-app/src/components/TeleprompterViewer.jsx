// TeleprompterViewer.jsx
// A dedicated component for displaying teleprompter content using node-based navigation

import React, { useRef } from 'react';
import useTeleprompterScroll from '../hooks/useTeleprompterScroll';
import useTeleprompterFontSize from '../hooks/useTeleprompterFontSize';
import useIframeLoading from '../hooks/useIframeLoading';
import useNodeNavigation from '../hooks/useNodeNavigation';
import usePositionTracking from '../hooks/usePositionTracking';
import ViewerFrame from './ui/ViewerFrame';

// Create a forwardRef wrapper to enable parent components to access the scrollToNode method
const TeleprompterViewer = React.forwardRef((props, ref) => {
  const {
    script, 
    isPlaying,
    speed = 1,
    direction = 'forward',
    fontSize = 24,
    aspectRatio = '16/9'
  } = props;
  
  const containerRef = useRef(null);
  const { scrollToNode, jumpToPosition } = useNodeNavigation();
  
  // Custom hooks to handle different aspects of the viewer
  const { isIframeLoaded, handleIframeLoad } = useIframeLoading(script, fontSize);
  const { animationRef } = useTeleprompterScroll(containerRef, isPlaying, speed, direction, script, isIframeLoaded);
  useTeleprompterFontSize(containerRef, fontSize, script, isIframeLoaded);
  
  // Enable position tracking with the forwarded ref from parent component
  usePositionTracking(containerRef, isPlaying, script, ref);
  
  // Log on render to debug ref issues
  console.log('TeleprompterViewer: Rendering component with ref =', !!ref);
  
  // Expose methods via ref
  React.useImperativeHandle(ref, () => {
    // Log debug info when the ref methods are created
    console.log('⭐ [POSITION DEBUG] Creating ref methods in TeleprompterViewer');
    
    // Create a unique ID for this ref creation to track persistence
    const refId = Date.now().toString(36);
    
    // Make sure scrollToNode is working by wrapping it with log statements
    const enhancedScrollToNode = (data) => {
      console.log('⭐ [POSITION DEBUG] TeleprompterViewer.scrollToNode called with data:', 
        typeof data === 'object' ? JSON.stringify(data).substring(0, 100) + '...' : data);
      
      try {
        const result = scrollToNode(data);
        console.log('⭐ [POSITION DEBUG] scrollToNode result:', result);
        return result;
      } catch (err) {
        console.error('⭐ [POSITION DEBUG] Error in scrollToNode:', err);
        return false;
      }
    };
    
    return {
      scrollToNode: enhancedScrollToNode,
      jumpToPosition,
      
      // Add getCurrentTopElement method - returns default data since we don't track it
      getCurrentTopElement: () => {
        try {
          // Try to get the actual current element in view
          const iframe = document.getElementById('teleprompter-frame');
          if (iframe && iframe.contentDocument && iframe.contentWindow) {
            const scrollY = iframe.contentWindow.scrollY || 0;
            const viewportHeight = iframe.contentWindow.innerHeight;
            const viewportCenter = scrollY + (viewportHeight / 2);
            
            // Find all possible text elements
            const textElements = iframe.contentDocument.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div, span');
            let closestElement = null;
            let closestDistance = Infinity;
            
            textElements.forEach(element => {
              const rect = element.getBoundingClientRect();
              const elementTop = rect.top + scrollY;
              const elementCenter = elementTop + (rect.height / 2);
              const distance = Math.abs(elementCenter - viewportCenter);
              
              if (distance < closestDistance && element.textContent.trim()) {
                closestDistance = distance;
                closestElement = element;
              }
            });
            
            if (closestElement) {
              return {
                textContent: closestElement.textContent.trim(),
                type: closestElement.tagName.toLowerCase(),
                element: closestElement
              };
            }
          }
        } catch (e) {
          console.error('Error getting current element:', e);
        }
        
        // Default fallback
        return { 
          textContent: 'Current position in teleprompter', 
          type: 'teleprompter-position' 
        };
      },
      
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
});

export default TeleprompterViewer;