// teleprompter-font.js - Script to handle font size changes in HTML content
(function() {
  console.log('Teleprompter font adjustment script loaded');
  
  // Set initial style
  function createStyleElement() {
    // Check if we already have a style element
    let styleEl = document.getElementById('teleprompter-font-style');
    
    if (!styleEl) {
      // Create a new style element
      styleEl = document.createElement('style');
      styleEl.id = 'teleprompter-font-style';
      document.head.appendChild(styleEl);
      console.log('Created teleprompter style element');
    }
    
    return styleEl;
  }
  
  // Set font size with a style element
  function setFontSize(size) {
    console.log('Setting font size to', size, 'px');
    
    // Set font size on body as inline style
    document.body.style.fontSize = size + 'px';
    
    // Create or update style element
    const styleEl = createStyleElement();
    
    // Update style rules - more specific selectors for better specificity
    styleEl.textContent = `
      /* Base styles */
      body, html {
        color: white !important;
        background-color: black !important;
        font-size: ${size}px !important;
        font-family: 'Arial', sans-serif !important;
      }
      
      /* Apply font size to all text elements */
      body *, p, div, span, h1, h2, h3, h4, h5, h6, li, td, th, label, a {
        font-size: ${size}px !important;
      }
      
      /* Center content */
      body {
        text-align: center !important;
      }

      /* Ensure specific selectors have the font size */
      p[style*="padding-left"] {
        font-size: ${size}px !important;
      }

      /* Character names - keep gold color but update font size */
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
        font-size: ${size}px !important;
      }
    `;
    
    // Log that we've updated successfully
    console.log('Font size updated successfully to', size, 'px');
    
    // Dispatch a custom event that the parent window can listen for
    try {
      const event = new CustomEvent('fontSizeChanged', { detail: { fontSize: size } });
      document.dispatchEvent(event);
      console.log('Dispatched fontSizeChanged event with size:', size);
    } catch (e) {
      console.error('Failed to dispatch custom event:', e);
    }
  }
  
  // Listen for font size change messages
  window.addEventListener('message', function(event) {
    console.log('Message received in teleprompter-font.js:', event.data);
    
    // Handle SET_FONT_SIZE message type
    if (event.data && event.data.type === 'SET_FONT_SIZE') {
      const fontSize = event.data.fontSize;
      console.log('Changing font size to', fontSize, 'px');
      setFontSize(fontSize);
    }
  });
  
  // Check URL for fontSize parameter
  function getURLParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }
  
  // Apply initial font size if specified in URL
  const urlFontSize = getURLParameter('fontSize');
  if (urlFontSize) {
    setFontSize(parseInt(urlFontSize, 10));
  } else {
    // Default font size
    setFontSize(24);
  }
  
  // Expose global function to set font size
  window.setTeleprompterFontSize = setFontSize;

  // Debug logger to track changes
  console.log('Teleprompter font adjustment script fully initialized');
})();