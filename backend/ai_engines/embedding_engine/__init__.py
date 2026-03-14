"""
TrajectIQ Embedding Engine
Vector Search Intelligence Layer

Uses Sentence Transformers for semantic embeddings
Supports pgvector for vector storage and similarity search
"""

from .engine import EmbeddingEngine, get_embedding_engine
from .config import EMBEDDING_MODEL, EMBEDDING_DIMENSION

__all__ = ['EmbeddingEngine', 'get_embedding_engine', 'EMBEDDING_MODEL', 'EMBEDDING_DIMENSION']
