"""
Semantic Matching Module
Keyword-based matching for lightweight deployment
Optional: Sentence Transformers for advanced semantic matching
"""
import asyncio
import json
import re
from typing import Dict, List, Any, Optional, Tuple
from loguru import logger
from pydantic import BaseModel

# Try to import sentence transformers (optional, requires 1GB+ RAM)
try:
    from sentence_transformers import SentenceTransformer
    import numpy as np
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    logger.info("Semantic matching using keyword-based mode (sentence-transformers not installed)")


class SemanticMatchResult(BaseModel):
    """Result of semantic matching"""
    similarity_score: float  # 0.0 to 1.0
    job_embedding: List[float] = []
    resume_embedding: List[float] = []
    
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
    mode: str = "keyword"  # "keyword" or "semantic"


class SemanticMatchingEngine:
    """
    Semantic matching using keyword-based or Sentence Transformers.
    Compares job descriptions with candidate resumes.
    """
    
    DEFAULT_MODEL = "all-MiniLM-L6-v2"
    
    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or self.DEFAULT_MODEL
        self.model = None
        self._initialized = False
        self._use_semantic = False
    
    async def initialize(self):
        """Initialize the matching engine"""
        if self._initialized:
            return
        
        # Check if sentence transformers is available
        if SENTENCE_TRANSFORMERS_AVAILABLE:
            try:
                logger.info(f"Loading sentence transformer model: {self.model_name}")
                self.model = SentenceTransformer(self.model_name)
                self._use_semantic = True
                logger.info("Semantic matching initialized (transformer mode)")
            except Exception as e:
                logger.warning(f"Failed to load sentence transformer: {e}")
                logger.info("Using keyword-based matching")
                self._use_semantic = False
        else:
            logger.info("Semantic matching initialized (keyword mode)")
            self._use_semantic = False
        
        self._initialized = True
    
    def _extract_keywords(self, text: str) -> set:
        """Extract keywords from text"""
        if not text:
            return set()
        
        # Convert to lowercase
        text = text.lower()
        
        # Remove special characters but keep spaces
        text = re.sub(r'[^a-z0-9\s]', ' ', text)
        
        # Split into words
        words = text.split()
        
        # Remove common stop words
        stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
            'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
            'used', 'using', 'use', 'this', 'that', 'these', 'those', 'it', 'its',
            'we', 'our', 'you', 'your', 'he', 'she', 'they', 'them', 'their', 'i', 'me', 'my'
        }
        
        keywords = set()
        for word in words:
            if len(word) > 2 and word not in stop_words:
                keywords.add(word)
        
        return keywords
    
    def _keyword_similarity(self, text1: str, text2: str) -> Tuple[float, List[str]]:
        """Calculate keyword-based similarity between two texts"""
        keywords1 = self._extract_keywords(text1)
        keywords2 = self._extract_keywords(text2)
        
        if not keywords1 or not keywords2:
            return 0.0, []
        
        # Find matching keywords
        matched = keywords1.intersection(keywords2)
        
        # Calculate Jaccard similarity
        union = keywords1.union(keywords2)
        similarity = len(matched) / len(union) if union else 0.0
        
        # Boost similarity for more matches
        if len(matched) > 5:
            similarity = min(1.0, similarity + 0.1)
        if len(matched) > 10:
            similarity = min(1.0, similarity + 0.1)
        
        return similarity, list(matched)
    
    def _get_embedding_semantic(self, text: str) -> List[float]:
        """Get embedding using sentence transformers"""
        if not self._use_semantic or self.model is None:
            return []
        
        try:
            import numpy as np
            embedding = self.model.encode(text)
            return embedding.tolist()
        except Exception as e:
            logger.error(f"Embedding error: {e}")
            return []
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        if not vec1 or not vec2:
            return 0.0
        
        try:
            import numpy as np
            v1 = np.array(vec1)
            v2 = np.array(vec2)
            
            dot_product = np.dot(v1, v2)
            norm1 = np.linalg.norm(v1)
            norm2 = np.linalg.norm(v2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            return float(dot_product / (norm1 * norm2))
        except Exception as e:
            logger.error(f"Similarity calculation error: {e}")
            return 0.0
    
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
        
        if self._use_semantic:
            job_embedding = self._get_embedding_semantic(job_description)
            resume_embedding = self._get_embedding_semantic(resume_text)
            return self._cosine_similarity(job_embedding, resume_embedding)
        else:
            similarity, _ = self._keyword_similarity(job_description, resume_text)
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
        
        job_embedding = []
        resume_embedding = []
        overall_similarity = 0.0
        mode = "keyword"
        
        if self._use_semantic:
            # Use semantic matching
            job_embedding = self._get_embedding_semantic(job_description)
            resume_embedding = self._get_embedding_semantic(resume_text)
            overall_similarity = self._cosine_similarity(job_embedding, resume_embedding)
            mode = "semantic"
        else:
            # Use keyword matching
            overall_similarity, matched_keywords = self._keyword_similarity(job_description, resume_text)
        
        # Match keywords (for both modes)
        matched_keywords = []
        job_words = set(job_description.lower().split())
        resume_words = set(resume_text.lower().split())
        matched_keywords = list(job_words.intersection(resume_words))[:20]
        
        # Skills similarity if provided
        skills_similarity = None
        if required_skills:
            skills_text = ' '.join(required_skills)
            if self._use_semantic:
                skills_embedding = self._get_embedding_semantic(skills_text)
                resume_skills_embedding = self._get_embedding_semantic(resume_text)
                skills_similarity = self._cosine_similarity(skills_embedding, resume_skills_embedding)
            else:
                skills_similarity, _ = self._keyword_similarity(skills_text, resume_text)
        
        processing_time_ms = int((asyncio.get_event_loop().time() - start_time) * 1000)
        
        return SemanticMatchResult(
            similarity_score=overall_similarity,
            job_embedding=job_embedding,
            resume_embedding=resume_embedding,
            title_similarity=None,
            skills_similarity=skills_similarity,
            experience_similarity=None,
            education_similarity=None,
            matched_keywords=matched_keywords,
            highlight_sections={},
            processing_time_ms=processing_time_ms,
            mode=mode,
        )
    
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
        
        results = []
        for i, resume in enumerate(resumes):
            similarity = await self.compute_similarity(job_description, resume)
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
