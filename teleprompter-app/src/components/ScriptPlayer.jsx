// ScriptPlayer.jsx
// An ultra-simple script player that just focuses on scrolling

import React, { useRef, useState, useMemo } from 'react';
import useFontSizeHandler from '../hooks/useFontSizeHandler';
import useScrollAnimation from '../hooks/useScrollAnimation';
import usePositionTracking from '../hooks/usePositionTracking';
import usePositionJump from '../hooks/usePositionJump';
import useIframeHandlers from '../hooks/useIframeHandlers';
import ScriptFrame from './ui/ScriptFrame';

const ScriptPlayer = ({ 
  script, 
  isPlaying,
  speed = 1,
  direction = 'forward',
  fontSize = 24,
  fullScreen = false,
  aspectRatio = '16/9'  // Default to 16:9, but can be '4/3' or '16/9'
}, ref) => {
  // Use useMemo to prevent infinite re-renders
  const enhancedScript = useMemo(() => {
    if (!script) return null;
    
    const enhanced = {
      ...script,
      isFountain: script.isFountain || 
                  script.id.toLowerCase().endsWith('.fountain') ||
                  (script.fileExtension && 
                   script.fileExtension.toLowerCase() === 'fountain')
    };
    
    // Log only once inside useMemo to avoid excessive logging
    console.log("ScriptPlayer: Rendering with enhanced script:", { 
      id: enhanced.id, 
      title: enhanced.title, 
      isFountain: enhanced.isFountain,
      fileExtension: enhanced.fileExtension,
      originalIsFountain: script.isFountain
    });
    
    return enhanced;
  }, [script]);
    
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  
  // Track font size in window for iframe load handler
  if (typeof window !== 'undefined') {
    window._currentFontSize = fontSize;
  }

  // Custom hooks to handle different aspects of the player
  useFontSizeHandler(containerRef, fontSize, enhancedScript);
  const { cleanupAnimation } = useScrollAnimation(containerRef, isPlaying, speed, direction, enhancedScript, animationRef);
  const { currentTopElement, findElementAtViewportTop } = usePositionTracking(containerRef, isPlaying, enhancedScript, ref);
  const { jumpToPosition } = usePositionJump(containerRef, enhancedScript);
  const { handleIframeLoad } = useIframeHandlers(containerRef, enhancedScript, ref);
  
  // Expose methods to parent component
  React.useImperativeHandle(ref, () => {
    // Log debug info when the ref methods are created
    console.log('⭐ [POSITION DEBUG] Creating ref methods in useImperativeHandle');
    
    // Create a unique ID for this ref creation to track persistence
    const refId = Date.now().toString(36);
    
    const refObject = {
      // Jump to a specific position
      jumpToPosition,
      
      // Get the current element at viewport top
      getCurrentTopElement: () => currentTopElement,
      
      // Flag to indicate animation is running (prevents user scroll events)
      setScrollAnimating: (animating) => {
        // Direct access to module-scoped state
        if (window._scrollState) {
          window._scrollState.isScrollAnimating = animating;
          console.log('📋 [DEBUG] Set animation state to', animating);
        }
      },
      
      // This is just a placeholder that will be overwritten by the parent
      // But we provide a default implementation for safety
      sendPosition: (data) => {
        console.log('⭐ [POSITION DEBUG] Default sendPosition called - this should be overridden by parent!', data);
      },
      
      // For debugging - add a ref ID and timestamp
      _debugInfo: {
        refId: refId,
        createdAt: new Date().toISOString(),
        componentId: containerRef.current ? containerRef.current.id : 'unknown'
      }
    };
    
    console.log('⭐ [POSITION DEBUG] Created ref object:', {
      refId: refId,
      hasJumpToPosition: !!refObject.jumpToPosition,
      hasGetCurrentTopElement: !!refObject.getCurrentTopElement,
      hasSetScrollAnimating: !!refObject.setScrollAnimating,
      hasSendPosition: !!refObject.sendPosition
    });
    
    return refObject;
  }, [enhancedScript, jumpToPosition, currentTopElement]);
  
  // If no script, render an empty message
  if (!enhancedScript) {
    return <div className="no-script-message">No script selected</div>;
  }
  
  return (
    <div 
      className={`script-player ${fullScreen ? 'fullscreen' : ''}`}
      style={{ 
        backgroundColor: 'black',
        color: 'white',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      {fullScreen && (
        <div 
          style={{
            padding: '1rem',
            textAlign: 'center',
            borderBottom: '1px solid #333',
            fontWeight: 'bold',
            fontSize: '1.5rem',
            width: '100%'
          }}
        >
          {enhancedScript.title}
        </div>
      )}
      
      <ScriptFrame
        script={enhancedScript}
        containerRef={containerRef}
        aspectRatio={aspectRatio}
        fullScreen={fullScreen}
        currentTopElement={currentTopElement}
        handleIframeLoad={handleIframeLoad}
      />
    </div>
  );
};

export default React.forwardRef(ScriptPlayer);