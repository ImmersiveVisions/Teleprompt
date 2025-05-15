// src/hooks/useResponsiveFontSize.js
import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to dynamically adjust font size based on viewport and content
 * to maintain a target number of visible lines
 * 
 * @param {Object} options Configuration options
 * @param {number} options.targetLineCount Target number of visible lines to display
 * @param {number} options.minFontSize Minimum font size in pixels
 * @param {number} options.maxFontSize Maximum font size in pixels
 * @param {number} options.initialFontSize Initial font size in pixels
 * @param {string} options.containerSelector CSS selector for the container element
 * @param {string} options.contentSelector CSS selector for the content element
 * @param {boolean} options.enabled Whether the adjustment is enabled
 * @returns {Object} Font size state and adjustment functions
 */
const useResponsiveFontSize = ({
  targetLineCount = 20,
  minFontSize = 12,
  maxFontSize = 48,
  initialFontSize = 24,
  containerSelector = '#teleprompter-frame',
  contentSelector = 'body',
  enabled = true
}) => {
  const [fontSize, setFontSize] = useState(initialFontSize);
  const [lineCount, setLineCount] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [lineHeight, setLineHeight] = useState(0);
  const adjustmentInProgress = useRef(false);
  const contentElementRef = useRef(null);

  // Calculate line height based on current font size
  const calculateLineHeight = (element, calculatedFontSize) => {
    if (!element) return 0;
    
    const computedStyle = window.getComputedStyle(element);
    const calculatedLineHeight = computedStyle.lineHeight === 'normal' 
      ? calculatedFontSize * 1.2 // Default browser line-height is typically 1.2
      : parseFloat(computedStyle.lineHeight);
      
    return calculatedLineHeight;
  };

  // Calculate visible line count based on container height and line height
  const calculateLineCount = (containerHeight, lineHeight) => {
    if (!containerHeight || !lineHeight) return 0;
    return Math.floor(containerHeight / lineHeight);
  };

  // Adjust font size to match target line count
  const adjustFontSize = () => {
    if (!enabled || adjustmentInProgress.current) return;
    
    adjustmentInProgress.current = true;
    
    // Get container element
    const container = document.querySelector(containerSelector);
    if (!container) {
      console.warn(`Container element with selector "${containerSelector}" not found`);
      adjustmentInProgress.current = false;
      return;
    }
    
    // For iframe content
    let contentElement;
    if (container.tagName === 'IFRAME') {
      try {
        contentElement = container.contentDocument.querySelector(contentSelector);
        if (!contentElement) {
          console.warn(`Content element with selector "${contentSelector}" not found in iframe`);
          adjustmentInProgress.current = false;
          return;
        }
        contentElementRef.current = contentElement;
      } catch (error) {
        console.error('Error accessing iframe content:', error);
        adjustmentInProgress.current = false;
        return;
      }
    } else {
      // For direct DOM content
      contentElement = container.querySelector(contentSelector);
      if (!contentElement) {
        console.warn(`Content element with selector "${contentSelector}" not found in container`);
        adjustmentInProgress.current = false;
        return;
      }
      contentElementRef.current = contentElement;
    }
    
    // Get container dimensions
    const height = container.clientHeight || container.offsetHeight;
    setContainerHeight(height);
    
    // Calculate line height based on current font size
    const currentLineHeight = calculateLineHeight(contentElement, fontSize);
    setLineHeight(currentLineHeight);
    
    // Calculate current visible line count
    const currentLineCount = calculateLineCount(height, currentLineHeight);
    setLineCount(currentLineCount);
    
    // Adjust font size based on difference from target line count
    if (currentLineCount !== targetLineCount && currentLineCount > 0) {
      // Calculate ideal line height to achieve target line count
      const idealLineHeight = height / targetLineCount;
      
      // Estimate font size based on line height ratio
      const lineHeightRatio = currentLineHeight / fontSize;
      const estimatedNewFontSize = idealLineHeight / lineHeightRatio;
      
      // Clamp the font size to min/max values
      const newFontSize = Math.max(
        minFontSize, 
        Math.min(maxFontSize, estimatedNewFontSize)
      );
      
      // Update font size with a small step to avoid jumps
      const step = newFontSize > fontSize ? 1 : -1;
      const adjustedFontSize = Math.abs(newFontSize - fontSize) < 2 
        ? newFontSize 
        : fontSize + step;
      
      setFontSize(adjustedFontSize);
      
      // Apply the new font size to the content element
      if (container.tagName === 'IFRAME') {
        try {
          const styleElement = container.contentDocument.getElementById('responsive-font-style') || 
                             container.contentDocument.createElement('style');
          styleElement.id = 'responsive-font-style';
          styleElement.textContent = `
            ${contentSelector} {
              font-size: ${adjustedFontSize}px !important;
              line-height: ${adjustedFontSize * 1.2}px !important;
            }
          `;
          
          if (!styleElement.parentNode) {
            container.contentDocument.head.appendChild(styleElement);
          }
        } catch (error) {
          console.error('Error applying font size to iframe:', error);
        }
      } else {
        contentElement.style.fontSize = `${adjustedFontSize}px`;
        contentElement.style.lineHeight = `${adjustedFontSize * 1.2}px`;
      }
    }
    
    adjustmentInProgress.current = false;
  };

  // Set up resize observer to adjust font size when container dimensions change
  useEffect(() => {
    if (!enabled) return;
    
    const handleResize = () => {
      // Debounce resize events
      if (window.resizeTimeout) {
        clearTimeout(window.resizeTimeout);
      }
      
      window.resizeTimeout = setTimeout(() => {
        adjustFontSize();
      }, 250);
    };
    
    // Initial adjustment
    adjustFontSize();
    
    // Set up resize listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
      if (window.resizeTimeout) {
        clearTimeout(window.resizeTimeout);
      }
    };
  }, [enabled, fontSize, targetLineCount]);

  // Re-adjust when font size is changed externally
  useEffect(() => {
    if (!enabled || fontSize === initialFontSize) return;
    
    const timer = setTimeout(() => {
      adjustFontSize();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [fontSize, enabled]);

  // Manual adjustment functions
  const increaseFontSize = () => {
    setFontSize(prevSize => Math.min(maxFontSize, prevSize + 1));
  };
  
  const decreaseFontSize = () => {
    setFontSize(prevSize => Math.max(minFontSize, prevSize - 1));
  };
  
  const resetFontSize = () => {
    setFontSize(initialFontSize);
  };

  // Force adjustment
  const forceAdjustment = () => {
    adjustmentInProgress.current = false;
    adjustFontSize();
  };

  return {
    fontSize,
    lineCount,
    lineHeight,
    containerHeight,
    setFontSize,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    forceAdjustment,
    debug: {
      targetLineCount,
      adjustmentInProgress: adjustmentInProgress.current,
      contentElement: contentElementRef.current
    }
  };
};

export default useResponsiveFontSize;