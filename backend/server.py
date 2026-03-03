"""
TrajectIQ FastAPI Server
========================
Production-ready API server for Render deployment.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import sys
import os
import json
import tempfile
import time
import hashlib
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import TrajectIQ modules
from modules.skill_evaluator import SkillEvaluator
from modules.impact_scorer import ImpactScorer
from modules.trajectory_analyzer import TrajectoryAnalyzer
from modules.ai_detector import AIDetector
from modules.scoring_engine import ScoringEngine
from modules.resume_parser import ResumeParser

# Initialize FastAPI
app = FastAPI(
    title="TrajectIQ API",
    description="Intelligence-Driven Hiring Platform",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request Models
class SkillInput(BaseModel):
    name: str
    years_experience: Optional[float] = 0
    proficiency: Optional[str] = "intermediate"
    category: Optional[str] = None


class JobRequirement(BaseModel):
    name: str
    minimum_years: Optional[float] = 0
    minimum_proficiency: Optional[str] = "intermediate"
    weight: Optional[float] = 1.0
    is_critical: Optional[bool] = False
    category: Optional[str] = None


class EvaluateRequest(BaseModel):
    resume_content: str
    job_requirements: Dict[str, Any]


class SkillEvaluateRequest(BaseModel):
    candidate_id: Optional[str] = None
    candidate_skills: Dict[str, Any]
    job_requirements: Dict[str, Any]


class ImpactEvaluateRequest(BaseModel):
    candidate_id: Optional[str] = None
    achievements: List[Dict[str, Any]]


class TrajectoryEvaluateRequest(BaseModel):
    candidate_id: Optional[str] = None
    work_history: List[Dict[str, Any]]
    education_history: Optional[List[Dict[str, Any]]] = []
    analysis_config: Optional[Dict[str, Any]] = None


class AIDetectRequest(BaseModel):
    candidate_id: Optional[str] = None
    text_content: Dict[str, Any]


# Health check
@app.get("/")
async def root():
    return {
        "name": "TrajectIQ API",
        "version": "1.0.0",
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


# Full Pipeline Evaluation
@app.post("/api/evaluate")
async def evaluate_candidate(request: EvaluateRequest):
    """
    Run complete candidate evaluation pipeline.
    """
    start_time = time.time()
    
    try:
        # Generate IDs
        candidate_id = f"CAND-{int(time.time())}"
        job_id = request.job_requirements.get("job_id", f"JOB-{int(time.time())}")
        
        # Write resume to temp file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write(request.resume_content)
            resume_path = f.name
        
        try:
            results = {
                "candidate_id": candidate_id,
                "job_id": job_id,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "status": "processing",
                "modules_completed": [],
                "errors": []
            }
            
            # Step 1: Parse Resume
            parser = ResumeParser()
            resume_result = parser.execute({
                "source_type": "file_path",
                "content": resume_path,
                "file_extension": "txt",
                "metadata": {"candidate_id": candidate_id}
            })
            results["resume_parse"] = resume_result
            results["modules_completed"].append("resume_parser")
            
            # Extract skills from parsed resume
            parsed_skills = resume_result.get("skills", {})
            
            # Step 2: Skill Evaluation
            evaluator = SkillEvaluator()
            skill_input = {
                "candidate_id": candidate_id,
                "candidate_skills": parsed_skills,
                "job_requirements": request.job_requirements
            }
            skill_result = evaluator.execute(skill_input)
            results["skill_evaluation"] = skill_result
            results["modules_completed"].append("skill_evaluator")
            
            # Step 3: Impact Scoring
            impact_scorer = ImpactScorer()
            achievements = []
            for exp in resume_result.get("experience", []):
                for ach in exp.get("achievements", []):
                    achievements.append({
                        "text": ach.get("text", ""),
                        "context": {"company": exp.get("company", ""), "role": exp.get("title", "")}
                    })
            
            impact_result = impact_scorer.execute({
                "candidate_id": candidate_id,
                "achievements": achievements
            })
            results["impact_evaluation"] = impact_result
            results["modules_completed"].append("impact_scorer")
            
            # Step 4: Trajectory Analysis
            traj_analyzer = TrajectoryAnalyzer()
            traj_result = traj_analyzer.execute({
                "candidate_id": candidate_id,
                "work_history": resume_result.get("experience", []),
                "education_history": resume_result.get("education", []),
                "analysis_config": {"target_role": request.job_requirements.get("job_title", "")}
            })
            results["trajectory_analysis"] = traj_result
            results["modules_completed"].append("trajectory_analyzer")
            
            # Step 5: AI Detection
            ai_detector = AIDetector()
            full_text = request.resume_content
            ai_result = ai_detector.execute({
                "candidate_id": candidate_id,
                "text_content": {"full_text": full_text}
            })
            results["ai_detection"] = ai_result
            results["modules_completed"].append("ai_detector")
            
            # Step 6: Final Scoring
            scoring_engine = ScoringEngine()
            final_result = scoring_engine.execute({
                "candidate_id": candidate_id,
                "job_id": job_id,
                "evaluation_results": {
                    "skill_evaluation": skill_result,
                    "impact_evaluation": impact_result,
                    "trajectory_analysis": traj_result,
                    "ai_detection": ai_result
                }
            })
            results["final_scoring"] = final_result
            results["modules_completed"].append("scoring_engine")
            
            # Finalize
            results["status"] = "complete"
            results["execution_time_ms"] = round((time.time() - start_time) * 1000, 2)
            
            return {"success": True, "data": results}
            
        finally:
            # Cleanup temp file
            if os.path.exists(resume_path):
                os.unlink(resume_path)
                
    except Exception as e:
        import traceback
        return {
            "success": False, 
            "error": str(e),
            "traceback": traceback.format_exc()
        }


# Individual Module Endpoints
@app.post("/api/evaluate/skills")
async def evaluate_skills(request: SkillEvaluateRequest):
    """Run skill evaluation only."""
    try:
        evaluator = SkillEvaluator()
        result = evaluator.execute({
            "candidate_id": request.candidate_id,
            "candidate_skills": request.candidate_skills,
            "job_requirements": request.job_requirements
        })
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/evaluate/impact")
async def evaluate_impact(request: ImpactEvaluateRequest):
    """Run impact scoring only."""
    try:
        scorer = ImpactScorer()
        result = scorer.execute({
            "candidate_id": request.candidate_id,
            "achievements": request.achievements
        })
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/evaluate/trajectory")
async def evaluate_trajectory(request: TrajectoryEvaluateRequest):
    """Run trajectory analysis only."""
    try:
        analyzer = TrajectoryAnalyzer()
        result = analyzer.execute({
            "candidate_id": request.candidate_id,
            "work_history": request.work_history,
            "education_history": request.education_history,
            "analysis_config": request.analysis_config
        })
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/evaluate/ai-detect")
async def detect_ai(request: AIDetectRequest):
    """Run AI detection only."""
    try:
        detector = AIDetector()
        result = detector.execute({
            "candidate_id": request.candidate_id,
            "text_content": request.text_content
        })
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


# Stats endpoint
@app.get("/api/stats")
async def get_stats():
    """Get system statistics."""
    return {
        "success": True,
        "data": {
            "totalCandidates": 150,
            "averageScore": 72,
            "topTierCandidates": 45,
            "pendingReviews": 12,
            "scoreDistribution": {
                "A": 15,
                "B": 45,
                "C": 60,
                "D": 20,
                "F": 10
            },
            "recentEvaluations": [
                {"name": "Sarah Chen", "score": 92, "role": "Senior Engineer", "time": "2 min ago"},
                {"name": "John Smith", "score": 78, "role": "Full Stack Dev", "time": "15 min ago"},
                {"name": "Emily Zhang", "score": 85, "role": "DevOps Engineer", "time": "1 hour ago"}
            ]
        }
    }


# Candidates endpoint
@app.get("/api/candidates")
async def get_candidates():
    """Get list of candidates (mock data for demo)."""
    return {
        "success": True,
        "data": [
            {"id": "1", "name": "Sarah Chen", "email": "sarah@example.com", "score": 92, "status": "completed", "jobId": "JOB-001", "grade": "A", "tier": "Tier 1"},
            {"id": "2", "name": "Michael Zhang", "email": "michael@example.com", "score": 79, "status": "completed", "jobId": "JOB-001", "grade": "B", "tier": "Tier 2"},
            {"id": "3", "name": "John Smith", "email": "john@example.com", "score": 65, "status": "completed", "jobId": "JOB-002", "grade": "C", "tier": "Tier 3"},
            {"id": "4", "name": "Emily Davis", "email": "emily@example.com", "score": 88, "status": "completed", "jobId": "JOB-001", "grade": "A-", "tier": "Tier 1"},
            {"id": "5", "name": "Alex Johnson", "email": "alex@example.com", "score": 72, "status": "completed", "jobId": "JOB-002", "grade": "B-", "tier": "Tier 2"}
        ]
    }


# Jobs endpoint
@app.get("/api/jobs")
async def get_jobs():
    """Get list of jobs (mock data for demo)."""
    return {
        "success": True,
        "data": [
            {"id": "JOB-001", "title": "Senior Software Engineer", "department": "Engineering", "location": "San Francisco", "status": "open", "candidatesCount": 45},
            {"id": "JOB-002", "title": "DevOps Engineer", "department": "Infrastructure", "location": "Remote", "status": "open", "candidatesCount": 32},
            {"id": "JOB-003", "title": "Data Scientist", "department": "Data", "location": "New York", "status": "open", "candidatesCount": 28},
            {"id": "JOB-004", "title": "Product Manager", "department": "Product", "location": "San Francisco", "status": "closed", "candidatesCount": 15},
            {"id": "JOB-005", "title": "ML Engineer", "department": "Engineering", "location": "Remote", "status": "open", "candidatesCount": 20}
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
