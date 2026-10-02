@echo off
setlocal
cd /d "%~dp0"
where gcc >nul 2>nul
if errorlevel 1 (
  echo gcc was not found. Install MinGW-w64 and add gcc to PATH.
  pause
  endlocal & exit /b 1
)
set "SERVER_BIN=%TEMP%\deadlock-lab-%RANDOM%-%RANDOM%.exe"
gcc -std=c11 -O2 -Wall -Wextra server.c -o "%SERVER_BIN%" -lws2_32
if errorlevel 1 (
  echo Build failed.
  del "%SERVER_BIN%" >nul 2>nul
  pause
  endlocal & exit /b 1
)
"%SERVER_BIN%" 8080
set "SERVER_EXIT=%ERRORLEVEL%"
del "%SERVER_BIN%" >nul 2>nul
if not "%SERVER_EXIT%"=="0" (
  echo The C server could not stay running. See the message above for the cause.
  echo If Windows reports a Device Guard or organization policy block, ask your IT administrator to authorize this local C backend.
  echo If the server says port 8080 is busy, stop the existing server or choose another port.
  pause
)
endlocal
