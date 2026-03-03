# TrajectIQ Enterprise Platform

<p align="center">
  <img src="public/trajectiq-logo.svg" alt="TrajectIQ Logo" width="200">
</p>

<p align="center">
  <strong>Intelligence-Driven Hiring Platform</strong><br>
  <em>Deterministic Scoring • Enterprise Security • Full Explainability</em>
</p>

---

## Overview

TrajectIQ Enterprise is a comprehensive, production-grade platform for intelligence-driven hiring of software engineers. It features deterministic scoring with full explainability, enterprise-grade security, and optional AI semantic enhancement.

### Key Features

- 🎯 **Deterministic Scoring** - Reproducible, explainable hiring decisions
- 🔐 **Enterprise Security** - RSA-4096 licensing, bcrypt auth, encrypted config
- 👥 **Multi-User RBAC** - Super Admin, HR Admin, Recruiter, Auditor roles
- 📊 **Bias Detection** - Fairness monitoring and compliance reporting
- 📜 **License Management** - Offline activation with machine binding
- 🔗 **Integrations** - Email (IMAP) and ATS (Greenhouse, Lever, Workable)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     TrajectIQ Enterprise                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Layer 1: Deterministic Core                │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │   │
│  │  │ Resume Parser│ │Skill Evaluator│ │Impact Scorer │    │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘    │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │   │
│  │  │Trajectory    │ │AI Detector   │ │Scoring Engine│    │   │
│  │  │Analyzer      │ │(Advisory)    │ │(Final Index) │    │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │          Layer 2: AI Enhancement (Optional)             │   │
│  │  Modes: OFF | LOCAL (Ollama) | API                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Enterprise Security Layer                   │   │
│  │  • Fernet encryption • bcrypt • RSA validation          │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Scoring System

### Deterministic Hiring Index

```
Hiring Index = (SDI × 0.40) + (CSIG × 0.15) + (IAE × 0.20) + (CTA × 0.15) + (ERR × 0.10)
```

| Component | Weight | Description |
|-----------|--------|-------------|
| **SDI** (Skill Depth Index) | 40% | Technical depth 0-5 scale |
| **CSIG** (Critical Skill Integrity Gate) | 15% | Required skills threshold |
| **IAE** (Impact Authenticity Engine) | 20% | Achievement quality scoring |
| **CTA** (Career Trajectory Analyzer) | 15% | Career progression analysis |
| **ERR** (Experience Relevance Ratio) | 10% | Relevant experience ratio |

### Grade Scale

| Grade | Score | Tier | Recommendation |
|-------|-------|------|----------------|
| A+ | 95-100 | 1 | Strong Hire |
| A | 90-94 | 1 | Strong Hire |
| B+ | 85-89 | 2 | Hire |
| B | 75-84 | 2 | Hire |
| C | 60-74 | 3 | Consider |
| D/F | <60 | 4-5 | Pass |

---

## Technology Stack

### Backend (Python)
- Python 3.10+
- SQLite with full-text search
- PyQt5 for desktop GUI
- Fernet encryption
- RSA-4096 signatures

### Frontend (Next.js 15)
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui components
- Prisma ORM
- Recharts for visualization

---

## Project Structure

```
TrajectIQ/
├── src/                          # Python Backend
│   ├── main.py                   # Entry point
│   ├── core/
│   │   ├── config.py             # Encrypted configuration
│   │   └── database.py           # SQLite manager
│   ├── security/
│   │   ├── rbac.py               # Role-based access control
│   │   └── license.py            # License validation
│   ├── modules/
│   │   ├── scoring_engine.py     # Deterministic evaluation
│   │   └── bias_detection.py     # Fairness monitoring
│   └── connectors/
│       ├── email_connector.py    # IMAP integration
│       └── ats_connector.py      # ATS APIs
├── tools/
│   ├── license_generator.py      # License creation tool
│   └── floating_license_server.py
├── installer/
│   └── setup.iss                 # Inno Setup script
├── docs/
│   ├── DEPLOYMENT.md
│   └── SECURITY_CHECKLIST.md
├── src/app/                      # Next.js Frontend
│   ├── page.tsx                  # Dashboard
│   └── api/                      # API routes
├── prisma/
│   └── schema.prisma             # Database schema
└── public/                       # Static assets
```

---

## Quick Start

### Frontend (Next.js Dashboard)

```bash
# Install dependencies
bun install

# Set up database
bunx prisma generate
bunx prisma db push

# Start development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

### Backend (Python Desktop App)

```bash
# Install dependencies
pip install -r TrajectIQ/requirements.txt

# Run CLI evaluation
python -m TrajectIQ.src.main --evaluate resume.txt

# Run GUI application
python -m TrajectIQ.src.main --gui

# Generate license keys
python TrajectIQ/tools/license_generator.py --interactive
```

### Building Windows Executable

```bash
# Install PyInstaller
pip install pyinstaller

# Build executable
python TrajectIQ/build.py --clean

# Output: dist/TrajectIQ.exe
```

---

## RBAC Roles

| Role | Permissions |
|------|-------------|
| **Super Admin** | Full control, license management, scoring weights |
| **HR Admin** | ATS/email config, all candidates, reports |
| **Recruiter** | Upload resumes, view assigned candidates |
| **Auditor** | Read-only, audit logs, bias monitoring |

---

## License System

- RSA-4096 signature validation
- Machine fingerprint binding (CPU + Disk + MAC)
- Feature gating (AI, ATS, Analytics, Bias)
- Offline activation by default
- Optional floating license server
- Optional cloud validation

---

## Bias Prevention

1. **No Protected Attributes** - Never uses race, gender, age
2. **Proxy Monitoring** - Detects potential proxy indicators
3. **Score Distribution** - Monitors for anomalous patterns
4. **Recruiter Deviation** - Flags significant scoring variations
5. **AI Signal Advisory** - AI detection never causes rejection

---

## Documentation

- [Deployment Guide](TrajectIQ/docs/DEPLOYMENT.md)
- [Security Checklist](TrajectIQ/docs/SECURITY_CHECKLIST.md)
- [Testing Instructions](TrajectIQ/docs/TESTING.md)

---

## Support

- Technical Support: support@trajectiq.com
- License Issues: license-support@trajectiq.com

---

## License

Copyright © 2024 TrajectIQ. All rights reserved.

Licensed under the terms of your license agreement. This software requires a valid license key for operation.
