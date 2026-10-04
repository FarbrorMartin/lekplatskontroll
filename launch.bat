@echo off
rem Starts the app on http://localhost:8080 and opens it in the browser.
rem Usage: launch.bat [port]   Stop the server with Ctrl+C.
setlocal
set PORT=%~1
if "%PORT%"=="" set PORT=8080
cd /d "%~dp0"
rem The browser opens after a short delay so the server has time to start.
start "" /b cmd /c "timeout /t 1 /nobreak >nul & start http://localhost:%PORT%"
python -m http.server %PORT%
