import React, { useEffect, useState, useRef } from 'react';
import { Fountain } from 'fountain-js';

/**
 * Renders a Fountain screenplay file using the fountain-js library
 * @param {Object} props Component props
 * @param {string} props.scriptId - The ID/filename of the fountain script
 * @param {string} props.width - Width of the viewer container (default: '100%')
 * @param {string} props.height - Height of the viewer container (default: '100%')
 * @param {Function} props.onLoad - Optional callback for when iframe is loaded
 */
const FountainViewer = ({ scriptId, width = '100%', height = '100%', onLoad }) => {
  const [scriptContent, setScriptContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const iframeRef = useRef(null);

  // Fetch the script content
  useEffect(() => {
    console.log('FountainViewer: useEffect triggered with scriptId:', scriptId);
    
    if (!scriptId) {
      console.error('FountainViewer: No script ID provided');
      setError('No fountain script ID provided');
      setLoading(false);
      return;
    }
    
    // Make sure scriptId is properly encoded for use in URLs
    const normalizedScriptId = encodeURIComponent(scriptId);
    
    console.log('FountainViewer: About to fetch script with ID:', scriptId, 'normalized:', normalizedScriptId);
    console.log('FountainViewer: Script ID filename check:', {
      original: scriptId,
      endsWithFountain: scriptId.toLowerCase().endsWith('.fountain'),
      extension: scriptId.split('.').pop().toLowerCase()
    });

    const fetchScript = async () => {
      try {
        setLoading(true);
        console.log('FountainViewer: Fetching script:', scriptId);
        
        // Try to fetch directly first
        console.log('FountainViewer: Attempting direct fetch from path /', scriptId);
        try {
          const directResponse = await fetch(`/${scriptId}`);
          console.log('FountainViewer: Direct fetch response status:', directResponse.status);
          
          if (directResponse.ok) {
            const text = await directResponse.text();
            console.log('FountainViewer: Direct fetch successful, content length:', text.length);
            console.log('FountainViewer: Content preview:', text.substring(0, 100) + '...');
            setScriptContent(text);
            setLoading(false);
            return;
          } else {
            console.log('FountainViewer: Direct fetch failed, status:', directResponse.status, 'statusText:', directResponse.statusText);
          }
        } catch (directFetchError) {
          console.error('FountainViewer: Direct fetch error:', directFetchError);
        }
        
        // If direct fetch fails, try API
        console.log('FountainViewer: Attempting API fetch from /api/scripts/', normalizedScriptId);
        const response = await fetch(`/api/scripts/${normalizedScriptId}`);
        console.log('FountainViewer: API fetch response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch script: ${response.statusText} (${response.status})`);
        }
        
        const data = await response.json();
        console.log('FountainViewer: API response successful:', data);
        
        if (data.script) {
          // Log detailed script info to aid debugging
          console.log('FountainViewer: Script info from API:', {
            id: data.script.id,
            title: data.script.title,
            isFountain: data.script.isFountain,
            fileExtension: data.script.fileExtension,
            contentLength: data.script.body?.length
          });
        }
        
        if (!data.success || !data.script) {
          throw new Error('No script data returned from API');
        }
        
        // API returned the script metadata, but we need the content
        // Try a direct fetch again with additional API info
        if (!data.script.body && data.script.id) {
          console.log('FountainViewer: API returned metadata but no content, trying direct fetch with ID:', data.script.id);
          try {
            const contentResponse = await fetch(`/${data.script.id}`);
            if (contentResponse.ok) {
              const text = await contentResponse.text();
              console.log('FountainViewer: Content fetch successful, length:', text.length);
              console.log('FountainViewer: Content preview:', text.substring(0, 100) + '...');
              setScriptContent(text);
              setLoading(false);
              return;
            }
          } catch (contentFetchError) {
            console.error('FountainViewer: Error fetching content:', contentFetchError);
          }
        }
        
        // If we got content from the API response, use it
        if (data.script.body) {
          console.log('FountainViewer: Using script body from API response, length:', data.script.body.length);
          setScriptContent(data.script.body);
          setLoading(false);
          return;
        }
        
        throw new Error('No script content available from any source');
      } catch (err) {
        console.error('FountainViewer: Error fetching script:', err);
        setError(`Error loading script: ${err.message}`);
        setLoading(false);
      }
    };

    fetchScript();
  }, [scriptId]);

  // Parse and display the script content when it's available
  useEffect(() => {
    if (!scriptContent || !iframeRef.current) return;
    
    try {
      console.log('FountainViewer: Parsing script content with fountain-js');
      
      // Create a fountain parser instance
      const fountain = new Fountain();
      
      // Parse the script content with fountain-js
      const parsed = fountain.parse(scriptContent);
      console.log('FountainViewer: Parsed fountain script');
      
      // Get access to the iframe document
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      
      // Write basic HTML structure
      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              background-color: black;
              color: white;
              font-family: 'Courier New', monospace;
              line-height: 1.5;
              padding: 20px;
              margin: 0;
            }
            .fountain-container {
              max-width: 800px;
              margin: 0 auto;
            }
            /* Title styling */
            h1 {
              text-align: center;
              font-size: 24px;
              margin-bottom: 20px;
            }
            /* Authors styling */
            p.authors {
              text-align: center;
              font-size: 18px;
              color: #999;
              margin-bottom: 40px;
            }
            /* Scene headings */
            h3 {
              font-weight: bold;
              color: #ADD8E6; /* Light blue */
              margin-top: 30px;
              margin-bottom: 10px;
              text-transform: uppercase;
            }
            /* Action paragraphs */
            p:not(.authors):not(.parenthetical):not(.centered) {
              margin-bottom: 10px;
            }
            /* Transitions */
            h2 {
              text-align: right;
              font-weight: bold;
              color: #FFA07A; /* Light salmon */
              margin: 20px 0;
              text-transform: uppercase;
            }
            /* Character */
            h4 {
              margin-left: 200px;
              margin-top: 20px;
              margin-bottom: 0;
              font-weight: bold;
              color: #FFD700; /* Gold */
              /* Data attributes are added via JavaScript */
            }
            /* Parentheticals */
            p.parenthetical {
              margin-left: 150px;
              font-style: italic;
              color: #BBBBBB; /* Light gray */
              /* Data attributes are added via JavaScript */
            }
            /* Dialog - all p tags after h4 until next element */
            h4 + p:not(.parenthetical) {
              margin-left: 100px;
              margin-right: 100px;
              margin-top: 0;
              margin-bottom: 20px;
              /* Data attributes are added via JavaScript */
            }
            /* Centered text */
            p.centered {
              text-align: center;
              margin: 20px 0;
            }
            /* Add data attributes to elements */
            h4, p.parenthetical, h4 + p {
              /* Data attributes are added via JavaScript */
            }
          </style>
        </head>
        <body>
          <div class="fountain-container" id="script-content">
          </div>
          <script>
            // Function to control font size
            window.setTeleprompterFontSize = function(size) {
              console.log('Setting teleprompter font size to:', size);
              const fontSize = parseInt(size, 10) || 16;
              document.body.style.fontSize = fontSize + 'px';
            };
          </script>
        </body>
        </html>
      `);
      iframeDoc.close();
      
      // Get the container
      const container = iframeDoc.getElementById('script-content');
      
      // Add the parsed fountain content
      if (container) {
        // Title page if available
        if (parsed.html.title_page) {
          container.innerHTML = parsed.html.title_page;
        }
        
        // Script content
        container.innerHTML += parsed.html.script;
        
        // Add data-type attributes to dialog elements
        const dialogElements = iframeDoc.querySelectorAll('h4, p.parenthetical, h4 + p:not(.parenthetical)');
        dialogElements.forEach(el => {
          el.setAttribute('data-type', 'dialog');
        });
      }
      
      // Set the iframe ID for external referencing - maintain consistency with teleprompter-frame
      iframe.id = 'teleprompter-frame';
      
      console.log('FountainViewer: Content written to iframe');
    } catch (err) {
      console.error('FountainViewer: Error parsing/displaying fountain script:', err);
      setError(`Error parsing fountain script: ${err.message}`);
      
      // Fallback to displaying raw content
      if (iframeRef.current) {
        try {
          const iframe = iframeRef.current;
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          
          iframeDoc.open();
          iframeDoc.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { 
                  background-color: black; 
                  color: white; 
                  font-family: monospace; 
                  white-space: pre-wrap;
                  padding: 20px;
                }
              </style>
            </head>
            <body>
              <pre>${scriptContent}</pre>
            </body>
            </html>
          `);
          iframeDoc.close();
          
          // Set the iframe ID for external referencing
          iframe.id = 'teleprompter-frame';
        } catch (fallbackErr) {
          console.error('FountainViewer: Fallback display failed:', fallbackErr);
        }
      }
    }
  }, [scriptContent]);

  // Show loading and error states more visibly
  if (loading) {
    return (
      <div className="fountain-viewer" style={{ 
        width, 
        height, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#111',
        color: '#fff',
        padding: '20px',
        border: '1px solid #444',
        fontFamily: 'monospace'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', marginBottom: '10px', fontWeight: 'bold' }}>
            Loading Fountain Script...
          </div>
          <div style={{ fontSize: '12px', opacity: 0.7 }}>
            Script ID: {scriptId}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fountain-viewer" style={{ 
        width, 
        height, 
        padding: '20px',
        backgroundColor: '#330000',
        color: '#ff9999',
        border: '1px solid #ff0000',
        fontFamily: 'monospace',
        overflow: 'auto'
      }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>
          Error Loading Fountain Script
        </div>
        <div style={{ fontSize: '14px', marginBottom: '10px' }}>
          Script ID: {scriptId}
        </div>
        <div style={{ backgroundColor: '#220000', padding: '10px', borderRadius: '4px' }}>
          {error}
        </div>
        <div style={{ marginTop: '20px', fontSize: '12px' }}>
          <button onClick={() => window.location.reload()} style={{ 
            padding: '5px 10px', 
            backgroundColor: '#660000', 
            color: 'white', 
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fountain-viewer" style={{ width, height }}>
      <iframe
        ref={iframeRef}
        style={{ width: '100%', height: '100%', border: 'none', backgroundColor: 'black' }}
        sandbox="allow-same-origin allow-scripts allow-downloads allow-popups"
        title="Fountain Script Viewer"
        id="teleprompter-frame"
        frameBorder="0"
        allowFullScreen={true}
        allow="fullscreen"
        onLoad={(e) => {
          console.log('FountainViewer: iframe loaded for script:', scriptId);
          if (onLoad) {
            console.log('FountainViewer: calling onLoad handler');
            onLoad(e);
          }
        }}
      />
    </div>
  );
};

export default FountainViewer;