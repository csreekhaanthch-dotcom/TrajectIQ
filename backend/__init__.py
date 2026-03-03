"""
TrajectIQ - Intelligence-Driven Hiring Platform
================================================

A proprietary internal hiring intelligence tool for deterministic,
explainable, and auditable candidate evaluation.
"""

__version__ = "1.0.0"
__author__ = "TrajectIQ Team"
__description__ = "Intelligence-Driven Hiring Platform"

from .orchestration.pipeline import TrajectIQPipeline, evaluate_resume

__all__ = [
    "TrajectIQPipeline",
    "evaluate_resume",
    "__version__",
]
