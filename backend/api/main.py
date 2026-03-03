"""
TrajectIQ API Server
====================
FastAPI-based REST API for TrajectIQ.
"""

import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import config
from core.database import DatabaseManager
from orchestration.pipeline import TrajectIQPipeline


# Create FastAPI app
app = FastAPI(
    title="TrajectIQ API",
    description="Intelligence-Driven Hiring Platform API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
db = DatabaseManager()


# ==================== Pydantic Models ====================

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str


class JobRequirements(BaseModel):
    job_id: str
    job_title: str
    department: Optional[str] = None
    required_skills: List[Dict[str, Any]] = []
    preferred_skills: Optional[List[Dict[str, Any]]] = None
    skill_synonyms: Optional[Dict[str, List[str]]] = None


class EvaluateRequest(BaseModel):
    resume_path: str
    job_requirements: JobRequirements
    candidate_id: Optional[str] = None


class CandidateResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class StatsResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None


# ==================== Routes ====================

@app.get("/", response_class=JSONResponse)
async def root():
    """Root endpoint with API information."""
    return {
        "name": "TrajectIQ API",
        "version": "1.0.0",
        "description": "Intelligence-Driven Hiring Platform",
        "docs": "/docs"
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow().isoformat() + "Z",
        version=config.version
    )


# ==================== Candidates ====================

@app.get("/api/candidates", response_model=CandidateResponse)
async def list_candidates(
    job_id: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    """List all candidates with optional filtering."""
    try:
        candidates = db.get_candidates(job_id=job_id, limit=limit, offset=offset)
        
        # Get scores for each candidate
        for candidate in candidates:
            if candidate.get("candidate_id"):
                evaluations = db.get_evaluations(candidate["candidate_id"])
                candidate["evaluations"] = evaluations
        
        return CandidateResponse(success=True, data=candidates)
    except Exception as e:
        return CandidateResponse(success=False, error=str(e))


@app.get("/api/candidates/{candidate_id}", response_model=CandidateResponse)
async def get_candidate(candidate_id: str):
    """Get a specific candidate by ID."""
    try:
        candidate = db.get_candidate(candidate_id)
        
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        # Get evaluations
        evaluations = db.get_evaluations(candidate_id)
        candidate["evaluations"] = evaluations
        
        return CandidateResponse(success=True, data=candidate)
    except HTTPException:
        raise
    except Exception as e:
        return CandidateResponse(success=False, error=str(e))


@app.post("/api/evaluate", response_model=CandidateResponse)
async def evaluate_candidate(request: EvaluateRequest):
    """Evaluate a new candidate."""
    try:
        pipeline = TrajectIQPipeline()
        
        result = pipeline.evaluate_candidate(
            resume_path=request.resume_path,
            job_requirements=request.job_requirements.dict(),
            candidate_id=request.candidate_id
        )
        
        return CandidateResponse(success=True, data=result)
    except Exception as e:
        return CandidateResponse(success=False, error=str(e))


@app.post("/api/evaluate/upload", response_model=CandidateResponse)
async def evaluate_upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    job_requirements: str = Form(...),
    candidate_id: Optional[str] = Form(None)
):
    """Evaluate a candidate with uploaded resume file."""
    try:
        # Save uploaded file
        upload_dir = Path(config.data_path) / "uploads"
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = upload_dir / f"{candidate_id or 'candidate'}_{file.filename}"
        
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Parse job requirements
        job_req = json.loads(job_requirements)
        
        # Evaluate
        pipeline = TrajectIQPipeline()
        result = pipeline.evaluate_candidate(
            resume_path=str(file_path),
            job_requirements=job_req,
            candidate_id=candidate_id
        )
        
        return CandidateResponse(success=True, data=result)
    except Exception as e:
        return CandidateResponse(success=False, error=str(e))


# ==================== Jobs ====================

@app.get("/api/jobs", response_model=CandidateResponse)
async def list_jobs(limit: int = 100):
    """List all jobs."""
    try:
        jobs = []
        # In production, implement job listing in database
        return CandidateResponse(success=True, data=jobs)
    except Exception as e:
        return CandidateResponse(success=False, error=str(e))


@app.get("/api/jobs/{job_id}", response_model=CandidateResponse)
async def get_job(job_id: str):
    """Get job details."""
    try:
        job = db.get_job(job_id)
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return CandidateResponse(success=True, data=job)
    except HTTPException:
        raise
    except Exception as e:
        return CandidateResponse(success=False, error=str(e))


@app.get("/api/jobs/{job_id}/leaderboard", response_model=CandidateResponse)
async def get_job_leaderboard(job_id: str, limit: int = 50):
    """Get ranked candidates for a job."""
    try:
        pipeline = TrajectIQPipeline()
        leaderboard = pipeline.get_leaderboard(job_id, limit=limit)
        
        return CandidateResponse(success=True, data=leaderboard)
    except Exception as e:
        return CandidateResponse(success=False, error=str(e))


# ==================== Statistics ====================

@app.get("/api/stats", response_model=StatsResponse)
async def get_stats(job_id: Optional[str] = None):
    """Get evaluation statistics."""
    try:
        stats = db.get_statistics(job_id)
        return StatsResponse(success=True, data=stats)
    except Exception as e:
        return StatsResponse(success=False)


# ==================== Error Handlers ====================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": exc.detail}
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": "Internal server error"}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
