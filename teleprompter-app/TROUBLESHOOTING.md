# Troubleshooting the Teleprompter Electron App

## Common Build Issues

### 1. How to Run the Debug Version

To identify the exact error causing the Windows build to fail, run one of these commands:

```
# Option 1: Run the simplified test app
cd /path/to/teleprompter-app
npx electron minimal.js

# Option 2: Run the main app in debug mode
cd /path/to/teleprompter-app
npx electron main-debug.js
```

This will:
- Generate detailed logs in your AppData folder
- Show errors directly in a user-friendly dialog
- Include a "Debug" menu to access error information

### 2. Common Error Causes

#### "ENOENT: no such file or directory"
- Problem: Missing files referenced in the build
- Solution: Check the path references in main.js

#### "The application was unable to start correctly (0xc000007b)"
- Problem: 32/64-bit architecture mismatch
- Solution: Ensure all native dependencies match your system architecture

#### "App threw an error during load"
- Problem: Error in the preload script or main process
- Solution: Check the error logs and fix the specific script error

#### "Failed to load module" or "Cannot find module"
- Problem: Missing npm dependency
- Solution: Run `npm install --legacy-peer-deps` to resolve dependency issues

### 3. Checking the Logs

When errors occur, check these log locations:
- Minimal app log: `teleprompter-app\minimal-electron.log`
- Debug log: `teleprompter-app\electron-debug.log`
- Main application log: `teleprompter-app\main.log`

If you ran the packaged app:
- Error dump: `%TEMP%\teleprompter-error-dump.txt`
- AppData logs: `%APPDATA%\Teleprompter\logs\`

### 4. Quick Fixes to Try

1. **Clear the dist directory and rebuild**
   ```
   rm -rf dist
   npm run electron:build:win
   ```

2. **Fix dependency issues**
   ```
   npm install --legacy-peer-deps
   ```

3. **Disable ASAR packaging temporarily**
   - Edit electron-builder.yml and add: `asar: false`

4. **Try direct electron execution**
   ```
   npx electron .
   ```

## Reporting Issues

When reporting errors:

1. Share a screenshot of the error dialog
2. Attach the electron-debug.log file 
3. Note the exact step where the error occurs
4. Include your Windows version information

## Using the Debug Helper

The included debug helper will:
- Create detailed logs of application startup
- Show errors in a user-friendly dialog
- Provide a menu option to view log location
- Help identify which component is causing failures