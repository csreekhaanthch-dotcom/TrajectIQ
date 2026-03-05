# TrajectIQ Enterprise - Threat Model Documentation

## Document Information

| Field | Value |
|-------|-------|
| Version | 3.0.0 |
| Date | March 2024 |
| Classification | Internal Use |
| Methodology | STRIDE + LINDDUN |

---

## 1. System Overview

### 1.1 Architecture Components

```
┌─────────────────────────────────────────────────────────────┐
│                    TrajectIQ Enterprise                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   UI Layer  │  │  API Layer  │  │  Scheduler  │         │
│  │  (PyQt5)    │  │  (FastAPI)  │  │  (Background)│        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
│  ┌──────▼────────────────▼────────────────▼──────┐         │
│  │            Business Logic Layer                │         │
│  │  • Scoring Engine  • License Manager           │         │
│  │  • RBAC System     • Bias Detection            │         │
│  └──────────────────────┬─────────────────────────┘         │
│                         │                                    │
│  ┌──────────────────────▼─────────────────────────┐         │
│  │           Data Layer (SQLCipher)               │         │
│  │  • Encrypted DB   • Audit Logs   • Cache       │         │
│  └────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Trust Boundaries

1. **User Boundary:** Desktop application user
2. **Application Boundary:** Running application
3. **Data Boundary:** Encrypted local storage
4. **Network Boundary:** External services (ATS, email)

---

## 2. Asset Inventory

### 2.1 Critical Assets

| Asset | Classification | Location |
|-------|---------------|----------|
| Resume Data | Confidential | Local DB, Memory |
| Evaluation Results | Confidential | Local DB |
| License Keys | Confidential | Key Store |
| User Credentials | Confidential | Local DB (hashed) |
| Audit Logs | High Integrity | Log Files |
| Scoring Algorithm | Business Critical | Binary |

### 2.2 Data Flow

```
Resume Upload → Parsing → Scoring → Storage → Report
     │            │          │          │         │
     ▼            ▼          ▼          ▼         ▼
   Sandbox     Memory    Memory+DB   DB      Export
   Check       Safe      Safe       Encrypted PDF/CSV
```

---

## 3. STRIDE Threat Analysis

### 3.1 Spoofing

| Threat ID | Description | Mitigation |
|-----------|-------------|------------|
| S-001 | Attacker spoofs license server | Certificate pinning, signed responses |
| S-002 | Attacker spoofs ATS API responses | API key validation, signature verification |
| S-003 | Attacker spoofs user identity | RBAC with bcrypt password hashing |
| S-004 | Attacker spoofs machine fingerprint | Multi-factor fingerprint binding |

**Residual Risk:** Low (mitigations implemented)

### 3.2 Tampering

| Threat ID | Description | Mitigation |
|-----------|-------------|------------|
| T-001 | Binary tampering/modification | Integrity hash verification, anti-debug |
| T-002 | Database tampering | SQLCipher encryption, audit trail |
| T-003 | License file tampering | RSA signature verification |
| T-004 | Audit log tampering | Hash-chained logs, append-only |
| T-005 | Configuration tampering | Signed config, checksums |
| T-006 | Resume file injection | Sandboxed parser, size limits |

**Residual Risk:** Low (mitigations implemented)

### 3.3 Repudiation

| Threat ID | Description | Mitigation |
|-----------|-------------|------------|
| R-001 | User denies evaluation action | Comprehensive audit logging |
| R-002 | Admin denies permission change | Audit trail with integrity hash |
| R-003 | Attacker denies malicious activity | Non-repudiation through logs |

**Residual Risk:** Low (audit logs implemented)

### 3.4 Information Disclosure

| Threat ID | Description | Mitigation |
|-----------|-------------|------------|
| I-001 | Resume data exposure | AES-256-GCM database encryption |
| I-002 | Password exposure | bcrypt hashing, no plaintext storage |
| I-003 | License key extraction | Machine binding, encrypted storage |
| I-004 | Memory dump exposure | Secure memory handling, anti-debug |
| I-005 | Log file exposure | Optional log encryption |
| I-006 | Network traffic interception | TLS 1.3, certificate pinning |
| I-007 | AI signal used unfairly | Advisory only, never for rejection |

**Residual Risk:** Low (encryption implemented)

### 3.5 Denial of Service

| Threat ID | Description | Mitigation |
|-----------|-------------|------------|
| D-001 | Malicious large file upload | Size limits, sandbox timeout |
| D-002 | API rate limiting bypass | Token bucket rate limiting |
| D-003 | Database corruption | WAL mode, backups |
| D-004 | License validation loop | Validation caching |
| D-005 | Memory exhaustion | Resource limits in sandbox |

**Residual Risk:** Medium (local app, limited DoS impact)

### 3.6 Elevation of Privilege

| Threat ID | Description | Mitigation |
|-----------|-------------|------------|
| E-001 | Regular user gains admin | RBAC enforcement, permission checks |
| E-002 | Attacker bypasses license | Feature gating, runtime validation |
| E-003 | Code injection via resume | Sandboxed parser, no code execution |
| E-004 | DLL/SO injection | Binary integrity check |
| E-005 | Debug bypass | Anti-debug detection |

**Residual Risk:** Low (mitigations implemented)

---

## 4. LINDDUN Privacy Analysis

### 4.1 Linkability

| Threat | Description | Mitigation |
|--------|-------------|------------|
| L-001 | Resume data linked across evaluations | Tenant isolation, data separation |
| L-002 | User activity linked across sessions | Session ID rotation |

### 4.2 Identifiability

| Threat | Description | Mitigation |
|--------|-------------|------------|
| I-001 | Resume contains PII | Local processing, no cloud transmission |
| I-002 | Audit logs contain PII | Access controls, encryption |

### 4.3 Non-repudiation

(Covered in STRIDE R-001 through R-003)

### 4.4 Detectability

| Threat | Description | Mitigation |
|--------|-------------|------------|
| D-001 | Attacker detects valid license keys | No brute-force feedback |
| D-002 | Attacker detects valid users | Generic error messages |

### 4.5 Disclosure

(Covered in STRIDE I-001 through I-007)

### 4.6 Unawareness

| Threat | Description | Mitigation |
|--------|-------------|------------|
| U-001 | User unaware of data processing | Transparency reports, logs |
| U-002 | User unaware of telemetry | Explicit opt-in consent |

### 4.7 Non-compliance

| Threat | Description | Mitigation |
|--------|-------------|------------|
| N-001 | GDPR non-compliance | Local processing, export capability |
| N-002 | Bias in hiring decisions | Bias detection module, fairness reports |

---

## 5. Attack Trees

### 5.1 License Bypass Attack Tree

```
Goal: Use software without valid license
│
├── 1. Crack license validation
│   ├── 1.1 Reverse engineer binary [HARD: Obfuscation, anti-debug]
│   ├── 1.2 Patch binary [HARD: Integrity check, secure fail]
│   └── 1.3 Extract private key [IMPOSSIBLE: Not included in binary]
│
├── 2. Steal valid license
│   ├── 2.1 Copy license file [BLOCKED: Machine binding]
│   ├── 2.2 Clone machine fingerprint [HARD: Multi-factor binding]
│   └── 2.3 Intercept online validation [HARD: TLS, pinning]
│
└── 3. Generate valid license
    └── 3.1 Create forged license [IMPOSSIBLE: No private key]
```

**Overall Risk:** Very Low

### 5.2 Data Exfiltration Attack Tree

```
Goal: Extract resume/evaluation data
│
├── 1. Access database directly
│   ├── 1.1 Read DB file [BLOCKED: SQLCipher encryption]
│   └── 1.2 Memory dump [MITIGATED: Anti-debug, secure fail]
│
├── 2. Use application features
│   ├── 2.1 Export functionality [MITIGATED: RBAC, audit log]
│   └── 2.2 Screenshot [ACCEPTED: OS-level, not preventable]
│
└── 3. Intercept in transit
    ├── 3.1 Network interception [BLOCKED: TLS 1.3]
    └── 3.2 ATS connector [MITIGATED: TLS, API keys]
```

**Overall Risk:** Low

---

## 6. Threat Scenarios

### 6.1 Scenario: Malicious Resume Upload

**Description:** Attacker uploads resume containing malicious content (script injection, macro, etc.)

**Attack Steps:**
1. Attacker creates resume with embedded malicious content
2. Uploads to application
3. Attempts to trigger code execution

**Mitigations:**
- MIME type validation (magic bytes)
- File size limits (10 MB)
- Parse timeout (10 seconds)
- Sandboxed parsing environment
- Suspicious pattern detection (script tags, macros)
- No code execution during parsing

**Residual Risk:** Very Low

### 6.2 Scenario: Insider Threat - Admin Account Compromise

**Description:** Attacker gains access to admin account credentials

**Attack Steps:**
1. Steal admin credentials (phishing, etc.)
2. Login as admin
3. Export all evaluation data
4. Modify audit logs

**Mitigations:**
- bcrypt password hashing (resists rainbow tables)
- Account lockout after failed attempts
- Comprehensive audit logging
- Hash-chained audit logs (detect tampering)
- Session timeout enforcement

**Residual Risk:** Medium (cannot fully prevent credential theft)

### 6.3 Scenario: Supply Chain Attack

**Description:** Attacker compromises update server or package

**Attack Steps:**
1. Compromise update server
2. Push malicious update
3. Users install update

**Mitigations:**
- All updates RSA-4096 signed
- Signature verification before installation
- Certificate pinning for update server
- Binary integrity check on startup
- Automatic rollback on failure

**Residual Risk:** Low (requires key compromise)

---

## 7. Risk Assessment Matrix

| Threat Category | Likelihood | Impact | Risk Score | Mitigation Status |
|-----------------|------------|--------|------------|-------------------|
| License Bypass | Low | High | Medium | Implemented |
| Data Exfiltration | Low | Critical | Medium | Implemented |
| Binary Tampering | Low | Critical | Medium | Implemented |
| Insider Threat | Medium | High | High | Partial |
| Network Attack | Low | Medium | Low | Implemented |
| Injection Attack | Very Low | High | Low | Implemented |

---

## 8. Security Controls Summary

| Control Type | Implementation | Status |
|--------------|----------------|--------|
| Encryption | AES-256-GCM, RSA-4096 | ✅ |
| Authentication | bcrypt, JWT, RBAC | ✅ |
| Authorization | RBAC, Permission Middleware | ✅ |
| Audit | Hash-chained logs, Immutable | ✅ |
| Integrity | Binary hash, Signed updates | ✅ |
| Network | TLS 1.3, Certificate pinning | ✅ |
| Input Validation | Schema validation, Sandbox | ✅ |
| Anti-Tamper | Anti-debug, Integrity check | ✅ |

---

## 9. Recommendations

### 9.1 Short-Term (0-3 months)

1. Add hardware security module (HSM) support for key storage
2. Implement SSO integration (SAML/OIDC)
3. Add DLP (Data Loss Prevention) capabilities

### 9.2 Medium-Term (3-6 months)

1. Third-party penetration testing
2. Bug bounty program launch
3. Security certification (SOC 2 Type II)

### 9.3 Long-Term (6-12 months)

1. Zero-trust architecture adoption
2. Advanced threat detection
3. Security orchestration and automation

---

## 10. Appendix: Security Test Cases

| Test ID | Description | Type |
|---------|-------------|------|
| SEC-001 | License bypass attempt | Pen Test |
| SEC-002 | SQL injection test | Pen Test |
| SEC-003 | XSS in resume parsing | Pen Test |
| SEC-004 | Binary patching test | Pen Test |
| SEC-005 | Memory dump analysis | Forensic |
| SEC-006 | Timing attack on license | Pen Test |
| SEC-007 | Fuzz testing parser | Fuzz |
| SEC-008 | Rate limiting bypass | Pen Test |

---

**Document Approval:**

| Role | Name | Date |
|------|------|------|
| Security Lead | _____________ | _______ |
| CTO | _____________ | _______ |
| Risk Officer | _____________ | _______ |
