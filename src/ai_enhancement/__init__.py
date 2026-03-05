# TrajectIQ Enterprise - AI Enhancement Package
"""
AI Semantic Enhancement Layer (Optional).
All AI suggestions are ADVISORY ONLY and never override deterministic rules.
"""

from .semantic_layer import (
    AIMode,
    BaseAIProvider,
    OllamaProvider,
    APIProvider,
    AISemanticEnhancer,
    AIEnhancementResult,
    create_ai_enhancer
)

__all__ = [
    'AIMode',
    'BaseAIProvider',
    'OllamaProvider',
    'APIProvider',
    'AISemanticEnhancer',
    'AIEnhancementResult',
    'create_ai_enhancer'
]
