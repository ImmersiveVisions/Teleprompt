# How to Report Electron App Errors

When you encounter errors in the Windows Electron build, here are several options to capture and share those error details:

## Option 1: Take a Screenshot

1. When the error popup appears, press `PrtScn` (Print Screen) on your keyboard
2. Open Paint or any image editor and paste the screenshot (Ctrl+V)
3. Save the image and share it

## Option 2: Copy Error Text

1. If the error dialog allows text selection, select the error message
2. Copy it with Ctrl+C
3. Paste it into a text file

## Option 3: Check Log Files

Windows often logs application errors in:

1. Open Event Viewer (search for it in the Start menu)
2. Navigate to Windows Logs > Application
3. Look for entries with "Error" level related to electron.exe or Teleprompter

## Option 4: Enable Logging in main.js

Add this code at the top of main.js:

```javascript
// Add to the top of main.js
const fs = require('fs');
const logFile = './electron-errors.log';

// Clear log file
fs.writeFileSync(logFile, '');

// Redirect console output to file
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function() {
  fs.appendFileSync(logFile, 'LOG: ' + Array.from(arguments).join(' ') + '\n');
  originalConsoleLog.apply(console, arguments);
};

console.error = function() {
  fs.appendFileSync(logFile, 'ERROR: ' + Array.from(arguments).join(' ') + '\n');
  originalConsoleError.apply(console, arguments);
};

// Log uncaught exceptions
process.on('uncaughtException', (error) => {
  fs.appendFileSync(logFile, 'UNCAUGHT EXCEPTION: ' + error.stack + '\n');
});
```

## Option 5: Enable Debug Mode

1. Run the electron app with debugging enabled:
   ```
   cd teleprompter-app/dist/quick-build/win-unpacked
   electron.exe --debug=5858
   ```

2. Open Chrome and navigate to `chrome://inspect`
3. Look for the Electron process and click "inspect"

## Option 6: Use the Included Debug Helper

1. Modify main.js to include the debug helper at the top:
   ```javascript
   const debug = require('./debug-helper');
   ```

2. Check the log file located at:
   - Windows: `%APPDATA%\Teleprompter\error-log.txt`

## What Information to Share

When reporting errors, please include:

1. The exact error message text
2. Steps to reproduce the error
3. When the error occurs (startup, specific action, etc.)
4. Your operating system version
5. Any log files or screenshots
6. Whether the error happens consistently or intermittently