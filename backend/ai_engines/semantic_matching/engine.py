"""
Semantic Matching Module
Sentence Transformers for Job-Resume Matching
"""
import asyncio
import json
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from loguru import logger
from pydantic import BaseModel

try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    logger.warning("Sentence Transformers not available. Install with: pip install sentence-transformers")


class SemanticMatchResult(BaseModel):
    """Result of semantic matching"""
    similarity_score: float  # 0.0 to 1.0
    job_embedding: List[float]
    resume_embedding: List[float]
    
    # Section scores
    title_similarity: Optional[float] = None
    skills_similarity: Optional[float] = None
    experience_similarity: Optional[float] = None
    education_similarity: Optional[float] = None
    
    # Matched phrases
    matched_keywords: List[str] = []
    highlight_sections: Dict[str, Any] = {}
    
    # Metadata
    processing_time_ms: int


class SemanticMatchingEngine:
    """
    Semantic matching using Sentence Transformers.
    Compares job descriptions with candidate resumes.
    """
    
    DEFAULT_MODEL = "all-MiniLM-L6-v2"
    
    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or self.DEFAULT_MODEL
        self.model = None
        self._initialized = False
    
    async def initialize(self):
        """Initialize the sentence transformer model"""
        if not SENTENCE_TRANSFORMERS_AVAILABLE:
            logger.warning("Sentence Transformers not available")
            return
            
        if self._initialized:
            return
            
        try:
            logger.info(f"Loading sentence transformer model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
            self._initialized = True
            logger.info(f"Sentence transformer initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize sentence transformer: {e}")
            self._initialized = False
    
    def _get_embedding(self, text: str) -> List[float]:
        """Get embedding for text"""
        if not self._initialized or self.model is None:
            # Return zero vector
            return [0.0] * 384  # Default dimension
        
        try:
            embedding = self.model.encode(text)
            return embedding.tolist()
        except Exception as e:
            logger.error(f"Embedding error: {e}")
            return [1.0] * 384
    
    def _cosine_similarity(
        self,
        vec1: List[float],
        vec2: List[float]
    ) -> float:
        """Calculate cosine similarity between two vectors"""
        vec1_np = np.array(vec1)
        vec2_np = np.array(vec2)
        
        dot_product = np.dot(vec1_np, vec2_np)
        norm1 = np.linalg.norm(vec1_np)
        norm2 = np.linalg.norm(vec2_np)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return dot_product / (norm1 * norm2)
    
    async def compute_similarity(
        self,
        job_description: str,
        resume_text: str,
    ) -> float:
        """
        Compute semantic similarity between job description and resume.
        
        Args:
            job_description: Job description text
            resume_text: Resume text
            
        Returns:
            Similarity score (0.0 to 1.0)
        """
        if not self._initialized:
            await self.initialize()
        
        job_embedding = self._get_embedding(job_description)
        resume_embedding = self._get_embedding(resume_text)
        
        similarity = self._cosine_similarity(job_embedding, resume_embedding)
        
        return similarity
    
    async def match_resume_to_job(
        self,
        job_description: str,
        resume_text: str,
        job_title: Optional[str] = None,
        required_skills: Optional[List[str]] = None,
    ) -> SemanticMatchResult:
        """
        Comprehensive matching of resume to job description.
        
        Args:
            job_description: Full job description
            resume_text: Resume text
            job_title: Optional job title for title matching
            required_skills: Optional list of required skills
            
        Returns:
            SemanticMatchResult with detailed analysis
        """
        start_time = asyncio.get_event_loop().time()
        
        # Ensure initialized
        if not self._initialized:
            await self.initialize()
        
        # Get embeddings
        job_embedding = self._get_embedding(job_description)
        resume_embedding = self._get_embedding(resume_text)
        
        # Overall similarity
        overall_similarity = self._cosine_similarity(job_embedding, resume_embedding)
        
        # Section-specific similarities
        title_similarity = None
        skills_similarity = None
        experience_similarity = None
        education_similarity = None
        
        # Match keywords
        matched_keywords = []
        job_words = set(job_description.lower().split())
        resume_words = set(resume_text.lower().split())
        matched_keywords = list(job_words.intersection(resume_words))[:20]
        
        # Highlight sections
        highlight_sections = {}
        
        # Extract and match skills if provided
        if required_skills:
            skills_text = ' '.join(required_skills)
            skills_embedding = self._get_embedding(skills_text)
            
            # Find skills section in resume
            skills_section = self._extract_skills_section(resume_text)
            if skills_section:
                resume_skills_embedding = self._get_embedding(skills_section)
                skills_similarity = self._cosine_similarity(
                    skills_embedding, resume_skills_embedding
                )
        
        processing_time_ms = int((asyncio.get_event_loop().time() - start_time) * 1000)
        
        return SemanticMatchResult(
            similarity_score=overall_similarity,
            job_embedding=job_embedding,
            resume_embedding=resume_embedding,
            title_similarity=title_similarity,
            skills_similarity=skills_similarity,
            experience_similarity=experience_similarity,
            education_similarity=education_similarity,
            matched_keywords=matched_keywords,
            highlight_sections=highlight_sections,
            processing_time_ms=processing_time_ms,
        )
    
    def _extract_skills_section(self, text: str) -> str:
        """Extract skills section from resume text"""
        skills_keywords = [
            'skills', 'technical skills', 'competencies', 'technologies',
            'programming', 'languages', 'frameworks', 'tools'
        ]
        
        text_lower = text.lower()
        for keyword in skills_keywords:
            if keyword in text_lower:
                # Find the section after this keyword
                idx = text_lower.find(keyword)
                if idx != -1:
                    # Get next 500 characters
                    return text[idx:idx+500]
        
        return ""
    
    async def batch_match(
        self,
        job_description: str,
        resumes: List[str],
    ) -> List[Tuple[int, float]]:
        """
        Match multiple resumes against a job description.
        
        Args:
            job_description: Job description
            resumes: List of resume texts
            
        Returns:
            List of (index, similarity_score) tuples
        """
        if not self._initialized:
            await self.initialize()
        
        # Get job embedding once
        job_embedding = self._get_embedding(job_description)
        
        results = []
        for i, resume in enumerate(resumes):
            resume_embedding = self._get_embedding(resume)
            similarity = self._cosine_similarity(job_embedding, resume_embedding)
            results.append((i, similarity))
        
        return results


# Singleton instance
_semantic_engine_instance: Optional[SemanticMatchingEngine] = None


async def get_semantic_engine(model_name: Optional[str] = None) -> SemanticMatchingEngine:
    """Get or create semantic engine singleton"""
    global _semantic_engine_instance
    
    if _semantic_engine_instance is None:
        _semantic_engine_instance = SemanticMatchingEngine(model_name)
        await _semantic_engine_instance.initialize()
    
    return _semantic_engine_instance
