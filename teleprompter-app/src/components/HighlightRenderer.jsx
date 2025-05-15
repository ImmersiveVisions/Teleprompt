// src/components/HighlightRenderer.jsx
import React, { useEffect, useRef } from 'react';
import highlightService from '../services/highlightService';

/**
 * Component to render highlights in script display frames
 * This is a utility component that doesn't render visible elements itself
 * but modifies the DOM of the script container to apply highlighting
 */
const HighlightRenderer = ({ 
  scriptId, 
  containerId = 'teleprompter-frame',
  contentSelector = 'body',
  enabled = true
}) => {
  const containerRef = useRef(null);
  const highlightsRef = useRef([]);
  const styleElRef = useRef(null);
  
  // Apply highlights to the script content
  const applyHighlights = () => {
    if (!enabled || !scriptId) return;
    
    // Get container element
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`Container element with ID "${containerId}" not found`);
      return;
    }
    
    containerRef.current = container;
    
    // Get highlights for this script
    const highlights = highlightService.getHighlights(scriptId);
    highlightsRef.current = highlights;
    
    if (highlights.length === 0) {
      // No highlights, clean up any existing ones
      removeHighlightStyles();
      return;
    }
    
    // For iframe content
    if (container.tagName === 'IFRAME') {
      applyHighlightsToIframe(container, highlights);
    } else {
      // For direct DOM content
      applyHighlightsToDom(container, highlights);
    }
  };
  
  // Apply highlights to iframe content
  const applyHighlightsToIframe = (iframe, highlights) => {
    try {
      // Wait for iframe to load
      if (!iframe.contentDocument || !iframe.contentDocument.body) {
        console.warn('Iframe content not loaded yet');
        return;
      }
      
      // Get content element
      const contentElement = iframe.contentDocument.querySelector(contentSelector);
      if (!contentElement) {
        console.warn(`Content element with selector "${contentSelector}" not found in iframe`);
        return;
      }
      
      // Create or get style element
      let styleElement = iframe.contentDocument.getElementById('highlight-styles');
      if (!styleElement) {
        styleElement = iframe.contentDocument.createElement('style');
        styleElement.id = 'highlight-styles';
        iframe.contentDocument.head.appendChild(styleElement);
      }
      
      styleElRef.current = styleElement;
      
      // Generate CSS for highlighting
      let css = '';
      
      // Character-based highlights - highlight all instances of a character name
      const enabledCharacters = highlightService.getEnabledCharacters();
      if (enabledCharacters.length > 0) {
        // Create character-based highlighting CSS rules
        enabledCharacters.forEach(character => {
          const characterColor = highlightService.getCharacterColor(character);
          if (characterColor) {
            const characterClass = `char-highlight-${character.toLowerCase().replace(/\s+/g, '-')}`;
            
            // Add a CSS rule that will highlight all instances of this character's name
            css += `.${characterClass} { 
              background-color: ${characterColor}; 
              color: ${getContrastColor(characterColor)};
              padding: 2px 0;
            }\n`;
            
            // Find all instances of the character name in the content
            // This is done by searching for the character name with word boundaries
            const characterName = character;
            const regex = new RegExp(`\\b${characterName}\\b`, 'gi');
            
            // Apply highlighting to all text nodes containing the character name
            highlightTextInIframe(iframe.contentDocument, contentElement, regex, characterClass);
          }
        });
      }
      
      // Position-based highlights - find DOM elements by position
      const allTextNodes = getAllTextNodes(contentElement);
      const contentRect = contentElement.getBoundingClientRect();
      
      highlights.forEach((highlight, index) => {
        // Calculate positions
        const startY = highlight.startPos * contentElement.scrollHeight;
        const endY = highlight.endPos * contentElement.scrollHeight;
        
        // Find elements in the specified range
        const elementsInRange = findElementsInYRange(allTextNodes, startY, endY);
        
        // Create a unique class for this highlight
        const highlightClass = `script-highlight-${index}`;
        
        // Add class to elements
        elementsInRange.forEach(el => {
          el.classList.add(highlightClass);
        });
        
        // Add CSS rule
        css += `.${highlightClass} { 
          background-color: ${highlight.color}; 
          color: ${getContrastColor(highlight.color)};
          padding: 2px 0;
        }\n`;
      });
      
      // Apply CSS
      styleElement.textContent = css;
      
    } catch (error) {
      console.error('Error applying highlights to iframe:', error);
    }
  };
  
  // Apply highlights to direct DOM content
  const applyHighlightsToDom = (container, highlights) => {
    // Get content element
    const contentElement = container.querySelector(contentSelector);
    if (!contentElement) {
      console.warn(`Content element with selector "${contentSelector}" not found in container`);
      return;
    }
    
    // Create or get style element
    let styleElement = document.getElementById('highlight-styles');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'highlight-styles';
      document.head.appendChild(styleElement);
    }
    
    styleElRef.current = styleElement;
    
    // Generate CSS for highlighting
    let css = '';
    
    // Character-based highlights - highlight all instances of a character name
    const enabledCharacters = highlightService.getEnabledCharacters();
    if (enabledCharacters.length > 0) {
      // Create character-based highlighting CSS rules
      enabledCharacters.forEach(character => {
        const characterColor = highlightService.getCharacterColor(character);
        if (characterColor) {
          const characterClass = `char-highlight-${character.toLowerCase().replace(/\s+/g, '-')}`;
          
          // Add a CSS rule that will highlight all instances of this character's name
          css += `.${characterClass} { 
            background-color: ${characterColor}; 
            color: ${getContrastColor(characterColor)};
            padding: 2px 0;
          }\n`;
          
          // Find all instances of the character name in the content
          const characterName = character;
          const regex = new RegExp(`\\b${characterName}\\b`, 'gi');
          
          // Apply highlighting to all text nodes containing the character name
          highlightTextInIframe(document, contentElement, regex, characterClass);
        }
      });
    }
    
    // Position-based highlights - find DOM elements by position
    const allTextNodes = getAllTextNodes(contentElement);
    const contentRect = contentElement.getBoundingClientRect();
    
    highlights.forEach((highlight, index) => {
      // Calculate positions
      const startY = highlight.startPos * contentElement.scrollHeight;
      const endY = highlight.endPos * contentElement.scrollHeight;
      
      // Find elements in the specified range
      const elementsInRange = findElementsInYRange(allTextNodes, startY, endY);
      
      // Create a unique class for this highlight
      const highlightClass = `script-highlight-${index}`;
      
      // Add class to elements
      elementsInRange.forEach(el => {
        el.classList.add(highlightClass);
      });
      
      // Add CSS rule
      css += `.${highlightClass} { 
        background-color: ${highlight.color}; 
        color: ${getContrastColor(highlight.color)};
        padding: 2px 0;
      }\n`;
    });
    
    // Apply CSS
    styleElement.textContent = css;
  };
  
  // Remove highlight styles
  const removeHighlightStyles = () => {
    // Remove style element from iframe
    if (containerRef.current && containerRef.current.tagName === 'IFRAME') {
      try {
        const styleElement = containerRef.current.contentDocument.getElementById('highlight-styles');
        if (styleElement) {
          styleElement.parentNode.removeChild(styleElement);
        }
      } catch (error) {
        console.error('Error removing highlight styles from iframe:', error);
      }
    } else {
      // Remove style element from direct DOM
      const styleElement = document.getElementById('highlight-styles');
      if (styleElement) {
        styleElement.parentNode.removeChild(styleElement);
      }
    }
    
    styleElRef.current = null;
  };
  
  // Get all text nodes in an element
  const getAllTextNodes = (element) => {
    const result = [];
    
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.trim()) {
        result.push(node);
      }
    }
    
    return result;
  };
  
  // Highlight text in iframe using regex pattern
  const highlightTextInIframe = (doc, element, regex, className) => {
    try {
      // Get all text nodes
      const textNodes = getAllTextNodes(element);
      
      // Process each text node
      textNodes.forEach(textNode => {
        const text = textNode.textContent;
        
        // Check if the text contains the pattern
        if (!regex.test(text)) {
          // Reset the regex lastIndex property
          regex.lastIndex = 0;
          return;
        }
        
        // Reset the regex lastIndex property for a fresh search
        regex.lastIndex = 0;
        
        // Create a document fragment to hold the highlighted text
        const fragment = doc.createDocumentFragment();
        let lastIndex = 0;
        let match;
        
        // Find all matches
        while ((match = regex.exec(text)) !== null) {
          // Add the text before the match
          if (match.index > lastIndex) {
            fragment.appendChild(doc.createTextNode(text.substring(lastIndex, match.index)));
          }
          
          // Create a span for the matched text with the highlight class
          const highlightSpan = doc.createElement('span');
          highlightSpan.className = className;
          highlightSpan.textContent = match[0];
          fragment.appendChild(highlightSpan);
          
          // Update the last index
          lastIndex = match.index + match[0].length;
        }
        
        // Add any remaining text
        if (lastIndex < text.length) {
          fragment.appendChild(doc.createTextNode(text.substring(lastIndex)));
        }
        
        // Replace the original text node with the fragment
        if (textNode.parentNode) {
          textNode.parentNode.replaceChild(fragment, textNode);
        }
      });
    } catch (error) {
      console.error('Error highlighting text in iframe:', error);
    }
  };
  
  // Find elements in a vertical range
  const findElementsInYRange = (textNodes, startY, endY) => {
    const elementsInRange = new Set();
    
    textNodes.forEach(textNode => {
      try {
        // Get parent element
        const element = textNode.parentElement;
        
        // Get bounding rect
        const range = document.createRange();
        range.selectNodeContents(textNode);
        const rects = range.getClientRects();
        
        // Check if any part of the element is in the range
        for (let i = 0; i < rects.length; i++) {
          const rect = rects[i];
          const elementTop = element.offsetTop + rect.top;
          const elementBottom = elementTop + rect.height;
          
          // Check if element overlaps with the specified range
          if (elementBottom >= startY && elementTop <= endY) {
            elementsInRange.add(element);
            break;
          }
        }
      } catch (error) {
        console.error('Error processing text node:', error);
      }
    });
    
    return Array.from(elementsInRange);
  };
  
  // Get contrasting text color for a background color
  const getContrastColor = (bgColor) => {
    // Default to black if bgColor is not a valid hex color
    if (!bgColor || typeof bgColor !== 'string' || !bgColor.startsWith('#')) {
      return '#000000';
    }
    
    // Extract RGB components
    let r, g, b;
    if (bgColor.length === 7) {
      r = parseInt(bgColor.substr(1, 2), 16);
      g = parseInt(bgColor.substr(3, 2), 16);
      b = parseInt(bgColor.substr(5, 2), 16);
    } else if (bgColor.length === 4) {
      r = parseInt(bgColor.substr(1, 1), 16) * 17;
      g = parseInt(bgColor.substr(2, 1), 16) * 17;
      b = parseInt(bgColor.substr(3, 1), 16) * 17;
    } else {
      return '#000000';
    }
    
    // Calculate brightness (YIQ formula)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    // Return black or white based on brightness
    return brightness > 128 ? '#000000' : '#FFFFFF';
  };
  
  // Listen for highlight updates
  useEffect(() => {
    if (!enabled) return;
    
    // Apply initial highlights
    applyHighlights();
    
    // Listen for highlight updates
    const handleHighlightUpdate = (event) => {
      if (event.detail.scriptId === scriptId) {
        // Update local highlights reference
        highlightsRef.current = event.detail.highlights;
        
        // Apply updated highlights
        applyHighlights();
      }
    };
    
    // Listen for character highlight toggles
    const handleCharacterToggle = () => {
      // Reapply highlights when character settings change
      applyHighlights();
    };
    
    window.addEventListener('highlightsUpdated', handleHighlightUpdate);
    window.addEventListener('characterHighlightToggled', handleCharacterToggle);
    
    // Clean up
    return () => {
      window.removeEventListener('highlightsUpdated', handleHighlightUpdate);
      window.removeEventListener('characterHighlightToggled', handleCharacterToggle);
      removeHighlightStyles();
    };
  }, [enabled, scriptId]);
  
  // Handle container changes
  useEffect(() => {
    if (!enabled) return;
    
    // Set up mutation observer to watch for DOM changes
    const observer = new MutationObserver((mutations) => {
      // Re-apply highlights when DOM changes
      setTimeout(() => {
        applyHighlights();
      }, 500);
    });
    
    // Get container element
    const container = document.getElementById(containerId);
    if (container) {
      // Start observing
      observer.observe(container, {
        childList: true,
        subtree: true
      });
    }
    
    // Clean up
    return () => {
      observer.disconnect();
    };
  }, [enabled, containerId]);
  
  // This component doesn't render anything visible
  return null;
};

export default HighlightRenderer;