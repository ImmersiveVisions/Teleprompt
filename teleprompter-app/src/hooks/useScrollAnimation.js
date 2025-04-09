import { useEffect, useRef } from 'react';
import $ from 'jquery';

const useScrollAnimation = (containerRef, isPlaying, speed, direction, script, animationRef) => {
  // jQuery-based smooth scrolling approach
  useEffect(() => {
    // Don't do anything if no script or container
    if (!script || !containerRef.current) {
      return;
    }
    
    const container = containerRef.current;
    
    // Clean up any existing animation
    const cleanupAnimation = () => {
      // Stop any ongoing jQuery animation first
      try {
        // Use jQuery to stop the animation
        $(container).stop(true, false);
        
        // For iframe content
        const iframe = container.querySelector('iframe');
        if (iframe && iframe.contentWindow && iframe.contentDocument) {
          try {
            // Try to stop animation in iframe using jQuery
            // This might not work due to cross-origin restrictions
            const iframeJQuery = iframe.contentWindow.$;
            if (iframeJQuery) {
              iframeJQuery('html, body').stop(true, false);
            }
          } catch (e) {
            // Silent fail for cross-origin restrictions
          }
        }
      } catch (e) {
        // Silent fail
      }
      
      // Clear any tracked timeouts or animation frames
      if (animationRef.current) {
        if (typeof animationRef.current === 'number') {
          cancelAnimationFrame(animationRef.current);
        } else if (animationRef.current.type === 'timeout') {
          clearTimeout(animationRef.current.id);
        }
        animationRef.current = null;
      }
    };
    
    // First, clean up existing animations
    cleanupAnimation();
    
    // If not playing, do nothing more
    if (!isPlaying) {
      return;
    }
    
    // DETERMINE SCROLL TARGET AND CONTAINER
    
    // For the main container
    let scrollDuration;
    let isIframeContent = false;
    
    if (script.id && script.id.toLowerCase().endsWith('.html')) {
      // HTML content in iframe
      const iframe = container.querySelector('iframe');
      if (iframe && iframe.contentWindow) {
        try {
          // Check if we can access iframe content
          if (iframe.contentDocument && iframe.contentDocument.body) {
            isIframeContent = true;
            
            // Add an end marker to the iframe if not exists
            const addEndMarker = () => {
              try {
                // Try to add an end marker element to the iframe
                if (!iframe.contentDocument.getElementById('endoftext')) {
                  const endMarker = iframe.contentDocument.createElement('div');
                  endMarker.id = 'endoftext';
                  endMarker.style.height = '1px';
                  endMarker.style.width = '100%';
                  
                  // Add to the end of the body
                  iframe.contentDocument.body.appendChild(endMarker);
                }
              } catch (e) {
                // Silent fail
              }
            };
            
            // Calculate duration based on content length
            const contentLength = iframe.contentDocument.body.scrollHeight;
            
            // Base reading speed in pixels per second
            // We assume 200-250 words per minute which is about 20-25 characters per second
            // If we assume 1 pixel roughly equals 0.2 characters
            const baseReadingPixelsPerSecond = 100; // 20 chars per second / 0.2 chars per pixel
            
            // User speed modifier
            const adjustedPixelsPerSecond = baseReadingPixelsPerSecond * speed;
            
            // Calculate duration in milliseconds
            scrollDuration = Math.round((contentLength / adjustedPixelsPerSecond) * 1000);
            
            // Set minimum duration
            const minDuration = 1000; // 1 second minimum
            scrollDuration = Math.max(minDuration, scrollDuration);
            
            // Try to use jQuery inside the iframe
            try {
              addEndMarker();
              
              // Check if jQuery is available in the iframe
              if (iframe.contentWindow.$ || iframe.contentWindow.jQuery) {
                // Get jQuery from iframe
                const $iframe = iframe.contentWindow.$ || iframe.contentWindow.jQuery;
                
                // If scrolling backward
                if (direction === 'backward') {
                  // Scroll to top
                  $iframe('html, body').animate({
                    scrollTop: 0
                  }, scrollDuration, 'linear');
                } else {
                  // Scroll to end marker
                  $iframe('html, body').animate({
                    scrollTop: $iframe('#endoftext').offset().top
                  }, scrollDuration, 'linear');
                }
                
                // Nothing more to do here
                return;
              } else {
                // Fallback to our own animation for cross-origin iframes
                
                // We'll use our own animation approach for iframes
                // Start with current position
                const startTime = performance.now();
                const startPos = iframe.contentWindow.scrollY || 0;
                const targetPos = direction === 'forward' ? 
                  iframe.contentDocument.body.scrollHeight - iframe.contentWindow.innerHeight : 0;
                
                // Create animation function
                const animateIframe = (timestamp) => {
                  if (!isPlaying) {
                    return;
                  }
                  
                  const elapsed = timestamp - startTime;
                  const progress = Math.min(1, elapsed / scrollDuration);
                  
                  // Linear position calculation
                  const currentPos = startPos + (targetPos - startPos) * progress;
                  
                  // Set scroll position
                  iframe.contentWindow.scrollTo(0, currentPos);
                  
                  // Continue if not done
                  if (progress < 1 && isPlaying) {
                    animationRef.current = requestAnimationFrame(animateIframe);
                  } else {
                    animationRef.current = null;
                  }
                };
                
                // Start animation
                animationRef.current = requestAnimationFrame(animateIframe);
                
                // Return cleanup function
                return;
              }
            } catch (e) {
              // Continue with outer container animation
            }
          }
        } catch (e) {
          // Cannot access iframe content directly
        }
      }
    }
    
    // If we get here, we need to animate the main container
    if (!isIframeContent) {
      // Calculate duration based on content length
      const contentLength = container.scrollHeight;
      
      // Base reading speed
      const baseReadingPixelsPerSecond = 100;
      const adjustedPixelsPerSecond = baseReadingPixelsPerSecond * speed;
      
      // Calculate duration
      scrollDuration = Math.round((contentLength / adjustedPixelsPerSecond) * 1000);
      
      // Set minimum duration
      const minDuration = 1000;
      scrollDuration = Math.max(minDuration, scrollDuration);
      
      // Animate the container with jQuery
      if (direction === 'backward') {
        $(container).animate({
          scrollTop: 0
        }, scrollDuration, 'linear');
      } else {
        // Add an end marker if needed
        if (!container.querySelector('#endoftext')) {
          const endMarker = document.createElement('div');
          endMarker.id = 'endoftext';
          endMarker.style.height = '1px';
          endMarker.style.width = '100%';
          container.appendChild(endMarker);
        }
        
        // Scroll to end of content
        $(container).animate({
          scrollTop: container.scrollHeight
        }, scrollDuration, 'linear');
      }
    }
    
    // Clean up on unmount or dependency change
    return cleanupAnimation;
  }, [isPlaying, speed, direction, script, containerRef, animationRef]);
  
  return {
    cleanupAnimation: () => {
      // Stop any ongoing jQuery animation first
      try {
        const container = containerRef.current;
        if (!container) return;
        
        // Use jQuery to stop the animation
        $(container).stop(true, false);
        
        // For iframe content
        const iframe = container.querySelector('iframe');
        if (iframe && iframe.contentWindow && iframe.contentDocument) {
          try {
            // Try to stop animation in iframe using jQuery
            const iframeJQuery = iframe.contentWindow.$;
            if (iframeJQuery) {
              iframeJQuery('html, body').stop(true, false);
            }
          } catch (e) {
            // Silent fail for cross-origin restrictions
          }
        }
      } catch (e) {
        // Silent fail
      }
      
      // Clear any tracked timeouts or animation frames
      if (animationRef.current) {
        if (typeof animationRef.current === 'number') {
          cancelAnimationFrame(animationRef.current);
        } else if (animationRef.current.type === 'timeout') {
          clearTimeout(animationRef.current.id);
        }
        animationRef.current = null;
      }
    }
  };
};

export default useScrollAnimation;