import React, { useMemo } from "react";
import FountainViewer from "../FountainViewer";

const ScriptFrame = ({
  script,
  containerRef,
  aspectRatio,
  fullScreen,
  currentTopElement,
  handleIframeLoad,
}) => {
  // Calculate aspect ratio value as a number for calculations
  const aspectRatioValue = aspectRatio === "16/9" ? 16 / 9 : 4 / 3;

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
    console.log('ScriptFrame: Enhanced script details:', {
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
    return <div className="no-script-message">{!script ? "No script selected" : "Script is missing ID property"}</div>;
  }

  if (!enhancedScript) {
    return <div className="no-script-message">Unable to process script</div>;
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        flex: 1,
        padding: fullScreen ? "0" : "0 2rem",
        boxSizing: "border-box",
      }}
    >
      {!fullScreen && currentTopElement && (
        <div
          style={{
            width: "100%",
            padding: "5px 10px",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            color: "#aaffaa",
            fontSize: "12px",
            textAlign: "center",
            borderRadius: "4px",
            margin: "0 0 10px 0",
            maxHeight: "40px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          Current: {currentTopElement.textContent.substring(0, 60).trim()}
          {currentTopElement.textContent.length > 60 ? "..." : ""}
        </div>
      )}
      <div
        ref={containerRef}
        style={{
          width: fullScreen
            ? aspectRatio === "16/9"
              ? "100%"
              : "calc(100vh * " + aspectRatioValue + ")"
            : "100%",
          height: fullScreen ? "100vh" : "100%",
          minHeight: fullScreen ? "auto" : "500px",
          maxWidth: "100vw",
          maxHeight: fullScreen ? "100vh" : "80vh",
          aspectRatio: aspectRatio,
          overflow: "hidden",
          backgroundColor: "black",
          border: fullScreen ? "none" : "1px solid #333",
          boxShadow: fullScreen ? "none" : "0 0 10px rgba(0, 0, 0, 0.5)",
          boxSizing: "border-box",
          position: "relative",
          margin: "0 auto",
          flex: "1",
        }}
        className="script-content-container"
        data-aspect-ratio={aspectRatio}
      >
        {/* Check if it's a fountain file - using enhanced script with consistent detection */}
        {enhancedScript.isFountain ? (
          <>
            {console.log('ScriptFrame: Rendering FountainViewer with scriptId:', enhancedScript.id)}
            <div style={{ 
              backgroundColor: "#e0f3e0", 
              color: "#006600", 
              padding: "5px", 
              marginBottom: "10px", 
              textAlign: "center",
              fontWeight: "bold",
              fontSize: "12px"
            }}>
              Fountain Mode Active - Script {enhancedScript.id}
            </div>
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
              width: "100%",
              height: "100%",
              minHeight: "500px",
              border: "none",
              backgroundColor: "black",
              display: "block",
            }}
            sandbox="allow-scripts allow-same-origin allow-downloads allow-popups"
            title={`${enhancedScript.title} content`}
            loading="eager"
            id="fountain-script-frame"
            onLoad={handleIframeLoad}
          />
        )}
      </div>
    </div>
  );
};

export default ScriptFrame;