"""
TrajectIQ Embedding Engine
Semantic Vector Search for Candidate Intelligence

Features:
- Sentence Transformers for embeddings
- Batch processing for efficiency
- Caching for performance
- Similarity scoring
"""

import logging
import time
import hashlib
from typing import List, Optional, Dict, Any, Tuple
from functools import lru_cache
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Lazy import for sentence-transformers (heavy dependency)
_model = None

def _get_model():
    """Lazy load the Sentence Transformer model."""
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info("[Embedding] Loading Sentence Transformer model...")
            _model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("[Embedding] Model loaded successfully")
        except ImportError:
            logger.warning("[Embedding] sentence-transformers not installed, using fallback")
            _model = None
        except Exception as e:
            logger.error(f"[Embedding] Failed to load model: {e}")
            _model = None
    return _model


class EmbeddingEngine:
    """
    Semantic Embedding Engine for Candidate Intelligence
    
    Uses Sentence Transformers to generate embeddings for:
    - Candidate resumes
    - Job descriptions
    - Search queries
    
    Enables semantic similarity search across the candidate database.
    """
    
    def __init__(
        self,
        model_name: str = "all-MiniLM-L6-v2",
        dimension: int = 384,
        batch_size: int = 32,
        enable_cache: bool = True
    ):
        """Initialize the Embedding Engine."""
        self.model_name = model_name
        self.dimension = dimension
        self.batch_size = batch_size
        self.enable_cache = enable_cache
        self._model = None
        self._cache: Dict[str, np.ndarray] = {}
        self._stats = {
            "embeddings_generated": 0,
            "cache_hits": 0,
            "total_time_ms": 0
        }
        logger.info(f"[EmbeddingEngine] Initialized with model={model_name}, dimension={dimension}")
    
    @property
    def model(self):
        """Lazy load the model."""
        if self._model is None:
            self._model = _get_model()
        return self._model
    
    def _get_cache_key(self, text: str) -> str:
        """Generate a cache key for text."""
        return hashlib.sha256(text.encode('utf-8')).hexdigest()
    
    def _normalize_text(self, text: str) -> str:
        """
        Normalize text for embedding generation.
        
        - Lowercase
        - Remove extra whitespace
        - Clean special characters
        """
        if not text:
            return ""
        
        # Basic normalization
        text = text.lower().strip()
        
        # Remove excessive whitespace
        import re
        text = re.sub(r'\s+', ' ', text)
        
        # Remove control characters
        text = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', text)
        
        return text
    
    def generate_embedding(
        self,
        text: str,
        normalize: bool = True,
        use_cache: bool = True
    ) -> Optional[List[float]]:
        """
        Generate embedding for a single text.
        
        Args:
            text: Input text to embed
            normalize: Whether to L2-normalize the embedding
            use_cache: Whether to use caching
            
        Returns:
            List of floats representing the embedding vector
        """
        if not text or not text.strip():
            logger.warning("[Embedding] Empty text provided")
            return None
        
        start_time = time.time()
        
        # Normalize text
        normalized_text = self._normalize_text(text)
        
        # Check cache
        if use_cache and self.enable_cache:
            cache_key = self._get_cache_key(normalized_text)
            if cache_key in self._cache:
                self._stats["cache_hits"] += 1
                logger.debug(f"[Embedding] Cache hit for text hash: {cache_key[:8]}")
                return self._cache[cache_key].tolist()
        
        # Generate embedding
        try:
            if self.model is None:
                logger.warning("[Embedding] Model not available, returning None")
                return None
            
            embedding = self.model.encode(
                normalized_text,
                normalize_embeddings=normalize,
                convert_to_numpy=True
            )
            
            # Cache the result
            if use_cache and self.enable_cache:
                cache_key = self._get_cache_key(normalized_text)
                self._cache[cache_key] = embedding
            
            # Update stats
            elapsed_ms = (time.time() - start_time) * 1000
            self._stats["embeddings_generated"] += 1
            self._stats["total_time_ms"] += elapsed_ms
            
            logger.debug(f"[Embedding] Generated embedding in {elapsed_ms:.2f}ms")
            
            return embedding.tolist()
            
        except Exception as e:
            logger.error(f"[Embedding] Failed to generate embedding: {e}")
            return None
    
    def generate_embeddings_batch(
        self,
        texts: List[str],
        normalize: bool = True,
        show_progress: bool = False
    ) -> List[Optional[List[float]]]:
        """
        Generate embeddings for multiple texts in batch.
        
        More efficient than individual calls for large datasets.
        
        Args:
            texts: List of texts to embed
            normalize: Whether to L2-normalize embeddings
            show_progress: Whether to show progress bar
            
        Returns:
            List of embeddings (or None for failed items)
        """
        if not texts:
            return []
        
        start_time = time.time()
        
        # Normalize all texts
        normalized_texts = [self._normalize_text(t) for t in texts]
        
        # Separate cached and uncached
        uncached_indices = []
        uncached_texts = []
        results = [None] * len(texts)
        
        for i, text in enumerate(normalized_texts):
            if self.enable_cache:
                cache_key = self._get_cache_key(text)
                if cache_key in self._cache:
                    self._stats["cache_hits"] += 1
                    results[i] = self._cache[cache_key].tolist()
                    continue
            uncached_indices.append(i)
            uncached_texts.append(text)
        
        # Generate embeddings for uncached texts
        if uncached_texts and self.model is not None:
            try:
                embeddings = self.model.encode(
                    uncached_texts,
                    batch_size=self.batch_size,
                    normalize_embeddings=normalize,
                    convert_to_numpy=True,
                    show_progress_bar=show_progress
                )
                
                # Assign results and cache
                for idx, embedding in zip(uncached_indices, embeddings):
                    results[idx] = embedding.tolist()
                    if self.enable_cache:
                        cache_key = self._get_cache_key(normalized_texts[idx])
                        self._cache[cache_key] = embedding
                
                self._stats["embeddings_generated"] += len(uncached_texts)
                
            except Exception as e:
                logger.error(f"[Embedding] Batch embedding failed: {e}")
        
        # Update stats
        elapsed_ms = (time.time() - start_time) * 1000
        self._stats["total_time_ms"] += elapsed_ms
        
        logger.info(f"[Embedding] Generated {len(uncached_texts)} embeddings in {elapsed_ms:.2f}ms")
        
        return results
    
    def compute_similarity(
        self,
        embedding1: List[float],
        embedding2: List[float]
    ) -> float:
        """
        Compute cosine similarity between two embeddings.
        
        Args:
            embedding1: First embedding vector
            embedding2: Second embedding vector
            
        Returns:
            Similarity score between -1 and 1
        """
        if embedding1 is None or embedding2 is None:
            return 0.0
        
        try:
            vec1 = np.array(embedding1)
            vec2 = np.array(embedding2)
            
            # Cosine similarity
            similarity = np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))
            
            return float(similarity)
        except Exception as e:
            logger.error(f"[Embedding] Similarity computation failed: {e}")
            return 0.0
    
    def compute_similarities(
        self,
        query_embedding: List[float],
        candidate_embeddings: List[List[float]]
    ) -> List[float]:
        """
        Compute similarities between a query and multiple candidates.
        
        Args:
            query_embedding: Query embedding vector
            candidate_embeddings: List of candidate embeddings
            
        Returns:
            List of similarity scores
        """
        if query_embedding is None or not candidate_embeddings:
            return [0.0] * len(candidate_embeddings)
        
        try:
            query_vec = np.array(query_embedding)
            candidate_matrix = np.array(candidate_embeddings)
            
            # Normalize vectors
            query_norm = query_vec / np.linalg.norm(query_vec)
            candidate_norms = candidate_matrix / np.linalg.norm(candidate_matrix, axis=1, keepdims=True)
            
            # Compute cosine similarities
            similarities = np.dot(candidate_norms, query_norm)
            
            return similarities.tolist()
        except Exception as e:
            logger.error(f"[Embedding] Batch similarity computation failed: {e}")
            return [0.0] * len(candidate_embeddings)
    
    def find_top_k_similar(
        self,
        query_embedding: List[float],
        candidate_embeddings: List[Tuple[str, List[float]]],  # List of (id, embedding)
        k: int = 10,
        threshold: float = 0.0
    ) -> List[Tuple[str, float]]:
        """
        Find top-k most similar candidates to a query.
        
        Args:
            query_embedding: Query embedding vector
            candidate_embeddings: List of (candidate_id, embedding) tuples
            k: Number of top results to return
            threshold: Minimum similarity threshold
            
        Returns:
            List of (candidate_id, similarity_score) tuples, sorted by similarity
        """
        if query_embedding is None or not candidate_embeddings:
            return []
        
        start_time = time.time()
        
        # Extract IDs and embeddings
        ids = [item[0] for item in candidate_embeddings]
        embeddings = [item[1] for item in candidate_embeddings]
        
        # Compute all similarities
        similarities = self.compute_similarities(query_embedding, embeddings)
        
        # Create scored results
        scored = list(zip(ids, similarities))
        
        # Filter by threshold and sort
        filtered = [(id_, score) for id_, score in scored if score >= threshold]
        sorted_results = sorted(filtered, key=lambda x: x[1], reverse=True)
        
        # Return top k
        top_k = sorted_results[:k]
        
        elapsed_ms = (time.time() - start_time) * 1000
        logger.info(f"[Embedding] Found top {len(top_k)} candidates in {elapsed_ms:.2f}ms")
        
        return top_k
    
    def get_stats(self) -> Dict[str, Any]:
        """Get engine statistics."""
        return {
            "model_name": self.model_name,
            "dimension": self.dimension,
            "cache_enabled": self.enable_cache,
            "cache_size": len(self._cache) if self.enable_cache else 0,
            "embeddings_generated": self._stats["embeddings_generated"],
            "cache_hits": self._stats["cache_hits"],
            "total_time_ms": round(self._stats["total_time_ms"], 2),
            "avg_time_per_embedding_ms": (
                round(self._stats["total_time_ms"] / max(1, self._stats["embeddings_generated"]), 2)
                if self._stats["embeddings_generated"] > 0 else 0
            )
        }
    
    def clear_cache(self):
        """Clear the embedding cache."""
        self._cache.clear()
        logger.info("[Embedding] Cache cleared")
    
    def is_available(self) -> bool:
        """Check if the embedding engine is available."""
        return self.model is not None


# Singleton instance
_embedding_engine: Optional[EmbeddingEngine] = None


def get_embedding_engine() -> EmbeddingEngine:
    """Get the singleton Embedding Engine instance."""
    global _embedding_engine
    if _embedding_engine is None:
        _embedding_engine = EmbeddingEngine()
    return _embedding_engine
