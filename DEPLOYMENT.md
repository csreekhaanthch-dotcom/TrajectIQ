# TrajectIQ — Intelligence-Driven Hiring
## Internal Deployment Guide

### Overview

TrajectIQ is a proprietary internal hiring intelligence tool designed for deterministic, explainable candidate evaluation. This guide covers deployment on internal networks and local environments.

---

## System Requirements

### Minimum Requirements
- **OS**: Linux (Ubuntu 20.04+), macOS 11+, Windows 10/11 with WSL2
- **Python**: 3.9 or higher
- **Node.js**: 18.x or higher
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 10GB for application and data

### For LLM Features
- **Ollama**: Latest version
- **Model**: llama3.2 (or compatible model)
- **GPU**: Optional but recommended for faster inference
- **RAM**: Additional 8GB for LLM

---

## Installation Steps

### 1. Backend Setup (Python)

```bash
# Navigate to backend directory
cd trajectiq/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Additional packages for resume parsing
pip install pdfplumber python-docx PyPDF2

# For database operations
pip install sqlite3  # Included in Python standard library

# For email connectors (optional)
pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client

# Initialize database
python -c "from core.database import DatabaseManager; DatabaseManager()"
```

### 2. Ollama Setup (For LLM Features)

```bash
# Install Ollama
curl https://ollama.ai/install.sh | sh

# Pull the recommended model
ollama pull llama3.2

# Start Ollama server
ollama serve

# Verify installation
ollama list
```

### 3. Frontend Setup (Next.js)

```bash
# Navigate to frontend directory (if separate)
# Or use the integrated Next.js project

# Install dependencies
npm install
# or
bun install

# Build for production
npm run build
# or
bun run build
```

---

## Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Application
ENVIRONMENT=production
LOG_LEVEL=INFO

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
OLLAMA_TEMPERATURE=0.1

# Database
DB_TYPE=sqlite
DB_PATH=/path/to/trajectiq/data/db/trajectiq.db

# For PostgreSQL (production)
# DB_TYPE=postgresql
# DB_CONNECTION_STRING=postgresql://user:pass@host:5432/trajectiq

# Email Connectors (optional)
IMAP_SERVER=imap.gmail.com
IMAP_PORT=993
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# ATS Integrations (optional)
GREENHOUSE_API_KEY=your-api-key
LEVER_API_KEY=your-api-key
LEVER_INSTANCE=your-instance

# Security
SECRET_KEY=your-secret-key-here
API_KEY=your-api-key-for-external-access
```

### Scoring Weights Configuration

Edit `backend/core/config.py` to adjust scoring weights:

```python
@dataclass
class ScoringWeights:
    skills: float = 0.35      # 35% weight
    impact: float = 0.25      # 25% weight
    trajectory: float = 0.25  # 25% weight
    experience: float = 0.15  # 15% weight
```

---

## Running the Application

### Development Mode

```bash
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Start Backend API (optional)
cd backend
python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 3: Start Frontend
npm run dev
# or
bun run dev
```

### Production Mode

```bash
# Start Ollama as service
ollama serve &

# Start backend with gunicorn
cd backend
gunicorn -w 4 -k uvicorn.workers.UvicornWorker api.main:app --bind 0.0.0.0:8000

# Start frontend
npm run start
# or
bun run start
```

### Using Systemd (Linux)

Create service file `/etc/systemd/system/trajectiq.service`:

```ini
[Unit]
Description=TrajectIQ Hiring Intelligence
After=network.target

[Service]
Type=simple
User=trajectiq
WorkingDirectory=/opt/trajectiq/backend
Environment="PATH=/opt/trajectiq/backend/venv/bin"
ExecStart=/opt/trajectiq/backend/venv/bin/gunicorn -w 4 -k uvicorn.workers.UvicornWorker api.main:app --bind 0.0.0.0:8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable trajectiq
sudo systemctl start trajectiq
```

---

## API Endpoints

### Candidates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/candidates` | List all candidates |
| GET | `/api/candidates/{id}` | Get candidate details |
| POST | `/api/evaluate` | Evaluate a new candidate |
| GET | `/api/candidates/{id}/evaluations` | Get candidate evaluations |

### Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs` | List all jobs |
| GET | `/api/jobs/{id}` | Get job details |
| POST | `/api/jobs` | Create new job |
| GET | `/api/jobs/{id}/leaderboard` | Get ranked candidates |

### Statistics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Get dashboard statistics |
| GET | `/api/stats/{job_id}` | Get job-specific statistics |

### Evaluation Request Example

```json
POST /api/evaluate
Content-Type: application/json

{
  "resume_path": "/data/resumes/candidate.pdf",
  "job_requirements": {
    "job_id": "JOB-2024-001",
    "job_title": "Senior Software Engineer",
    "required_skills": [
      {
        "name": "Python",
        "minimum_years": 5,
        "minimum_proficiency": "advanced",
        "is_critical": true
      }
    ],
    "preferred_skills": [
      {"name": "AWS"}
    ]
  }
}
```

---

## Database Management

### Backup

```bash
# SQLite backup
sqlite3 /path/to/trajectiq.db ".backup '/backups/trajectiq_$(date +%Y%m%d).db'"

# Or simple file copy
cp /path/to/trajectiq.db /backups/trajectiq_$(date +%Y%m%d).db
```

### Migration to PostgreSQL

1. Export SQLite data:
```bash
sqlite3 trajectiq.db .dump > dump.sql
```

2. Convert to PostgreSQL format (adjust syntax as needed)

3. Import to PostgreSQL:
```bash
psql -d trajectiq -f dump_converted.sql
```

---

## Security Considerations

### Data Privacy
- All candidate data is stored locally
- No external data transmission without explicit configuration
- Resume files are processed locally
- Audit logs track all access

### Access Control
- Implement API key authentication for external access
- Use role-based access control (RBAC) for multi-user deployments
- Restrict database access to application user only

### Network Security
- Deploy behind internal firewall
- Use HTTPS for all connections
- Enable VPN access for remote users

### Compliance
- All evaluations are auditable
- Deterministic scoring (temperature 0.1)
- No random outputs
- Full explanation trail for each score

---

## Monitoring & Logging

### Log Files Location
```
data/logs/
├── trajectiq.log          # Main application log
├── audit.log              # Audit trail
├── evaluations.log        # Evaluation records
└── error.log              # Error logs
```

### Log Rotation

Add to logrotate configuration:

```
/path/to/trajectiq/data/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0640 trajectiq trajectiq
}
```

### Health Check Endpoint

```bash
curl http://localhost:8000/health
# Expected: {"status": "healthy", "timestamp": "2024-01-15T..."}
```

---

## Troubleshooting

### Common Issues

**Ollama Connection Failed**
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama
ollama serve
```

**Resume Parsing Errors**
```bash
# Install OCR support (for scanned PDFs)
sudo apt-get install tesseract-ocr
pip install pytesseract
```

**Database Locked**
```bash
# Check for active connections
lsof /path/to/trajectiq.db

# Kill stale connections
fuser -k /path/to/trajectiq.db
```

**Memory Issues**
```bash
# Increase Python memory limit
export PYTHONMEMORY=4G

# Or use chunked processing for large batches
```

---

## Scaling Considerations

### Horizontal Scaling
- Deploy multiple backend instances behind load balancer
- Use Redis for session/cache storage
- Migrate to PostgreSQL for multi-instance database access

### Performance Optimization
- Enable caching for repeated evaluations
- Use batch processing for bulk imports
- Implement async processing for large files

### Resource Allocation
```
Small Deployment (< 100 candidates/day):
- 2 CPU cores
- 8GB RAM
- Local SQLite

Medium Deployment (100-1000 candidates/day):
- 4 CPU cores
- 16GB RAM
- PostgreSQL

Large Deployment (> 1000 candidates/day):
- 8+ CPU cores
- 32GB+ RAM
- PostgreSQL cluster
- Redis cache
```

---

## Support & Maintenance

### Regular Maintenance Tasks
- Daily: Database backup
- Weekly: Log rotation check
- Monthly: Security updates, model updates

### Update Procedure
```bash
# Backup
cp -r trajectiq trajectiq_backup_$(date +%Y%m%d)

# Pull updates
git pull origin main

# Update dependencies
pip install -r requirements.txt --upgrade
npm install

# Run migrations (if any)
python -m scripts.migrate

# Restart services
sudo systemctl restart trajectiq
```

---

## Contact

For internal support:
- **Technical Issues**: engineering@company.internal
- **Feature Requests**: product@company.internal
- **Security Concerns**: security@company.internal

---

*TrajectIQ v1.0.0 - Internal Use Only*
