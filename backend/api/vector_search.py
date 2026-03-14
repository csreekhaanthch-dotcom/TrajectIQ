"""
TrajectIQ Vector Search API
Semantic Candidate Search & Intelligence

FastAPI Router for:
- Semantic candidate search
- Job-candidate matching
- Candidate recommendations
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import logging
import time
import asyncio
import json
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/search", tags=["Vector Search"])

# ============================================
# Request/Response Models
# ============================================

class CandidateSearchRequest(BaseModel):
    """Request model for semantic candidate search."""
    query: str = Field(..., description="Natural language search query", min_length=3)
    limit: int = Field(10, ge=1, le=100, description="Maximum number of results")
    threshold: float = Field(0.5, ge=0.0, le=1.0, description="Minimum similarity threshold")
    organization_id: Optional[str] = Field(None, description="Filter by organization")
    skills_filter: Optional[List[str]] = Field(None, description="Filter by required skills")
    experience_min: Optional[int] = Field(None, description="Minimum years of experience")
    experience_max: Optional[int] = Field(None, description="Maximum years of experience")


class CandidateMatch(BaseModel):
    """Matched candidate result."""
    candidate_id: str
    similarity_score: float = Field(..., ge=0.0, le=1.0)
    match_level: str  # "excellent", "high", "medium", "low"
    name: Optional[str] = None
    email: Optional[str] = None
    current_title: Optional[str] = None
    current_company: Optional[str] = None
    years_experience: Optional[int] = None
    skills: Optional[List[str]] = None
    highlights: Optional[List[str]] = None


class CandidateSearchResponse(BaseModel):
    """Response model for semantic candidate search."""
    success: bool
    query: str
    results: List[CandidateMatch]
    total_count: int
    search_time_ms: float
    model_used: str


class JobMatchRequest(BaseModel):
    """Request model for job-candidate matching."""
    job_description: str = Field(..., description="Job description text", min_length=50)
    required_skills: Optional[List[str]] = Field(None, description="Required skills")
    preferred_skills: Optional[List[str]] = Field(None, description="Preferred skills")
    experience_required: Optional[int] = Field(None, description="Required years of experience")
    limit: int = Field(10, ge=1, le=100)
    threshold: float = Field(0.5, ge=0.0, le=1.0)
    organization_id: Optional[str] = None


class RecommendRequest(BaseModel):
    """Request model for candidate recommendations."""
    job_description: str = Field(..., description="Job description", min_length=50)
    top_k: int = Field(10, ge=1, le=50, description="Number of recommendations")
    diversity_factor: float = Field(0.0, ge=0.0, le=1.0, description="Add diversity to results")
    organization_id: Optional[str] = None


# ============================================
# Embedding Engine Instance
# ============================================

_embedding_engine = None

def get_embedding_engine():
    """Get or create the embedding engine instance."""
    global _embedding_engine
    if _embedding_engine is None:
        from ai_engines.embedding_engine import get_embedding_engine as _get
        _embedding_engine = _get()
    return _embedding_engine


# ============================================
# Database Connection
# ============================================

async def get_candidates_with_embeddings(organization_id: Optional[str] = None):
    """
    Fetch candidates with their embeddings from the database.

    For SQLite (local): Uses JSON-stored embeddings
    For PostgreSQL (production): Uses pgvector
    """
    database_url = os.getenv("DATABASE_URL", "")

    # Check if using SQLite or PostgreSQL
    if database_url.startswith("file:"):
        # SQLite - use Prisma/Prisma-like query
        return await _get_candidates_sqlite(organization_id)
    else:
        # PostgreSQL with pgvector
        return await _get_candidates_postgres(organization_id)


async def _get_candidates_sqlite(organization_id: Optional[str] = None):
    """Fetch candidates from SQLite with JSON-stored embeddings."""
    # This would use Prisma client in production
    # For now, return empty list - will be populated by frontend API
    return []


async def _get_candidates_postgres(organization_id: Optional[str] = None):
    """Fetch candidates from PostgreSQL with pgvector."""
    try:
        import asyncpg
    except ImportError:
        logger.warning("[VectorSearch] asyncpg not installed")
        return []

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        return []

    try:
        conn = await asyncpg.connect(database_url)

        query = """
        SELECT
            c.id as candidate_id,
            c.first_name,
            c.last_name,
            c.email,
            c.current_title,
            c.current_company,
            c.years_experience,
            cv.resume_embedding,
            r.skills
        FROM candidates c
        LEFT JOIN candidate_vectors cv ON c.id = cv.candidate_id
        LEFT JOIN resumes r ON c.id = r.candidate_id
        WHERE cv.resume_embedding IS NOT NULL
        """

        if organization_id:
            query += " AND c.organization_id = $1"
            rows = await conn.fetch(query + " ORDER BY c.created_at DESC", organization_id)
        else:
            rows = await conn.fetch(query + " ORDER BY c.created_at DESC")

        await conn.close()

        results = []
        for row in rows:
            # Convert vector to list
            embedding = list(row['resume_embedding']) if row['resume_embedding'] else None

            # Parse skills from JSON
            skills = []
            if row['skills']:
                try:
                    skills_data = json.loads(row['skills'])
                    skills = [s.get('name', s) if isinstance(s, dict) else s for s in skills_data]
                except:
                    pass

            results.append({
                'candidate_id': str(row['candidate_id']),
                'name': f"{row['first_name']} {row['last_name']}",
                'email': row['email'],
                'current_title': row['current_title'],
                'current_company': row['current_company'],
                'years_experience': row['years_experience'],
                'embedding': embedding,
                'skills': skills[:10]  # Top 10 skills
            })

        return results

    except Exception as e:
        logger.error(f"[VectorSearch] Database error: {e}")
        return []


# ============================================
# Semantic Search Endpoints
# ============================================

@router.post("/candidates", response_model=CandidateSearchResponse)
async def semantic_candidate_search(request: CandidateSearchRequest):
    """
    Semantic Candidate Search

    Search candidates using natural language queries.
    Returns candidates ranked by semantic similarity.

    Example:
        Query: "Backend engineer with distributed systems experience"
        Returns: Candidates with relevant experience (even without exact keywords)
    """
    start_time = time.time()

    try:
        # Get embedding engine
        engine = get_embedding_engine()

        if not engine.is_available():
            raise HTTPException(
                status_code=503,
                detail="Embedding engine not available. Please ensure sentence-transformers is installed."
            )

        # Generate query embedding
        logger.info(f"[VectorSearch] Processing query: '{request.query}'")
        query_embedding = await run_in_threadpool(
            engine.generate_embedding,
            request.query
        )

        if query_embedding is None:
            raise HTTPException(status_code=500, detail="Failed to generate query embedding")

        # Fetch candidates with embeddings
        candidates = await get_candidates_with_embeddings(request.organization_id)

        if not candidates:
            # No candidates with embeddings - return empty results
            return CandidateSearchResponse(
                success=True,
                query=request.query,
                results=[],
                total_count=0,
                search_time_ms=(time.time() - start_time) * 1000,
                model_used=engine.model_name
            )

        # Compute similarities
        candidate_embeddings = [
            (c['candidate_id'], c['embedding'])
            for c in candidates
            if c.get('embedding')
        ]

        similar = await run_in_threadpool(
            engine.find_top_k_similar,
            query_embedding,
            candidate_embeddings,
            request.limit,
            request.threshold
        )

        # Build response with candidate details
        candidate_map = {c['candidate_id']: c for c in candidates}
        results = []

        for candidate_id, similarity in similar:
            candidate = candidate_map.get(candidate_id, {})

            # Determine match level
            if similarity >= 0.9:
                match_level = "excellent"
            elif similarity >= 0.8:
                match_level = "high"
            elif similarity >= 0.6:
                match_level = "medium"
            else:
                match_level = "low"

            # Generate highlights (keywords that matched)
            highlights = _extract_highlights(request.query, candidate)

            results.append(CandidateMatch(
                candidate_id=candidate_id,
                similarity_score=round(similarity, 4),
                match_level=match_level,
                name=candidate.get('name'),
                email=candidate.get('email'),
                current_title=candidate.get('current_title'),
                current_company=candidate.get('current_company'),
                years_experience=candidate.get('years_experience'),
                skills=candidate.get('skills'),
                highlights=highlights
            ))

        # Apply filters if specified
        if request.skills_filter:
            results = [
                r for r in results
                if r.skills and any(s.lower() in [sk.lower() for sk in r.skills] for s in request.skills_filter)
            ]

        if request.experience_min is not None:
            results = [r for r in results if r.years_experience and r.years_experience >= request.experience_min]

        if request.experience_max is not None:
            results = [r for r in results if r.years_experience and r.years_experience <= request.experience_max]

        search_time = (time.time() - start_time) * 1000

        logger.info(f"[VectorSearch] Found {len(results)} candidates in {search_time:.2f}ms")

        return CandidateSearchResponse(
            success=True,
            query=request.query,
            results=results[:request.limit],
            total_count=len(results),
            search_time_ms=round(search_time, 2),
            model_used=engine.model_name
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[VectorSearch] Search failed: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.post("/jobs/match")
async def match_candidates_to_job(request: JobMatchRequest):
    """
    Job-Candidate Matching

    Find the best candidates for a job description.
    Uses semantic similarity between job description and candidate resumes.
    """
    start_time = time.time()

    try:
        engine = get_embedding_engine()

        if not engine.is_available():
            raise HTTPException(
                status_code=503,
                detail="Embedding engine not available"
            )

        # Generate job description embedding
        logger.info("[VectorSearch] Generating job description embedding")
        job_embedding = await run_in_threadpool(
            engine.generate_embedding,
            request.job_description
        )

        if job_embedding is None:
            raise HTTPException(status_code=500, detail="Failed to generate job embedding")

        # Fetch candidates
        candidates = await get_candidates_with_embeddings(request.organization_id)

        if not candidates:
            return {
                "success": True,
                "results": [],
                "total_count": 0,
                "search_time_ms": (time.time() - start_time) * 1000
            }

        # Find similar candidates
        candidate_embeddings = [
            (c['candidate_id'], c['embedding'])
            for c in candidates
            if c.get('embedding')
        ]

        similar = await run_in_threadpool(
            engine.find_top_k_similar,
            job_embedding,
            candidate_embeddings,
            request.limit,
            request.threshold
        )

        # Build detailed results
        candidate_map = {c['candidate_id']: c for c in candidates}
        results = []

        for candidate_id, similarity in similar:
            candidate = candidate_map.get(candidate_id, {})

            # Calculate skill match if skills are provided
            skill_match = None
            if request.required_skills and candidate.get('skills'):
                candidate_skills_lower = [s.lower() for s in candidate['skills']]
                matched_skills = [s for s in request.required_skills if s.lower() in candidate_skills_lower]
                skill_match = len(matched_skills) / len(request.required_skills) * 100

            results.append({
                "candidate_id": candidate_id,
                "name": candidate.get('name'),
                "email": candidate.get('email'),
                "current_title": candidate.get('current_title'),
                "current_company": candidate.get('current_company'),
                "years_experience": candidate.get('years_experience'),
                "skills": candidate.get('skills'),
                "similarity_score": round(similarity, 4),
                "skill_match_percentage": round(skill_match, 1) if skill_match is not None else None,
                "match_level": "excellent" if similarity >= 0.9 else "high" if similarity >= 0.8 else "medium" if similarity >= 0.6 else "low"
            })

        search_time = (time.time() - start_time) * 1000

        logger.info(f"[VectorSearch] Matched {len(results)} candidates to job in {search_time:.2f}ms")

        return {
            "success": True,
            "results": results,
            "total_count": len(results),
            "search_time_ms": round(search_time, 2),
            "model_used": engine.model_name
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[VectorSearch] Job matching failed: {e}")
        raise HTTPException(status_code=500, detail=f"Matching failed: {str(e)}")


@router.post("/recommend/candidates")
async def recommend_candidates(request: RecommendRequest):
    """
    Intelligent Candidate Recommendations

    Get top candidates recommended for a job description.
    Includes diversity in results to show varied candidates.
    """
    start_time = time.time()

    try:
        engine = get_embedding_engine()

        if not engine.is_available():
            raise HTTPException(
                status_code=503,
                detail="Embedding engine not available"
            )

        # Generate embedding
        job_embedding = await run_in_threadpool(
            engine.generate_embedding,
            request.job_description
        )

        if job_embedding is None:
            raise HTTPException(status_code=500, detail="Failed to generate embedding")

        # Fetch candidates
        candidates = await get_candidates_with_embeddings(request.organization_id)

        if not candidates:
            return {
                "success": True,
                "recommendations": [],
                "diversity_applied": False
            }

        # Get initial top candidates
        candidate_embeddings = [
            (c['candidate_id'], c['embedding'])
            for c in candidates
            if c.get('embedding')
        ]

        top_candidates = await run_in_threadpool(
            engine.find_top_k_similar,
            job_embedding,
            candidate_embeddings,
            request.top_k * 2,  # Get more for diversity filtering
            0.4
        )

        # Apply diversity if requested
        if request.diversity_factor > 0:
            top_candidates = _apply_diversity(
                top_candidates,
                candidates,
                request.diversity_factor
            )

        # Build recommendations
        candidate_map = {c['candidate_id']: c for c in candidates}
        recommendations = []

        for candidate_id, similarity in top_candidates[:request.top_k]:
            candidate = candidate_map.get(candidate_id, {})

            recommendations.append({
                "rank": len(recommendations) + 1,
                "candidate_id": candidate_id,
                "name": candidate.get('name'),
                "email": candidate.get('email'),
                "current_title": candidate.get('current_title'),
                "current_company": candidate.get('current_company'),
                "years_experience": candidate.get('years_experience'),
                "skills": candidate.get('skills'),
                "similarity_score": round(similarity, 4),
                "recommendation_strength": "strong" if similarity >= 0.85 else "moderate" if similarity >= 0.7 else "weak",
                "match_reasons": _generate_match_reasons(request.job_description, candidate)
            })

        search_time = (time.time() - start_time) * 1000

        logger.info(f"[VectorSearch] Generated {len(recommendations)} recommendations in {search_time:.2f}ms")

        return {
            "success": True,
            "recommendations": recommendations,
            "diversity_applied": request.diversity_factor > 0,
            "search_time_ms": round(search_time, 2),
            "model_used": engine.model_name
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[VectorSearch] Recommendation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Recommendation failed: {str(e)}")


@router.get("/status")
async def vector_search_status():
    """
    Get the status of the vector search system.
    """
    try:
        engine = get_embedding_engine()
        stats = engine.get_stats()

        return {
            "success": True,
            "status": "available" if engine.is_available() else "unavailable",
            "stats": stats,
            "features": {
                "semantic_search": engine.is_available(),
                "job_matching": engine.is_available(),
                "recommendations": engine.is_available()
            }
        }
    except Exception as e:
        return {
            "success": False,
            "status": "error",
            "error": str(e)
        }


# ============================================
# Helper Functions
# ============================================

def _extract_highlights(query: str, candidate: Dict) -> List[str]:
    """Extract matching highlights from query and candidate data."""
    highlights = []
    query_words = set(query.lower().split())

    # Check title match
    if candidate.get('current_title'):
        title_words = set(candidate['current_title'].lower().split())
        matching = query_words & title_words
        if matching:
            highlights.append(f"Title matches: {', '.join(matching)}")

    # Check skills match
    if candidate.get('skills'):
        for skill in candidate['skills'][:5]:
            if skill.lower() in query.lower():
                highlights.append(f"Skill: {skill}")

    return highlights[:5]


def _apply_diversity(
    candidates: List[tuple],
    all_candidates: List[Dict],
    diversity_factor: float
) -> List[tuple]:
    """Apply diversity to results to show varied candidates."""
    if not candidates or diversity_factor == 0:
        return candidates

    candidate_map = {c['candidate_id']: c for c in all_candidates}

    # Group by company
    company_counts = {}
    diverse_results = []

    for candidate_id, score in candidates:
        candidate = candidate_map.get(candidate_id, {})
        company = candidate.get('current_company', 'Unknown')

        # Limit candidates from same company
        company_counts[company] = company_counts.get(company, 0) + 1

        if company_counts[company] <= 2:  # Max 2 from same company
            diverse_results.append((candidate_id, score))

        if len(diverse_results) >= len(candidates) // (1 + diversity_factor):
            break

    # Fill remaining with highest scores
    remaining = [c for c in candidates if c not in diverse_results]
    diverse_results.extend(remaining[:len(candidates) - len(diverse_results)])

    return diverse_results


def _generate_match_reasons(job_description: str, candidate: Dict) -> List[str]:
    """Generate reasons why a candidate matches a job."""
    reasons = []
    job_lower = job_description.lower()

    # Check skills
    if candidate.get('skills'):
        matched_skills = [s for s in candidate['skills'] if s.lower() in job_lower]
        if matched_skills:
            reasons.append(f"Has relevant skills: {', '.join(matched_skills[:3])}")

    # Check title
    if candidate.get('current_title'):
        title_words = candidate['current_title'].lower().split()
        if any(word in job_lower for word in title_words if len(word) > 3):
            reasons.append(f"Current role aligns: {candidate['current_title']}")

    # Check experience
    if candidate.get('years_experience'):
        if 'senior' in job_lower and candidate['years_experience'] >= 5:
            reasons.append("Has senior-level experience")
        elif 'junior' in job_lower and candidate['years_experience'] <= 3:
            reasons.append("Appropriate experience level")

    if not reasons:
        reasons.append("Semantically similar background")

    return reasons[:3]
