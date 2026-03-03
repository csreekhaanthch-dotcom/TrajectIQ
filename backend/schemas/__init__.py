"""
TrajectIQ JSON Schemas
======================
Strict JSON schemas for all modules ensuring deterministic, auditable outputs.
"""

from .resume_schema import RESUME_SCHEMA, RESUME_OUTPUT_SCHEMA
from .skill_schema import SKILL_SCHEMA, SKILL_OUTPUT_SCHEMA
from .impact_schema import IMPACT_SCHEMA, IMPACT_OUTPUT_SCHEMA
from .trajectory_schema import TRAJECTORY_SCHEMA, TRAJECTORY_OUTPUT_SCHEMA
from .ai_detection_schema import AI_DETECTION_SCHEMA, AI_DETECTION_OUTPUT_SCHEMA
from .scoring_schema import SCORING_SCHEMA, SCORING_OUTPUT_SCHEMA
from .candidate_schema import CANDIDATE_FULL_SCHEMA

__all__ = [
    'RESUME_SCHEMA',
    'RESUME_OUTPUT_SCHEMA',
    'SKILL_SCHEMA', 
    'SKILL_OUTPUT_SCHEMA',
    'IMPACT_SCHEMA',
    'IMPACT_OUTPUT_SCHEMA',
    'TRAJECTORY_SCHEMA',
    'TRAJECTORY_OUTPUT_SCHEMA',
    'AI_DETECTION_SCHEMA',
    'AI_DETECTION_OUTPUT_SCHEMA',
    'SCORING_SCHEMA',
    'SCORING_OUTPUT_SCHEMA',
    'CANDIDATE_FULL_SCHEMA'
]
