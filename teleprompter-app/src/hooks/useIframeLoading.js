import { useState, useEffect } from 'react';

const useIframeLoading = (script, fontSize) => {
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  
  // Set loaded state immediately for fountain files
  useEffect(() => {
    if (script && script.isFountain) {
      console.log('TeleprompterViewer: Setting loaded state for fountain file');
      setIsIframeLoaded(true);
    } else {
      // Reset loaded state when script changes
      setIsIframeLoaded(false);
    }
  }, [script]);

  const handleIframeLoad = (e) => {
    console.log('TeleprompterViewer: iframe loaded');
    setIsIframeLoaded(true);
    
    // Mark iframe as loaded
    e.target.dataset.loaded = 'true';
  
    // Apply initial font size
    try {
      const iframe = e.target;
      
      // Inspect the document for debugging
      setTimeout(() => {
        try {
          // Find paragraphs with padding-left or text-align to identify potential script elements
          const scriptElements = iframe.contentDocument.querySelectorAll('p[style*="padding-left"], p[style*="text-align"]');
          console.log(`useIframeLoading: Found ${scriptElements.length} potential script elements`);
          
          if (scriptElements.length > 0) {
            // Log a few examples
            const examples = Array.from(scriptElements).slice(0, 5);
            examples.forEach((el, i) => {
              console.log(`Script Element ${i}:`, {
                style: el.getAttribute('style'),
                textContent: el.textContent.substring(0, 30) + (el.textContent.length > 30 ? '...' : ''),
                classList: Array.from(el.classList)
              });
            });
          }
          
          // Check for any selectors that might conflict
          const allElements = iframe.contentDocument.querySelectorAll('*');
          console.log(`useIframeLoading: Total elements in document: ${allElements.length}`);
          
        } catch (err) {
          console.error('Error inspecting script elements:', err);
        }
      }, 500);
      
      // Try the exposed global function
      if (iframe.contentWindow && iframe.contentWindow.setTeleprompterFontSize) {
        iframe.contentWindow.setTeleprompterFontSize(fontSize);
      } 
      // Fall back to direct manipulation
      else if (iframe.contentDocument && iframe.contentDocument.head) {
        // Create style element
        const style = iframe.contentDocument.createElement('style');
        style.id = 'teleprompter-font-style';
        style.textContent = `
          /* Base styles */
          body, html {
            color: white !important;
            background-color: black !important;
            font-size: ${fontSize}px !important;
            font-family: 'Courier New', monospace !important;
            font-weight: bold !important;
            line-height: 1.5 !important;
            padding: 20px !important;
            margin: 0 !important;
          }
          
          /* IMPORTANT: Remove text-align: center from body to prevent style conflicts */
          
          /* Apply font size to text elements but don't set text-align
             which would override specific element styling */
          body p, body div, body span, body h1, body h2, body h3, 
          body h4, body h5, body h6, body li, body td, body th, 
          body label, body a {
            font-size: ${fontSize}px !important;
            font-weight: bold !important;
            /* Do NOT set text-align here to avoid conflicts */
          }
          
          /* SCRIPT STYLING - Force certain elements to specific colors
             Specificity order is important to ensure styles apply correctly */
          
          /* CHARACTER NAMES - SCRIPT ELEMENTS - highest priority for character styling */
          p[style*="padding-left: 166pt"],
          p[style*="padding-left: 165pt"],
          p[style*="padding-left: 178pt"],
          p[style*="padding-left: 142pt"],
          p[style*="padding-left: 40pt"],
          p[style*="padding-left: 84pt"],
          p[style*="padding-left: 65pt"],
          p[style*="padding-left: 77pt"] {
            color: #FFD700 !important; /* Gold color for character names */
            font-weight: bold !important;
            text-align: center !important; 
            margin-bottom: 0 !important;
            background-color: rgba(255, 215, 0, 0.1) !important; /* Add subtle background for debugging */
          }
          
          /* DIALOG TEXT - SCRIPT ELEMENTS */
          p[style*="padding-left: 94pt"],
          p[style*="padding-left: 93pt"] {
            color: white !important;
            text-align: center !important;
            margin-top: 0 !important;
            margin-bottom: 1em !important;
          }
          
          /* PARENTHETICALS - SCRIPT ELEMENTS */
          p[style*="padding-left: 123pt"],
          p[style*="padding-left: 129pt"],
          p[style*="padding-left: 121pt"],
          p[style*="padding-left: 122pt"],
          p[style*="padding-left: 136pt"] {
            color: #BBBBBB !important; /* Light gray for parentheticals */
            font-style: italic !important;
            text-align: center !important;
            margin-top: 0 !important;
            margin-bottom: 0 !important;
          }
          
          /* SCENE HEADINGS - SCRIPT ELEMENTS */
          p[style*="padding-left: 22pt"] {
            color: #ADD8E6 !important; /* Light blue for scene headings */
            font-weight: bold !important;
            text-align: center !important;
            margin-top: 1.5em !important;
            margin-bottom: 0.5em !important;
          }
          
          /* TRANSITIONS - SCRIPT ELEMENTS */
          p[style*="text-align: right"],
          p:contains("CUT TO:"),
          p:contains("FADE TO:"),
          p:contains("DISSOLVE TO:") {
            color: #FFA07A !important; /* Light salmon for transitions */
            font-weight: bold !important;
            text-transform: uppercase !important;
            text-align: center !important;
            margin-top: 1em !important;
            margin-bottom: 1em !important;
          }
          
          /* Additional catch-all selectors for common screenplay elements */
          p[style*="margin-left"],
          [class*="character"],
          [class*="Character"], 
          [data-type="dialog"],
          [data-type="character"],
          [class*="dialog"], 
          [class*="scene"] { 
            text-align: center !important;
          }
        `;
        iframe.contentDocument.head.appendChild(style);
        
        // Set body styles directly
        if (iframe.contentDocument.body) {
          iframe.contentDocument.body.style.color = 'white';
          iframe.contentDocument.body.style.backgroundColor = 'black';
          iframe.contentDocument.body.style.fontSize = `${fontSize}px`;
          iframe.contentDocument.body.style.fontFamily = 'Courier New, monospace';
          iframe.contentDocument.body.style.fontWeight = 'bold';
          iframe.contentDocument.body.style.lineHeight = '1.5';
          iframe.contentDocument.body.style.textAlign = 'center';
          iframe.contentDocument.body.style.padding = '20px';
          iframe.contentDocument.body.style.margin = '0';
        }
      }
    } catch (err) {
      console.error('TeleprompterViewer: Error setting initial font size:', err);
    }
  };

  return {
    isIframeLoaded,
    handleIframeLoad
  };
};

export default useIframeLoading;