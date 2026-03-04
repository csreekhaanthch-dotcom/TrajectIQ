@echo off
REM ============================================================
REM TrajectIQ Enterprise - Windows Build Script v3.0.2
REM ============================================================
REM
REM This script builds the Windows executable from source.
REM All dependencies will be installed automatically.
REM
REM Prerequisites:
REM   1. Python 3.9+ installed from https://python.org
REM   2. During Python install, CHECK "Add Python to PATH"
REM
REM Usage:
REM   Double-click this file or run from command prompt
REM
REM ============================================================

setlocal enabledelayedexpansion

echo.
echo ============================================================
echo   TrajectIQ Enterprise v3.0.2 - Windows Build
echo ============================================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found!
    echo.
    echo Please install Python 3.9+ from https://python.org
    echo IMPORTANT: Check "Add Python to PATH" during installation
    echo.
    pause
    exit /b 1
)

echo [Step 1/5] Checking Python version...
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo Python version: %PYTHON_VERSION%

echo.
echo [Step 2/5] Upgrading pip...
python -m pip install --upgrade pip --quiet

echo.
echo [Step 3/5] Installing dependencies...
echo This may take a few minutes...
pip install pyinstaller PyQt5 cryptography bcrypt PyPDF2 python-docx lxml requests --quiet

echo.
echo [Step 4/5] Cleaning previous build...
if exist build rmdir /s /q build 2>nul
if exist dist rmdir /s /q dist 2>nul
if exist TrajectIQ.spec del /q TrajectIQ.spec 2>nul

echo.
echo [Step 5/5] Building executable...
echo Building TrajectIQ.exe...
python build.py --clean

echo.
if exist dist\TrajectIQ.exe (
    echo ============================================================
    echo   BUILD SUCCESSFUL!
    echo ============================================================
    echo.
    for %%I in (dist\TrajectIQ.exe) do set SIZE=%%~zI
    set /a SIZE_MB=!SIZE! / 1048576
    echo Executable: dist\TrajectIQ.exe
    echo Size: !SIZE_MB! MB
    echo.
    echo You can now run TrajectIQ.exe from the dist folder.
    echo.
    echo Demo License Key:
    echo TRAJECTIQ-DEMO-2024-FULL-ACCESS
    echo.
) else (
    echo ============================================================
    echo   BUILD FAILED
    echo ============================================================
    echo.
    echo Check the error messages above for details.
    echo.
    echo Common fixes:
    echo 1. Make sure Python is installed and in PATH
    echo 2. Try running: pip install --upgrade pyinstaller
    echo 3. Delete build and dist folders manually and retry
    echo.
)

pause
