# TrajectIQ Enterprise Deployment Guide

## Overview

TrajectIQ Enterprise is a standalone Windows desktop application for intelligence-driven hiring. It runs entirely within your corporate network with no external dependencies required.

## System Requirements

### Build Machine
- Windows 10/11 64-bit
- Python 3.9+ (for building only)
- 8 GB RAM minimum
- 2 GB disk space

### End User Machine
- Windows 10/11 64-bit (build 17763 or later)
- 4 GB RAM minimum
- 500 MB disk space
- No Python required

## Build Process

### Step 1: Install Build Dependencies

```bash
# Create virtual environment
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install PyInstaller
pip install pyinstaller
```

### Step 2: Generate License Keys

```bash
# Generate RSA key pair for license signing
python build.py --keys

# Keys will be created in:
# - tools/keys/private_key.pem (SECURE - never distribute)
# - tools/keys/public_key.pem (embedded in application)
```

### Step 3: Build Executable

```bash
# Clean build and create executable
python build.py --clean

# Output: dist/TrajectIQ.exe
```

### Step 4: Build Installer (Optional)

Prerequisite: Install [Inno Setup 6](https://jrsoftware.org/isdl.php)

```bash
# Build executable and installer
python build.py --all

# Output: dist/TrajectIQ-Setup-1.0.0.exe
```

### Step 5: Generate License Keys for Customers

```bash
# Interactive license generation
python tools/license_generator.py --interactive

# Or command line:
python tools/license_generator.py generate \
    --id "TQI-ABCD1234" \
    --org "Customer Company" \
    --days 365 \
    --users 10 \
    --ai \
    --output license.key
```

## Deployment Options

### Option 1: Standalone Executable

1. Copy `dist/TrajectIQ.exe` to target machine
2. Run executable
3. Enter license key on first launch
4. Application creates data directory in `%APPDATA%\TrajectIQ`

### Option 2: Installer Package

1. Distribute `dist/TrajectIQ-Setup-1.0.0.exe`
2. User runs installer
3. Installer creates shortcuts and data directories
4. Application prompts for license on first launch

### Option 3: Enterprise Deployment

For enterprise deployments with multiple users:

1. **Floating License Server** (optional)
   ```bash
   # Install license server on internal server
   python tools/floating_license_server.py --install
   
   # Configure client machines to connect to server
   ```

2. **Network Share Deployment**
   - Place executable on network share
   - Users create shortcuts to executable
   - Data stored in individual user profiles

3. **Group Policy Deployment**
   - Create MSI package (advanced)
   - Deploy via Group Policy Software Installation

## Security Checklist

### Pre-Deployment

- [ ] Private key stored securely (never in source control)
- [ ] License keys generated with correct features
- [ ] Machine fingerprints collected for binding (if applicable)
- [ ] Expiration dates set appropriately
- [ ] Test license activation on clean machine

### Configuration

- [ ] Session timeout configured (default: 30 minutes)
- [ ] Password policy enforced (12+ chars, complexity)
- [ ] Max login attempts configured (default: 5)
- [ ] Lockout duration set (default: 15 minutes)

### Database

- [ ] SQLite database in user profile (encrypted)
- [ ] Backup schedule configured
- [ ] Audit logging enabled

### Network

- [ ] No external network calls required
- [ ] Floating license server on internal network (if used)
- [ ] Cloud license validation disabled (or endpoint secured)

## User Roles

| Role | Permissions |
|------|-------------|
| Super Admin | Full system control, license management, user management |
| HR Admin | Configure integrations, view all candidates, export reports |
| Recruiter | Upload resumes, view assigned candidates, run evaluations |
| Auditor | Read-only access, audit logs, bias monitoring |

## Default Admin Account

On first launch, create the initial Super Admin account:

1. Launch TrajectIQ
2. Click "Create Admin Account"
3. Enter credentials (strong password required)
4. Account stored in encrypted local database

## Feature Flags

Features are controlled by license:

| Feature | License Flag |
|---------|-------------|
| AI Enhancement | `ai_enabled` |
| ATS Integration | `ats_enabled` |
| Analytics Dashboard | `analytics_enabled` |
| Bias Detection | `bias_module_enabled` |
| Floating License | `floating_license_enabled` |

## Troubleshooting

### License Won't Activate

1. Verify license key is valid
2. Check machine fingerprint matches (if bound)
3. Verify license not expired
4. Check network connectivity (for cloud validation)

### Application Won't Start

1. Check Windows version (10 build 17763+)
2. Verify executable not corrupted
3. Check antivirus exclusions
4. Review logs in `%APPDATA%\TrajectIQ\logs`

### Database Errors

1. Verify write permissions to `%APPDATA%\TrajectIQ\data`
2. Check disk space
3. Restore from backup if corrupted

## Support

- Documentation: `docs/`
- License Issues: license-support@trajectiq.com
- Technical Support: support@trajectiq.com
