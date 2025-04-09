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
        
      // Search logic based on nodeData type
      
      // If we have an index, try to use that first (most reliable)
      if (typeof nodeData.index === 'number') {
        const dialogElements = element.contentDocument.querySelectorAll('[data-type="dialog"]');
        if (dialogElements.length > 0 && nodeData.index < dialogElements.length) {
          const targetElement = dialogElements[nodeData.index];
          
          // Create highlight effect for index-based navigation
          const highlightElement = element.contentDocument.createElement('div');
          highlightElement.className = 'teleprompter-highlight';
          highlightElement.style.cssText = `
            position: absolute;
            background-color: rgba(0, 255, 0, 0.3);
            border: 2px solid rgba(0, 255, 0, 0.7);
            box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
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
        }
      }
      
      // If we have text content, search for it
      if (nodeData.text) {
        // First try dialog elements
        const dialogElements = element.contentDocument.querySelectorAll('[data-type="dialog"]');
        const searchText = nodeData.text.trim().toLowerCase();
        
        // Collect matches
        const matchingElements = [];
        dialogElements.forEach(element => {
          if (element.textContent.toLowerCase().includes(searchText)) {
            matchingElements.push(element);
          }
        });
        
        if (matchingElements.length > 0) {
          // If rollback, use first match
          // Otherwise find closest to current position
          let targetElement;
          
          if (nodeData.fromRollback) {
            targetElement = matchingElements[0];
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
          }
          
          if (targetElement) {
            // Create highlight effect
            const highlightElement = element.contentDocument.createElement('div');
            highlightElement.className = 'teleprompter-highlight';
            highlightElement.style.cssText = `
              position: absolute;
              background-color: rgba(255, 255, 0, 0.3);
              border: 2px solid rgba(255, 215, 0, 0.7);
              box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
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
          }
        }
        
        // Try text nodes as fallback
        try {
          const walker = document.createTreeWalker(
            element.contentDocument.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
          );
          
          const textMatches = [];
          let node;
          
          while ((node = walker.nextNode())) {
            if (node.textContent && node.textContent.toLowerCase().includes(searchText)) {
              textMatches.push(node);
            }
          }
          
          if (textMatches.length > 0) {
            // Use first match for simplicity
            const firstMatch = textMatches[0];
            if (firstMatch.parentElement) {
              // Create highlight effect for text node match
              const highlightElement = element.contentDocument.createElement('div');
              highlightElement.className = 'teleprompter-highlight';
              highlightElement.style.cssText = `
                position: absolute;
                background-color: rgba(255, 255, 0, 0.3);
                border: 2px solid rgba(255, 215, 0, 0.7);
                box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
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
              const rect = firstMatch.parentElement.getBoundingClientRect();
              highlightElement.style.left = '0';
              highlightElement.style.width = '100%';
              highlightElement.style.top = `${rect.top + element.contentWindow.scrollY}px`;
              highlightElement.style.height = `${rect.height}px`;
              
              // Add to body
              element.contentDocument.body.appendChild(highlightElement);
              
              // Scroll element into view
              firstMatch.parentElement.scrollIntoView({
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
            }
          }
        } catch (err) {
          console.error('Error in text node search:', err);
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