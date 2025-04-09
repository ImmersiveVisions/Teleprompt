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
  React.useImperativeHandle(ref, () => ({
    scrollToNode,
    jumpToPosition,
    
    // No-op method required by some components
    setScrollAnimating(isAnimating) {
      console.log(`scrollAnimating set to ${isAnimating}`);
    }
  }));
  
  // Render the component - don't pass ref as it would create circular reference
  return <TeleprompterViewer {...props} />;
});