import { useEffect } from 'react';

const useTeleprompterFontSize = (containerRef, fontSize, script, isIframeLoaded) => {
  // Font size effect - applies font size changes to the iframe
  useEffect(() => {
    if (!script || !containerRef.current || !isIframeLoaded) {
      return;
    }
    
    console.log('TeleprompterViewer: Applying font size:', fontSize);
    
    // Handle iframe content (both HTML and fountain now use iframe)
    const iframe = document.getElementById('teleprompter-frame');
    if (!iframe || !iframe.contentWindow) {
      return;
    }
    
    try {
      // Try using the teleprompter global function
      if (iframe.contentWindow.setTeleprompterFontSize) {
        iframe.contentWindow.setTeleprompterFontSize(fontSize);
        return;
      }
      
      // Try direct DOM manipulation
      if (iframe.contentDocument && iframe.contentDocument.head) {
        // Find or create style element
        let styleEl = iframe.contentDocument.getElementById('teleprompter-font-style');
        if (!styleEl) {
          styleEl = iframe.contentDocument.createElement('style');
          styleEl.id = 'teleprompter-font-style';
          iframe.contentDocument.head.appendChild(styleEl);
        }
        
        // Update styles - same as ScriptPlayer
        styleEl.textContent = `
          /* Base styles */
          body, html {
            color: white !important;
            background-color: black !important;
            font-size: ${fontSize}px !important;
            font-family: 'Arial', sans-serif !important;
            font-weight: bold !important;
          }
          
          /* Apply font size to all text elements */
          body *, p, div, span, h1, h2, h3, h4, h5, h6, li, td, th, label, a {
            font-size: ${fontSize}px !important;
            font-weight: bold !important;
          }
          
          /* Ensure specific selectors have the font size */
          p[style*="padding-left"] {
            font-size: ${fontSize}px !important;
            font-weight: bold !important;
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
            font-size: ${fontSize}px !important;
            font-weight: bold !important;
          }
        `;
      }
    } catch (error) {
      console.error('TeleprompterViewer: Error applying font size:', error);
    }
  }, [fontSize, script, isIframeLoaded, containerRef]);
};

export default useTeleprompterFontSize;