import { useEffect } from 'react';

const useFontSizeHandler = (containerRef, fontSize, script) => {
  // Apply font size to iframe content when it changes
  useEffect(() => {
    // Only proceed if we have a script and container
    if (!script || !containerRef.current) return;
    
    const container = containerRef.current;
    const iframe = container.querySelector('iframe');
    if (!iframe) return;
    
    // Define our approaches to updating the font size
    const updateFontSizeMethods = [
      // Method 1: Use the exposed global function if available
      function useGlobalFunction() {
        try {
          if (iframe.contentWindow && typeof iframe.contentWindow.setTeleprompterFontSize === 'function') {
            iframe.contentWindow.setTeleprompterFontSize(fontSize);
            return true;
          }
        } catch (e) {
          return false;
        }
        return false;
      },
      
      // Method 2: Direct DOM manipulation if same-origin
      function useDomManipulation() {
        try {
          if (iframe.contentDocument && iframe.contentDocument.body) {
            // Set directly on body
            iframe.contentDocument.body.style.fontSize = `${fontSize}px`;
            
            // Update or create style element
            const styleId = 'teleprompter-font-size-style';
            let styleEl = iframe.contentDocument.getElementById(styleId);
            
            if (!styleEl) {
              styleEl = iframe.contentDocument.createElement('style');
              styleEl.id = styleId;
              iframe.contentDocument.head.appendChild(styleEl);
            }
            
            // More specific CSS selectors for better specificity
            styleEl.textContent = `
              /* Base styles */
              body, html {
                color: white !important;
                background-color: black !important;
                font-size: ${fontSize}px !important;
                font-family: 'Arial', sans-serif !important;
              }
              
              /* Apply font size to all text elements */
              body *, p, div, span, h1, h2, h3, h4, h5, h6, li, td, th, label, a {
                font-size: ${fontSize}px !important;
              }
              
              /* Ensure specific selectors have the font size */
              p[style*="padding-left"] {
                font-size: ${fontSize}px !important;
              }
            `;
            return true;
          }
        } catch (e) {
          return false;
        }
        return false;
      },
      
      // Method 3: postMessage API (works cross-origin)
      function usePostMessage() {
        try {
          iframe.contentWindow.postMessage({
            type: 'SET_FONT_SIZE',
            fontSize: fontSize
          }, '*');
          return true;
        } catch (e) {
          return false;
        }
        return false;
      },
      
      // Method 4: URL parameter (requires reload)
      function useUrlParameter() {
        try {
          // Get current src
          const currentSrc = iframe.src;
          // Parse current URL
          const url = new URL(currentSrc, window.location.origin);
          // Set/update font size parameter
          url.searchParams.set('fontSize', fontSize);
          // Only update if the URL actually changed
          if (url.toString() !== currentSrc) {
            iframe.src = url.toString();
            return true;
          }
        } catch (e) {
          return false;
        }
        return false;
      }
    ];
    
    // Try each method in order until one succeeds
    for (const method of updateFontSizeMethods) {
      if (method()) break;
    }
  }, [fontSize, script, containerRef]);
};

export default useFontSizeHandler;