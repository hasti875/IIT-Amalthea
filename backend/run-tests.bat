@echo off
setlocal enabledelayedexpansion

REM Test Runner Script for Amalthea Backend (Windows)
REM This script sets up the test environment and runs comprehensive tests

echo 🧪 Amalthea Backend Test Suite
echo ==============================

REM Check if we're in the backend directory
if not exist "package.json" (
    echo ❌ Error: Please run this script from the backend directory
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Node.js is not installed
    exit /b 1
)

REM Check if npm is installed  
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: npm is not installed
    exit /b 1
)

echo 📦 Installing test dependencies...
npm install --silent

echo.
echo 🔧 Environment Setup
echo ====================

REM Set test environment variables
set NODE_ENV=test
set JWT_SECRET=test_jwt_secret_key_for_testing_only_do_not_use_in_production
set MONGODB_URI=mongodb://localhost:27017/amalthea_test

REM Check if MongoDB is running (optional)
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe" >NUL
if errorlevel 1 (
    echo ⚠️  Warning: MongoDB doesn't appear to be running
    echo    Some integration tests may fail without a database connection
) else (
    echo ✅ MongoDB is running
)

echo ✅ Environment configured for testing
echo.

REM Parse command line arguments
set TEST_TYPE=%1
if "%TEST_TYPE%"=="" set TEST_TYPE=all

if "%TEST_TYPE%"=="unit" (
    echo 🧪 Running Unit Tests...
    echo ================================
    npm run test:unit
    if errorlevel 1 (
        echo ❌ Unit tests failed
        exit /b 1
    )
    echo ✅ Unit tests passed
) else if "%TEST_TYPE%"=="integration" (
    echo 🧪 Running Integration Tests...
    echo ================================
    npm run test:integration
    if errorlevel 1 (
        echo ❌ Integration tests failed
        exit /b 1
    )
    echo ✅ Integration tests passed
) else if "%TEST_TYPE%"=="coverage" (
    echo 📊 Running tests with coverage...
    echo ================================
    npm run test:coverage
    if errorlevel 1 (
        echo ❌ Coverage tests failed
        exit /b 1
    )
) else if "%TEST_TYPE%"=="watch" (
    echo 👀 Running tests in watch mode...
    echo ================================
    echo Press Ctrl+C to stop watching
    npm run test:watch
) else (
    echo 🚀 Running Full Test Suite
    echo ==========================
    
    echo 🧪 Running Unit Tests...
    echo ================================
    npm run test:unit
    if errorlevel 1 (
        echo ❌ Unit tests failed
        exit /b 1
    )
    echo ✅ Unit tests passed
    echo.
    
    echo 🧪 Running Integration Tests...
    echo ================================
    npm run test:integration
    if errorlevel 1 (
        echo ❌ Integration tests failed
        exit /b 1
    )
    echo ✅ Integration tests passed
    echo.
    
    echo 🎉 All tests completed successfully!
    echo.
    echo 📊 Test Summary:
    echo   - Unit tests: Edge cases and business logic
    echo   - Integration tests: API endpoints and workflows
    echo.
    echo 💡 Run specific test suites:
    echo   run-tests.bat unit         # Unit tests only
    echo   run-tests.bat integration  # Integration tests only
    echo   run-tests.bat coverage     # Tests with coverage report
    echo   run-tests.bat watch        # Watch mode for development
)

echo.
echo ✨ Testing complete!