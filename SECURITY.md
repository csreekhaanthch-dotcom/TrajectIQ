# TrajectIQ Security Policy

## Security Features

### Encryption & Data Protection
- **AES-256-GCM encryption** for sensitive data at rest
- **SQLCipher** for encrypted database storage
- **RSA-4096** for license key validation
- **TLS 1.3** for data in transit (when applicable)

### Authentication & Authorization
- **JWT/OAuth 2.0** with PKCE flow
- **Role-Based Access Control (RBAC)** with 4 tiers
- **Machine fingerprint binding** for license validation
- **Session management** with secure token handling

### Secure Development Practices
- **Sandboxed resume parsing** with MIME validation
- **Certificate pinning** for HTTPS connections
- **Rate limiting** (token bucket algorithm)
- **Circuit breaker** for API resilience
- **Signed updates** with delta patches

## Vulnerability Scanning

We use multiple tools to scan for vulnerabilities:

### Automated Scans (CI/CD)

| Tool | Purpose | Frequency |
|------|---------|-----------|
| Bandit | Python security linter | Every commit |
| Safety | Dependency vulnerabilities | Every commit |
| Semgrep | Advanced security patterns | Every commit |
| Dependabot | GitHub dependency alerts | Continuous |

### Running Security Scans Locally

```bash
# Install security tools
pip install bandit safety semgrep

# Run Bandit (Python security linter)
bandit -r src/ -f txt

# Run Safety (dependency vulnerability check)
safety check

# Run Semgrep (advanced security patterns)
semgrep --config p/security-audit --config p/secrets src/
```

### Security Scan Results

Results are uploaded as artifacts in GitHub Actions and can be reviewed:
- `bandit-report.json` - Bandit findings
- `safety-report.json` - Safety findings
- Semgrep results in GitHub Security tab

## Reporting Security Vulnerabilities

We take security seriously. If you discover a vulnerability:

1. **Do NOT** open a public issue
2. Email: security@trajectiq.com
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours and provide a timeline for resolution.

## Security Checklist

### Pre-Release Security Audit

- [ ] Run full Bandit scan - no high-severity issues
- [ ] Run Safety check - no known vulnerabilities
- [ ] Run Semgrep security audit
- [ ] Review all dependencies for known CVEs
- [ ] Verify encryption key management
- [ ] Check for hardcoded secrets/credentials
- [ ] Validate input sanitization
- [ ] Test authentication bypass attempts
- [ ] Verify license validation cannot be bypassed
- [ ] Check file upload security (MIME validation)
- [ ] Review error messages for information disclosure
- [ ] Test rate limiting effectiveness

### Quarterly Security Review

- [ ] Rotate encryption keys
- [ ] Review access logs for anomalies
- [ ] Update dependencies to latest versions
- [ ] Penetration testing (if applicable)
- [ ] Review and update security policies
- [ ] Security awareness training for team

## Compliance

### Current Status
- ✅ OWASP Top 10 awareness
- ✅ Secure development lifecycle
- ✅ Vulnerability management process

### Roadmap
- 🔄 SOC 2 Type I (Planned: Q3 2025)
- 🔄 SOC 2 Type II (Planned: Q4 2025)
- 🔄 ISO 27001 (Planned: 2026)

## Security Headers & Configurations

### Database Encryption
```python
# SQLCipher configuration
PRAGMA key = 'encryption_key';
PRAGMA cipher_page_size = 4096;
PRAGMA kdf_iter = 64000;
PRAGMA cipher_hmac_algorithm = HMAC_SHA512;
PRAGMA cipher_kdf_algorithm = PBKDF2_HMAC_SHA512;
```

### Secure Session Configuration
```python
SESSION_CONFIG = {
    'secure': True,
    'httponly': True,
    'samesite': 'Strict',
    'max_age': 3600,
}
```

## Third-Party Security Tools

| Tool | Purpose | Status |
|------|---------|--------|
| GitHub Dependabot | Dependency alerts | ✅ Active |
| GitHub CodeQL | Code analysis | ✅ Active |
| Bandit | Python security | ✅ CI/CD |
| Safety | Vulnerability DB | ✅ CI/CD |

---

Last Updated: March 2025
Version: 3.0.2
