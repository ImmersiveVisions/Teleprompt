// src/components/ScriptPreview.jsx
import React, { useMemo } from 'react';
import ScriptPlayer from './ScriptPlayer';

const ScriptPreview = ({ 
  selectedScript, 
  isPlaying, 
  speed, 
  direction, 
  fontSize, 
  aspectRatio,
  scriptPlayerRef
}) => {
  // Ensure fountain flag is set properly using useMemo to prevent infinite renders
  const enhancedScript = useMemo(() => {
    if (!selectedScript) return null;
    
    const enhanced = {
      ...selectedScript,
      isFountain: selectedScript.isFountain === true ? true :
                  selectedScript.id.toLowerCase().endsWith('.fountain') ||
                  (selectedScript.fileExtension && 
                  selectedScript.fileExtension.toLowerCase() === 'fountain')
    };
    
    // Log only once inside useMemo to avoid repeated logging on every render
    console.log('ScriptPreview: Enhanced script:', {
      id: enhanced.id,
      title: enhanced.title,
      isFountain: enhanced.isFountain,
      fileExtension: enhanced.fileExtension,
      endsWithFountain: enhanced.id.toLowerCase().endsWith('.fountain')
    });
    
    return enhanced;
  }, [selectedScript]);

  return (
    <div className="preview-container">
      <div className="preview-header">
        <h3>Preview: {enhancedScript?.title}</h3>
      </div>
      {enhancedScript ? (
        <ScriptPlayer 
          ref={scriptPlayerRef}
          key={`preview-${enhancedScript.id}`} 
          script={enhancedScript}
          isPlaying={isPlaying}
          speed={speed}
          direction={direction}
          fontSize={Math.round(fontSize * 0.5)} // Reduce font size to 50% for preview
          aspectRatio={aspectRatio}
          fullScreen={false}
        />
      ) : (
        <div className="no-script-preview">No script selected</div>
      )}
    </div>
  );
};

export default ScriptPreview;