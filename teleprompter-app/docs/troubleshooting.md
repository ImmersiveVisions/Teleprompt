# Troubleshooting Guide

This guide helps diagnose and resolve common issues with the Teleprompter App.

## Table of Contents

- [Connection Issues](#connection-issues)
- [Script Loading Problems](#script-loading-problems)
- [Display Issues](#display-issues)
- [Control Problems](#control-problems)
- [Performance Issues](#performance-issues)
- [Installation Issues](#installation-issues)
- [Known Issues](#known-issues)
- [Getting Help](#getting-help)

## Connection Issues

### WebSocket Connection Failing

**Symptoms:**
- "Connecting to teleprompter..." message doesn't disappear
- Red connection indicator in Admin or Remote panels
- Scripts can't be loaded or controlled

**Solutions:**
1. **Check Network Connectivity**:
   - Ensure all devices are on the same network
   - Verify firewall settings allow WebSocket connections (port 3000)

2. **Restart the Server**:
   ```bash
   # Stop the current server (Ctrl+C) and restart it
   npm run dev
   ```

3. **Check for Browser Support**:
   - Use modern browsers (Chrome, Firefox, Edge)
   - Disable aggressive privacy extensions that might block WebSockets

4. **Verify IP Address**:
   - Confirm you're using the correct IP address shown in the terminal
   - Try using `localhost` if on the same machine

### Multiple Viewers Not Connecting

**Symptoms:**
- Some devices connect but others don't
- Inconsistent behavior across devices

**Solutions:**
1. **Check Network Segmentation**:
   - Ensure devices aren't on separate VLANs or subnets
   - Try connecting all devices to the same WiFi network

2. **Increase Connection Timeout**:
   - Edit `websocket.js` to increase reconnection attempts
   - Restart the server after changes

3. **Check for CORS Issues**:
   - If using different domains or ports, check CORS settings in server.js
   - Enable Chrome DevTools and check for CORS errors

## Script Loading Problems

### Scripts Not Appearing in List

**Symptoms:**
- Script files exist but don't show in the Admin panel
- "No scripts found" message displayed

**Solutions:**
1. **Check File Location**:
   - Scripts should be in the `public` directory
   - For automatic conversion, check the `intake` directory

2. **Verify File Extensions**:
   - Only `.html`, `.htm`, and `.txt` extensions are recognized
   - Rename files if necessary

3. **Check File Permissions**:
   - Ensure the application has read access to script files
   - Set proper permissions: `chmod 644 yourscript.html`

4. **Run Manual Conversion**:
   - Try the "Convert Scripts" button in the Admin panel
   - Check server logs for conversion errors

### HTML Scripts Not Displaying Correctly

**Symptoms:**
- Script loads but appears blank or unstyled
- Content visible but formatting is broken

**Solutions:**
1. **Validate HTML**:
   - Check for HTML syntax errors
   - Ensure all tags are properly closed

2. **Check for Script Errors**:
   - Look for JavaScript errors in browser console
   - Remove or fix problematic scripts

3. **Add Required Styles**:
   - Ensure scripts have basic styles (color: white; background-color: black;)
   - Add the following to your HTML head:
     ```html
     <style>
       body { color: white; background-color: black; }
     </style>
     ```

4. **Try Iframe Direct Access**:
   - Access the script directly via URL: `http://localhost:3000/yourscript.html`
   - Check if it renders correctly outside the teleprompter

## Display Issues

### Font Size Not Changing

**Symptoms:**
- Adjusting font size has no effect
- Size changes momentarily then reverts

**Solutions:**
1. **Refresh the Viewer Page**:
   - Completely reload the Viewer page after changing font size
   - Wait a few seconds for changes to take effect

2. **Check CSS Conflicts**:
   - HTML scripts may have CSS that overrides font settings
   - Use higher specificity in your HTML:
     ```html
     <style>
       body, p, div, span { font-size: inherit !important; }
     </style>
     ```

3. **Verify teleprompter-font.js**:
   - Check if the script is properly loaded
   - Try accessing directly: `http://localhost:3000/teleprompter-font.js`

### Text Not Scrolling

**Symptoms:**
- Play button activates but text remains stationary
- Erratic or inconsistent scrolling

**Solutions:**
1. **Check Speed Setting**:
   - Ensure speed value is not set to 0
   - Try increasing speed significantly as a test

2. **Verify Script Format**:
   - Ensure script has sufficient content to scroll
   - Check for HTML elements that might interfere with scrolling

3. **Check Console for Errors**:
   - Open browser developer tools and check for JavaScript errors
   - Look for specific scrolling function failures

4. **Try Position Controller**:
   - Use the position slider to manually move through the script
   - If this works, the issue is specifically with auto-scroll

## Control Problems

### Remote Control Not Working

**Symptoms:**
- Remote buttons have no effect
- Control actions delayed or inconsistent

**Solutions:**
1. **Check WebSocket Connection**:
   - Verify the remote has an active WebSocket connection
   - Look for the green connection indicator

2. **Restart the Remote**:
   - Close and reopen the Remote page
   - Scan the QR code again for a fresh connection

3. **Try Direct Controls**:
   - Test if the Admin panel controls work correctly
   - If Admin works but Remote doesn't, it's likely a Remote-specific issue

### Bluetooth Remote Issues

**Symptoms:**
- Bluetooth remote not responding
- Incorrect actions when buttons pressed

**Solutions:**
1. **Check Pairing**:
   - Ensure the remote is paired with the device running Admin mode
   - Try re-pairing the device

2. **Verify Battery Level**:
   - Replace batteries or recharge the remote
   - Check for low battery indicators

3. **Key Mapping**:
   - Verify the key mapping in `bluetoothService.js`
   - Test each button individually to identify problems

## Performance Issues

### Sluggish Scrolling

**Symptoms:**
- Jerky or inconsistent scrolling
- Delayed response to speed changes

**Solutions:**
1. **Check Device Resources**:
   - Monitor CPU and memory usage
   - Close other resource-intensive applications

2. **Simplify HTML Content**:
   - Remove unnecessary JavaScript from HTML scripts
   - Minimize complex CSS animations

3. **Reduce Network Load**:
   - Ensure only necessary devices are connected
   - Check for bandwidth-heavy applications on the network

### High CPU Usage

**Symptoms:**
- Fan noise increases
- Device becomes hot
- Overall system slowdown

**Solutions:**
1. **Check Scripts for Complexity**:
   - Simplified HTML scripts use less processing power
   - Remove embedded videos or animations

2. **Monitor Browser Processes**:
   - Use Task Manager to identify browser resource usage
   - Try a different browser if one performs poorly

3. **Reduce Tab Count**:
   - Close unnecessary browser tabs
   - Use dedicated windows for Admin and Viewer

## Installation Issues

### Dependency Installation Failures

**Symptoms:**
- `npm install` fails with errors
- Missing modules errors when starting

**Solutions:**
1. **Clear npm Cache**:
   ```bash
   npm cache clean --force
   ```

2. **Check Node Version**:
   ```bash
   node -v
   ```
   Ensure you're using version 14.0.0 or later

3. **Try with --legacy-peer-deps**:
   ```bash
   npm install --legacy-peer-deps
   ```

### Electron Build Failures

**Symptoms:**
- `npm run electron-build` fails
- Application builds but crashes on startup

**Solutions:**
1. **Check for Native Module Issues**:
   - Some dependencies may require rebuilding for Electron
   - Try: `npm rebuild`

2. **Verify Electron Configuration**:
   - Check electron-build.js for platform-specific settings
   - Ensure paths are correct for your system

3. **Update Electron**:
   - Try with the latest Electron version
   - Check for compatibility issues

## Known Issues

### Position Broadcasting Issue

**Description:**
When manually scrolling in the preview pane, position updates may not broadcast correctly to viewers.

**Workaround:**
Use the position slider or search functionality instead of manual scrolling.

**Status:**
Fixed in commit `5347064` (Fix position broadcasting from manual scrolling in preview pane).

### Script Variable Reference Ordering

**Description:**
ViewerPage may experience issues with variable reference ordering when script changes occur rapidly.

**Workaround:**
Wait a few seconds between script changes to ensure proper state updates.

**Status:**
Fixed in commit `f3387d4` (Fixed ViewerPage variable reference ordering issue).

## Getting Help

If you've tried the solutions above and still have issues:

1. **Check Server Logs**:
   - Look for error messages in the terminal running the server
   - Note any specific error codes or messages

2. **Browser Console**:
   - Open browser developer tools (F12 in most browsers)
   - Check the Console tab for JavaScript errors
   - Look for WebSocket related messages

3. **File an Issue**:
   - Report bugs on GitHub with detailed information
   - Include browser/OS version and steps to reproduce

4. **Community Support**:
   - Check existing discussions for similar problems
   - Share your troubleshooting steps and solutions