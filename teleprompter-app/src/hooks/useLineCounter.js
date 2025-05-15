// src/hooks/useLineCounter.js
import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to count and track visible lines in a script
 * 
 * @param {Object} options Configuration options
 * @param {string} options.containerSelector CSS selector for the container element
 * @param {string} options.contentSelector CSS selector for the content element
 * @param {boolean} options.enabled Whether the line counting is enabled
 * @returns {Object} Line counting state and utility functions
 */
const useLineCounter = ({
  containerSelector = '#teleprompter-frame',
  contentSelector = 'body',
  enabled = true
}) => {
  const [totalLines, setTotalLines] = useState(0);
  const [visibleLines, setVisibleLines] = useState(0);
  const [currentFirstLine, setCurrentFirstLine] = useState(1);
  const [currentLastLine, setCurrentLastLine] = useState(1);
  const [lineMap, setLineMap] = useState([]);
  const lineMapRef = useRef([]);
  const lineHeightRef = useRef(0);
  const containerRef = useRef(null);
  const contentElementRef = useRef(null);

  // Calculate total number of lines and create a map of line positions
  const calculateLineMap = () => {
    if (!enabled) return;
    
    const container = document.querySelector(containerSelector);
    if (!container) {
      console.warn(`Container element with selector "${containerSelector}" not found`);
      return;
    }
    
    containerRef.current = container;
    
    // For iframe content
    let contentElement;
    if (container.tagName === 'IFRAME') {
      try {
        contentElement = container.contentDocument.querySelector(contentSelector);
        if (!contentElement) {
          console.warn(`Content element with selector "${contentSelector}" not found in iframe`);
          return;
        }
        contentElementRef.current = contentElement;
      } catch (error) {
        console.error('Error accessing iframe content:', error);
        return;
      }
    } else {
      // For direct DOM content
      contentElement = container.querySelector(contentSelector);
      if (!contentElement) {
        console.warn(`Content element with selector "${contentSelector}" not found in container`);
        return;
      }
      contentElementRef.current = contentElement;
    }
    
    // Get all text nodes
    const textNodesArray = [];
    const walkTextNodes = (node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        textNodesArray.push(node);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Skip hidden elements
        const style = window.getComputedStyle(node);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          for (let child of node.childNodes) {
            walkTextNodes(child);
          }
        }
      }
    };
    
    walkTextNodes(contentElement);
    
    // Calculate line height
    const computedStyle = window.getComputedStyle(contentElement);
    const fontSize = parseFloat(computedStyle.fontSize);
    const lineHeight = computedStyle.lineHeight === 'normal' 
      ? fontSize * 1.2 // Default browser line-height is typically 1.2
      : parseFloat(computedStyle.lineHeight);
    
    lineHeightRef.current = lineHeight;
    
    // Create a map of lines with their positions
    const map = [];
    let lineCounter = 1;
    
    // Process each text node
    textNodesArray.forEach(textNode => {
      const range = document.createRange();
      range.selectNodeContents(textNode);
      
      // Get the bounding client rect
      const rects = range.getClientRects();
      
      // Process each rect (line)
      for (let i = 0; i < rects.length; i++) {
        const rect = rects[i];
        const lineTop = rect.top + container.scrollTop;
        
        // Skip extremely small rects (likely just spacing)
        if (rect.width < 5 || rect.height < 5) continue;
        
        // Add line to map
        map.push({
          lineNumber: lineCounter,
          top: lineTop,
          bottom: lineTop + rect.height,
          height: rect.height,
          text: textNode.textContent.trim().substring(0, 50) // First 50 chars for reference
        });
        
        lineCounter++;
      }
    });
    
    // Sort by position
    map.sort((a, b) => a.top - b.top);
    
    // Deduplicate lines at similar positions (within half line height)
    const deduplicatedMap = [];
    let lastTop = -1000;
    
    map.forEach(line => {
      if (line.top - lastTop > lineHeight / 2) {
        deduplicatedMap.push(line);
        lastTop = line.top;
      }
    });
    
    // Update line numbers
    deduplicatedMap.forEach((line, index) => {
      line.lineNumber = index + 1;
    });
    
    // Update state
    setTotalLines(deduplicatedMap.length);
    setLineMap(deduplicatedMap);
    lineMapRef.current = deduplicatedMap;
  };

  // Calculate which lines are currently visible in the viewport
  const calculateVisibleLines = () => {
    if (!enabled || !containerRef.current || lineMapRef.current.length === 0) return;
    
    const container = containerRef.current;
    let scrollTop = 0;
    let viewportHeight = 0;
    
    // Get scroll position and viewport height
    if (container.tagName === 'IFRAME') {
      try {
        scrollTop = container.contentWindow.scrollY || container.contentWindow.pageYOffset;
        viewportHeight = container.contentWindow.innerHeight;
      } catch (error) {
        console.error('Error getting iframe scroll position:', error);
        return;
      }
    } else {
      scrollTop = container.scrollTop;
      viewportHeight = container.clientHeight;
    }
    
    // Find first and last visible lines
    const firstVisibleLine = lineMapRef.current.find(line => 
      line.bottom > scrollTop
    );
    
    const lastVisibleLine = [...lineMapRef.current].reverse().find(line => 
      line.top < scrollTop + viewportHeight
    );
    
    if (firstVisibleLine && lastVisibleLine) {
      const visibleLineCount = lastVisibleLine.lineNumber - firstVisibleLine.lineNumber + 1;
      
      setCurrentFirstLine(firstVisibleLine.lineNumber);
      setCurrentLastLine(lastVisibleLine.lineNumber);
      setVisibleLines(visibleLineCount);
    }
  };

  // Scroll to a specific line number
  const scrollToLine = (lineNumber) => {
    if (!enabled || !containerRef.current || lineMapRef.current.length === 0) return false;
    
    // Find the line in our map
    const line = lineMapRef.current.find(l => l.lineNumber === lineNumber);
    if (!line) {
      console.warn(`Line ${lineNumber} not found in line map`);
      return false;
    }
    
    const container = containerRef.current;
    
    // Scroll to the line
    if (container.tagName === 'IFRAME') {
      try {
        container.contentWindow.scrollTo({
          top: line.top - (lineHeightRef.current / 2), // Position in the middle
          behavior: 'smooth'
        });
      } catch (error) {
        console.error('Error scrolling iframe to line:', error);
        return false;
      }
    } else {
      container.scrollTo({
        top: line.top - (lineHeightRef.current / 2),
        behavior: 'smooth'
      });
    }
    
    return true;
  };

  // Initialize line counting when enabled
  useEffect(() => {
    if (!enabled) return;
    
    // Allow time for the content to load
    const timer = setTimeout(() => {
      calculateLineMap();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [enabled]);

  // Set up scroll listener to track visible lines
  useEffect(() => {
    if (!enabled || !containerRef.current) return;
    
    const container = containerRef.current;
    
    const handleScroll = () => {
      // Debounce scroll events
      if (window.scrollTimeout) {
        cancelAnimationFrame(window.scrollTimeout);
      }
      
      window.scrollTimeout = requestAnimationFrame(() => {
        calculateVisibleLines();
      });
    };
    
    // Set up scroll listener
    if (container.tagName === 'IFRAME') {
      try {
        container.contentWindow.addEventListener('scroll', handleScroll);
      } catch (error) {
        console.error('Error adding scroll listener to iframe:', error);
      }
    } else {
      container.addEventListener('scroll', handleScroll);
    }
    
    // Initial calculation
    calculateVisibleLines();
    
    // Clean up
    return () => {
      if (window.scrollTimeout) {
        cancelAnimationFrame(window.scrollTimeout);
      }
      
      if (container.tagName === 'IFRAME') {
        try {
          container.contentWindow.removeEventListener('scroll', handleScroll);
        } catch (error) {
          console.error('Error removing scroll listener from iframe:', error);
        }
      } else {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [enabled, containerRef.current, lineMapRef.current.length]);

  return {
    totalLines,
    visibleLines,
    currentFirstLine,
    currentLastLine,
    lineMap,
    scrollToLine,
    recalculateLines: calculateLineMap,
    refreshVisibleLines: calculateVisibleLines
  };
};

export default useLineCounter;