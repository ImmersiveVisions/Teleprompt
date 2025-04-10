import { useEffect, useRef } from 'react';

const useTeleprompterScroll = (containerRef, isPlaying, speed, direction, script, isIframeLoaded) => {
  const animationRef = useRef(null);
  
  // Auto-scrolling logic - uses requestAnimationFrame for smooth scrolling
  useEffect(() => {
    if (!script || !containerRef.current || !isIframeLoaded) {
      return;
    }
    
    // Update global playback state to prevent position messages during playback
    window._isPlaybackActive = isPlaying;
    
    // Setup global teleprompter state for other components to access
    if (!window._teleprompterState) {
      window._teleprompterState = {};
    }
    
    // Update the global state
    window._teleprompterState.isAnimating = isPlaying;
    window._teleprompterState.speed = speed;
    window._teleprompterState.direction = direction;
    
    console.log(`TeleprompterViewer: Playback state updated - isPlaying: ${isPlaying}, speed: ${speed}, global state updated`);
    
    // For iframe content - either HTML or fountain
    const iframe = document.getElementById('teleprompter-frame');
    if (!iframe || !iframe.contentWindow || !iframe.contentDocument) {
      console.error('TeleprompterViewer: Cannot find iframe or access content');
      return;
    }
    
    // Clean up any existing animation
    const cleanupAnimation = () => {
      try {
        // Cancel any running animation frame
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        
        // If we're cleaning up and not playing, reset the global flags
        if (!isPlaying) {
          // Update global state to indicate we're not animating anymore
          if (window._teleprompterState) {
            window._teleprompterState.isAnimating = false;
          }
          
          // Also reset the playback active flag
          window._isPlaybackActive = false;
        }
      } catch (e) {
        console.error('TeleprompterViewer: Error cleaning up animation:', e);
      }
    };
    
    // First, clean up existing animations
    cleanupAnimation();
    
    // If not playing, do nothing more
    if (!isPlaying) {
      return cleanupAnimation;
    }
    
    try {
      // For HTML content - exactly mirroring ScriptPlayer's implementation
      // HTML content in iframe
      if (iframe.contentDocument && iframe.contentDocument.body) {
        try {
          // Calculate scrolling parameters
          const scrollHeight = iframe.contentDocument.body.scrollHeight;
          const clientHeight = iframe.contentWindow.innerHeight;
          
          // Get current position
          const startPos = iframe.contentWindow.scrollY || 
            iframe.contentDocument.documentElement.scrollTop || 0;
          
          // Calculate target position based on direction
          const targetPos = direction === 'forward' ? 
            scrollHeight - clientHeight : 0;
          
          // Base reading speed in pixels per second
          const baseScrollSpeed = 100; // Same as ScriptPlayer
          const adjustedSpeed = baseScrollSpeed * speed;
          
          // Calculate duration in milliseconds based on content length
          const remainingScroll = Math.abs(targetPos - startPos);
          const scrollDuration = Math.max(1000, Math.round((remainingScroll / adjustedSpeed) * 1000));
          
          console.log('TeleprompterViewer: Starting auto-scroll:', {
            startPos,
            targetPos,
            scrollHeight,
            duration: scrollDuration,
            speed
          });
          
          // Start the animation - exactly like ScriptPlayer's implementation
          const startTime = performance.now();
          
          const animateScroll = (timestamp) => {
            // Check if we're still supposed to be playing - check actual prop value,
            // not the captured value from closure
            if (!isPlaying) {
              console.log("TeleprompterViewer: Animation stopped - isPlaying is now false");
              cleanupAnimation();
              return;
            }
            
            const elapsed = timestamp - startTime;
            const progress = Math.min(1, elapsed / scrollDuration);
            
            // Calculate current position using linear interpolation
            const currentPos = startPos + (targetPos - startPos) * progress;
            
            // Set scroll position
            iframe.contentWindow.scrollTo(0, currentPos);
            
            // Notify position handler of the current position (if available)
            try {
              if (window._teleprompterPositionHandler) {
                const position = progress; // Normalized position (0-1)
                window._teleprompterPositionHandler({
                  position: position,
                  source: 'teleprompter-scroll',
                  timestamp: Date.now()
                });
              }
            } catch (positionError) {
              console.error('Error reporting position:', positionError);
            }
            
            // Continue if not done and still playing
            if (progress < 1 && isPlaying) {
              animationRef.current = requestAnimationFrame(animateScroll);
            } else {
              console.log('TeleprompterViewer: Auto-scroll animation complete or stopped');
              animationRef.current = null;
            }
          };
          
          // Force a small delay before starting animation to ensure React state is settled
          setTimeout(() => {
            // Double-check we're still supposed to be playing before starting animation
            if (isPlaying) {
              console.log('TeleprompterViewer: Starting scroll animation after delay');
              animationRef.current = requestAnimationFrame(animateScroll);
            } else {
              console.log('TeleprompterViewer: Not starting animation - isPlaying changed to false during delay');
            }
          }, 50);
        } catch (error) {
          console.error('TeleprompterViewer: Error setting up iframe auto-scroll:', error);
        }
      }
    } catch (error) {
      console.error('TeleprompterViewer: Error in auto-scroll effect:', error);
    }
    
    // Return cleanup function
    return cleanupAnimation;
  }, [isPlaying, script, speed, direction, isIframeLoaded, containerRef]);

  return {
    animationRef,
    cleanupAnimation: () => {
      try {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
      } catch (e) {
        console.error('TeleprompterViewer: Error cleaning up animation:', e);
      }
    }
  };
};

export default useTeleprompterScroll;