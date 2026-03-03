"""Core module - Configuration, Database, and Logging"""
from .config import get_config
from .database import get_database, DatabaseManager

__all__ = ['get_config', 'get_database', 'DatabaseManager']
