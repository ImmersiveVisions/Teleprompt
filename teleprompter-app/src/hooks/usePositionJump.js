import $ from 'jquery';

const usePositionJump = (containerRef, script) => {
  // jQuery-based jump to position function
  const jumpToPosition = (position) => {
    if (!containerRef.current || !script) {
      return;
    }
    
    const container = containerRef.current;
    
    // Stop any ongoing animations
    try {
      // Use jQuery to stop all animations
      $(container).stop(true, true);
      
      // For iframe content
      const iframe = container.querySelector('iframe');
      if (iframe && iframe.contentWindow) {
        try {
          if (iframe.contentWindow.$ || iframe.contentWindow.jQuery) {
            const $iframe = iframe.contentWindow.$ || iframe.contentWindow.jQuery;
            $iframe('html, body').stop(true, true);
          }
        } catch (e) {
          // Silent fail
        }
      }
    } catch (e) {
      // Silent fail
    }
    
    // Check if position is an object (from SEARCH_POSITION message)
    // or a simple number (from JUMP_TO_POSITION control)
    let percentage = 0;
    let isSearchPositionObject = false;
    
    if (typeof position === 'object' && position !== null) {
      // Enhanced position data - extract the normalized position value
      if (position.position !== undefined) {
        percentage = position.position;
        isSearchPositionObject = true;
      } else {
        return;
      }
    } else {
      // Simple number for position - calculate percentage
      const scriptContent = script.body || script.content || '';
      const maxLength = Math.max(1, scriptContent.length);
      percentage = Math.max(0, Math.min(position, maxLength)) / maxLength;
    }
    
    // Ensure position is within bounds
    percentage = Math.max(0, Math.min(1, percentage));
    
    // Apply the scroll
    if (script.id && script.id.toLowerCase().endsWith('.html')) {
      // For HTML content, find the iframe and scroll it
      const iframe = container.querySelector('iframe');
      
      if (!iframe || !iframe.contentWindow) {
        return;
      }
      
      // If we have a search position object with text, try to find and highlight that text
      if (isSearchPositionObject && position.text) {
        // Create a function that will search for text in the iframe
        const findAndScrollToText = () => {
          try {
            if (!iframe.contentDocument || !iframe.contentDocument.body) {
              return false;
            }
            
            // Normalize the search text
            const searchText = position.text.trim().toLowerCase();
            
            // Create a tree walker to search all text nodes
            const walker = document.createTreeWalker(
              iframe.contentDocument.body,
              NodeFilter.SHOW_TEXT,
              null,
              false
            );
            
            let foundNode = null;
            let node;
            
            // Walk through all text nodes
            while ((node = walker.nextNode())) {
              // Only check nodes that have content
              const nodeText = node.textContent.trim();
              if (nodeText && nodeText.toLowerCase().includes(searchText)) {
                foundNode = node;
                break;
              }
            }
            
            // If no node found with exact match, try with a shorter substring
            if (!foundNode && searchText.length > 10) {
              const shorterSearch = searchText.substring(0, 10);
              
              // Create a new tree walker for the second pass
              const walker2 = document.createTreeWalker(
                iframe.contentDocument.body,
                NodeFilter.SHOW_TEXT,
                null,
                false
              );
              
              // Second pass with shorter text
              while ((node = walker2.nextNode())) {
                const nodeText = node.textContent.trim().toLowerCase();
                if (nodeText && nodeText.includes(shorterSearch)) {
                  foundNode = node;
                  break;
                }
              }
            }
            
            // If found, scroll directly to the node
            if (foundNode && foundNode.parentElement) {
              // Highlight for visibility
              const originalBg = foundNode.parentElement.style.backgroundColor;
              const originalColor = foundNode.parentElement.style.color;
              
              // Apply highlight
              foundNode.parentElement.style.backgroundColor = '#ff6600';
              foundNode.parentElement.style.color = '#ffffff';
              
              // Scroll to the element
              foundNode.parentElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
              });
              
              // Reset styles after delay
              setTimeout(() => {
                foundNode.parentElement.style.backgroundColor = originalBg;
                foundNode.parentElement.style.color = originalColor;
              }, 2000);
              
              return true; // Successfully found and scrolled
            }
            
            return false; // Text not found
          } catch (err) {
            return false;
          }
        };
        
        // Try to find and scroll to text, fall back to position-based if not found
        if (findAndScrollToText()) {
          return; // Successfully scrolled to text, don't need to do position-based
        }
      }
      
      // Wait for iframe to load and then scroll to position
      const checkIframeLoaded = () => {
        try {
          // Try to access contentDocument to check if loaded
          if (iframe.contentDocument && iframe.contentDocument.body) {
            const viewportHeight = iframe.contentWindow.innerHeight || iframe.clientHeight;
            const scrollHeight = iframe.contentDocument.body.scrollHeight;
            const maxScroll = Math.max(0, scrollHeight - viewportHeight);
            const targetScroll = percentage * maxScroll;
            
            // Try to use jQuery inside iframe if available
            try {
              if (iframe.contentWindow.$ || iframe.contentWindow.jQuery) {
                const $iframe = iframe.contentWindow.$ || iframe.contentWindow.jQuery;
                $iframe('html, body').animate({
                  scrollTop: targetScroll
                }, 500, 'swing');
                return;
              }
            } catch (e) {
              // Silent fail
            }
            
            // Try to use teleprompterScrollTo if available
            try {
              if (typeof iframe.contentWindow.teleprompterScrollTo === 'function') {
                iframe.contentWindow.teleprompterScrollTo(percentage);
                return;
              }
            } catch (e) {
              // Silent fail
            }
            
            // Fallback to basic scrollTo
            iframe.contentWindow.scrollTo({
              top: targetScroll,
              behavior: 'smooth'
            });
          } else {
            // Try again in a moment
            setTimeout(checkIframeLoaded, 100);
          }
        } catch (e) {
          // Last resort: try using postMessage API
          try {
            iframe.contentWindow.postMessage({
              type: 'SCROLL_TO_POSITION',
              position: percentage
            }, '*');
          } catch (postMsgErr) {
            // Silent fail
          }
        }
      };
      
      checkIframeLoaded();
    } else {
      // For regular text content
      const maxScroll = container.scrollHeight - container.clientHeight;
      const targetScroll = percentage * maxScroll;
      
      // Use jQuery for smooth animation
      $(container).animate({
        scrollTop: targetScroll
      }, 500, 'swing');
    }
  };

  return { jumpToPosition };
};

export default usePositionJump;