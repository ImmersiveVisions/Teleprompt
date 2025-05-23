# Windows Build Script for Teleprompter App

Write-Host "Installing dependencies with --force to resolve conflicts..."
npm install --force

Write-Host "Running Windows build with ESLint disabled..."
npm run electron:build:win

Write-Host "Build complete! Check the dist folder for your application."