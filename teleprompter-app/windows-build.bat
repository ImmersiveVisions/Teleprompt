@echo off
echo Installing dependencies with --force to resolve conflicts...
call npm install --force

echo Running Windows build with ESLint disabled...
call npm run electron:build:win

echo Build complete! Check the dist folder for your application.
pause