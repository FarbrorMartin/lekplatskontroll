@echo off
rem Checks the Excel file with the app's own rules. Double-click to check data\lekplatskontroll.xlsx,
rem or drop another .xlsx file onto this file to check that one. Requires Node.js.
setlocal
cd /d "%~dp0"
if "%~1"=="" (node check-workbook.cjs) else (node check-workbook.cjs "%~1")
echo.
pause
