# Building TrajectIQ for Windows

## Quick Build (Automated)

1. Install Python 3.9+ from https://python.org
   - **Important**: Check "Add Python to PATH" during installation

2. Double-click `build-windows.bat`

3. Find your executable at `dist\TrajectIQ.exe`

## Manual Build Steps

```powershell
# 1. Install dependencies
pip install pyinstaller PyQt5 pycryptodome bcrypt PyPDF2 python-docx lxml requests

# 2. Build executable
python build.py --clean

# 3. Find your executable
# dist\TrajectIQ.exe
```

## Build with Installer

If you have Inno Setup 6 installed:

```powershell
python build.py --clean --installer
```

Output: `dist\TrajectIQ-Setup-1.0.0.exe`

## Requirements

| Software | Version | Download |
|----------|---------|----------|
| Python | 3.9+ | https://python.org |
| Inno Setup (optional) | 6.0+ | https://jrsoftware.org/isdl.php |

## Troubleshooting

### "Python not found"
- Reinstall Python and check "Add Python to PATH"

### "pip not found"
- Run: `python -m pip install --upgrade pip`

### "PyInstaller not found"
- Run: `pip install pyinstaller`

### Build fails with errors
1. Delete `build` and `dist` folders
2. Run: `pip install --upgrade pyinstaller`
3. Try building again

## Demo License Key

```
TRAJECTIQ-DEMO-2024-FULL-ACCESS
```

## Support

- GitHub: https://github.com/csreekhaanthch-dotcom/TrajectIQ
- Version: 3.0.1
