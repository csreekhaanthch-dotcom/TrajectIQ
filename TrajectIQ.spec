# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['src/main.py'],
    pathex=['/home/z/my-project/download/TrajectIQ/src'],
    binaries=[],
    datas=[('assets', 'assets')],
    hiddenimports=['sqlite3', '_sqlite3', 'json', 'hashlib', 'secrets', 'getpass', 'platform', 'uuid', 'datetime', 'pathlib', 'typing', 'dataclasses', 'enum', 'logging', 'argparse', 'subprocess', 'abc', 'collections', 'functools', 'itertools', 're', 'io', 'os', 'sys', 'cryptography', 'cryptography.fernet', 'cryptography.hazmat.primitives', 'cryptography.hazmat.primitives.asymmetric', 'cryptography.hazmat.backends', 'bcrypt', 'PyQt5', 'PyQt5.QtCore', 'PyQt5.QtGui', 'PyQt5.QtWidgets', 'security', 'security.license', 'security.rbac', 'security.integrity', 'core', 'core.database', 'core.config', 'modules', 'modules.scoring_engine', 'modules.bias_detection', 'ui', 'ui.main_window', 'connectors', 'connectors.ats_connector', 'connectors.email_connector', 'ai_enhancement', 'ai_enhancement.semantic_layer', 'PyPDF2', 'docx', 'lxml', 'requests'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='TrajectIQ',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['assets/icon.ico'],
)
