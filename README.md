# TrajectIQ — Intelligence-Driven Hiring

<div align="center">
  <strong>Internal Hiring Intelligence Platform</strong><br>
  Deterministic • Explainable • Auditable
</div>

---

## Overview

TrajectIQ is a proprietary internal hiring intelligence tool that provides comprehensive candidate evaluation through modular, deterministic analysis. The system is designed for internal deployment with strict data privacy requirements.

### Key Features

- **Resume Parsing**: PDF/DOCX extraction with structured output
- **Skill Depth Evaluation**: Critical skill matching with explainable scoring
- **Impact Authenticity Scoring**: Achievement verification and impact analysis
- **Career Trajectory Analysis**: Progression patterns and stability indicators
- **AI-Assistance Detection**: Heuristic signals (not for auto-rejection)
- **Multi-factor Scoring Engine**: Comprehensive, deterministic final scoring

---

## Architecture

```
trajectiq/
├── backend/
│   ├── core/               # Configuration, logging, database
│   │   ├── config.py
│   │   ├── logger.py
│   │   └── database.py
│   ├── modules/            # Evaluation modules
│   │   ├── resume_parser.py
│   │   ├── skill_evaluator.py
│   │   ├── impact_scorer.py
│   │   ├── trajectory_analyzer.py
│   │   ├── ai_detector.py
│   │   └── scoring_engine.py
│   ├── connectors/         # External integrations
│   │   ├── email_connector.py
│   │   └── ats_connector.py
│   ├── schemas/            # JSON schemas
│   │   └── *.py
│   └── orchestration/      # Pipeline orchestration
│       └── pipeline.py
├── frontend/               # Next.js dashboard
├── data/
│   ├── samples/            # Example data
│   ├── logs/               # Application logs
│   └── db/                 # SQLite database
└── config/                 # Configuration files
```

---

## Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- Ollama (for LLM features)

### Installation

```bash
# Clone repository
git clone <internal-repo>/trajectiq.git
cd trajectiq

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend setup
cd ../frontend
npm install

# Start Ollama
ollama serve &
ollama pull llama3.2
```

### Run Evaluation

```python
from orchestration.pipeline import TrajectIQPipeline

# Initialize pipeline
pipeline = TrajectIQPipeline()

# Define job requirements
job_requirements = {
    "job_id": "JOB-2024-001",
    "job_title": "Senior Software Engineer",
    "required_skills": [
        {"name": "Python", "minimum_years": 5, "minimum_proficiency": "advanced", "is_critical": True}
    ]
}

# Evaluate candidate
result = pipeline.evaluate_candidate(
    resume_path="/path/to/resume.pdf",
    job_requirements=job_requirements
)

print(f"Score: {result['final_scoring']['final_score']['normalized_score']}")
print(f"Grade: {result['final_scoring']['final_score']['grade']}")
print(f"Recommendation: {result['final_scoring']['recommendation']['decision']}")
```

---

## Module Documentation

### 1. Resume Parser

Parses PDF and DOCX resumes into structured JSON format.

```python
from modules.resume_parser import ResumeParser

parser = ResumeParser()
result = parser.execute({
    "source_type": "file_path",
    "content": "/path/to/resume.pdf",
    "file_extension": "pdf"
})
```

**Output Schema**: See `schemas/resume_schema.py`

### 2. Skill Evaluator

Matches candidate skills against job requirements with depth analysis.

```python
from modules.skill_evaluator import SkillEvaluator

evaluator = SkillEvaluator()
result = evaluator.execute({
    "candidate_id": "CAND-001",
    "candidate_skills": {...},
    "job_requirements": {...}
})
```

**Output Schema**: See `schemas/skill_schema.py`

### 3. Impact Scorer

Evaluates authenticity and impact of achievements.

```python
from modules.impact_scorer import ImpactScorer

scorer = ImpactScorer()
result = scorer.execute({
    "candidate_id": "CAND-001",
    "achievements": [...]
})
```

**Output Schema**: See `schemas/impact_schema.py`

### 4. Trajectory Analyzer

Analyzes career progression patterns and stability.

```python
from modules.trajectory_analyzer import TrajectoryAnalyzer

analyzer = TrajectoryAnalyzer()
result = analyzer.execute({
    "candidate_id": "CAND-001",
    "work_history": [...],
    "education_history": [...]
})
```

**Output Schema**: See `schemas/trajectory_schema.py`

### 5. AI Detector

Heuristic detection of AI-generated content (signal only).

```python
from modules.ai_detector import AIDetector

detector = AIDetector()
result = detector.execute({
    "candidate_id": "CAND-001",
    "text_content": {
        "full_text": "...",
        "sections": {...}
    }
})
```

**Output Schema**: See `schemas/ai_detection_schema.py`

⚠️ **Important**: This is a heuristic signal only. Never use for automatic rejection.

### 6. Scoring Engine

Combines all factors into deterministic final score.

```python
from modules.scoring_engine import ScoringEngine

engine = ScoringEngine()
result = engine.execute({
    "candidate_id": "CAND-001",
    "job_id": "JOB-001",
    "evaluation_results": {...}
})
```

**Output Schema**: See `schemas/scoring_schema.py`

---

## Scoring System

### Factor Weights

| Factor | Weight | Description |
|--------|--------|-------------|
| Skills | 35% | Technical skill match and depth |
| Impact | 25% | Achievement quality and authenticity |
| Trajectory | 25% | Career progression and stability |
| Experience | 15% | Total and relevant experience |

### Grade Scale

| Grade | Score Range | Description |
|-------|-------------|-------------|
| A+ | 95-100 | Exceptional candidate |
| A | 90-94 | Top candidate |
| A- | 85-89 | Strong candidate |
| B+ | 80-84 | Good candidate |
| B | 75-79 | Solid candidate |
| B- | 70-74 | Qualified candidate |
| C+ | 65-69 | Consider candidate |
| C | 60-64 | Marginal candidate |
| Below C | <60 | Not recommended |

### Tier Classification

- **Tier 1**: Top candidates (85+)
- **Tier 2**: Strong candidates (75-84)
- **Tier 3**: Qualified candidates (60-74)
- **Tier 4**: Consider (45-59)
- **Tier 5**: Not recommended (<45)

---

## Connectors

### Email Connector

Fetches resumes from email attachments.

```python
from connectors.email_connector import EmailConnector

connector = EmailConnector("gmail")
connector.connect(username="email@gmail.com", password="app-password")
resumes = connector.fetch_resumes(folder="INBOX", limit=100)
```

### ATS Connector

Integrates with applicant tracking systems.

```python
from connectors.ats_connector import get_ats_connector

connector = get_ats_connector("greenhouse", api_key="your-key")
candidates = connector.get_candidates(job_id="12345")
```

Supported ATS:
- Greenhouse
- Lever
- Workday

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/candidates` | List all candidates |
| GET | `/api/candidates/{id}` | Get candidate details |
| POST | `/api/evaluate` | Evaluate candidate |
| GET | `/api/jobs` | List all jobs |
| GET | `/api/jobs/{id}/leaderboard` | Get ranked candidates |
| GET | `/api/stats` | Dashboard statistics |

---

## Dashboard

The Next.js dashboard provides:

- Summary statistics
- Candidate leaderboard
- Score distribution visualization
- Individual candidate details
- Evaluation history

Access at `http://localhost:3000` when running.

---

## Compliance & Auditability

### Audit Trail

Every evaluation generates a complete audit trail:

- Input/output hashes for reproducibility
- Timestamp and actor information
- Configuration snapshot
- Processing metadata

### Determinism

- LLM temperature set to 0.1
- No random outputs
- Consistent scoring for identical inputs
- Full explanation for every score component

### Data Privacy

- All processing happens locally
- No external data transmission
- Candidate data never leaves your network
- Configurable data retention

---

## Configuration

Key configuration options in `backend/core/config.py`:

```python
# LLM settings
ollama_temperature = 0.1  # Deterministic outputs

# Scoring weights
scoring_weights = {
    "skills": 0.35,
    "impact": 0.25,
    "trajectory": 0.25,
    "experience": 0.15
}

# Thresholds
critical_skill_min_match = 0.7
job_hopping_max_tenure_years = 1.5
ai_detection_high_threshold = 70.0
```

---

## Testing

```bash
# Run all tests
pytest backend/tests/

# Run with coverage
pytest --cov=backend backend/tests/

# Run specific module tests
pytest backend/tests/test_skill_evaluator.py
```

---

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Production Setup

```bash
# Start services
ollama serve &
gunicorn -w 4 -k uvicorn.workers.UvicornWorker api.main:app &
npm run start
```

---

## Support

- **Technical Issues**: engineering@company.internal
- **Feature Requests**: product@company.internal
- **Security**: security@company.internal

---

## License

Internal use only. Not for distribution.

---

*TrajectIQ v1.0.0*
