#!/usr/bin/env python3
"""
TrajectIQ Enterprise Build Script
==================================
Builds standalone Windows executable and installer.

Usage:
    python build.py [--clean] [--installer]
"""

import os
import sys
import shutil
import subprocess
import argparse
from pathlib import Path


def clean_build_dirs():
    """Remove build artifacts"""
    dirs_to_clean = ["build", "dist", "__pycache__", "*.egg-info"]
    
    for dir_pattern in dirs_to_clean:
        for path in Path(".").glob(dir_pattern):
            if path.is_dir():
                print(f"Removing: {path}")
                shutil.rmtree(path, ignore_errors=True)
    
    # Remove spec file if exists
    spec_file = Path("TrajectIQ.spec")
    if spec_file.exists():
        spec_file.unlink()
        print(f"Removing: {spec_file}")


def build_executable():
    """Build the executable using PyInstaller"""
    print("\n" + "=" * 60)
    print("  Building TrajectIQ Enterprise Executable")
    print("=" * 60 + "\n")
    
    # Check PyInstaller
    try:
        import PyInstaller
        print(f"PyInstaller version: {PyInstaller.__version__}")
    except ImportError:
        print("Error: PyInstaller not installed.")
        print("Run: pip install pyinstaller")
        return False
    
    # Run PyInstaller
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--onefile",
        "--windowed",  # No console window
        "--name", "TrajectIQ",
        "--clean",
        "--noconfirm",
    ]
    
    # Add icon if exists
    icon_path = Path("assets/icon.ico")
    if icon_path.exists():
        cmd.extend(["--icon", str(icon_path)])
    
    # Add hidden imports
    hidden_imports = [
        "cryptography",
        "cryptography.fernet",
        "cryptography.hazmat.primitives",
        "cryptography.hazmat.primitives.asymmetric",
        "cryptography.hazmat.backends",
        "bcrypt",
        "PyQt5",
        "PyQt5.QtCore",
        "PyQt5.QtGui",
        "PyQt5.QtWidgets",
    ]
    
    for imp in hidden_imports:
        cmd.extend(["--hidden-import", imp])
    
    # Add data files - use correct separator for platform
    import platform
    separator = ';' if platform.system() == 'Windows' else ':'
    if Path("assets").exists():
        cmd.extend([f"--add-data", f"assets{separator}assets"])
    
    # Main entry point
    cmd.append("src/main.py")
    
    print(f"Running: {' '.join(cmd)}")
    print()
    
    result = subprocess.run(cmd, cwd=Path(__file__).parent)
    
    if result.returncode == 0:
        exe_path = Path("dist/TrajectIQ.exe")
        if exe_path.exists():
            size_mb = exe_path.stat().st_size / (1024 * 1024)
            print(f"\nBuild successful!")
            print(f"Executable: {exe_path.absolute()}")
            print(f"Size: {size_mb:.1f} MB")
            return True
        else:
            print("Error: Executable not found after build")
            return False
    else:
        print(f"Build failed with return code: {result.returncode}")
        return False


def build_installer():
    """Build the installer using Inno Setup"""
    print("\n" + "=" * 60)
    print("  Building TrajectIQ Enterprise Installer")
    print("=" * 60 + "\n")
    
    # Check for Inno Setup
    inno_path = Path("C:/Program Files (x86)/Inno Setup 6/ISCC.exe")
    if not inno_path.exists():
        inno_path = Path("C:/Program Files/Inno Setup 6/ISCC.exe")
    
    if not inno_path.exists():
        print("Error: Inno Setup not found.")
        print("Please install Inno Setup 6 from: https://jrsoftware.org/isdl.php")
        return False
    
    # Check for executable
    exe_path = Path("dist/TrajectIQ.exe")
    if not exe_path.exists():
        print("Error: Executable not found. Run build.py first.")
        return False
    
    # Run Inno Setup
    setup_script = Path("installer/setup.iss")
    if not setup_script.exists():
        print(f"Error: Installer script not found: {setup_script}")
        return False
    
    cmd = [str(inno_path), str(setup_script)]
    
    print(f"Running: {' '.join(cmd)}")
    print()
    
    result = subprocess.run(cmd, cwd=Path(__file__).parent)
    
    if result.returncode == 0:
        print("\nInstaller build successful!")
        print("Output: dist/TrajectIQ-Setup-1.0.0.exe")
        return True
    else:
        print(f"Installer build failed with return code: {result.returncode}")
        return False


def generate_keys():
    """Generate RSA key pair for license signing"""
    print("\n" + "=" * 60)
    print("  Generating RSA Key Pair for License Signing")
    print("=" * 60 + "\n")
    
    from tools.license_generator import LicenseGenerator
    
    keys_dir = Path("tools/keys")
    keys_dir.mkdir(parents=True, exist_ok=True)
    
    private_path, public_path = LicenseGenerator.generate_key_pair(str(keys_dir))
    
    print(f"\nKeys generated:")
    print(f"  Private key: {private_path}")
    print(f"  Public key:  {public_path}")
    print("\nSECURITY WARNING:")
    print("  - Keep the private key SECURE and NEVER distribute it")
    print("  - The public key will be embedded in the application")
    print("  - Use tools/license_generator.py to create license keys")
    
    return True


def main():
    parser = argparse.ArgumentParser(
        description="TrajectIQ Enterprise Build Script"
    )
    
    parser.add_argument(
        "--clean", "-c",
        action="store_true",
        help="Clean build artifacts before building"
    )
    
    parser.add_argument(
        "--installer", "-i",
        action="store_true",
        help="Build installer after executable"
    )
    
    parser.add_argument(
        "--keys", "-k",
        action="store_true",
        help="Generate RSA key pair for license signing"
    )
    
    parser.add_argument(
        "--all", "-a",
        action="store_true",
        help="Build everything (clean, keys, exe, installer)"
    )
    
    args = parser.parse_args()
    
    # Change to project root
    os.chdir(Path(__file__).parent)
    
    # Clean
    if args.clean or args.all:
        print("\nCleaning build artifacts...")
        clean_build_dirs()
    
    # Generate keys
    if args.keys or args.all:
        if not generate_keys():
            return 1
    
    # Build executable
    if not build_executable():
        return 1
    
    # Build installer
    if args.installer or args.all:
        if not build_installer():
            return 1
    
    print("\n" + "=" * 60)
    print("  BUILD COMPLETE")
    print("=" * 60)
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
