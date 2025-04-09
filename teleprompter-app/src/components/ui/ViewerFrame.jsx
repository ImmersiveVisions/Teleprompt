import React from 'react';
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
      {script.isFountain ? (
        <FountainViewer 
          scriptId={script.id}
          width="100%"
          height="100%"
        />
      ) : (
        <iframe 
          src={`/${script.id}`}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            backgroundColor: 'black',
            display: 'block'
          }}
          sandbox="allow-scripts allow-same-origin"
          title={`${script.title || 'Script'} content`}
          loading="eager"
          id="teleprompter-frame"
          onLoad={handleIframeLoad}
        />
      )}
    </div>
  );
};

export default ViewerFrame;