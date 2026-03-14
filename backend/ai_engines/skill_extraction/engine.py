"""
SkillNER Skill Extraction Module
Professional Skill Detection and Categorization
"""
import asyncio
import json
import re
import time
from typing import Dict, List, Any, Optional, Set, Tuple
from loguru import logger
from pydantic import BaseModel

try:
    from skillNer.skill_extractor_class import SkillExtractor
    from skillNer.general_params import SKILL_DB
    SKILLNER_AVAILABLE = True
except ImportError:
    SKILLNER_AVAILABLE = False
    logger.warning("SkillNER not available. Install with: pip install skillner")


class ExtractedSkill(BaseModel):
    """Skill extracted from resume"""
    name: str
    category: Optional[str] = None  # programming, framework, tool, soft_skill
    skill_type: Optional[str] = None  # hard, soft
    confidence: float = 1.0
    context: Optional[str] = None
    years_experience: Optional[int] = None
    proficiency: Optional[str] = None


class SkillExtractionResult(BaseModel):
    """Result of skill extraction"""
    skills: List[ExtractedSkill]
    total_skills: int
    hard_skills: List[str]
    soft_skills: List[str]
    programming_languages: List[str]
    frameworks: List[str]
    tools: List[str]
    
    # Categories
    categories: Dict[str, List[str]]
    
    # Processing metadata
    processing_time_ms: int


class SkillExtractorEngine:
    """
    Advanced skill extraction using SkillNER.
    """
    
    # Skill categories
    SKILL_CATEGORIES = {
        'programming_language': [
            'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'go', 'rust', 'kotlin', 'swift',
            'php', 'ruby', 'scala', 'perl', 'r', 'matlab', 'sql'
        ],
        'framework': [
            'django', 'flask', 'fastapi', 'spring', 'springboot', 'react', 'angular', 'vue', 'nodejs',
            'express', 'nextjs', 'nuxt', 'svelte', 'ember', 'backbone',
            'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'pandas', 'numpy',
        ],
        'cloud_platform': [
            'aws', 'amazon web services', 'azure', 'microsoft azure', 'gcp', 'google cloud',
            'heroku', 'digitalocean', 'vercel', 'netlify', 'cloudflare',
            'firebase', 'supabase',
        ],
        'database': [
            'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'elasticsearch',
            'dynamodb', 'cassandra', 'sqlite', 'oracle', 'sqlserver',
        ],
        'devops_tool': [
            'docker', 'kubernetes', 'k8s', 'jenkins', 'github actions', 'gitlab ci',
            'terraform', 'ansible', 'chef', 'puppet', 'helm',
            'prometheus', 'grafana', 'nginx', 'apache',
        ],
        'soft_skill': [
            'leadership', 'communication', 'teamwork', 'problem solving',
            'critical thinking', 'time management', 'project management',
            'agile', 'scrum', 'collaboration', 'presentation',
            'negotiation', 'mentoring', 'adaptability',
        ],
    }
    
    def __init__(self):
        self.extractor = None
        self._initialized = False
    
    async def initialize(self):
        """Initialize SkillNER"""
        if not SKILLNER_AVAILABLE:
            logger.warning("SkillNER not available, using fallback skill extraction")
            return
            
        if self._initialized:
            return
            
        try:
            self.extractor = SkillExtractor()
            self._initialized = True
            logger.info("SkillNER engine initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize SkillNER: {e}")
            self._initialized = False
    
    def _categorize_skill(self, skill: str) -> Tuple[Optional[str], Optional[str]]:
        """Categorize a skill"""
        skill_lower = skill.lower()
        
        for category, skills in self.SKILL_CATEGORIES.items():
            if skill_lower in [s.lower() for s in skills]:
                return category, skill
        
        return None, None
    
    async def extract_skills(
        self,
        text: str,
    ) -> SkillExtractionResult:
        """
        Extract skills from text.
        
        Args:
            text: Resume text
            
        Returns:
            SkillExtractionResult with categorized skills
        """
        start_time = time.time()
        
        # Ensure initialized
        await self.initialize()
        
        skills = []
        hard_skills = []
        soft_skills = []
        categories = {cat: [] for cat in self.SKILL_CATEGORIES.keys()}
        
        try:
            if SKILLNER_AVAILABLE and self.extractor:
                # Use SkillNER
                skills_found = self.extractor.annotate(text)
                
                for skill_name in skills_found:
                    category, skill_type = self._categorize_skill(skill_name)
                    
                    skill = ExtractedSkill(
                        name=skill_name,
                        category=category,
                        skill_type=skill_type,
                        confidence=0.9,
                    )
                    skills.append(skill)
                    
                    if skill_type == 'hard':
                        hard_skills.append(skill_name)
                    elif skill_type == 'soft':
                        soft_skills.append(skill_name)
                    
                    if category:
                        categories.setdefault(category, []).append(skill_name)
            else:
                # Fallback: Use keyword matching
                skills = self._fallback_skill_extraction(text)
                
            for skill in skills:
                category, skill_type = self._categorize_skill(skill.name)
                skill.category = category
                skill.skill_type = skill_type
            
        except Exception as e:
            logger.error(f"Skill extraction failed: {e}")
            skills = self._fallback_skill_extraction(text)
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        return SkillExtractionResult(
            skills=skills,
            total_skills=len(skills),
            hard_skills=hard_skills,
            soft_skills=soft_skills,
            programming_languages=categories.get('programming_language', []),
            frameworks=categories.get('framework', []),
            tools=categories.get('devops_tool', []) + categories.get('tool', []),
            categories=categories,
            processing_time_ms=processing_time_ms,
        )
    
    def _fallback_skill_extraction(self, text: str) -> List[ExtractedSkill]:
        """Fallback skill extraction using keyword matching"""
        skills = []
        text_lower = text.lower()
        
        # Technical skills
        tech_skills = [
            'python', 'java', 'javascript', 'typescript', 'react', 'angular', 'vue',
            'node', 'nodejs', 'django', 'flask', 'fastapi', 'spring',
            'docker', 'kubernetes', 'k8s', 'aws', 'azure', 'gcp',
            'sql', 'postgresql', 'mysql', 'mongodb', 'redis',
            'git', 'linux', 'tensorflow', 'pytorch', 'machine learning',
            'deep learning', 'data science', 'api', 'rest', 'graphql',
        ]
        
        for skill in tech_skills:
            if skill in text_lower:
                skills.append(ExtractedSkill(
                    name=skill.title(),
                    category=self._categorize_skill(skill)[0],
                    skill_type='hard',
                    confidence=0.8,
                ))
        
        return skills
    
    async def extract_from_resume(self, resume_text: str) -> Dict[str, Any]:
        """
        Extract skills from resume with full analysis.
        
        Args:
            resume_text: Resume text
            
        Returns:
            Dictionary with skills and analysis
        """
        result = await self.extract_skills(resume_text)
        
        # Group by category
        grouped = {}
        for skill in result.skills:
            cat = skill.category or 'other'
            if cat not in grouped:
                grouped[cat] = []
            grouped[cat].append(skill.name)
        
        return {
            'all_skills': [s.name for s in result.skills],
            'hard_skills': result.hard_skills,
            'soft_skills': result.soft_skills,
            'grouped': grouped,
            'stats': {
                'total': result.total_skills,
                'hard': len(result.hard_skills),
                'soft': len(result.soft_skills),
            }
        }


# Singleton instance
_skill_extractor_instance: Optional[SkillExtractorEngine] = None


async def get_skill_extractor() -> SkillExtractorEngine:
    """Get or create skill extractor singleton"""
    global _skill_extractor_instance
    
    if _skill_extractor_instance is None:
        _skill_extractor_instance = SkillExtractorEngine()
        await _skill_extractor_instance.initialize()
    
    return _skill_extractor_instance
