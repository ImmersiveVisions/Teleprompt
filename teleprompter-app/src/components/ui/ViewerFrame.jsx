import React, { useMemo, useEffect } from 'react';
import FountainViewer from '../FountainViewer';
import useFontSizeHandler from '../../hooks/useFontSizeHandler';

const ViewerFrame = ({
  script,
  containerRef,
  aspectRatio,
  isIframeLoaded,
  handleIframeLoad,
  fontSize
}) => {
  // Apply font size changes using the hook
  useFontSizeHandler(containerRef, fontSize, script);
  
  // Always use 16:9 aspect ratio (no need for calculation variable)

  // Use useMemo to prevent infinite re-renders
  // The script should already have isFountain properly set by parent components
  const enhancedScript = useMemo(() => {
    if (!script) return null;
    if (!script.id) return null;
    
    const enhanced = {
      ...script,
      // Only check script.id if isFountain is not already set
      isFountain: script.isFountain === true ? true : 
                  script.id.toLowerCase().endsWith('.fountain') ||
                  (script.fileExtension && script.fileExtension.toLowerCase() === 'fountain')
    };
    
    // Log once inside useMemo to avoid excessive logging on every render
    console.log('ViewerFrame: Enhanced script details:', {
      id: enhanced.id,
      title: enhanced.title,
      isFountain: enhanced.isFountain,
      fileExtension: enhanced.fileExtension,
      endsWithFountain: enhanced.id.toLowerCase().endsWith('.fountain'),
      originalIsFountain: script.isFountain
    });
    
    return enhanced;
  }, [script]);

  if (!script || !script.id) {
    return <div className="no-script-message">No script loaded</div>;
  }

  if (!enhancedScript) {
    return <div className="no-script-message">Unable to process script</div>;
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100vh',
        aspectRatio: '16/9',
        overflow: 'hidden',
        backgroundColor: 'black',
        border: 'none',
        boxSizing: 'border-box',
        position: 'relative',
        margin: '0 auto',
        maxWidth: '177.78vh' /* 16:9 ratio */
      }}
      className="viewer-content-container"
      data-aspect-ratio="16/9"
    >
      {/* Using enhanced script with consistent detection */}
      {enhancedScript.isFountain ? (
        <>
          {console.log('ViewerFrame: Rendering FountainViewer with scriptId:', enhancedScript.id)}
          <FountainViewer 
            scriptId={enhancedScript.id}
            width="100%"
            height="100%"
            onLoad={handleIframeLoad}
          />
        </>
      ) : (
        <iframe 
          src={`/${enhancedScript.id}`}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            backgroundColor: 'black',
            display: 'block'
          }}
          sandbox="allow-scripts allow-same-origin allow-downloads allow-popups"
          title={`${enhancedScript.title || 'Script'} content`}
          loading="eager"
          id="teleprompter-frame"
          onLoad={handleIframeLoad}
        />
      )}
    </div>
  );
};

export default ViewerFrame;