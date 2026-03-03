# -*- mode: python ; coding: utf-8 -*-
"""
TrajectIQ Enterprise - PyInstaller Spec File
=============================================
Creates a fully standalone Windows executable with all dependencies.
"""

import sys
from pathlib import Path

# Get the project root
project_root = SPECPATH if 'SPECPATH' in dir() else Path('.').absolute()

block_cipher = None

# ============================================================
# Hidden imports - all modules that need to be bundled
# ============================================================
hiddenimports = [
    # Cryptography
    'cryptography',
    'cryptography.fernet',
    'cryptography.hazmat.primitives',
    'cryptography.hazmat.primitives.asymmetric',
    'cryptography.hazmat.primitives.asymmetric.rsa',
    'cryptography.hazmat.primitives.asymmetric.padding',
    'cryptography.hazmat.primitives.hashes',
    'cryptography.hazmat.primitives.serialization',
    'cryptography.hazmat.backends',
    'cryptography.hazmat.backends.defaultbackend',
    
    # Password hashing
    'bcrypt',
    '_bcrypt',
    
    # PyQt5
    'PyQt5',
    'PyQt5.QtCore',
    'PyQt5.QtGui',
    'PyQt5.QtWidgets',
    'PyQt5.sip',
    'PyQt5.QtDBus',
    
    # Application modules (imported from src directory via pathex)
    'security',
    'security.license',
    'security.rbac',
    'security.integrity',
    'modules',
    'modules.scoring_engine',
    'modules.bias_detection',
    'modules.experience_relevance',
    'core',
    'core.database',
    'core.config',
    'ui',
    'ui.main_window',
    'connectors',
    'connectors.ats_connector',
    'connectors.email_connector',
    'ai_enhancement',
    'ai_enhancement.semantic_layer',
    
    # Resume parsing
    'PyPDF2',
    'docx',
    'lxml',
    'lxml.etree',
    'lxml._elementpath',
    
    # HTTP
    'requests',
    'urllib3',
    'charset_normalizer',
    'idna',
    'certifi',
    'hmac',
    
    # Standard library
    'sqlite3',
    'json',
    'hashlib',
    'secrets',
    'getpass',
    'platform',
    'uuid',
    'datetime',
    'pathlib',
    'typing',
    'dataclasses',
    'enum',
    'logging',
    'argparse',
    'subprocess',
]

# ============================================================
# Data files to include
# ============================================================
datas = []

# Add public key
public_key = project_root / 'tools' / 'keys' / 'public_key.pem'
if public_key.exists():
    datas.append((str(public_key), 'tools/keys'))

# Add docs if exists
docs_dir = project_root / 'docs'
if docs_dir.exists():
    datas.append((str(docs_dir), 'docs'))

# ============================================================
# Binaries
# ============================================================
binaries = []

# ============================================================
# Analysis - scan all source files
# pathex includes src directory so modules can be found
# ============================================================
a = Analysis(
    [str(project_root / 'src' / 'main.py')],
    pathex=[
        str(project_root),          # Project root
        str(project_root / 'src'),  # src directory for module imports
    ],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter',
        'unittest',
        'pydoc',
        'doctest',
        'distutils',
        'setuptools',
        'pip',
        'wheel',
        'IPython',
        'jupyter',
        'notebook',
        'pytest',
        'sphinx',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

# ============================================================
# PYZ - Python bytecode archive
# ============================================================
pyz = PYZ(
    a.pure,
    a.zipped_data,
    cipher=block_cipher
)

# ============================================================
# EXE - Standalone executable
# ============================================================
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='TrajectIQ',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # Set to True for debugging
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
