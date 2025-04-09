import React from 'react';

const ScriptFrame = ({ 
  script, 
  containerRef, 
  aspectRatio, 
  fullScreen, 
  currentTopElement, 
  handleIframeLoad 
}) => {
  // Calculate aspect ratio value as a number for calculations
  const aspectRatioValue = aspectRatio === '16/9' ? 16/9 : 4/3;

  if (!script) {
    return <div className="no-script-message">No script selected</div>;
  }
  
  // Verify script has required properties
  if (!script.id) {
    return <div className="no-script-message">Script is missing ID property</div>;
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
        padding: fullScreen ? '0' : '0 2rem',
        boxSizing: 'border-box'
      }}
    >
      {!fullScreen && currentTopElement && (
        <div
          style={{
            width: '100%',
            padding: '5px 10px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: '#aaffaa',
            fontSize: '12px',
            textAlign: 'center',
            borderRadius: '4px',
            margin: '0 0 10px 0',
            maxHeight: '40px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          Current: {currentTopElement.textContent.substring(0, 60).trim()}
          {currentTopElement.textContent.length > 60 ? '...' : ''}
        </div>
      )}
      <div
        ref={containerRef}
        style={{
          width: fullScreen ? (aspectRatio === '16/9' ? '100%' : 'calc(100vh * ' + aspectRatioValue + ')') : '100%',
          height: fullScreen ? '100vh' : '100%',
          minHeight: fullScreen ? 'auto' : '500px',
          maxWidth: '100vw',
          maxHeight: fullScreen ? '100vh' : '80vh',
          aspectRatio: aspectRatio,
          overflow: 'hidden',
          backgroundColor: 'black',
          border: fullScreen ? 'none' : '1px solid #333',
          boxShadow: fullScreen ? 'none' : '0 0 10px rgba(0, 0, 0, 0.5)',
          boxSizing: 'border-box',
          position: 'relative',
          margin: '0 auto',
          flex: '1'
        }}
        className="script-content-container"
        data-aspect-ratio={aspectRatio}
      >
        <iframe 
          src={`/${script.id}`}
          style={{
            width: '100%',
            height: '100%',
            minHeight: '500px',
            border: 'none',
            backgroundColor: 'black',
            display: 'block'
          }}
          sandbox="allow-scripts allow-same-origin"
          title={`${script.title} content`}
          loading="eager"
          id="html-script-frame"
          onLoad={handleIframeLoad}
        />
      </div>
    </div>
  );
};

export default ScriptFrame;