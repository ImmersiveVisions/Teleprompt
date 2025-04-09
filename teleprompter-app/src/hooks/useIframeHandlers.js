import { useEffect } from 'react';

const useIframeHandlers = (containerRef, script, ref) => {
  // When we receive a script, ensure the parent knows about it
  useEffect(() => {
    if (script && typeof window !== 'undefined') {
      // Ensure script is available in global scope for error recovery
      window.__currentScript = script;
    }
  }, [script]);

  // Handle iframe load event
  const handleIframeLoad = (e) => {
    // Create and dispatch a custom event to notify the ViewerPage that the iframe is loaded
    const loadEvent = new CustomEvent('iframeLoaded', {
      detail: {
        iframe: e.target,
        scriptId: script?.id
      },
      bubbles: true
    });
    e.target.dispatchEvent(loadEvent);
    
    // Make sure iframe is marked as loaded
    e.target.dataset.loaded = 'true';
    
    // Apply font size when iframe loads
    try {
      const iframe = e.target;
      
      // First, check if teleprompter-font.js is doing its job
      if (iframe.contentWindow && typeof iframe.contentWindow.setTeleprompterFontSize === 'function') {
        // Using the exposed global function from teleprompter-font.js
        iframe.contentWindow.setTeleprompterFontSize(window._currentFontSize || 24);
        
        // Add event listener for custom event
        iframe.contentDocument.addEventListener('fontSizeChanged', (event) => {
          // Handle font size change event silently
        });
      } 
      // If teleprompter-font.js isn't loaded, fall back to direct manipulation
      else if (iframe.contentDocument && iframe.contentDocument.body) {
        // Direct DOM manipulation
        // Make text color white by default
        iframe.contentDocument.body.style.color = 'white';
        iframe.contentDocument.body.style.backgroundColor = 'black';
        
        // Set font size on body element
        iframe.contentDocument.body.style.fontSize = `${window._currentFontSize || 24}px`;
        
        // Add a style element to the iframe head for more comprehensive font sizing
        const style = iframe.contentDocument.createElement('style');
        style.id = 'teleprompter-font-size-style';
        style.textContent = `
          /* Base styles */
          body, html {
            color: white !important;
            background-color: black !important;
            font-size: ${window._currentFontSize || 24}px !important;
            font-family: 'Arial', sans-serif !important;
          }
          
          /* Apply font size to all text elements */
          body *, p, div, span, h1, h2, h3, h4, h5, h6, li, td, th, label, a {
            font-size: ${window._currentFontSize || 24}px !important;
          }
          
          /* Ensure specific selectors have the font size */
          p[style*="padding-left"] {
            font-size: ${window._currentFontSize || 24}px !important;
          }
          
          /* Character names */
          p[style*="padding-left: 166pt"], 
          p[style*="padding-left: 165pt"], 
          p[style*="padding-left: 178pt"],
          p[style*="padding-left: 142pt"],
          p[style*="padding-left: 40pt"],
          p[style*="padding-left: 84pt"],
          p[style*="padding-left: 65pt"],
          p[style*="padding-left: 77pt"],
          p[style*="padding-left: 91pt"],
          p[style*="padding-left: 104pt"],
          p[style*="padding-left: 83pt"] {
            font-size: ${window._currentFontSize || 24}px !important;
          }
        `;
        iframe.contentDocument.head.appendChild(style);
        
        // Set up a message listener in the iframe for font size changes 
        const messageListener = (event) => {
          if (event.data && event.data.type === 'SET_FONT_SIZE') {
            const newSize = event.data.fontSize;
            
            // Update body font size
            iframe.contentDocument.body.style.fontSize = `${newSize}px`;
            
            // Find and update our style element
            const styleEl = iframe.contentDocument.getElementById('teleprompter-font-size-style');
            if (styleEl) {
              styleEl.textContent = `
                /* Base styles */
                body, html {
                  color: white !important;
                  background-color: black !important;
                  font-size: ${newSize}px !important;
                  font-family: 'Arial', sans-serif !important;
                }
                
                /* Apply font size to all text elements */
                body *, p, div, span, h1, h2, h3, h4, h5, h6, li, td, th, label, a {
                  font-size: ${newSize}px !important;
                }
                
                /* Ensure specific selectors have the font size */
                p[style*="padding-left"] {
                  font-size: ${newSize}px !important;
                }
                
                /* Character names */
                p[style*="padding-left: 166pt"], 
                p[style*="padding-left: 165pt"], 
                p[style*="padding-left: 178pt"],
                p[style*="padding-left: 142pt"],
                p[style*="padding-left: 40pt"],
                p[style*="padding-left: 84pt"],
                p[style*="padding-left: 65pt"],
                p[style*="padding-left: 77pt"],
                p[style*="padding-left: 91pt"],
                p[style*="padding-left: 104pt"],
                p[style*="padding-left: 83pt"] {
                  font-size: ${newSize}px !important;
                }
              `;
            }
          }
        };
        
        // We need to add the listener to the content window
        if (iframe.contentWindow) {
          iframe.contentWindow.addEventListener('message', messageListener);
        } else {
          // Fall back to window-level listener
          window.addEventListener('message', messageListener);
        }
      } else {
        // If we can't access the iframe contentDocument, resort to postMessage
        iframe.contentWindow.postMessage({
          type: 'SET_FONT_SIZE',
          fontSize: window._currentFontSize || 24
        }, '*');
      }
    } catch (err) {
      // Last resort - try postMessage even after error
      try {
        const iframe = e.target;
        iframe.contentWindow.postMessage({
          type: 'SET_FONT_SIZE',
          fontSize: window._currentFontSize || 24
        }, '*');
      } catch (postMsgErr) {
        // Silent fail
      }
    }
  };

  return { handleIframeLoad };
};

export default useIframeHandlers;