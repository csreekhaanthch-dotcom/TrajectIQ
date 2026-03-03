#!/usr/bin/env python3
"""
TrajectIQ - Quick Evaluation Script
====================================
Run this script to evaluate a candidate resume.

Usage:
    python run.py                    # Interactive mode
    python run.py resume.txt         # Evaluate a file
"""

import sys
import os
import json

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from orchestration.pipeline import TrajectIQPipeline


def get_sample_resume():
    """Return sample resume for testing"""
    return """
SARAH CHEN
Senior Software Engineer | San Francisco, CA
sarah.chen@email.com | (555) 123-4567

PROFESSIONAL SUMMARY
Senior Software Engineer with 8+ years of experience building scalable distributed systems. 
Expert in Python, Kubernetes, and cloud-native architectures. Led teams of 5-10 engineers.

EXPERIENCE
TechCorp Inc. | Senior Software Engineer | 2020 - Present
- Led microservices architecture serving 10M+ users
- Reduced API latency by 40% through optimization
- Managed a team of 5 engineers

StartupXYZ | Software Engineer | 2016 - 2020  
- Built core platform from ground up
- Implemented CI/CD pipelines reducing deployment time by 60%

EDUCATION
Stanford University | MS Computer Science | 2014-2016
UC Berkeley | BS Computer Science | 2010-2014

SKILLS
Python, Kubernetes, PostgreSQL, AWS, Docker, Redis
Leadership, Communication, Problem Solving
"""


def get_sample_job_requirements():
    """Return sample job requirements"""
    return {
        "job_id": "JOB-2024-001",
        "job_title": "Senior Software Engineer",
        "department": "Engineering",
        "required_skills": [
            {
                "name": "Python",
                "category": "Programming",
                "minimum_years": 5,
                "minimum_proficiency": "advanced",
                "weight": 1.0,
                "is_critical": True
            },
            {
                "name": "Kubernetes",
                "category": "Infrastructure",
                "minimum_years": 2,
                "minimum_proficiency": "intermediate",
                "weight": 0.8,
                "is_critical": True
            },
            {
                "name": "AWS",
                "category": "Cloud",
                "minimum_years": 3,
                "minimum_proficiency": "intermediate",
                "weight": 0.6,
                "is_critical": False
            },
            {
                "name": "PostgreSQL",
                "category": "Database",
                "minimum_years": 3,
                "minimum_proficiency": "intermediate",
                "weight": 0.5,
                "is_critical": False
            }
        ],
        "preferred_skills": [
            {"name": "Docker", "category": "Infrastructure", "minimum_years": 2, "weight": 0.3},
            {"name": "Redis", "category": "Database", "minimum_years": 1, "weight": 0.2}
        ]
    }


def print_result(result):
    """Pretty print evaluation result"""
    print("\n" + "="*60)
    print("📊 TRAJECTIQ EVALUATION RESULTS")
    print("="*60)
    
    print(f"\n📋 Status: {result.get('status', 'unknown')}")
    print(f"⏱️  Execution Time: {result.get('execution_time_ms', 0):.1f}ms")
    print(f"✅ Modules Completed: {', '.join(result.get('modules_completed', []))}")
    
    if 'final_scoring' in result:
        fs = result['final_scoring']
        score = fs['final_score']
        
        print("\n" + "-"*60)
        print("🎯 FINAL SCORE")
        print("-"*60)
        print(f"   Score: {score['normalized_score']}/100")
        print(f"   Grade: {score['grade']}")
        print(f"   Tier:  {score['tier'].replace('_', ' ').title()}")
        
        rec = fs.get('recommendation', {})
        print(f"\n   Recommendation: {rec.get('decision', 'N/A').replace('_', ' ').upper()}")
        print(f"   Confidence: {rec.get('confidence', 0) * 100:.0f}%")
        
        if rec.get('key_strengths'):
            print(f"\n   ✨ Key Strengths:")
            for s in rec['key_strengths'][:3]:
                print(f"      • {s}")
        
        if rec.get('key_concerns'):
            print(f"\n   ⚠️  Key Concerns:")
            for c in rec['key_concerns'][:3]:
                print(f"      • {c}")
    
    if 'skill_evaluation' in result:
        se = result['skill_evaluation']
        cs = se.get('critical_skills_status', {})
        print("\n" + "-"*60)
        print("🔧 SKILLS EVALUATION")
        print("-"*60)
        print(f"   Score: {se['overall_score']['normalized_score']}/100")
        print(f"   Critical Skills Met: {cs.get('critical_skills_met_count', 0)}/{cs.get('critical_skills_count', 0)}")
        if cs.get('unmet_critical_skills'):
            print(f"   Missing: {', '.join(cs['unmet_critical_skills'])}")
    
    if 'impact_evaluation' in result:
        ie = result['impact_evaluation']
        print("\n" + "-"*60)
        print("📈 IMPACT SCORE")
        print("-"*60)
        print(f"   Score: {ie['overall_impact_score']['normalized_score']}/100")
    
    if 'trajectory_analysis' in result:
        ta = result['trajectory_analysis']
        print("\n" + "-"*60)
        print("🔄 CAREER TRAJECTORY")
        print("-"*60)
        print(f"   Score: {ta['trajectory_score']['overall_score']}/100")
        print(f"   Pattern: {ta['progression_analysis'].get('pattern', 'N/A')}")
        print(f"   Stability: {ta['stability_indicators'].get('stability_score', 'N/A')}")
    
    if 'ai_detection' in result:
        ai = result['ai_detection']
        print("\n" + "-"*60)
        print("🤖 AI DETECTION")
        print("-"*60)
        print(f"   AI Likelihood: {ai['overall_assessment']['ai_likelihood_score']}%")
        print(f"   Risk Level: {ai['overall_assessment']['risk_level']}")
    
    print("\n" + "="*60)


def main():
    """Main entry point"""
    print("\n" + "="*60)
    print("🚀 TRAJECTIQ - Intelligence-Driven Hiring")
    print("="*60)
    
    # Check for resume file argument
    resume_path = None
    
    if len(sys.argv) > 1:
        resume_path = sys.argv[1]
        if not os.path.exists(resume_path):
            print(f"\n❌ Error: File not found: {resume_path}")
            sys.exit(1)
    else:
        # Use sample resume
        print("\n📝 No resume file provided. Using sample resume...")
        resume_content = get_sample_resume()
        resume_path = "temp_resume.txt"
        with open(resume_path, 'w') as f:
            f.write(resume_content)
    
    print(f"\n📄 Resume: {resume_path}")
    print("📋 Job: Senior Software Engineer")
    
    # Get job requirements
    job_requirements = get_sample_job_requirements()
    
    # Initialize pipeline and evaluate
    print("\n⏳ Running evaluation...")
    
    try:
        pipeline = TrajectIQPipeline()
        result = pipeline.evaluate_candidate(
            resume_path=resume_path,
            job_requirements=job_requirements
        )
        
        print_result(result)
        
    except Exception as e:
        print(f"\n❌ Error during evaluation: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    finally:
        # Clean up temp file
        if resume_path == "temp_resume.txt" and os.path.exists(resume_path):
            os.remove(resume_path)


if __name__ == "__main__":
    main()
