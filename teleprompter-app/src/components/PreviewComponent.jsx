// src/components/PreviewComponent.jsx
// A dedicated preview component for the AdminPage
// Unlike the ViewerComponent, this one can send position updates

import React, { useRef, useState, useEffect } from 'react';
import ViewerFrame from './ui/ViewerFrame';
import useTeleprompterScroll from '../hooks/useTeleprompterScroll';
import useTeleprompterFontSize from '../hooks/useTeleprompterFontSize';
import useIframeLoading from '../hooks/useIframeLoading';
import useNodeNavigation from '../hooks/useNodeNavigation';

/**
 * PreviewComponent - For displaying and controlling teleprompter in Admin UI
 * Unlike ViewerComponent, this component CAN send position updates
 */
const PreviewComponent = React.forwardRef((props, ref) => {
  const {
    script, 
    isPlaying,
    speed = 1,
    direction = 'forward',
    fontSize = 12, // Smaller size for admin preview
    aspectRatio = '16/9',
    onPositionChange = null
  } = props;
  
  const containerRef = useRef(null);
  const { scrollToNode, jumpToPosition } = useNodeNavigation();
  
  // Track the currently viewed element for the position indicator
  const [currentPosition, setCurrentPosition] = useState(null);
  const [showIndicator, setShowIndicator] = useState(true);

  // Custom hooks to handle different aspects of the preview
  const { isIframeLoaded, handleIframeLoad } = useIframeLoading(script, fontSize);
  const { animationRef } = useTeleprompterScroll(containerRef, isPlaying, speed, direction, script, isIframeLoaded);
  useTeleprompterFontSize(containerRef, fontSize, script, isIframeLoaded);
  
  // Define a function to find the element at viewport top
  const findElementAtViewportTop = () => {
    try {
      const iframe = containerRef.current?.querySelector('iframe');
      if (!iframe || !iframe.contentDocument || !iframe.contentDocument.body) {
        return null;
      }
      
      // Get all elements that could be at the top of the viewport - prioritize dialog elements
      const dialogElements = iframe.contentDocument.querySelectorAll('[data-type="dialog"]');
      // Also get other text elements as fallback
      const textElements = iframe.contentDocument.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div:not(:has(*))');
      
      // Combine the elements, prioritizing dialog elements
      const allElements = [...dialogElements, ...textElements];
      
      // Get current scroll position
      const scrollTop = iframe.contentWindow.scrollY || iframe.contentDocument.documentElement.scrollTop || 0;
      
      // Add offset from top to match our new tracking line position
      const viewportTopPosition = scrollTop + 50; // Match tracking line position
      
      // Find the element closest to our tracking line
      let closestElement = null;
      let closestDistance = Infinity;
      
      allElements.forEach(element => {
        // Skip empty elements
        if (!element.textContent.trim()) return;
        
        const rect = element.getBoundingClientRect();
        const elementTop = rect.top + scrollTop;
        const distance = Math.abs(elementTop - viewportTopPosition);
        
        // Calculate a priority score - dialog elements get priority
        let priorityScore = distance;
        if (element.getAttribute('data-type') === 'dialog') {
          // Give dialog elements a boost in priority (subtract 1000 from distance)
          priorityScore -= 1000;
        }
        
        if (priorityScore < closestDistance) {
          closestDistance = priorityScore;
          closestElement = element;
        }
      });
      
      return closestElement;
    } catch (error) {
      console.error('Error finding element at viewport top:', error);
      return null;
    }
  };
  
  // Track user scrolling to send position updates after scroll stops
  useEffect(() => {
    if (!containerRef.current || !script) return;
    
    // Track user scrolling state
    let isScrolling = false;
    let scrollTimeout = null;
    
    // Update position after scroll stops
    const handleScrollStop = () => {
      // Check if we still have references (component not unmounted)
      if (!containerRef.current) return;
      
      // Find the element at current position
      const element = findElementAtViewportTop();
      if (element) {
        // Clear any previous highlight
        const iframe = containerRef.current.querySelector('iframe');
        if (iframe && iframe.contentDocument) {
          // Remove previous highlight class from all elements
          iframe.contentDocument.querySelectorAll('.current-line-highlight').forEach(el => {
            el.classList.remove('current-line-highlight');
          });
          
          // Add subtle highlight to current element if indicator is showing
          if (showIndicator) {
            // Add highlight class
            element.classList.add('current-line-highlight');
            
            // Add style for highlight if it doesn't exist
            if (!iframe.contentDocument.getElementById('highlight-style')) {
              const style = iframe.contentDocument.createElement('style');
              style.id = 'highlight-style';
              style.textContent = `
                .current-line-highlight {
                  background-color: rgba(255, 0, 0, 0.08) !important;
                  box-shadow: 0 0 10px rgba(255, 0, 0, 0.1) !important;
                  outline: 1px dashed rgba(255, 0, 0, 0.3) !important;
                }
              `;
              iframe.contentDocument.head.appendChild(style);
            }
          }
        }
        
        setCurrentPosition({
          element: element,
          text: element.textContent.trim().substring(0, 50)
        });
        
        // Send position update to parent if handler provided AND not playing
        // This prevents position updates during auto-scrolling
        if (onPositionChange && !isPlaying) {
          // Get normalized percentage position
          const iframe = containerRef.current.querySelector('iframe');
          if (iframe && iframe.contentWindow && iframe.contentDocument) {
            const scrollTop = iframe.contentWindow.scrollY || 0;
            const scrollHeight = iframe.contentDocument.body.scrollHeight;
            const viewportHeight = iframe.contentWindow.innerHeight;
            const maxScroll = Math.max(0, scrollHeight - viewportHeight);
            const percentage = maxScroll > 0 ? scrollTop / maxScroll : 0;
            
            console.log('Scroll stopped, sending position update:', percentage.toFixed(3));
            
            // Only send position update if not already playing
            // This prevents loops during playback
            if (!isPlaying) {
              // Send enhanced position data with better element identification
              onPositionChange({
                position: percentage,
                text: element.textContent.trim(),
                tag: element.tagName,
                type: element.getAttribute('data-type') || element.tagName.toLowerCase(),
                absolutePosition: scrollTop,
                attributes: {
                  class: element.getAttribute('class'),
                  id: element.getAttribute('id'),
                  dataType: element.getAttribute('data-type')
                }
              });
            }
          }
        }
      }
    };
    
    // Handle scroll events
    const handleScroll = () => {
      // Set scrolling state
      isScrolling = true;
      
      // Clear previous timeout
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      
      // Set a timeout to run after scrolling ends (1 second)
      scrollTimeout = setTimeout(() => {
        // Only process if not playing (don't interfere with auto-scroll)
        if (!isPlaying) {
          isScrolling = false;
          handleScrollStop();
        }
      }, 1000);
    };
    
    // Add scroll event listener to iframe
    let iframe = null;
    try {
      iframe = containerRef.current.querySelector('iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.addEventListener('scroll', handleScroll, { passive: true });
      }
    } catch (err) {
      console.error('Error adding scroll listener:', err);
    }
    
    // Return cleanup function
    return () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      
      try {
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.removeEventListener('scroll', handleScroll);
        }
      } catch (err) {
        console.error('Error removing scroll listener:', err);
      }
    };
  }, [containerRef, script, onPositionChange, isPlaying, findElementAtViewportTop]);
  
  // Expose methods via ref
  React.useImperativeHandle(ref, () => {
    console.log('Creating ref methods in PreviewComponent');
    
    return {
      // Navigation methods
      scrollToNode: (data) => {
        console.log('PreviewComponent.scrollToNode called with data:', 
          typeof data === 'object' ? JSON.stringify(data).substring(0, 100) + '...' : data);
        
        try {
          const result = scrollToNode(data);
          console.log('scrollToNode result:', result);
          return result;
        } catch (err) {
          console.error('Error in scrollToNode:', err);
          return false;
        }
      },
      
      // Direct position navigation
      jumpToPosition,
      
      // Flag to indicate animation is running
      setScrollAnimating(isAnimating) {
        if (!window._scrollState) {
          window._scrollState = {};
        }
        window._scrollState.isScrollAnimating = isAnimating;
      },
      
      // Get the current element in view
      getCurrentTopElement: () => {
        const element = findElementAtViewportTop();
        if (element) {
          return {
            textContent: element.textContent.trim(),
            type: element.tagName.toLowerCase(),
            element: element
          };
        }
        return null;
      }
    };
  }, [scrollToNode, jumpToPosition]);
  
  if (!script) {
    return <div className="no-script-message">No script loaded</div>;
  }
  
  return (
    <div 
      className="teleprompter-preview"
      style={{ 
        backgroundColor: 'black',
        color: 'white',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative' // Allow for absolute positioning of indicators
      }}
    >
      {/* Tracking indicator line */}
      {showIndicator && (
        <div className="tracking-line" style={{
          position: 'absolute',
          top: '50px', // Positioned higher for better visibility
          left: '0',
          right: '0',
          height: '2px',
          backgroundColor: 'rgba(255, 0, 0, 0.9)',
          zIndex: 1000,
          pointerEvents: 'none', // Don't interfere with mouse events
          boxShadow: '0 0 8px 2px rgba(255, 0, 0, 0.7)',
          borderTop: '1px solid rgba(255, 255, 255, 0.3)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.3)'
        }} />
      )}
      
      <ViewerFrame
        script={script}
        containerRef={containerRef}
        aspectRatio={aspectRatio}
        isIframeLoaded={isIframeLoaded}
        handleIframeLoad={handleIframeLoad}
        fontSize={fontSize}
      />
      
      {/* Toggle button for indicator */}
      <button 
        onClick={() => setShowIndicator(!showIndicator)}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          backgroundColor: showIndicator ? 'rgba(255, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          borderRadius: '4px',
          padding: '5px 10px',
          fontSize: '13px',
          fontWeight: 'bold',
          cursor: 'pointer',
          zIndex: 1001,
          boxShadow: '0 0 5px rgba(0, 0, 0, 0.5)',
          transition: 'background-color 0.3s ease'
        }}
      >
        {showIndicator ? '❌ Hide Marker' : '⏺️ Show Marker'}
      </button>
    </div>
  );
});

export default PreviewComponent;