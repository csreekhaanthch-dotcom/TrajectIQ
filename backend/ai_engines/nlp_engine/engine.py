"""
spaCy NLP Engine Module
Named Entity Recognition,Job Title Detection
Organization Detection
Skill Phrase Extraction
"""
import asyncio
import json
from typing import Dict, List, Any, Optional
from loguru import logger
from pydantic import BaseModel

try:
    import spacy
    from spacy.matcher import Matcher
    from spacy.tokens import Span
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False
    logger.warning("spaCy not available. Install with: pip install spacy")


class NLPEntity(BaseModel):
    """NLP extracted entity"""
    type: str  # ORG, PERSON, GPE, JOB_TITLE, DATE, LOC
    text: str
    start_char: int
    end_char: int
    label: Optional[str] = None
    confidence: float = 1.0


class NLPAnalysisResult(BaseModel):
    """Result of NLP analysis"""
    entities: List[NLPEntity]
    job_titles: List[str]
    organizations: List[str]
    locations: List[str]
    dates: List[str]
    skills_phrases: List[str]
    
    # Full analysis text
    processed_text: str
    processing_time_ms: int


class NLPEngine:
    """
    Advanced NLP processing using spaCy.
    """
    
    # Job title patterns for matching
    JOB_TITLE_PATTERNS = [
        r'(?:(?:senior|junior|lead|principal|staff|chief|head)\s+)?(?:software|frontend|backend|full[\s-]?stack|data|devops|security|qa|test|android|ios|mobile|web|systems|platform|solutions|cloud|backend|frontend)\s*(?:engineer|developer|architect|scientist|analyst|specialist|consultant|administrator|manager|director|lead|head|chief)',
        r'(?:product|project|engineering|technical|platform|data|software|quality assurance|qa|test)\s*(?:manager|lead|director|head|chief)',
        r'(?:technical|tech|principal|senior|junior|staff)\s*(?:architect|engineer|developer|analyst|scientist|consultant)',
    ]
    
    def __init__(self, model_name: str = "en_core_web_lg"):
        self.nlp = None
        self.matcher = None
        self._initialized = False
        self._model_name = model_name
    
    async def initialize(self):
        """Initialize spaCy model"""
        if not SPACY_AVAILABLE:
            logger.warning("spaCy not available, using fallback NLP")
            return
            
        if self._initialized:
            return
            
        try:
            logger.info(f"Loading spaCy model: {self._model_name}")
            self.nlp = spacy.load(self._model_name)
            self._setup_matchers()
            self._initialized = True
            logger.info("spaCy NLP engine initialized successfully")
        except Exception as e:
            logger.error(f"Failed to load spaCy model: {e}")
            self._initialized = False
    
    def _setup_matchers(self):
        """Setup custom matchers for job titles"""
        if not self.nlp:
            return
            
        self.matcher = Matcher(self.nlp.vocab)
        
        # Add job title patterns
        for i in range(len(self.JOB_TITLE_PATTERNS)):
            pattern_name = f"JOB_TITLE_{i}"
            self.matcher.add(pattern_name, [{"LOWER": {"TEXT": self.JOB_TITLE_PATTERNS[i].lower()}}])
    
    async def analyze(self, text: str) -> NLPAnalysisResult:
        """
        Perform comprehensive NLP analysis on text.
        
        Args:
            text: Text to analyze
            
        Returns:
            NLPAnalysisResult with extracted entities
        """
        start_time = asyncio.get_event_loop().time()
        
        # Ensure initialized
        await self.initialize()
        
        entities = []
        job_titles = []
        organizations = []
        locations = []
        dates = []
        skills_phrases = []
        
        try:
            if SPACY_AVAILABLE and self.nlp:
                # Process with spaCy
                doc = self.nlp(text)
                
                # Extract named entities
                for ent in doc.ents:
                    entity = NLPEntity(
                        type=ent.label_,
                        text=ent.text,
                        start_char=ent.start_char,
                        end_char=ent.end_char,
                        confidence=getattr(ent, 'score_', 1.0) or 1.0
                    )
                    entities.append(entity)
                    
                    if ent.label_ == "ORG":
                        organizations.append(ent.text)
                    elif ent.label_ == "GPE" or ent.label_ == "LOC":
                        locations.append(ent.text)
                    elif ent.label_ == "DATE":
                        dates.append(ent.text)
                
                # Match job titles
                matches = self.matcher(doc)
                for match_id, start, end in matches:
                    span = doc[start:end]
                    job_titles.append(span.text)
                
                # Extract noun chunks for skill phrases
                for chunk in doc.noun_chunks:
                    if len(chunk.text.split()) >= 1:  # Multi-word phrases
                        skills_phrases.append(chunk.text)
                
            else:
                # Fallback: simple regex-based extraction
                entities = self._fallback_extraction(text)
                organizations = [e.text for e in entities if e.type == "ORG"]
                locations = [e.text for e in entities if e.type in ("GPE", "LOC")]
                dates = [e.text for e in entities if e.type == "DATE"]
        
        except Exception as e:
            logger.error(f"NLP analysis failed: {e}")
            # Use fallback extraction on error
            entities = self._fallback_extraction(text)
            organizations = [e.text for e in entities if e.type == "ORG"]
            locations = [e.text for e in entities if e.type in ("GPE", "LOC")]
            dates = [e.text for e in entities if e.type == "DATE"]
        
        processing_time = int((asyncio.get_event_loop().time() - start_time) * 1000)
        
        return NLPAnalysisResult(
            entities=entities,
            job_titles=list(set(job_titles)),
            organizations=list(set(organizations)),
            locations=list(set(locations)),
            dates=dates,
            skills_phrases=list(set(skills_phrases))[:20],  # Limit to 20
            processed_text=text,
            processing_time_ms=processing_time
        )
    
    def _fallback_extraction(self, text: str) -> List[NLPEntity]:
        """Fallback NLP extraction using regex"""
        import re
        
        entities = []
        
        # Email pattern
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        for match in re.finditer(email_pattern, text):
            entities.append(NLPEntity(
                type="EMAIL",
                text=match.group(),
                start_char=match.start(),
                end_char=match.end(),
                confidence=0.9
            ))
        
        # Phone pattern
        phone_pattern = r'\b(?:\+?1[-.]?)?\(?[0-9]{3}\)?[-.]?[0-9]{3}[-.]?[0-9]{4}\b'
        for match in re.finditer(phone_pattern, text):
            entities.append(NLPEntity(
                type="PHONE",
                text=match.group(),
                start_char=match.start(),
                end_char=match.end(),
                confidence=0.8
            ))
        
        # URL pattern
        url_pattern = r'https?://[^\s<>"{}|\\^`[\]]+'
        for match in re.finditer(url_pattern, text):
            entities.append(NLPEntity(
                type="URL",
                text=match.group(),
                start_char=match.start(),
                end_char=match.end(),
                confidence=0.95
            ))
        
        # Date patterns
        date_patterns = [
            r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b',
            r'\b\d{1,2}/\d{1,2}/\d{2,4}\b',
            r'\b\d{4}\b',
        ]
        for pattern in date_patterns:
            for match in re.finditer(pattern, text):
                entities.append(NLPEntity(
                    type="DATE",
                    text=match.group(),
                    start_char=match.start(),
                    end_char=match.end(),
                    confidence=0.7
                ))
        
        return entities
    
    async def extract_entities(self, text: str, entity_types: Optional[List[str]] = None) -> List[NLPEntity]:
        """
        Extract specific entity types from text.
        
        Args:
            text: Text to extract from
            entity_types: List of entity types to extract (e.g., ['ORG', 'PERSON'])
            
        Returns:
            List of extracted entities
        """
        result = await self.analyze(text)
        
        if entity_types:
            return [e for e in result.entities if e.type in entity_types]
        return result.entities
    
    async def extract_job_titles(self, text: str) -> List[str]:
        """
        Extract job titles from text.
        
        Args:
            text: Text to extract from
            
        Returns:
            List of detected job titles
        """
        result = await self.analyze(text)
        return result.job_titles
    
    async def extract_organizations(self, text: str) -> List[str]:
        """
        Extract organization names from text.
        
        Args:
            text: Text to extract from
            
        Returns:
            List of detected organizations
        """
        result = await self.analyze(text)
        return result.organizations


    async def close(self):
        """Cleanup resources"""
        pass


# Singleton instance
_nlp_engine_instance: Optional[NLPEngine] = None


async def get_nlp_engine(model_name: str = "en_core_web_lg") -> NLPEngine:
    """Get or create NLP engine singleton"""
    global _nlp_engine_instance
    
    if _nlp_engine_instance is None:
        _nlp_engine_instance = NLPEngine(model_name)
        await _nlp_engine_instance.initialize()
    
    return _nlp_engine_instance
