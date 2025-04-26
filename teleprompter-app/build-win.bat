@echo off
echo Building Teleprompter Electron App for Windows...
echo.

REM Run the build process using Node.js explicitly
node electron-builder.js

echo.
if %ERRORLEVEL% neq 0 (
  echo Build process failed with error code %ERRORLEVEL%
  echo See log for details
) else (
  echo Build completed successfully!
  echo The executable should be in the "dist" folder
)

pause