import React, { useMemo } from 'react';
import FountainViewer from '../FountainViewer';

const ViewerFrame = ({
  script,
  containerRef,
  aspectRatio,
  isIframeLoaded,
  handleIframeLoad,
  fontSize
}) => {
  // Calculate aspect ratio value as a number for calculations
  const aspectRatioValue = aspectRatio === '16/9' ? 16/9 : 4/3;

  if (!script) {
    return <div className="no-script-message">No script loaded</div>;
  }
  
  // Use useMemo to prevent infinite re-renders
  // The script should already have isFountain properly set by parent components
  const enhancedScript = useMemo(() => {
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

  return (
    <div
      ref={containerRef}
      style={{
        width: aspectRatio === '16/9' ? '100%' : 'calc(100vh * ' + aspectRatioValue + ')',
        height: '100vh',
        aspectRatio: aspectRatio,
        overflow: 'hidden',
        backgroundColor: 'black',
        border: 'none',
        boxSizing: 'border-box',
        position: 'relative',
        margin: '0 auto'
      }}
      className="viewer-content-container"
      data-aspect-ratio={aspectRatio}
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