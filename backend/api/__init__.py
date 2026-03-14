"""
TrajectIQ Backend API
"""

from .vector_search import router as vector_search_router

__all__ = ['vector_search_router']
