// src/components/FountainTest.jsx
import React, { useEffect, useRef } from 'react';

const FountainTest = () => {
  const iframeRef = useRef(null);
  
  useEffect(() => {
    if (!iframeRef.current) return;
    
    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    
    // Write basic HTML structure with fountain-js script include
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Fountain Test</title>
        <style>
          body {
            background-color: black;
            color: white;
            font-family: 'Courier New', monospace;
            line-height: 1.5;
            padding: 20px;
            margin: 0;
          }
          #result {
            margin: 20px 0;
            padding: 10px;
            background-color: #333;
            border-radius: 5px;
          }
          .centered {
            text-align: center;
          }
          h3 {
            color: #ADD8E6;
            margin-top: 30px;
            margin-bottom: 10px;
            text-transform: uppercase;
          }
          h2 {
            text-align: right;
            color: #FFA07A;
            margin: 20px 0;
            text-transform: uppercase;
          }
          #expected {
            margin-top: 20px;
            padding: 10px;
            background-color: #2a2a2a;
            color: #00ff00;
          }
          .success {
            color: #00ff00;
            font-weight: bold;
          }
          .failure {
            color: #ff0000;
            font-weight: bold;
          }
        </style>
        <script src="https://unpkg.com/fountain-js@1.2.1/fountain.min.js"></script>
      </head>
      <body>
        <h1>Fountain Parser Test</h1>
        <div id="input">
          <h2>Input:</h2>
          <pre>.OPENING TITLES

            > BRICK & STEEL <
            > FULL RETIRED <

            SMASH CUT TO:</pre>
        </div>
        <div id="output">
          <h2>Output:</h2>
          <div id="result"></div>
          <div id="expected">
            <h3>Expected:</h3>
            <pre>&lt;h3&gt;OPENING TITLES&lt;/h3&gt;&lt;p class="centered"&gt;BRICK & STEEL &lt;br /&gt; FULL RETIRED&lt;/p&gt;&lt;h2&gt;SMASH CUT TO:&lt;/h2&gt;</pre>
          </div>
          <div id="status"></div>
        </div>
        
        <script>
          document.addEventListener('DOMContentLoaded', () => {
            try {
              // Create a fountain parser instance
              const fountainParser = new Fountain();
              
              // Define the sample text
              const text = \`.OPENING TITLES

            > BRICK & STEEL <
            > FULL RETIRED <

            SMASH CUT TO:\`;
              
              // Parse the script content with fountain-js
              const parsed = fountainParser.parse(text);
              
              // Get the HTML output
              const actual = parsed.html.script;
              
              // Display the result
              document.getElementById('result').innerHTML = actual;
              
              // Define expected output
              const expected = '<h3>OPENING TITLES</h3><p class="centered">BRICK & STEEL <br /> FULL RETIRED</p><h2>SMASH CUT TO:</h2>';
              
              // Perform assertion
              const isEqual = actual === expected;
              
              // Display result
              const statusEl = document.getElementById('status');
              if (isEqual) {
                statusEl.innerHTML = '<div class="success">Test Passed! Output matches expected result.</div>';
              } else {
                statusEl.innerHTML = '<div class="failure">Test Failed! Output does not match expected result.</div>';
                statusEl.innerHTML += '<h3>Actual:</h3><pre>' + actual.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre>';
              }
            } catch (error) {
              document.getElementById('status').innerHTML = 
                '<div class="failure">Error: ' + error.message + '</div>';
            }
          });
        </script>
      </body>
      </html>
    `);
    iframeDoc.close();
  }, []);
  
  return (
    <div style={{ width: '100%', height: '100%', padding: '20px' }}>
      <h2>Fountain-js Parser Test</h2>
      <iframe
        ref={iframeRef}
        style={{ 
          width: '100%', 
          height: '600px', 
          border: '1px solid #333',
          backgroundColor: 'black',
          borderRadius: '5px'
        }}
        sandbox="allow-same-origin allow-scripts"
        title="Fountain Test"
      />
    </div>
  );
};

export default FountainTest;