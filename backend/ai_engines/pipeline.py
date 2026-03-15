"""
AI Pipeline Orchestrator
Coordinates all AI modules for resume processing
"""
import asyncio
import time
import json
from typing import Dict, List, Any, Optional
from loguru import logger
from pydantic import BaseModel

from ai_engines.docling_parser.engine import DoclingParser, ParsedResume
from ai_engines.resume_parser.engine import ResumeParserEngine, ExtractedResume
from ai_engines.nlp_engine.engine import NLPEngine, NLPAnalysisResult
from ai_engines.skill_extraction.engine import SkillExtractorEngine, SkillExtractionResult
from ai_engines.semantic_matching.engine import SemanticMatchingEngine, SemanticMatchResult


class PipelineResult(BaseModel):
    """Complete pipeline processing result"""
    # Extracted data
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    
    # Structured content
    summary: Optional[str] = None
    skills: List[str] = []
    experience: List[Dict[str, Any]] = []
    education: List[Dict[str, Any]] = []
    certifications: List[Dict[str, Any]] = []
    
    # AI Analysis
    entities: List[Dict[str, Any]] = []
    extracted_skills: List[str] = []
    semantic_score: Optional[float] = None
    
    # Match analysis
    skill_match_percentage: Optional[float] = None
    matched_skills: List[str] = []
    missing_skills: List[str] = []
    additional_skills: List[str] = []
    
    # Processing metadata
    processing_time_ms: int = 0
    confidence: float = 1.0
    
    # Error handling
    errors: List[str] = []


class AIResumePipeline:
    """
    Orchestrates the complete AI resume processing pipeline.
    
    Pipeline stages:
    1. Docling Document Parsing
    2. pyresparser Resume Extraction
    3. spaCy NLP Processing
    4. SkillNER Skill Extraction
    5. Sentence Transformers Semantic Matching (lazy - only when needed)
    """
    
    def __init__(self):
        self.docling_parser = DoclingParser()
        self.resume_parser = ResumeParserEngine()
        self.nlp_engine = NLPEngine()
        self.skill_extractor = SkillExtractorEngine()
        self.semantic_engine = None  # Lazy loaded - heavy memory usage
        
        self._initialized = False
    
    async def initialize(self):
        """Initialize lightweight pipeline components only"""
        if self._initialized:
            return
        
        logger.info("Initializing AI Resume Pipeline (lightweight mode)...")
        
        try:
            # Initialize lightweight components only
            # Do NOT initialize semantic_engine here - it uses too much memory
            await asyncio.gather(
                self.docling_parser.initialize(),
                self.resume_parser.initialize(),
                self.nlp_engine.initialize(),
                self.skill_extractor.initialize(),
            )
            
            self._initialized = True
            logger.info("AI Resume Pipeline initialized successfully (semantic matching lazy-loaded)")
        except Exception as e:
            logger.error(f"Failed to initialize pipeline: {e}")
            self._initialized = False
            raise
    
    async def _get_semantic_engine(self):
        """Lazy load semantic engine only when needed"""
        if self.semantic_engine is None:
            logger.info("Lazy loading semantic matching engine...")
            self.semantic_engine = SemanticMatchingEngine()
            await self.semantic_engine.initialize()
        return self.semantic_engine
    
    async def process_resume(
        self,
        file_path: Optional[str] = None,
        file_bytes: Optional[bytes] = None,
        file_name: Optional[str] = None,
        job_description: Optional[str] = None,
        required_skills: Optional[List[str]] = None,
    ) -> PipelineResult:
        """
        Process a resume through the complete AI pipeline.
        
        Args:
            file_path: Path to resume file
            file_bytes: Raw bytes of file
            file_name: Original filename
            job_description: Optional job description for matching
            required_skills: Optional required skills for matching
            
        Returns:
            PipelineResult with all extracted data
        """
        start_time = time.time()
        result = PipelineResult()
        
        try:
            # Stage 1: Docling Document Parsing
            logger.info("Stage 1: Docling Document Parsing")
            docling_result = await self.docling_parser.parse_resume(
                file_path=file_path,
                file_bytes=file_bytes,
                file_name=file_name,
            )
            
            # Merge Docling results
            result.name = docling_result.name
            result.email = docling_result.email
            result.phone = docling_result.phone
            result.location = docling_result.location
            result.summary = docling_result.summary
            result.skills = docling_result.skills
            result.experience = docling_result.experience
            result.education = docling_result.education
            result.certifications = docling_result.certifications
            
            # Get full text for other modules
            full_text = docling_result.full_text
            
        except Exception as e:
            logger.warning(f"Docling parsing failed: {e}, using fallback")
            result.errors.append(f"Docling parsing: {str(e)}")
            full_text = ""
        
        try:
            # Stage 2: pyresparser Resume Extraction
            logger.info("Stage 2: pyresparser Resume Extraction")
            pyresparser_result = await self.resume_parser.extract(
                file_path=file_path,
                file_bytes=file_bytes,
                file_name=file_name,
            )
            
            # Merge pyresparser results (only fill if not already set)
            if not result.name and pyresparser_result.name:
                result.name = pyresparser_result.name
            if not result.email and pyresparser_result.email:
                result.email = pyresparser_result.email
            if not result.phone and pyresparser_result.mobile_number:
                result.phone = pyresparser_result.mobile_number
            
            # Add skills from pyresparser
            if pyresparser_result.skills:
                result.skills = list(set(result.skills + pyresparser_result.skills))
            
            # Use full text from pyresparser if available
            if not full_text:
                full_text = self._build_text_from_extraction(pyresparser_result)
            
        except Exception as e:
            logger.warning(f"pyresparser extraction failed: {e}")
            result.errors.append(f"pyresparser: {str(e)}")
        
        # Ensure we have some text to work with
        if not full_text:
            full_text = self._build_text_from_result(result)
        
        try:
            # Stage 3: spaCy NLP Processing
            logger.info("Stage 3: spaCy NLP Processing")
            nlp_result = await self.nlp_engine.analyze(full_text)
            
            # Add NLP entities
            result.entities = [
                {
                    'type': e.type,
                    'text': e.text,
                    'confidence': e.confidence,
                }
                for e in nlp_result.entities
            ]
            
            # Add organizations from NLP
            if nlp_result.organizations:
                for org in nlp_result.organizations:
                    if org not in [e.get('company', '') for e in result.experience]:
                        result.experience.append({
                            'company': org,
                            'title': '',
                            'duration': '',
                        })
            
        except Exception as e:
            logger.warning(f"spaCy NLP failed: {e}")
            result.errors.append(f"spaCy NLP: {str(e)}")
        
        try:
            # Stage 4: SkillNER Skill Extraction
            logger.info("Stage 4: SkillNER Skill Extraction")
            skill_result = await self.skill_extractor.extract_skills(full_text)
            
            # Merge skills
            all_skills = set(result.skills)
            for skill in skill_result.skills:
                all_skills.add(skill.name)
            result.skills = list(all_skills)
            result.extracted_skills = [s.name for s in skill_result.skills]
            
            # Calculate skill match if required skills provided
            if required_skills:
                result = self._calculate_skill_match(
                    result, 
                    required_skills
                )
            
        except Exception as e:
            logger.warning(f"SkillNER extraction failed: {e}")
            result.errors.append(f"SkillNER: {str(e)}")
        
        try:
            # Stage 5: Semantic Matching (lazy loaded)
            if job_description:
                logger.info("Stage 5: Semantic Matching (lazy loading engine)")
                try:
                    semantic_engine = await self._get_semantic_engine()
                    semantic_result = await semantic_engine.match_resume_to_job(
                        job_description,
                        full_text,
                        required_skills=required_skills,
                    )
                    result.semantic_score = semantic_result.similarity_score
                except Exception as se:
                    # Semantic matching is optional - continue without it
                    logger.warning(f"Semantic matching unavailable: {se}")
                    result.errors.append(f"Semantic: {str(se)}")
                    # Use keyword-based similarity as fallback
                    result.semantic_score = self._fallback_similarity(job_description, full_text)
            else:
                logger.info("Stage 5: Skipped (no job description)")
            
        except Exception as e:
            logger.warning(f"Semantic matching failed: {e}")
            result.errors.append(f"Semantic: {str(e)}")
        
        # Calculate processing time
        result.processing_time_ms = int((time.time() - start_time) * 1000)
        
        # Calculate confidence based on errors
        if result.errors:
            result.confidence = max(0.5, 1.0 - len(result.errors) * 0.1)
        
        return result
    
    def _fallback_similarity(self, job_description: str, resume_text: str) -> float:
        """Fallback keyword-based similarity when semantic engine unavailable"""
        job_words = set(job_description.lower().split())
        resume_words = set(resume_text.lower().split())
        
        # Remove common words
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
        job_words -= stop_words
        resume_words -= stop_words
        
        if not job_words:
            return 0.0
        
        common = job_words.intersection(resume_words)
        return len(common) / len(job_words)
    
    def _build_text_from_extraction(self, extraction: ExtractedResume) -> str:
        """Build text from pyresparser extraction"""
        parts = []
        
        if extraction.name:
            parts.append(f"Name: {extraction.name}")
        if extraction.email:
            parts.append(f"Email: {extraction.email}")
        if extraction.mobile_number:
            parts.append(f"Phone: {extraction.mobile_number}")
        if extraction.degree:
            parts.append(f"Degree: {extraction.degree}")
        if extraction.college_name:
            parts.append(f"College: {extraction.college_name}")
        if extraction.total_experience:
            parts.append(f"Experience: {extraction.total_experience}")
        if extraction.skills:
            parts.append(f"Skills: {', '.join(extraction.skills)}")
        if extraction.companies:
            parts.append(f"Companies: {', '.join(extraction.companies)}")
        
        return '\n'.join(parts)
    
    def _build_text_from_result(self, result: PipelineResult) -> str:
        """Build text from pipeline result"""
        parts = []
        
        if result.name:
            parts.append(f"Name: {result.name}")
        if result.email:
            parts.append(f"Email: {result.email}")
        if result.phone:
            parts.append(f"Phone: {result.phone}")
        if result.summary:
            parts.append(f"Summary: {result.summary}")
        if result.skills:
            parts.append(f"Skills: {', '.join(result.skills)}")
        if result.experience:
            for exp in result.experience:
                exp_text = f"{exp.get('title', '')} at {exp.get('company', '')}"
                parts.append(exp_text)
        if result.education:
            for edu in result.education:
                edu_text = f"{edu.get('degree', '')} from {edu.get('institution', '')}"
                parts.append(edu_text)
        
        return '\n'.join(parts)
    
    def _calculate_skill_match(
        self,
        result: PipelineResult,
        required_skills: List[str],
    ) -> PipelineResult:
        """Calculate skill match percentage"""
        resume_skills_lower = {s.lower() for s in result.skills}
        required_skills_lower = {s.lower() for s in required_skills}
        
        # Matched skills
        matched = resume_skills_lower.intersection(required_skills_lower)
        result.matched_skills = list(matched)
        
        # Missing skills
        missing = required_skills_lower - resume_skills_lower
        result.missing_skills = list(missing)
        
        # Additional skills (in resume but not required)
        additional = resume_skills_lower - required_skills_lower
        result.additional_skills = list(additional)
        
        # Calculate percentage
        if required_skills:
            result.skill_match_percentage = (len(matched) / len(required_skills)) * 100
        
        return result
    
    async def process_batch(
        self,
        resumes: List[Dict[str, Any]],
        job_description: Optional[str] = None,
        required_skills: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Process multiple resumes in batch.
        
        Args:
            resumes: List of resume data dicts
            job_description: Optional job description
            required_skills: Optional required skills
            
        Returns:
            List of results with original index
        """
        await self.initialize()
        
        results = []
        
        for i in range(len(resumes)):
                resume_data = resumes[i]
                
                try:
                    result = await self.process_resume(
                        file_path=resume_data.get('file_path'),
                        file_bytes=resume_data.get('file_bytes'),
                        file_name=resume_data.get('file_name'),
                        job_description=job_description,
                        required_skills=required_skills,
                    )
                    results.append({
                        'index': i,
                        'success': True,
                        'result': result.dict(),
                    })
                except Exception as e:
                    logger.error(f"Failed to process resume {i}: {e}")
                    results.append({
                        'index': i,
                        'success': False,
                        'error': str(e),
                    })
        
        return results


# Singleton instance
_pipeline_instance: Optional[AIResumePipeline] = None


async def get_pipeline() -> AIResumePipeline:
    """Get or create pipeline singleton"""
    global _pipeline_instance
    
    if _pipeline_instance is None:
        _pipeline_instance = AIResumePipeline()
        await _pipeline_instance.initialize()
    
    return _pipeline_instance
