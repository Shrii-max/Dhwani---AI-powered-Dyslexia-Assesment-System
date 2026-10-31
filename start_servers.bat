@echo off
set "ROOT=%~dp0"
title Dhwani - Dyslexia Assessment System
echo ========================================================
echo  Starting Dhwani AI-Powered Dyslexia Assessment System
echo ========================================================
echo.

echo [1/2] Launching Backend Server (Port 5000)...
start "Dhwani Backend (Port 5000)" /D "%ROOT%BACKEND\BACKEND" cmd /k npm run dev

echo Waiting 3 seconds for backend initialization...
timeout /t 3 /nobreak >nul

echo [2/2] Launching Frontend Server (Port 8443)...
start "Dhwani Frontend (Port 8443)" /D "%ROOT%FRONTEND FINAL\FRONTEND FINAL" cmd /k npm run dev

echo.
echo ========================================================
echo  Two separate command windows have been opened!
echo  Please check both windows to ensure servers are running:
echo.
echo  - Frontend App: http://localhost:8443
echo  - Backend API:  http://localhost:5000
echo ========================================================
echo.
pause
