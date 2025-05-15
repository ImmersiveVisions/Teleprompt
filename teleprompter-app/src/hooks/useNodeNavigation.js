const useNodeNavigation = () => {
  // Simple accessor to the teleprompter frame element (div or iframe)
  const getElement = () => document.getElementById('teleprompter-frame');

  const scrollToNode = (nodeData) => {
    console.log('🔍 useNodeNavigation.scrollToNode called with:', JSON.stringify(nodeData));
    
    if (!nodeData) {
      console.error('scrollToNode: Missing nodeData');
      return false;
    }
    
    try {
      const element = getElement();
      if (!element) {
        console.error('scrollToNode: Teleprompter frame element not found');
        return false;
      }
      
      // For fountain or HTML content in iframe
      if (!element.contentDocument || !element.contentDocument.body) {
        console.error('scrollToNode: Cannot access iframe content');
        return false;
      }
      
      const scrollContainer = element.contentDocument.body || element.contentDocument.documentElement;
      const containerScrollHeight = scrollContainer.scrollHeight;
      
      // SIMPLIFIED DIRECT LINE-BASED NAVIGATION
      if (nodeData.lineIndex !== undefined && nodeData.totalLines) {
        console.log(`useNodeNavigation: DIRECT LINE POSITIONING ${nodeData.lineIndex}/${nodeData.totalLines}`);
        
        // Calculate position as pure ratio of document height
        const lineRatio = nodeData.lineIndex / nodeData.totalLines;
        const targetPosition = lineRatio * containerScrollHeight;
        
        console.log(`useNodeNavigation: Line position ${targetPosition}px (${lineRatio.toFixed(4)} of scroll height)`);
        
        // BRUTE FORCE: Use multiple methods to ensure scrolling works
        
        // Method 1: Direct DOM manipulation
        console.log('Method 1: Direct scrollTop');
        scrollContainer.scrollTop = targetPosition;
        
        // Method 2: window.scrollTo
        console.log('Method 2: Window scrollTo');
        element.contentWindow.scrollTo(0, targetPosition);
        
        // Method 3: Create a marker and use scrollIntoView
        try {
          // Create a visible highlight for better feedback
          const highlight = document.createElement('div');
          highlight.style.cssText = `
            position: absolute;
            left: 0;
            width: 100%;
            height: 80px;
            background-color: rgba(255, 0, 0, 0.5);
            border-top: 3px solid red;
            border-bottom: 3px solid red;
            top: ${targetPosition - 40}px;
            z-index: 1000;
            pointer-events: none;
            animation: pulse-highlight 3s ease-in-out;
          `;
          
          // Create animation
          if (!element.contentDocument.getElementById('highlight-keyframes')) {
            const keyframes = element.contentDocument.createElement('style');
            keyframes.id = 'highlight-keyframes';
            keyframes.textContent = `
              @keyframes pulse-highlight {
                0% { opacity: 0.3; }
                25% { opacity: 1; }
                75% { opacity: 1; }
                100% { opacity: 0.3; }
              }
            `;
            element.contentDocument.head.appendChild(keyframes);
          }
          
          scrollContainer.appendChild(highlight);
          
          // Remove after delay
          setTimeout(() => {
            if (highlight.parentNode) highlight.parentNode.removeChild(highlight);
          }, 3000);
        } catch (highlightErr) {
          console.error('Error creating highlight:', highlightErr);
        }
        
        return true;
      }
      
      // FALLBACK: Use position-based navigation if no line index
      if (typeof nodeData.position === 'number') {
        console.log('useNodeNavigation: Using position fallback:', nodeData.position);
        
        const targetPosition = nodeData.position * containerScrollHeight;
        element.contentWindow.scrollTo(0, targetPosition);
        
        return true;
      }
      
      console.error('useNodeNavigation: No usable position data found');
      return false;
    } catch (err) {
      console.error('Error in scrollToNode:', err);
      return false;
    }
  };

  const jumpToPosition = (positionData) => {
    return scrollToNode(positionData);
  };

  return {
    scrollToNode,
    jumpToPosition
  };
};

export default useNodeNavigation;