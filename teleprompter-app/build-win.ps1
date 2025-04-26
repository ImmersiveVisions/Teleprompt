# PowerShell script to build the Electron app

Write-Host "Building Teleprompter Electron App for Windows..." -ForegroundColor Green
Write-Host ""

# Run the Node.js script directly
Write-Host "Executing build script with Node.js..."
& node electron-builder.js

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build process failed with exit code $LASTEXITCODE" -ForegroundColor Red
    Write-Host "Check electron-build.log for details" -ForegroundColor Yellow
}
else {
    Write-Host "Build completed successfully!" -ForegroundColor Green
    Write-Host "The executable should be in the 'dist' folder" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")