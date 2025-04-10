const useNodeNavigation = () => {
  // Simple accessor to the teleprompter frame element (div or iframe)
  const getElement = () => document.getElementById('teleprompter-frame');

  const scrollToNode = (nodeData) => {
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
      
      // Get current scroll position for context
      const currentScrollTop = element.contentWindow.scrollY || 
        element.contentDocument.documentElement.scrollTop || 0;
        
      // Search logic based on nodeData type - USING DIALOG ELEMENTS ONLY
      
      // Helper function to create highlight effect
      const createHighlightForElement = (targetElement, color = 'green') => {
        // Define colors based on type
        const colors = {
          green: { bg: 'rgba(0, 255, 0, 0.3)', border: 'rgba(0, 255, 0, 0.7)', shadow: 'rgba(0, 255, 0, 0.5)' },
          yellow: { bg: 'rgba(255, 255, 0, 0.3)', border: 'rgba(255, 215, 0, 0.7)', shadow: 'rgba(255, 215, 0, 0.5)' },
          cyan: { bg: 'rgba(0, 255, 255, 0.2)', border: 'rgba(0, 255, 255, 0.7)', shadow: 'rgba(0, 255, 255, 0.3)' }
        };
        
        const colorSet = colors[color] || colors.green;
        
        // Create highlight element
        const highlightElement = element.contentDocument.createElement('div');
        highlightElement.className = 'teleprompter-highlight';
        highlightElement.style.cssText = `
          position: absolute;
          background-color: ${colorSet.bg};
          border: 2px solid ${colorSet.border};
          box-shadow: 0 0 10px ${colorSet.shadow};
          z-index: 1000;
          pointer-events: none;
          animation: pulse-highlight 2s ease-in-out;
        `;
        
        // Create animation if it doesn't exist
        if (!element.contentDocument.getElementById('highlight-keyframes')) {
          const keyframes = element.contentDocument.createElement('style');
          keyframes.id = 'highlight-keyframes';
          keyframes.textContent = `
            @keyframes pulse-highlight {
              0% { opacity: 0; }
              25% { opacity: 1; }
              75% { opacity: 1; }
              100% { opacity: 0; }
            }
          `;
          element.contentDocument.head.appendChild(keyframes);
        }
        
        // Position the highlight based on the element
        const rect = targetElement.getBoundingClientRect();
        highlightElement.style.left = '0';
        highlightElement.style.width = '100%';
        highlightElement.style.top = `${rect.top + element.contentWindow.scrollY}px`;
        highlightElement.style.height = `${rect.height}px`;
        
        // Add to body
        element.contentDocument.body.appendChild(highlightElement);
        
        // Scroll element into view
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
        
        // Remove highlight after animation
        setTimeout(() => {
          if (highlightElement.parentNode) {
            highlightElement.parentNode.removeChild(highlightElement);
          }
        }, 2000);
        
        return true;
      };
      
      // First, get all dialog elements - we will use these exclusively for navigation
      const dialogElements = element.contentDocument.querySelectorAll('[data-type="dialog"]');
      console.log(`Found ${dialogElements.length} dialog elements for navigation`);
      
      if (dialogElements.length === 0) {
        console.warn('No dialog elements found in document. Position navigation will be less accurate.');
        // Fall back to position-based navigation if no dialogs found
        return false;
      }
      
      // If we have an index, try to use that first (most reliable)
      if (typeof nodeData.index === 'number') {
        if (dialogElements.length > 0 && nodeData.index < dialogElements.length) {
          const targetElement = dialogElements[nodeData.index];
          console.log(`Using index navigation to dialog ${nodeData.index} of ${dialogElements.length}`);
          return createHighlightForElement(targetElement, 'green');
        }
      }
      
      // If we have text content, search for it in dialog elements only
      if (nodeData.text) {
        const searchText = nodeData.text.trim().toLowerCase();
        
        // Collect matches from dialog elements only
        const matchingElements = [];
        dialogElements.forEach(element => {
          if (element.textContent.toLowerCase().includes(searchText)) {
            matchingElements.push(element);
          }
        });
        
        if (matchingElements.length > 0) {
          console.log(`Found ${matchingElements.length} dialog elements matching text "${searchText.substring(0, 20)}..."`);
          
          // If rollback, use first match
          // Otherwise find closest to current position
          let targetElement;
          
          if (nodeData.fromRollback) {
            targetElement = matchingElements[0];
            console.log('Using first match for rollback');
          } else {
            // Find closest to current position
            targetElement = matchingElements.reduce((closest, element) => {
              const elementPos = element.getBoundingClientRect().top + currentScrollTop;
              const closestPos = closest ? 
                closest.getBoundingClientRect().top + currentScrollTop : 0;
                
              const closestDist = Math.abs(currentScrollTop - closestPos);
              const elementDist = Math.abs(currentScrollTop - elementPos);
              
              return elementDist < closestDist ? element : closest;
            }, null);
            console.log('Using closest match to current position');
          }
          
          if (targetElement) {
            return createHighlightForElement(targetElement, 'yellow');
          }
        } else {
          console.log(`No dialog elements match text "${searchText.substring(0, 20)}..."`);
        }
      }
      
      // If we have a position value as fallback
      if (typeof nodeData.position === 'number') {
        const scrollHeight = element.contentDocument.body.scrollHeight;
        const clientHeight = element.contentWindow.innerHeight;
        const maxScroll = Math.max(1, scrollHeight - clientHeight);
        const targetPosition = Math.floor(nodeData.position * maxScroll);
        
        // Create a highlight for position-based navigation
        const highlightElement = element.contentDocument.createElement('div');
        highlightElement.className = 'teleprompter-position-highlight';
        highlightElement.style.cssText = `
          position: absolute;
          left: 0;
          width: 100%;
          height: 50px;
          background-color: rgba(0, 255, 255, 0.2);
          border-top: 2px solid rgba(0, 255, 255, 0.7);
          border-bottom: 2px solid rgba(0, 255, 255, 0.7);
          box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
          z-index: 1000;
          pointer-events: none;
          animation: pulse-position-highlight 2s ease-in-out;
        `;
        
        // Create animation if it doesn't exist
        if (!element.contentDocument.getElementById('position-highlight-keyframes')) {
          const keyframes = element.contentDocument.createElement('style');
          keyframes.id = 'position-highlight-keyframes';
          keyframes.textContent = `
            @keyframes pulse-position-highlight {
              0% { opacity: 0; }
              25% { opacity: 1; }
              75% { opacity: 1; }
              100% { opacity: 0; }
            }
          `;
          element.contentDocument.head.appendChild(keyframes);
        }
        
        // Position the highlight at the target position
        highlightElement.style.top = `${targetPosition + element.contentWindow.innerHeight/2 - 25}px`;
        
        // Add to body
        element.contentDocument.body.appendChild(highlightElement);
        
        // Scroll to the position
        element.contentWindow.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
        
        // Remove highlight after animation
        setTimeout(() => {
          if (highlightElement.parentNode) {
            highlightElement.parentNode.removeChild(highlightElement);
          }
        }, 2000);
        
        return true;
      }
      
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