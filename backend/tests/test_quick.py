#!/usr/bin/env python3
"""
Quick Test Script for TrajectIQ
===============================
Tests basic functionality without pytest.
Run from the backend directory: python tests/test_quick.py
"""

import json
import sys
import os
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Change to backend directory for relative imports to work
os.chdir(backend_dir)

print("=" * 60)
print("TrajectIQ Quick Test")
print("=" * 60)
print(f"\nWorking directory: {os.getcwd()}")
print(f"Python path: {sys.path[0]}")

# Test 1: Import all modules
print("\n[1] Testing imports...")
try:
    from core.config import config
    from core.logger import get_logger
    from core.database import DatabaseManager
    from modules.resume_parser import ResumeParser
    from modules.skill_evaluator import SkillEvaluator
    from modules.impact_scorer import ImpactScorer
    from modules.trajectory_analyzer import TrajectoryAnalyzer
    from modules.ai_detector import AIDetector
    from modules.scoring_engine import ScoringEngine
    print("    ✓ All imports successful")
except Exception as e:
    print(f"    ✗ Import error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 2: Test Resume Parser
print("\n[2] Testing Resume Parser...")
try:
    parser = ResumeParser()
    
    result = parser.execute({
        "source_type": "raw_text",
        "content": """
        JOHN DOE
        Software Engineer
        john.doe@email.com | (555) 123-4567
        
        SUMMARY
        Senior software engineer with 8 years of Python experience.
        
        EXPERIENCE
        TechCorp Inc. | Senior Software Engineer | 2020 - Present
        - Reduced API latency by 40% through optimization
        - Led migration to microservices, improving deployment frequency by 10x
        
        SKILLS
        Python (Expert), Kubernetes (Advanced), PostgreSQL (Advanced)
        
        EDUCATION
        Stanford University | MS Computer Science | 2016 - 2018
        """,
        "metadata": {"candidate_id": "TEST-001"}
    })
    
    assert result["status"] in ["success", "partial"]
    assert "candidate_info" in result
    print(f"    ✓ Resume parsed successfully")
    print(f"    - Status: {result['status']}")
    print(f"    - Confidence: {result['confidence_score']:.2f}")
except Exception as e:
    print(f"    ✗ Resume Parser error: {e}")
    import traceback
    traceback.print_exc()

# Test 3: Test Skill Evaluator
print("\n[3] Testing Skill Evaluator...")
try:
    evaluator = SkillEvaluator()
    
    result = evaluator.execute({
        "candidate_id": "TEST-001",
        "candidate_skills": {
            "technical": [
                {"name": "Python", "years_experience": 8, "proficiency": "expert"},
                {"name": "Kubernetes", "years_experience": 4, "proficiency": "advanced"},
                {"name": "PostgreSQL", "years_experience": 6, "proficiency": "advanced"}
            ]
        },
        "job_requirements": {
            "job_id": "JOB-001",
            "required_skills": [
                {"name": "Python", "minimum_years": 5, "minimum_proficiency": "advanced", "is_critical": True},
                {"name": "Kubernetes", "minimum_years": 2, "minimum_proficiency": "intermediate", "is_critical": True}
            ]
        }
    })
    
    assert "overall_score" in result
    assert "skill_matches" in result
    print(f"    ✓ Skill evaluation complete")
    print(f"    - Score: {result['overall_score']['normalized_score']}")
    print(f"    - Critical skills met: {result['critical_skills_status']['all_critical_met']}")
except Exception as e:
    print(f"    ✗ Skill Evaluator error: {e}")
    import traceback
    traceback.print_exc()

# Test 4: Test Impact Scorer
print("\n[4] Testing Impact Scorer...")
try:
    scorer = ImpactScorer()
    
    result = scorer.execute({
        "candidate_id": "TEST-001",
        "achievements": [
            {
                "text": "Reduced API latency by 40% through optimization of database queries",
                "context": {"company": "TechCorp", "role": "Senior Engineer"},
                "claimed_metrics": [{"value": "40%", "unit": "reduction", "type": "percentage"}]
            }
        ]
    })
    
    assert "overall_impact_score" in result
    print(f"    ✓ Impact scoring complete")
    print(f"    - Score: {result['overall_impact_score']['normalized_score']}")
    print(f"    - Grade: {result['overall_impact_score']['grade']}")
except Exception as e:
    print(f"    ✗ Impact Scorer error: {e}")
    import traceback
    traceback.print_exc()

# Test 5: Test Trajectory Analyzer
print("\n[5] Testing Trajectory Analyzer...")
try:
    analyzer = TrajectoryAnalyzer()
    
    result = analyzer.execute({
        "candidate_id": "TEST-001",
        "work_history": [
            {"company": "StartupXYZ", "title": "Junior Engineer", "level": "junior", "start_date": "2016-06", "end_date": "2018-03"},
            {"company": "TechCorp", "title": "Software Engineer", "level": "mid", "start_date": "2018-04", "end_date": "2020-02"},
            {"company": "TechCorp", "title": "Senior Engineer", "level": "senior", "start_date": "2020-03", "is_current": True}
        ]
    })
    
    assert "trajectory_score" in result
    print(f"    ✓ Trajectory analysis complete")
    print(f"    - Score: {result['trajectory_score']['overall_score']}")
    print(f"    - Type: {result['trajectory_score']['trajectory_type']}")
except Exception as e:
    print(f"    ✗ Trajectory Analyzer error: {e}")
    import traceback
    traceback.print_exc()

# Test 6: Test AI Detector
print("\n[6] Testing AI Detector...")
try:
    detector = AIDetector()
    
    result = detector.execute({
        "candidate_id": "TEST-001",
        "text_content": {
            "full_text": "I built a real-time notification system that processes 5 million daily events. The system reduced latency from 500ms to 150ms.",
            "sections": {}
        }
    })
    
    assert "overall_assessment" in result
    print(f"    ✓ AI detection complete")
    print(f"    - AI Likelihood: {result['overall_assessment']['ai_likelihood_score']}")
    print(f"    - Risk Level: {result['overall_assessment']['risk_level']}")
except Exception as e:
    print(f"    ✗ AI Detector error: {e}")
    import traceback
    traceback.print_exc()

# Test 7: Test Scoring Engine
print("\n[7] Testing Scoring Engine...")
try:
    engine = ScoringEngine()
    
    result = engine.execute({
        "candidate_id": "TEST-001",
        "job_id": "JOB-001",
        "evaluation_results": {
            "skill_evaluation": {
                "overall_score": {"normalized_score": 85},
                "critical_skills_status": {"all_critical_met": True},
                "skill_depth_analysis": {"skill_depth_score": 80}
            },
            "impact_evaluation": {
                "overall_impact_score": {"normalized_score": 75, "confidence": 0.7}
            },
            "trajectory_analysis": {
                "trajectory_score": {"overall_score": 80, "momentum_score": 85},
                "progression_analysis": {"total_experience_years": 7},
                "stability_indicators": {"job_hopping_risk": "low"}
            },
            "ai_detection": {
                "overall_assessment": {"ai_likelihood_score": 25, "risk_level": "low"}
            }
        }
    })
    
    assert "final_score" in result
    assert "recommendation" in result
    print(f"    ✓ Scoring complete")
    print(f"    - Final Score: {result['final_score']['normalized_score']}")
    print(f"    - Grade: {result['final_score']['grade']}")
    print(f"    - Tier: {result['final_score']['tier']}")
    print(f"    - Recommendation: {result['recommendation']['decision']}")
except Exception as e:
    print(f"    ✗ Scoring Engine error: {e}")
    import traceback
    traceback.print_exc()

# Test 8: Test Database
print("\n[8] Testing Database...")
try:
    db = DatabaseManager()
    
    # Save a test candidate
    candidate_id = db.save_candidate({
        "candidate_id": "TEST-DB-001",
        "full_name": "Test Candidate",
        "email": "test@example.com"
    })
    
    # Retrieve the candidate
    candidate = db.get_candidate(candidate_id)
    
    assert candidate is not None
    assert candidate["email"] == "test@example.com"
    print(f"    ✓ Database operations working")
    print(f"    - Candidate ID: {candidate_id}")
except Exception as e:
    print(f"    ✗ Database error: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("Quick Test Complete!")
print("=" * 60)
