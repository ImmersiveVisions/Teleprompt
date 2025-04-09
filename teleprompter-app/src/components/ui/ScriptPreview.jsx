import React from 'react';
import ScriptPlayer from '../ScriptPlayer';

const ScriptPreview = ({
  script,
  isPlaying,
  speed,
  direction,
  fontSize,
  aspectRatio,
  scriptPlayerRef
}) => {
  return (
    <div className="preview-container">
      <div className="preview-header">
        <h3>Preview: {script?.title}</h3>
      </div>
      <ScriptPlayer 
        ref={scriptPlayerRef}
        key={`preview-${script.id}`} 
        script={script}
        isPlaying={isPlaying}
        speed={speed}
        direction={direction}
        fontSize={Math.round(fontSize * 0.5)} // Reduce font size to 50% for preview
        aspectRatio={aspectRatio}
        fullScreen={false}
      />
    </div>
  );
};

export default ScriptPreview;