"""
TrajectIQ Core Module
=====================
Configuration, logging, and database infrastructure.
"""

from .config import config, TrajectIQConfig
from .logger import get_logger, log_audit, TrajectIQLogger
from .database import DatabaseManager
from .base_module import BaseModule, ModuleRegistry

__all__ = [
    "config",
    "TrajectIQConfig",
    "get_logger",
    "log_audit",
    "TrajectIQLogger",
    "DatabaseManager",
    "BaseModule",
    "ModuleRegistry",
]
