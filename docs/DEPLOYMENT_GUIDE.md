# TrajectIQ Enterprise - Deployment Guide

## Overview

This guide covers deployment of TrajectIQ Enterprise in various environments, from single-user desktop installations to enterprise-wide rollouts.

---

## 1. System Requirements

### 1.1 Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | Intel i5 / AMD Ryzen 5 | Intel i7 / AMD Ryzen 7 |
| RAM | 8 GB | 16 GB |
| Storage | 500 MB free | 5 GB free |
| Display | 1366x768 | 1920x1080 |

### 1.2 Software Requirements

| Software | Version |
|----------|---------|
| OS | Windows 10/11 (64-bit) |
| .NET Framework | 4.8+ (for installer) |
| Visual C++ Runtime | 2015-2022 |

### 1.3 Network Requirements

| Purpose | Port | Protocol |
|---------|------|----------|
| License Validation | 443 | HTTPS |
| ATS Integration | 443 | HTTPS |
| Email (IMAP) | 993 | IMAPS |
| Updates | 443 | HTTPS |

---

## 2. Installation Methods

### 2.1 Standard Installation (Recommended)

1. Download `TrajectIQ-{version}-win-x64.zip` from GitHub Releases
2. Extract to desired location (e.g., `C:\Program Files\TrajectIQ`)
3. Run `TrajectIQ.exe`
4. Complete license activation wizard

### 2.2 Silent Installation (Enterprise)

```powershell
# Using PowerShell
Start-Process -FilePath "TrajectIQ-installer.exe" -ArgumentList "/S", "/D=C:\Program Files\TrajectIQ" -Wait

# Using CMD
TrajectIQ-installer.exe /S /D=C:\Program Files\TrajectIQ
```

**Silent Install Flags:**
- `/S` - Silent mode
- `/D=` - Installation directory
- `/LICENSE=` - Pre-configure license key
- `/CONFIG=` - Import configuration file

### 2.3 Portable Installation

1. Extract ZIP to USB drive or network share
2. Run `TrajectIQ.exe` directly
3. Data stored in `%APPDATA%\TrajectIQ`

---

## 3. License Activation

### 3.1 Online Activation

1. Launch TrajectIQ
2. Enter license key when prompted
3. Application validates against license server
4. Machine fingerprint bound to license

### 3.2 Offline Activation

1. Launch TrajectIQ
2. Click "Show Fingerprint"
3. Send fingerprint to support@trajectiq.com
4. Receive signed license file
5. Import license file via "Import License" button

### 3.3 Demo License

```
License Key: TRAJECTIQ-DEMO-2024-FULL-ACCESS
```

**Demo License Features:**
- 30-day validity
- All features enabled
- Single user
- For evaluation only

---

## 4. Configuration

### 4.1 Configuration Location

```
Windows: %APPDATA%\TrajectIQ\config.json
Database: %APPDATA%\TrajectIQ\data\trajectiq_encrypted.db
Keys: %APPDATA%\TrajectIQ\.keyring
Logs: %APPDATA%\TrajectIQ\logs\
```

### 4.2 Configuration File

```json
{
  "version": "3.0.0",
  "license": {
    "server_url": "https://license.trajectiq.com",
    "validation_interval_hours": 24,
    "offline_grace_days": 7
  },
  "database": {
    "encryption_enabled": true,
    "backup_enabled": true,
    "backup_interval_hours": 24,
    "retention_days": 90
  },
  "logging": {
    "level": "INFO",
    "encrypt_logs": true,
    "retention_days": 90
  },
  "scoring": {
    "weights": {
      "skills": 0.35,
      "impact": 0.25,
      "trajectory": 0.25,
      "experience": 0.15
    },
    "ai_mode": "advisory"
  },
  "connectors": {
    "email": {
      "server": "imap.example.com",
      "port": 993,
      "use_ssl": true,
      "polling_interval_minutes": 15
    },
    "ats": {
      "provider": "greenhouse",
      "api_key": "",
      "sync_interval_hours": 6
    }
  },
  "telemetry": {
    "enabled": false,
    "consent_given_at": null
  }
}
```

### 4.3 Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `TRAJECTIQ_CONFIG` | Custom config path | `D:\configs\trajectiq.json` |
| `TRAJECTIQ_DATA` | Custom data directory | `D:\data\trajectiq` |
| `TRAJECTIQ_LOG_LEVEL` | Log level override | `DEBUG` |

---

## 5. User Management

### 5.1 Initial User Setup

On first launch, create the Super Admin account:

1. Enter username (min 4 characters)
2. Enter password (min 12 characters, complexity required)
3. Confirm password
4. Account is created with Super Admin role

### 5.2 Role Management

| Role | Description | Capabilities |
|------|-------------|--------------|
| Super Admin | Full system access | All features, user management |
| HR Admin | HR operations | User creation, evaluations, reports |
| Recruiter | Day-to-day recruiting | Evaluations, candidate management |
| Auditor | Read-only audit | View audit logs, bias reports |

### 5.3 Adding Users

1. Navigate to Settings > User Management
2. Click "Add User"
3. Enter user details
4. Assign role
5. User receives temporary password
6. User must change password on first login

---

## 6. ATS Integration

### 6.1 Greenhouse Setup

1. Generate API key in Greenhouse (Configuration > API Credentials)
2. Navigate to Settings > ATS Integration in TrajectIQ
3. Select "Greenhouse"
4. Enter API key
5. Click "Test Connection"
6. Save configuration

### 6.2 Lever Setup

1. Generate API key in Lever (Settings > Integrations > API)
2. Navigate to Settings > ATS Integration in TrajectIQ
3. Select "Lever"
4. Enter API key
5. Click "Test Connection"
6. Save configuration

### 6.3 Workable Setup

1. Generate API key in Workable (Integrations > API)
2. Navigate to Settings > ATS Integration in TrajectIQ
3. Select "Workable"
4. Enter API key and subdomain
5. Click "Test Connection"
6. Save configuration

---

## 7. Email Integration

### 7.1 IMAP Configuration

1. Navigate to Settings > Email Integration
2. Enter IMAP server hostname
3. Enter port (default: 993 for SSL)
4. Enter email username/password
5. Select folder to monitor
6. Click "Test Connection"
7. Enable auto-scan if desired

### 7.2 Gmail Setup

1. Enable IMAP in Gmail settings
2. Generate App Password (Google Account > Security > App passwords)
3. Use App Password instead of regular password
4. Server: `imap.gmail.com`
5. Port: `993`

### 7.3 Outlook/Office 365 Setup

1. Server: `outlook.office365.com`
2. Port: `993`
3. Username: full email address
4. Password: account password or app password

---

## 8. Security Configuration

### 8.1 Password Policy

Default requirements (configurable):
- Minimum 12 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 digit
- At least 1 special character
- No common patterns

### 8.2 Session Configuration

```json
{
  "session": {
    "timeout_minutes": 30,
    "max_concurrent_sessions": 3,
    "activity_refresh": true
  }
}
```

### 8.3 Audit Logging

Audit logs capture:
- User authentication events
- Permission changes
- Evaluation access
- Configuration changes
- License events

Access via Settings > Audit Logs

---

## 9. Backup and Recovery

### 9.1 Automatic Backups

```json
{
  "backup": {
    "enabled": true,
    "interval_hours": 24,
    "retention_days": 30,
    "location": "%APPDATA%\\TrajectIQ\\backups"
  }
}
```

### 9.2 Manual Backup

1. Navigate to Settings > System
2. Click "Create Backup"
3. Select location
4. Backup includes:
   - Encrypted database
   - Configuration
   - License file
   - Keys

### 9.3 Recovery

1. Navigate to Settings > System
2. Click "Restore Backup"
3. Select backup file
4. Confirm restoration
5. Application restarts

---

## 10. Updates

### 10.1 Automatic Updates

```json
{
  "updates": {
    "channel": "stable",
    "auto_check": true,
    "auto_download": false,
    "check_interval_hours": 24
  }
}
```

### 10.2 Manual Update Check

1. Navigate to Settings > Updates
2. Click "Check for Updates"
3. If update available, review release notes
4. Click "Download and Install"
5. Application will restart

### 10.3 Rollback

1. Navigate to Settings > Updates
2. Click "View Update History"
3. Select previous version
4. Click "Rollback"
5. Application will restart

---

## 11. Troubleshooting

### 11.1 Common Issues

| Issue | Solution |
|-------|----------|
| License validation fails | Check internet connection, verify license not expired |
| Database locked | Close other instances, check for crashed processes |
| ATS connection fails | Verify API key, check network connectivity |
| Slow evaluation | Check file size, reduce batch size |

### 11.2 Log Files

```
%APPDATA%\TrajectIQ\logs\trajectiq.log
%APPDATA%\TrajectIQ\logs\audit.log
%APPDATA%\TrajectIQ\logs\security.log
```

### 11.3 Support Contacts

- **Technical Support:** support@trajectiq.com
- **License Issues:** license-support@trajectiq.com
- **Security Issues:** security@trajectiq.com

---

## 12. Enterprise Deployment

### 12.1 Group Policy Deployment

1. Create GPO for software installation
2. Point to MSI package on network share
3. Configure silent install parameters
4. Deploy to target OUs

### 12.2 SCCM Deployment

1. Create application package
2. Configure detection rules
3. Set installation program: `TrajectIQ-installer.exe /S`
4. Deploy to device collections

### 12.3 Configuration Management

Distribute configuration via:
- Group Policy Preferences
- Configuration Management Tools
- Login Scripts

Example PowerShell deployment script:

```powershell
# TrajectIQ Enterprise Deployment Script

# Configuration
$InstallPath = "C:\Program Files\TrajectIQ"
$ConfigPath = "\\server\share\TrajectIQ\config.json"
$LicensePath = "\\server\share\TrajectIQ\license.key"

# Check if already installed
if (Test-Path "$InstallPath\TrajectIQ.exe") {
    Write-Host "TrajectIQ already installed"
    exit 0
}

# Install
Start-Process -FilePath "\\server\share\TrajectIQ\TrajectIQ-installer.exe" -ArgumentList "/S", "/D=$InstallPath" -Wait

# Configure
Copy-Item -Path $ConfigPath -Destination "$env:APPDATA\TrajectIQ\config.json" -Force

# Activate license
# (License activation typically requires user interaction or pre-activation)

Write-Host "TrajectIQ installed successfully"
```

---

## 13. Performance Tuning

### 13.1 Database Optimization

```json
{
  "database": {
    "cache_size_mb": 64,
    "wal_checkpoint_threshold": 1000,
    "connection_pool_size": 5
  }
}
```

### 13.2 Batch Processing

```json
{
  "evaluation": {
    "batch_size": 50,
    "parallel_workers": 4,
    "timeout_seconds": 2
  }
}
```

### 13.3 Memory Configuration

For large-scale deployments:
- Increase heap size in startup configuration
- Enable memory-mapped I/O for database
- Configure aggressive garbage collection

---

## 14. Appendix

### A. File Locations

| File | Location |
|------|----------|
| Executable | `C:\Program Files\TrajectIQ\TrajectIQ.exe` |
| Configuration | `%APPDATA%\TrajectIQ\config.json` |
| Database | `%APPDATA%\TrajectIQ\data\trajectiq_encrypted.db` |
| Logs | `%APPDATA%\TrajectIQ\logs\` |
| Backups | `%APPDATA%\TrajectIQ\backups\` |
| Updates | `%APPDATA%\TrajectIQ\updates\` |

### B. Registry Keys

```
HKCU\Software\TrajectIQ\
    InstallPath
    Version
    ConfigPath
```

### C. Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Integrity check failed |
| 2 | License invalid |
| 3 | Database error |
| 4 | Configuration error |
| 5 | Security violation |

---

**Document Version:** 3.0.0  
**Last Updated:** March 2024
