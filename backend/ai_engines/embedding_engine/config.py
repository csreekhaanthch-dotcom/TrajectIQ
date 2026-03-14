"""
Embedding Engine Configuration
"""

# Sentence Transformer Model
# all-MiniLM-L6-v2: Fast, efficient, 384 dimensions
# Good balance between speed and quality for semantic search
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

# Embedding dimensions (depends on model)
# all-MiniLM-L6-v2 = 384 dimensions
EMBEDDING_DIMENSION = 384

# Alternative models (can be configured):
# - "all-mpnet-base-v2": 768 dimensions, higher quality, slower
# - "paraphrase-multilingual-MiniLM-L12-v2": 384 dimensions, multilingual
# - "sentence-t5-base": 768 dimensions, T5-based

# Batch size for embedding generation
EMBEDDING_BATCH_SIZE = 32

# Similarity thresholds
DEFAULT_SIMILARITY_THRESHOLD = 0.5  # Minimum similarity score
HIGH_SIMILARITY_THRESHOLD = 0.8     # High match threshold
EXCELLENT_SIMILARITY_THRESHOLD = 0.9  # Excellent match threshold

# Search settings
DEFAULT_SEARCH_LIMIT = 10
MAX_SEARCH_LIMIT = 100

# Cache settings
ENABLE_EMBEDDING_CACHE = True
CACHE_MAX_SIZE = 10000

# Performance settings
MAX_WORKERS = 4  # For parallel embedding generation
