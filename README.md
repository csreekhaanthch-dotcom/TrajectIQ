# TrajectIQ Enterprise Platform

## Overview

TrajectIQ Enterprise is a comprehensive, production-grade Windows desktop platform for intelligence-driven hiring. It operates entirely within your corporate network with deterministic scoring, optional AI enhancement, and enterprise-grade security.

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
│  │  Features: Semantic inference, Context normalization    │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Enterprise Security Layer                   │   │
│  │  • Fernet encryption for config                         │   │
│  │  • bcrypt password hashing                              │   │
│  │  • RSA license validation                               │   │
│  │  • Machine fingerprint binding                          │   │
│  │  • Tamper detection                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  RBAC System                            │   │
│  │  Roles: Super Admin | HR Admin | Recruiter | Auditor   │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Bias Detection & Fairness                  │   │
│  │  • Score distribution monitoring                        │   │
│  │  • Proxy word detection                                 │   │
│  │  • Recruiter deviation analysis                         │   │
│  │  • Fairness reports                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### Core Evaluation Modules

| Module | Description | Output |
|--------|-------------|--------|
| **Resume Parser** | Extracts structured data from PDF/DOCX | Parsed resume JSON |
| **Skill Evaluator** | Skill depth index (0-5), classification | Skill scores, critical status |
| **Impact Scorer** | Achievement authenticity (0-10) | Impact score, flags |
| **Trajectory Analyzer** | Career progression analysis | Trajectory score, risk level |
| **AI Detector** | Heuristic AI content detection | Likelihood score (advisory) |
| **Scoring Engine** | Multi-factor final index | Hiring Index, Grade, Recommendation |

### Enterprise Features

| Feature | Description |
|---------|-------------|
| **License System** | RSA-signed, machine-bound, offline activation |
| **Floating License** | Optional concurrent usage tracking |
| **RBAC** | 4 roles with granular permissions |
| **Audit Trail** | Complete logging with input/output hashes |
| **Bias Monitoring** | Daily fairness reports and alerts |
| **Analytics** | Usage dashboard with export capability |

### Security Features

- **Fernet Encryption**: All configuration encrypted at rest
- **bcrypt**: Password hashing with cost factor 12
- **RSA 4096-bit**: License signature validation
- **Machine Fingerprint**: Hardware-bound activation
- **Session Management**: Auto-expiration, lockout policies
- **Audit Logging**: Tamper-resistant operation logs

## File Structure

```
trajectiq_enterprise/
├── src/
│   ├── core/
│   │   ├── config.py          # Encrypted configuration
│   │   ├── database.py        # SQLite manager
│   │   └── logger.py          # Structured logging
│   ├── security/
│   │   ├── rbac.py            # Role-based access control
│   │   └── license.py         # License validation
│   ├── modules/
│   │   ├── scoring_engine.py  # Deterministic evaluation
│   │   └── bias_detection.py  # Fairness monitoring
│   ├── ui/
│   │   └── main_window.py     # PyQt5 desktop UI
│   └── main.py                # Entry point
├── tools/
│   ├── license_generator.py   # License creation tool
│   └── floating_license_server.py  # Concurrent license server
├── installer/
│   └── setup.iss              # Inno Setup script
├── docs/
│   ├── DEPLOYMENT.md          # Deployment guide
│   └── SECURITY_CHECKLIST.md  # Security verification
├── trajectiq.spec             # PyInstaller spec
├── build.py                   # Build automation
└── requirements.txt           # Python dependencies
```

## Building

```bash
# Install dependencies
pip install -r requirements.txt

# Generate license keys
python build.py --keys

# Build executable
python build.py --clean

# Build with installer
python build.py --all
```

## Output Files

| File | Description |
|------|-------------|
| `dist/TrajectIQ.exe` | Standalone executable (~50MB) |
| `dist/TrajectIQ-Setup-1.0.0.exe` | Windows installer |
| `tools/keys/private_key.pem` | License signing key (secure!) |
| `tools/keys/public_key.pem` | Embedded validation key |

## License Features

Controlled by license flags:

- `ai_enabled` - AI semantic enhancement
- `ats_enabled` - ATS integration (Greenhouse, Lever, Workable)
- `analytics_enabled` - Usage analytics dashboard
- `bias_module_enabled` - Bias detection & monitoring
- `floating_license_enabled` - Concurrent seat management

## Deterministic Scoring

### Factor Weights (Customizable)

| Factor | Default Weight | Description |
|--------|---------------|-------------|
| Skills | 35% | Technical match and depth |
| Impact | 25% | Achievement quality |
| Trajectory | 25% | Career progression |
| Experience | 15% | Total experience years |

### Grade Scale

| Grade | Score Range | Description |
|-------|-------------|-------------|
| A+ | 95-100 | Exceptional candidate |
| A | 90-94 | Top candidate |
| B | 75-89 | Strong candidate |
| C | 60-74 | Qualified candidate |
| D/F | <60 | Not recommended |

### Recommendation Tiers

- **Tier 1** (85+): Strong Hire - Immediate interview
- **Tier 2** (75-84): Hire - Schedule interview
- **Tier 3** (60-74): Consider - Further review needed
- **Tier 4** (45-59): Pass - Significant concerns
- **Tier 5** (<45): Strong Pass - Not suitable

## Bias Prevention

The system is designed to avoid discriminatory outcomes:

1. **No Protected Attributes**: Never uses race, gender, age, etc.
2. **Proxy Monitoring**: Detects potential proxy indicators
3. **Score Distribution**: Monitors for anomalous patterns
4. **Recruiter Deviation**: Flags significant scoring variations
5. **AI Signal Advisory**: AI detection never causes rejection

## Support

- Technical Support: support@trajectiq.com
- License Issues: license-support@trajectiq.com
- Documentation: See `docs/` directory
