"""
TrajectIQ Enterprise - AI Semantic Enhancement Layer
====================================================
Layer 2 - Optional AI Enhancement (Toggleable)

Modes: OFF | LOCAL (Ollama) | API
Features: Semantic inference, Context normalization

CRITICAL: AI enhancement NEVER overrides deterministic gating rules.
All AI suggestions are advisory only.
"""

import json
import hashlib
import logging
import requests
from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class AIMode(Enum):
    OFF = "off"
    LOCAL = "local"
    API = "api"


@dataclass
class AIEnhancementResult:
    """Result of AI enhancement"""
    enhanced: bool
    mode: str
    confidence: float
    skill_inferences: List[Dict[str, Any]]
    context_normalizations: List[Dict[str, Any]]
    achievement_clarifications: List[Dict[str, Any]]
    responsibility_interpretations: List[Dict[str, Any]]
    warnings: List[str]
    processing_time_ms: float


class BaseAIProvider(ABC):
    """Base class for AI providers"""
    
    def __init__(self, model: str = "", temperature: float = 0.1, max_tokens: int = 2048):
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self._logger = logging.getLogger(__name__)
    
    @abstractmethod
    def generate(self, prompt: str) -> Optional[str]:
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        pass


class OllamaProvider(BaseAIProvider):
    """Local Ollama AI provider"""
    
    def __init__(
        self,
        base_url: str = "http://localhost:11434",
        model: str = "llama3.2",
        temperature: float = 0.1,
        max_tokens: int = 2048
    ):
        super().__init__(model, temperature, max_tokens)
        self.base_url = base_url.rstrip('/')
    
    def is_available(self) -> bool:
        """Check if Ollama is running"""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=5)
            return response.status_code == 200
        except:
            return False
    
    def generate(self, prompt: str) -> Optional[str]:
        """Generate response from Ollama"""
        if not self.is_available():
            return None
        
        try:
            response = requests.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": self.temperature,
                        "num_predict": self.max_tokens
                    }
                },
                timeout=120
            )
            
            if response.status_code == 200:
                return response.json().get("response", "")
        except Exception as e:
            self._logger.error(f"Ollama generation error: {e}")
        
        return None


class APIProvider(BaseAIProvider):
    """Remote API AI provider"""
    
    def __init__(
        self,
        api_endpoint: str,
        api_key: str = "",
        model: str = "gpt-4",
        temperature: float = 0.1,
        max_tokens: int = 2048
    ):
        super().__init__(model, temperature, max_tokens)
        self.api_endpoint = api_endpoint.rstrip('/')
        self.api_key = api_key
    
    def is_available(self) -> bool:
        """Check if API is accessible"""
        return bool(self.api_endpoint)
    
    def generate(self, prompt: str) -> Optional[str]:
        """Generate response from API"""
        try:
            headers = {"Content-Type": "application/json"}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
            
            response = requests.post(
                f"{self.api_endpoint}/chat/completions",
                headers=headers,
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": self.temperature,
                    "max_tokens": self.max_tokens
                },
                timeout=60
            )
            
            if response.status_code == 200:
                return response.json().get("choices", [{}])[0].get("message", {}).get("content", "")
        except Exception as e:
            self._logger.error(f"API generation error: {e}")
        
        return None


class AISemanticEnhancer:
    """
    AI Semantic Enhancement Layer.
    
    IMPORTANT: All AI suggestions are ADVISORY ONLY.
    They NEVER override deterministic scoring rules.
    """
    
    # Prompts for different enhancement types
    SKILL_INFERENCE_PROMPT = """Analyze this resume section and infer additional relevant skills not explicitly mentioned.
Return ONLY a JSON array of inferred skills with confidence (0-1).

Resume section: {section}

Response format:
[
  {{"skill": "skill_name", "confidence": 0.8, "reasoning": "inferred from X"}}
]"""

    CONTEXT_NORMALIZATION_PROMPT = """Normalize this job context to standard industry terminology.
Return ONLY a JSON object with normalized fields.

Original: {context}

Response format:
{{
  "normalized_title": "standard title",
  "normalized_department": "standard department",
  "normalized_level": "entry|mid|senior|lead|manager|director"
}}"""

    ACHIEVEMENT_CLARIFICATION_PROMPT = """Analyze this achievement and clarify its impact.
Return ONLY a JSON object with clarification details.

Achievement: {achievement}

Response format:
{{
  "clarified_impact": "what was actually achieved",
  "quantified_estimate": "estimated numeric impact",
  "confidence": 0.7,
  "assumptions": ["assumption1", "assumption2"]
}}"""

    RESPONSIBILITY_PROMPT = """Interpret this job responsibility and extract implied skills.
Return ONLY a JSON object with skill implications.

Responsibility: {responsibility}

Response format:
{{
  "implied_skills": ["skill1", "skill2"],
  "leadership_indicators": ["indicator1"],
  "technical_depth": "low|medium|high"
}}"""
    
    def __init__(
        self,
        mode: AIMode = AIMode.OFF,
        provider: Optional[BaseAIProvider] = None
    ):
        self.mode = mode
        self.provider = provider
        self._logger = logging.getLogger(__name__)
        
        # Initialize default provider based on mode
        if mode != AIMode.OFF and not provider:
            self.provider = self._get_default_provider(mode)
    
    def _get_default_provider(self, mode: AIMode) -> Optional[BaseAIProvider]:
        """Get default provider for mode"""
        if mode == AIMode.LOCAL:
            return OllamaProvider()
        return None
    
    def is_enabled(self) -> bool:
        """Check if AI enhancement is enabled and available"""
        if self.mode == AIMode.OFF:
            return False
        if self.provider is None:
            return False
        return self.provider.is_available()
    
    def enhance(
        self,
        parsed_resume: Dict[str, Any],
        job_requirements: Dict[str, Any]
    ) -> AIEnhancementResult:
        """
        Enhance parsed resume with AI semantic analysis.
        
        CRITICAL: Results are ADVISORY ONLY and never override deterministic rules.
        """
        import time
        start_time = time.time()
        
        result = AIEnhancementResult(
            enhanced=False,
            mode=self.mode.value,
            confidence=0.0,
            skill_inferences=[],
            context_normalizations=[],
            achievement_clarifications=[],
            responsibility_interpretations=[],
            warnings=[],
            processing_time_ms=0.0
        )
        
        if not self.is_enabled():
            result.warnings.append("AI enhancement is disabled or unavailable")
            result.processing_time_ms = (time.time() - start_time) * 1000
            return result
        
        result.enhanced = True
        
        # 1. Skill Inference
        skills_result = self._infer_skills(parsed_resume)
        if skills_result:
            result.skill_inferences = skills_result
            result.warnings.append("Skill inferences are ADVISORY - verify with deterministic scoring")
        
        # 2. Context Normalization
        context_result = self._normalize_contexts(parsed_resume)
        if context_result:
            result.context_normalizations = context_result
        
        # 3. Achievement Clarification
        achievement_result = self._clarify_achievements(parsed_resume)
        if achievement_result:
            result.achievement_clarifications = achievement_result
            result.warnings.append("Achievement clarifications are estimates - verify with candidate")
        
        # 4. Responsibility Interpretation
        responsibility_result = self._interpret_responsibilities(parsed_resume)
        if responsibility_result:
            result.responsibility_interpretations = responsibility_result
        
        # Calculate overall confidence
        total_items = (
            len(result.skill_inferences) +
            len(result.context_normalizations) +
            len(result.achievement_clarifications) +
            len(result.responsibility_interpretations)
        )
        
        if total_items > 0:
            result.confidence = min(1.0, total_items * 0.1)
        
        result.processing_time_ms = (time.time() - start_time) * 1000
        
        # Add critical warning
        result.warnings.insert(0, "AI enhancement is ADVISORY ONLY and NEVER overrides deterministic gating rules")
        
        return result
    
    def _infer_skills(self, resume: Dict) -> List[Dict]:
        """Infer additional skills from resume context"""
        if not self.provider:
            return []
        
        results = []
        
        # Process skills section
        skills_section = resume.get("skills", {})
        if skills_section:
            prompt = self.SKILL_INFERENCE_PROMPT.format(
                section=json.dumps(skills_section)
            )
            response = self._safe_json_generation(prompt)
            if response:
                results.extend(response)
        
        return results
    
    def _normalize_contexts(self, resume: Dict) -> List[Dict]:
        """Normalize job contexts"""
        if not self.provider:
            return []
        
        results = []
        
        for exp in resume.get("experience", []):
            context = {
                "title": exp.get("title", ""),
                "company": exp.get("company", "")
            }
            prompt = self.CONTEXT_NORMALIZATION_PROMPT.format(
                context=json.dumps(context)
            )
            response = self._safe_json_generation(prompt)
            if response:
                response["original_title"] = exp.get("title", "")
                results.append(response)
        
        return results
    
    def _clarify_achievements(self, resume: Dict) -> List[Dict]:
        """Clarify achievement impacts"""
        if not self.provider:
            return []
        
        results = []
        
        for exp in resume.get("experience", []):
            for achievement in exp.get("achievements", []):
                if isinstance(achievement, dict):
                    text = achievement.get("text", "")
                else:
                    text = str(achievement)
                
                if text:
                    prompt = self.ACHIEVEMENT_CLARIFICATION_PROMPT.format(
                        achievement=text
                    )
                    response = self._safe_json_generation(prompt)
                    if response:
                        response["original_achievement"] = text[:100]
                        results.append(response)
        
        return results
    
    def _interpret_responsibilities(self, resume: Dict) -> List[Dict]:
        """Interpret job responsibilities"""
        if not self.provider:
            return []
        
        results = []
        
        for exp in resume.get("experience", []):
            description = exp.get("description", "")
            if description:
                prompt = self.RESPONSIBILITY_PROMPT.format(
                    responsibility=description
                )
                response = self._safe_json_generation(prompt)
                if response:
                    response["source_title"] = exp.get("title", "")
                    results.append(response)
        
        return results
    
    def _safe_json_generation(self, prompt: str) -> Optional[Dict]:
        """Safely generate and parse JSON response"""
        try:
            response = self.provider.generate(prompt)
            if response:
                # Try to extract JSON from response
                json_match = None
                
                # Look for JSON array
                if '[' in response and ']' in response:
                    start = response.index('[')
                    end = response.rindex(']') + 1
                    json_match = response[start:end]
                # Look for JSON object
                elif '{' in response and '}' in response:
                    start = response.index('{')
                    end = response.rindex('}') + 1
                    json_match = response[start:end]
                
                if json_match:
                    return json.loads(json_match)
        except Exception as e:
            self._logger.error(f"JSON parsing error: {e}")
        
        return None


def create_ai_enhancer(
    mode: str = "off",
    local_model: str = "llama3.2",
    api_endpoint: str = "",
    api_key: str = ""
) -> AISemanticEnhancer:
    """
    Factory function for AI enhancer.
    
    Args:
        mode: 'off', 'local', or 'api'
        local_model: Model name for local Ollama
        api_endpoint: API endpoint URL
        api_key: API authentication key
    
    Returns:
        Configured AISemanticEnhancer instance
    """
    ai_mode = AIMode(mode.lower())
    
    if ai_mode == AIMode.OFF:
        return AISemanticEnhancer(mode=ai_mode)
    
    if ai_mode == AIMode.LOCAL:
        provider = OllamaProvider(model=local_model)
        return AISemanticEnhancer(mode=ai_mode, provider=provider)
    
    if ai_mode == AIMode.API:
        provider = APIProvider(
            api_endpoint=api_endpoint,
            api_key=api_key
        )
        return AISemanticEnhancer(mode=ai_mode, provider=provider)
    
    return AISemanticEnhancer(mode=AIMode.OFF)
