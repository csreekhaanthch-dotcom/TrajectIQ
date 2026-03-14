"""
Resume Data Extraction using pyresparser.
Extracts structured data from resume files.
"""
import asyncio
import json
import hashlib
import time
from typing import Dict, List, Any, Optional
from pathlib import Path
from loguru import logger
from pydantic import BaseModel

try:
    from pyresparser import ResumeParser
    PYRESPARSER_AVAILABLE = True
except ImportError:
    PYRESPARSER_AVAILABLE = False
    logger.warning("pyresparser not available. Install with: pip install pyresparser")


class ExtractedResume(BaseModel):
    """Structured resume data from pyresparser"""
    name: Optional[str] = None
    email: Optional[str] = None
    mobile_number: Optional[str] = None
    degree: Optional[str] = None
    college_name: Optional[str] = None
    graduation_year: Optional[str] = None
    graduation_month: Optional[str] = None
    total_experience: Optional[str] = None
    experience: List[Dict[str, Any]] = []
    skills: List[str] = []
    companies: List[str] = []
    achievements: List[str] = []
    
    # Metadata
    parse_time_ms: int = 0
    confidence: float = 1.0


class ResumeParserEngine:
    """
    Resume data extraction using pyresparser.
    """
    
    def __init__(self):
        self.parser = None
        self._initialized = False
    
    async def initialize(self):
        """Initialize pyresparser"""
        if not PYRESPARSER_AVAILABLE:
            logger.warning("pyresparser not available, using fallback extraction")
            return
            
        if self._initialized:
            return
            
        try:
            self.parser = ResumeParser()
            self._initialized = True
            logger.info("pyresparser engine initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize pyresparser: {e}")
            self._initialized = False
    
    async def extract(
        self,
        file_path: Optional[str] = None,
        file_bytes: Optional[bytes] = None,
        file_name: Optional[str] = None,
    ) -> ExtractedResume:
        """
        Extract resume data from file.
        
        Args:
            file_path: Path to resume file
            file_bytes: Raw bytes of the file
            file_name: Original filename
            
        Returns:
            ExtractedResume with structured data
        """
        start_time = time.time()
        
        try:
            if PYRESPARSER_AVAILABLE and self.parser:
                # Save file temporarily if bytes provided
                temp_file = None
                temp_file_path = None
                if file_bytes:
                    temp_file = Path(f"/tmp/resume_{int(time.time() * 1000000)}.pdf")
                    temp_file.write_bytes(file_bytes)
                    temp_file_path = str(temp_file)
                
                # Parse using pyresparser
                file_to_parse = temp_file_path if temp_file else file_path
                
                if not file_to_parse:
                    raise ValueError("No file path or bytes provided")
                
                data = self.parser.read(file_to_parse)
                
                result = ExtractedResume(
                    name=data.get('name'),
                    email=data.get('email'),
                    mobile_number=data.get('mobile_number'),
                    degree=data.get('degree'),
                    college_name=data.get('college_name'),
                    graduation_year=data.get('graduation_year'),
                    graduation_month=data.get('graduation_month'),
                    total_experience=data.get('total_experience'),
                    experience=data.get('experience', []),
                    skills=data.get('skills', []),
                    companies=data.get('companies', []),
                    achievements=data.get('achievements', []),
                    parse_time_ms=int((time.time() - start_time) * 1000),
                    confidence=0.9
                )
                
                # Cleanup temp file
                if temp_file and temp_file.exists():
                    temp_file.unlink()
                
                return result
            else:
                return self._fallback_extract(file_bytes, file_path)
                
        except Exception as e:
            logger.error(f"Resume extraction failed: {e}")
            return self._fallback_extract(file_bytes, file_path)
    
    def _fallback_extract(
        self, 
        file_bytes: Optional[bytes] = None,
        file_path: Optional[str] = None
    ) -> ExtractedResume:
        """Fallback extraction when pyresparser is not available"""
        # Basic text extraction for fallback
        text = ""
        
        if file_bytes:
            try:
                # Try to extract text from PDF
                if file_path and file_path.lower().endswith('.pdf'):
                    text = self._extract_pdf_text(file_bytes)
                else:
                    text = file_bytes.decode('utf-8', errors='ignore')
            except Exception as e:
                logger.warning(f"Fallback text extraction failed: {e}")
        
        # Basic regex extraction
        import re
        
        result = ExtractedResume(
            name=self._extract_field(text, r'(?:name[:\s]*[:=]?\s*([A-Z][a-z\s]+)', default=None),
            email=self._extract_field(text, r'(?:email|e-?mail)[:\s]*[:=]?\s*([\w\.-]+@[\w\.-]+)', default=None),
            mobile_number=self._extract_field(text, r'(?:phone|mobile|cell)[:\s]*[:=]?\s*([\d\-\s\(\)\+]+)', default=None),
            degree=self._extract_field(text, r'(?:degree|education)[:\s]*[:=]?\s*(.+)', default=None),
            skills=self._extract_skills(text),
            companies=self._extract_companies(text),
            experience=[],
            achievements=[],
            parse_time_ms=0,
            confidence=0.5
        )
        
        return result
    
    def _extract_pdf_text(self, file_bytes: bytes) -> str:
        """Extract text from PDF bytes"""
        try:
            import fitz  # For PDF text extraction
            
            # Open PDF from bytes
            from io import BytesIO
            doc = fitz.open(stream=BytesIO(file_bytes), filetype="pdf")
            text = ""
            for page in doc:
                text += page.get_text() + "\n"
            return text
        except ImportError:
            # Fallback to pdfminer
            try:
                from pdfminer.high_level import extract_text
                from io import BytesIO
                
                text = extract_text(BytesIO(file_bytes))
                return text
            except:
                return ""
        except Exception:
            return ""
    
    def _extract_field(self, text: str, pattern: str, default: Any = None) -> Optional[str]:
        """Extract a field using regex"""
        if not text:
            return default
        match = re.search(pattern, re.IGNORECASE | re.MULTILINE)
        if match:
            return match.group(1).strip() if match.lastindex else default
        return default
    
    def _extract_skills(self, text: str) -> List[str]:
        """Extract skills from text"""
        if not text:
            return []
        
        # Common technical skills
        common_skills = [
            'python', 'java', 'javascript', 'typescript', 'react', 'angular', 'vue', 'node', 'django',
            'flask', 'spring', 'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'sql',
            'postgresql', 'mysql', 'mongodb', 'redis', 'git', 'linux', 'tensorflow',
            'pytorch', 'machine learning', 'deep learning', 'data science',
            'api', 'rest', 'graphql', 'microservices', 'ci/cd', 'jenkins',
            'agile', 'scrum', 'kotlin', 'swift', 'go', 'rust', 'c++', 'c#',
        ]
        
        text_lower = text.lower()
        found_skills = []
        
        for skill in common_skills:
            if skill in text_lower:
                found_skills.append(skill.title())
        
        return found_skills
    
    def _extract_companies(self, text: str) -> List[str]:
        """Extract company names from text"""
        import re
        
        if not text:
            return []
        
        # Look for company patterns
        patterns = [
            r'at\s+([A-Z][a-zA-Z0-9\s&]+(?:\s+(?:Inc|LLC|Corp|Corporation|Company|Ltd|GmbH|SA|S\.A\.)?)?',
            r'(?:worked at|employed at|position at)\s+([A-Z][a-zA-Z0-9\s&]+)',
        ]
        
        companies = []
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            companies.extend(matches)
        
        # Clean up
        return list(set(companies))[:10]


# Singleton instance
_resume_parser_instance: Optional[ResumeParserEngine] = None


async def get_resume_parser() -> ResumeParserEngine:
    """Get or create ResumeParserEngine instance"""
    global _resume_parser_instance
    if _resume_parser_instance is None:
        _resume_parser_instance = ResumeParserEngine()
        await _resume_parser_instance.initialize()
    return _resume_parser_instance
