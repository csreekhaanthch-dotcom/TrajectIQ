@echo off
REM ============================================================
REM TrajectIQ Enterprise - Windows Build Script
REM ============================================================
REM
REM Prerequisites:
REM   1. Python 3.9+ installed (https://python.org)
REM   2. Add Python to PATH during installation
REM
REM Usage:
REM   Double-click this file or run from command prompt:
REM   build-windows.bat
REM
REM ============================================================

echo.
echo ============================================================
echo   TrajectIQ Enterprise - Windows Build
echo ============================================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.9+ from python.org
    pause
    exit /b 1
)

echo [1/4] Upgrading pip...
python -m pip install --upgrade pip --quiet

echo [2/4] Installing dependencies...
pip install pyinstaller PyQt5 cryptography bcrypt PyPDF2 python-docx lxml requests --quiet

echo [3/4] Cleaning previous build...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist

echo [4/4] Building executable...
python build.py --clean

if exist dist\TrajectIQ.exe (
    echo.
    echo ============================================================
    echo   BUILD SUCCESSFUL!
    echo ============================================================
    echo.
    echo Executable: dist\TrajectIQ.exe
    for %%I in (dist\TrajectIQ.exe) do echo Size: %%~zI bytes
    echo.
    echo You can now run TrajectIQ.exe from the dist folder.
    echo.
) else (
    echo.
    echo BUILD FAILED - Check the error messages above.
    echo.
)

pause
