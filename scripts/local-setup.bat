@echo off
REM Local Development Setup Script for Gupta_Chat (Windows)

echo === Gupta_Chat Local Development Setup ===
echo.

REM Check prerequisites
echo Checking prerequisites...
where node >nul 2>&1 || (echo Error: Node.js is not installed. Please install Node.js ^>= 18. && exit /b 1)
where npm >nul 2>&1 || (echo Error: npm is not installed. && exit /b 1)

echo Node.js version:
node --version
echo npm version:
npm --version
echo.

REM Install dependencies
echo Installing dependencies...
call npm run install:all
echo.

REM Setup frontend environment
echo Setting up frontend environment...
if not exist frontend\.env (
  copy frontend\.env.example frontend\.env
  echo Created frontend\.env from example
) else (
  echo frontend\.env already exists, skipping
)
echo.

REM Setup worker environment
echo Setting up worker environment...
if not exist worker\.env (
  copy worker\.env.example worker\.env
  echo Created worker\.env from example
) else (
  echo worker/.env already exists, skipping
)
echo.

echo === Setup Complete ===
echo.
echo To start local development:
echo   npm run dev
echo.
echo This will start:
echo   - Frontend: http://localhost:5173
echo   - Worker:   http://localhost:8787
echo.
echo To run tests:
echo   npm run test
echo.
echo For more information, see LOCAL_SETUP.md
pause
