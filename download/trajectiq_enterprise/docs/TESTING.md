# TrajectIQ Enterprise - Testing Instructions

## Overview

This document provides comprehensive testing instructions for TrajectIQ Enterprise. Follow these procedures to verify all components are functioning correctly.

## Prerequisites

- Python 3.9+ installed
- All dependencies installed (`pip install -r requirements.txt`)
- RSA key pair generated (`python build.py --keys`)
- Test data available in `data/samples/`

## 1. Module Testing

### 1.1 Resume Parser Tests

```bash
# Run parser tests
cd /path/to/trajectiq_enterprise
python -m pytest src/tests/test_resume_parser.py -v

# Manual test
python -c "
from src.modules.scoring_engine import ResumeParser

parser = ResumeParser()

# Test with sample resume
with open('data/samples/sample_resume.txt', 'r') as f:
    result = parser.evaluate(f.read())

print('Parse Confidence:', result['confidence_score'])
print('Skills Found:', len(result['skills']['technical']))
print('Experience Entries:', len(result['experience']))
"
```

### 1.2 Skill Evaluator Tests

```bash
# Run evaluator tests
python -m pytest src/tests/test_skill_evaluator.py -v

# Manual test
python -c "
from src.modules.scoring_engine import SkillEvaluator

evaluator = SkillEvaluator()

candidate_skills = [
    {'name': 'Python', 'years_experience': 5, 'proficiency': 'advanced'},
    {'name': 'Kubernetes', 'years_experience': 3, 'proficiency': 'intermediate'}
]

job_requirements = [
    {'name': 'Python', 'classification': 'mission_critical', 'minimum_years': 3, 'is_critical': True},
    {'name': 'Kubernetes', 'classification': 'core', 'minimum_years': 2}
]

result = evaluator.evaluate(candidate_skills, job_requirements)

print('Overall Score:', result['normalized_score'])
print('Critical Skills Met:', result['critical_skills_met'])
print('Depth Index:', result['skill_depth_index'])
"
```

### 1.3 Impact Scorer Tests

```bash
python -c "
from src.modules.scoring_engine import ImpactScorer

scorer = ImpactScorer()

achievements = [
    {'text': 'Reduced infrastructure costs by 60%, saving $2M/year'},
    {'text': 'Led migration of 200+ microservices to Kubernetes'},
    {'text': 'Built ML platform serving 1B predictions daily'}
]

result = scorer.evaluate(achievements)

print('Impact Score:', result['overall_impact_score'])
print('Authenticity Score:', result['overall_authenticity_score'])
print('Quantified Count:', result['quantified_count'])
"
```

### 1.4 Trajectory Analyzer Tests

```bash
python -c "
from src.modules.scoring_engine import TrajectoryAnalyzer

analyzer = TrajectoryAnalyzer()

work_history = [
    {'company': 'Google', 'title': 'Staff Software Engineer', 'start_date': '2020', 'end_date': 'Present', 'is_current': True},
    {'company': 'StartupXYZ', 'title': 'Senior Engineer', 'start_date': '2015', 'end_date': '2020'},
    {'company': 'TechCorp', 'title': 'Software Engineer', 'start_date': '2012', 'end_date': '2015'}
]

result = analyzer.evaluate(work_history)

print('Overall Score:', result['overall_score'])
print('Trajectory Type:', result['trajectory_type'])
print('Job Hopping Risk:', result['job_hopping_risk'])
print('Management Experience:', result['management_experience'])
"
```

### 1.5 AI Detector Tests

```bash
python -c "
from src.modules.scoring_engine import AIDetector

detector = AIDetector()

test_text = '''
Experienced software engineer leveraging cutting-edge technologies to facilitate 
innovative solutions. Utilizing holistic approaches to implement robust systems 
with state-of-the-art paradigms for comprehensive synergy.
'''

result = detector.evaluate(test_text)

print('AI Likelihood:', result['ai_likelihood_score'])
print('Indicators:', result['indicators'])
print('Recommendation:', result['recommendation'])
"
```

### 1.6 Full Scoring Engine Tests

```bash
python -c "
from src.modules.scoring_engine import run_full_evaluation

resume_text = '''
JOHN SMITH
Senior Software Engineer

EXPERIENCE
Google | Staff Engineer | 2020 - Present
- Led migration of 200+ microservices to Kubernetes
- Reduced infrastructure costs by 60%
- Built ML platform serving 1B predictions

TechStartup | Senior Engineer | 2015 - 2020
- Built core platform from 0 to 5M users
- Led team of 8 engineers

SKILLS
Python (8 yrs, Expert), Kubernetes (5 yrs, Expert), AWS (7 yrs, Advanced)
'''

job_requirements = [
    {'name': 'Python', 'classification': 'mission_critical', 'minimum_years': 5, 'is_critical': True},
    {'name': 'Kubernetes', 'classification': 'mission_critical', 'minimum_years': 3, 'is_critical': True},
    {'name': 'AWS', 'classification': 'core', 'minimum_years': 3}
]

result = run_full_evaluation(resume_text, job_requirements)

final = result['final_scoring']
print('HIRING INDEX:', final['hiring_index']['overall_score'])
print('GRADE:', final['grade'])
print('TIER:', final['tier'])
print('RECOMMENDATION:', final['recommendation'])
"
```

## 2. Security Module Testing

### 2.1 RBAC Tests

```bash
python -c "
from src.security.rbac import RBACManager, Role

rbac = RBACManager()

# Create test user
try:
    user = rbac.create_user(
        username='test_recruiter',
        password='TestPassword123!',
        role=Role.RECRUITER,
        full_name='Test Recruiter'
    )
    print('User created:', user.username, user.role.value)
except Exception as e:
    print('User might already exist:', e)

# Test authentication
try:
    user, session = rbac.authenticate('test_recruiter', 'TestPassword123!')
    print('Authentication successful')
    print('Has evaluation permission:', rbac.has_permission(user, 'evaluations.run'))
except Exception as e:
    print('Auth failed:', e)
"
```

### 2.2 License System Tests

```bash
python -c "
from src.security.license import LicenseManager, MachineFingerprint

# Test machine fingerprint
fp = MachineFingerprint.generate()
print('Machine Fingerprint:', fp)

# Test license manager
lm = LicenseManager()
status, info = lm.validate_license()

if info:
    print('License Status:', status.value)
    print('Organization:', info.organization_name)
    print('Max Users:', info.max_users)
else:
    print('No active license')
"
```

### 2.3 Integrity Check Tests

```bash
python -c "
from src.security.integrity import check_integrity_on_startup, get_integrity_validator

# Run startup check
is_valid = check_integrity_on_startup()
print('Integrity Check Passed:', is_valid)

# Detailed check
validator = get_integrity_validator()
result = validator.validate_full()

print('Status:', result.status.value)
print('Debug Detected:', result.debug_detected)
print('VM Detected:', result.emulator_detected)
print('Warnings:', result.warnings)
"
```

## 3. Connector Testing

### 3.1 Email Connector Tests

```bash
# Note: Requires actual IMAP credentials for full test
python -c "
from src.connectors.email_connector import EmailConnector, EmailMessage

# Create connector (won't connect without credentials)
connector = EmailConnector(
    server='imap.gmail.com',
    port=993,
    username='test@example.com',
    password='test_password'
)

# Test resume detection
is_resume, confidence = connector._detect_resume(
    subject='Job Application - Software Engineer',
    body='I am applying for the position...',
    attachments=[]
)

print('Is Resume:', is_resume)
print('Confidence:', confidence)
"
```

### 3.2 ATS Connector Tests

```bash
python -c "
from src.connectors.ats_connector import get_ats_connector

# Note: Requires actual API key for full test
# connector = get_ats_connector('greenhouse', api_key='your_key')

# Test factory
print('Available providers: greenhouse, lever, workable')
"
```

## 4. AI Enhancement Tests

### 4.1 Ollama Connection Test

```bash
python -c "
from src.ai_enhancement.semantic_layer import OllamaProvider

provider = OllamaProvider(base_url='http://localhost:11434')
available = provider.is_available()

print('Ollama Available:', available)

if available:
    response = provider.generate('Say hello in JSON format.')
    print('Response:', response)
"
```

### 4.2 Semantic Enhancer Test

```bash
python -c "
from src.ai_enhancement.semantic_layer import create_ai_enhancer

# Test with AI off
enhancer = create_ai_enhancer(mode='off')
print('AI Enabled:', enhancer.is_enabled())

result = enhancer.enhance(
    parsed_resume={'skills': {}, 'experience': []},
    job_requirements={}
)

print('Enhanced:', result.enhanced)
print('Warnings:', result.warnings)
"
```

## 5. Database Tests

```bash
python -c "
from src.core.database import get_database

db = get_database()

# Test audit logging
audit_id = db.log_audit(
    action='test_action',
    user_id=1,
    details={'test': 'value'}
)
print('Audit Log ID:', audit_id)

# Test analytics logging
analytics_id = db.log_analytics(
    event_type='test_event',
    details={'metric': 100}
)
print('Analytics Log ID:', analytics_id)
"
```

## 6. Full Pipeline Integration Test

```bash
# Run complete integration test
python -c "
import json
from src.modules.scoring_engine import run_full_evaluation

# Load sample resume
with open('data/samples/sample_resume.txt', 'r') as f:
    resume = f.read()

# Load job requirements
with open('data/samples/job_requirements_senior_engineer.json', 'r') as f:
    requirements = json.load(f)

# Run evaluation
result = run_full_evaluation(resume, requirements['required_skills'])

# Print summary
print('=' * 60)
print('INTEGRATION TEST RESULTS')
print('=' * 60)

final = result['final_scoring']
print(f\"\"\"
Evaluation ID: {result['evaluation_id']}
Timestamp: {result['timestamp']}

HIRING INDEX: {final['hiring_index']['overall_score']}/100
GRADE: {final['grade']}
TIER: {final['tier']}
RECOMMENDATION: {final['recommendation']}

SKILL SCORE: {final['hiring_index']['skill_score']}/100
IMPACT SCORE: {final['hiring_index']['impact_score']}/100
TRAJECTORY SCORE: {final['hiring_index']['trajectory_score']}/100
AI SIGNAL: {final['hiring_index']['ai_signal']}%

KEY STRENGTHS:
\"\"\")
for s in final['hiring_index']['key_strengths'][:3]:
    print(f'  ✓ {s}')

print('\\nKEY CONCERNS:')
for c in final['hiring_index']['key_concerns'][:3]:
    print(f'  ⚠ {c}')

print('\\n' + '=' * 60)
print('TEST PASSED: Full pipeline executed successfully')
print('=' * 60)
"
```

## 7. UI Testing

### 7.1 Manual UI Test

```bash
# Launch UI for manual testing
cd /path/to/trajectiq_enterprise
python src/main.py --gui
```

**UI Test Checklist:**
- [ ] Login dialog appears
- [ ] Can create admin account
- [ ] Main window loads
- [ ] Can paste resume text
- [ ] Can enter job requirements
- [ ] Evaluation runs successfully
- [ ] Results display correctly
- [ ] Can navigate between tabs
- [ ] Analytics dashboard shows data
- [ ] Bias monitor displays correctly

## 8. Build Tests

### 8.1 Executable Build Test

```bash
# Build executable
python build.py --clean

# Verify output
ls -la dist/TrajectIQ.exe

# Test executable (Windows only)
# ./dist/TrajectIQ.exe
```

### 8.2 Installer Build Test

```bash
# Build installer (requires Inno Setup)
python build.py --installer

# Verify output
ls -la dist/TrajectIQ-Setup-*.exe
```

## 9. Performance Tests

### 9.1 Evaluation Speed Test

```bash
python -c "
import time
from src.modules.scoring_engine import run_full_evaluation

# Load test data
with open('data/samples/sample_resume.txt', 'r') as f:
    resume = f.read()

requirements = [{'name': 'Python', 'classification': 'core'}]

# Run 10 iterations
times = []
for i in range(10):
    start = time.time()
    run_full_evaluation(resume, requirements)
    times.append((time.time() - start) * 1000)

print(f'Average time: {sum(times)/len(times):.2f}ms')
print(f'Min time: {min(times):.2f}ms')
print(f'Max time: {max(times):.2f}ms')
"
```

## 10. Test Automation

### Run All Tests

```bash
# Run pytest with coverage
pytest src/tests/ -v --cov=src --cov-report=html

# View coverage report
# open htmlcov/index.html
```

### Test Script

Save as `run_all_tests.sh`:

```bash
#!/bin/bash
echo "Running TrajectIQ Enterprise Test Suite"
echo "========================================"

echo "1. Running module tests..."
python -m pytest src/tests/ -v

echo "2. Testing integrity checks..."
python -c "from src.security.integrity import check_integrity_on_startup; check_integrity_on_startup()"

echo "3. Testing database..."
python -c "from src.core.database import get_database; db = get_database(); print('Database OK')"

echo "4. Testing full pipeline..."
# Add full pipeline test command

echo "========================================"
echo "Test suite complete!"
```

## Support

For issues during testing, contact:
- Technical Support: support@trajectiq.com
- Security Issues: security@trajectiq.com
