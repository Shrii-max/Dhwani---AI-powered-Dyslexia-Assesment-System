$root = $PSScriptRoot

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Starting Dhwani AI-Powered Dyslexia Assessment System" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/2] Starting Backend Server on http://localhost:5000..." -ForegroundColor Yellow
Start-Process powershell -WorkingDirectory "$root\BACKEND\BACKEND" -ArgumentList "-NoExit", "-Command", "npm run dev"

Start-Sleep -Seconds 3

Write-Host "[2/2] Starting Frontend Server on http://localhost:8443..." -ForegroundColor Yellow
Start-Process powershell -WorkingDirectory "$root\FRONTEND FINAL\FRONTEND FINAL" -ArgumentList "-NoExit", "-Command", "npm run dev"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host " Two separate PowerShell windows have been launched:" -ForegroundColor Green
Write-Host " - Frontend App: http://localhost:8443" -ForegroundColor Green
Write-Host " - Backend API:  http://localhost:5000" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
