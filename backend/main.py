"""
TrajectIQ AI Backend - Main FastAPI Application
"""
import time
import json
from contextlib import asynccontextmanager
from typing import Optional, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi import UploadFile, File
from pydantic import BaseModel

from loguru import logger

# Import AI engines
from ai_engines.pipeline import AIResumePipeline, get_pipeline, PipelineResult
from ai_engines.docling_parser.engine import ParsedResume
from ai_engines.resume_parser.engine import ExtractedResume
from ai_engines.nlp_engine.engine import NLPAnalysisResult
from ai_engines.skill_extraction.engine import SkillExtractionResult
from ai_engines.semantic_matching.engine import SemanticMatchResult

# Import API routers
from api.vector_search import router as vector_search_router

# Configure logging
import sys
logger.add(sys.stdout, colorize=True)

# Create FastAPI app
app = FastAPI(
    title="TrajectIQ AI Backend",
    description="Advanced Resume Intelligence API",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(vector_search_router)


# ============================================
# Request/Response Models
# ============================================

class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: float


class ParseResumeRequest(BaseModel):
    file_name: Optional[str] = None
    job_description: Optional[str] = None
    required_skills: Optional[List[str]] = None


class ParseResumeResponse(BaseModel):
    success: bool
    result: Optional[dict] = None
    error: Optional[str] = None
    processing_time_ms: int


class BatchParseRequest(BaseModel):
    resumes: List[dict]
    job_description: Optional[str] = None
    required_skills: Optional[List[str]] = None


class BatchParseResponse(BaseModel):
    success: bool
    results: List[dict]
    total_processed: int
    total_time_ms: int


class SemanticMatchRequest(BaseModel):
    job_description: str
    resume_text: str
    required_skills: Optional[List[str]] = None


class SkillExtractRequest(BaseModel):
    text: str


# ============================================
# Startup/Shutdown
# ============================================

@app.on_event("startup")
async def startup_event():
    """Initialize AI pipeline on startup"""
    logger.info("Starting TrajectIQ AI Backend...")
    try:
        pipeline = await get_pipeline()
        logger.info("AI Pipeline initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize AI Pipeline: {e}")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down TrajectIQ AI Backend...")


# ============================================
# Health Endpoints
# ============================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        version="2.0.0",
        timestamp=time.time(),
    )


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "TrajectIQ AI Backend",
        "version": "2.0.0",
        "endpoints": [
            "/health",
            "/parse",
            "/parse/batch",
            "/skills/extract",
            "/semantic/match",
        ]
    }


# ============================================
# Resume Parsing Endpoints
# ============================================

@app.post("/parse", response_model=ParseResumeResponse)
async def parse_resume(
    file: UploadFile = File(...),
    job_description: Optional[str] = None,
    required_skills: Optional[str] = None,
):
    """
    Parse a resume file through the complete AI pipeline.
    
    Supports: PDF, DOCX, DOC, TXT
    
    Returns structured data including:
    - Contact information
    - Skills (technical and soft)
    - Work experience
    - Education
    - NLP entities
    - Semantic match score (if job description provided)
    """
    start_time = time.time()
    
    try:
        # Read file
        file_bytes = await file.read()
        file_name = file.filename or "resume.pdf"
        
        # Parse required skills
        skills_list = None
        if required_skills:
            try:
                skills_list = json.loads(required_skills)
            except:
                skills_list = [s.strip() for s in required_skills.split(',')]
        
        # Process through pipeline
        pipeline = await get_pipeline()
        result = await pipeline.process_resume(
            file_bytes=file_bytes,
            file_name=file_name,
            job_description=job_description,
            required_skills=skills_list,
        )
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        return ParseResumeResponse(
            success=True,
            result=result.dict(),
            processing_time_ms=processing_time_ms,
        )
        
    except Exception as e:
        logger.error(f"Parse error: {e}")
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        return ParseResumeResponse(
            success=False,
            error=str(e),
            processing_time_ms=processing_time_ms,
        )


@app.post("/parse/batch", response_model=BatchParseResponse)
async def parse_resume_batch(request: BatchParseRequest):
    """
    Parse multiple resumes in batch.
    
    Each resume in the batch should be a dict with:
    - file_path: optional path to file
    - file_bytes: optional raw bytes (base64 encoded)
    - file_name: original filename
    """
    start_time = time.time()
    
    try:
        pipeline = await get_pipeline()
        results = await pipeline.process_batch(
            request.resumes,
            request.job_description,
            request.required_skills,
        )
        
        total_time_ms = int((time.time() - start_time) * 1000)
        
        return BatchParseResponse(
            success=True,
            results=results,
            total_processed=len(results),
            total_time_ms=total_time_ms,
        )
        
    except Exception as e:
        logger.error(f"Batch parse error: {e}")
        total_time_ms = int((time.time() - start_time) * 1000)
        
        return BatchParseResponse(
            success=False,
            results=[],
            total_processed=0,
            total_time_ms=total_time_ms,
        )


# ============================================
# Skill Extraction Endpoint
# ============================================

@app.post("/skills/extract")
async def extract_skills(request: SkillExtractRequest):
    """
    Extract skills from text using SkillNER.
    
    Returns categorized skills:
    - Programming languages
    - Frameworks
    - Tools
    - Soft skills
    """
    from ai_engines.skill_extraction.engine import get_skill_extractor
    
    try:
        extractor = await get_skill_extractor()
        result = await extractor.extract_skills(request.text)
        
        return {
            "success": True,
            "skills": [s.dict() for s in result.skills],
            "total_skills": result.total_skills,
            "hard_skills": result.hard_skills,
            "soft_skills": result.soft_skills,
            "programming_languages": result.programming_languages,
            "frameworks": result.frameworks,
            "categories": result.categories,
            "processing_time_ms": result.processing_time_ms,
        }
        
    except Exception as e:
        logger.error(f"Skill extraction error: {e}")
        return {
            "success": False,
            "error": str(e),
        }


# ============================================
# Semantic Matching Endpoint
# ============================================

@app.post("/semantic/match")
async def semantic_match(request: SemanticMatchRequest):
    """
    Compute semantic similarity between job description and resume.
    
    Returns:
    - similarity_score: 0.0 to 1.0
    - matched_keywords
    - section scores
    """
    from ai_engines.semantic_matching.engine import get_semantic_engine
    
    try:
        engine = await get_semantic_engine()
        result = await engine.match_resume_to_job(
            request.job_description,
            request.resume_text,
            required_skills=request.required_skills,
        )
        
        return {
            "success": True,
            "similarity_score": result.similarity_score,
            "matched_keywords": result.matched_keywords,
            "title_similarity": result.title_similarity,
            "skills_similarity": result.skills_similarity,
            "processing_time_ms": result.processing_time_ms,
        }
        
    except Exception as e:
        logger.error(f"Semantic match error: {e}")
        return {
            "success": False,
            "error": str(e),
        }


# ============================================
# NLP Analysis Endpoint
# ============================================

@app.post("/nlp/analyze")
async def nlp_analyze(text: str):
    """
    Analyze text using spaCy NLP.
    
    Extracts:
    - Named entities (ORG, PERSON, GPE, DATE, LOC)
    - Job titles
    - Organizations
    """
    from ai_engines.nlp_engine.engine import get_nlp_engine
    
    try:
        engine = await get_nlp_engine()
        result = await engine.analyze(text)
        
        return {
            "success": True,
            "entities": [e.dict() for e in result.entities],
            "job_titles": result.job_titles,
            "organizations": result.organizations,
            "locations": result.locations,
            "processing_time_ms": result.processing_time_ms,
        }
        
    except Exception as e:
        logger.error(f"NLP analysis error: {e}")
        return {
            "success": False,
            "error": str(e),
        }


# ============================================
# Scoring Endpoint
# ============================================

class ScoreRequest(BaseModel):
    """Request for resume scoring"""
    job_description: str
    resume_text: str
    required_skills: List[str]
    experience_years_required: Optional[int] = 0
    education_level: Optional[str] = None


@app.post("/score")
async def score_resume(request: ScoreRequest):
    """
    Calculate comprehensive resume score.
    
    Scoring components:
    - SDI (Skills & Domain Intelligence): 40%
    - CSIG (Career & Stability Indicators): 15%
    - IAE (Impact & Achievements Evidence): 20%
    - CTA (Cultural & Team Alignment): 15%
    - ERR (Education & Role Relevance): 10%
    """
    try:
        pipeline = await get_pipeline()
        result = await pipeline.process_resume(
            file_bytes=request.resume_text.encode(),
            file_name="resume.txt",
            job_description=request.job_description,
            required_skills=request.required_skills,
        )
        
        # Calculate final score
        final_score = 0.0
        if result.semantic_score is not None:
            final_score = result.semantic_score * 100
        elif result.skill_match_percentage is not None:
            final_score = result.skill_match_percentage
        else:
            final_score = 65.0  # Default fallback
        
        return {
            "success": True,
            "final_score": round(final_score, 1),
            "grade": _get_grade(final_score),
            "skill_match_percentage": result.skill_match_percentage,
            "matched_skills": result.matched_skills,
            "missing_skills": result.missing_skills,
            "semantic_score": result.semantic_score,
            "processing_time_ms": result.processing_time_ms,
        }
        
    except Exception as e:
        logger.error(f"Scoring error: {e}")
        return {
            "success": False,
            "error": str(e),
        }


def _get_grade(score: float) -> str:
    """Convert score to grade"""
    if score >= 90:
        return "A"
    elif score >= 80:
        return "B"
    elif score >= 70:
        return "C"
    elif score >= 60:
        return "D"
    return "F"


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
