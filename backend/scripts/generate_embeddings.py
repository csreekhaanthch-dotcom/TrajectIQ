#!/usr/bin/env python3
"""
TrajectIQ - Generate Embeddings for Existing Candidates

This script generates vector embeddings for all candidates in the database
that have resumes but don't have embeddings yet.

Usage:
    python scripts/generate_embeddings.py [--batch-size 10] [--dry-run]

Environment Variables:
    DATABASE_URL: PostgreSQL connection string (required)
"""

import os
import sys
import asyncio
import argparse
import logging
from typing import List, Dict, Any, Optional

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Try to import required packages
try:
    import asyncpg
except ImportError:
    logger.error("asyncpg not installed. Run: pip install asyncpg")
    sys.exit(1)

try:
    from ai_engines.embedding_engine import get_embedding_engine
except ImportError:
    logger.error("Could not import embedding engine")
    sys.exit(1)


async def get_database_connection():
    """Get database connection from environment variable."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        logger.error("DATABASE_URL environment variable not set")
        sys.exit(1)

    return await asyncpg.connect(database_url)


async def get_candidates_without_embeddings(conn, limit: int = 100) -> List[Dict[str, Any]]:
    """Fetch candidates that have resumes but no embeddings."""
    query = """
    SELECT
        c.id as candidate_id,
        c.first_name,
        c.last_name,
        c.email,
        c.current_title,
        c.current_company,
        r.id as resume_id,
        r.raw_text,
        r.skills
    FROM candidates c
    INNER JOIN resumes r ON c.id = r.candidate_id
    LEFT JOIN candidate_vectors cv ON c.id = cv.candidate_id
    WHERE cv.id IS NULL
    AND r.raw_text IS NOT NULL
    AND LENGTH(r.raw_text) > 100
    ORDER BY c.created_at DESC
    LIMIT $1
    """

    rows = await conn.fetch(query, limit)
    return [dict(row) for row in rows]


async def get_embedding_count(conn) -> int:
    """Get count of candidates with embeddings."""
    result = await conn.fetchval("SELECT COUNT(*) FROM candidate_vectors")
    return result or 0


async def get_total_candidate_count(conn) -> int:
    """Get total count of candidates with resumes."""
    result = await conn.fetchval("""
        SELECT COUNT(DISTINCT c.id)
        FROM candidates c
        INNER JOIN resumes r ON c.id = r.candidate_id
        WHERE r.raw_text IS NOT NULL
    """)
    return result or 0


def build_resume_text(candidate: Dict[str, Any]) -> str:
    """Build comprehensive text for embedding from candidate data."""
    parts = []

    # Add name and title
    if candidate.get('first_name') or candidate.get('last_name'):
        name = f"{candidate.get('first_name', '')} {candidate.get('last_name', '')}".strip()
        parts.append(f"Candidate: {name}")

    if candidate.get('current_title'):
        parts.append(f"Title: {candidate['current_title']}")

    if candidate.get('current_company'):
        parts.append(f"Company: {candidate['current_company']}")

    # Add skills
    if candidate.get('skills'):
        try:
            import json
            skills = json.loads(candidate['skills'])
            if isinstance(skills, list):
                skill_names = [s.get('name', s) if isinstance(s, dict) else s for s in skills]
                parts.append(f"Skills: {', '.join(skill_names[:20])}")
        except:
            pass

    # Add raw resume text
    if candidate.get('raw_text'):
        parts.append(candidate['raw_text'])

    return "\n".join(parts)


async def save_embedding(conn, candidate_id: str, embedding: List[float], processing_time_ms: int):
    """Save embedding to database."""
    import json
    import hashlib
    from datetime import datetime

    # Generate content hash
    content_hash = hashlib.sha256(str(embedding[:10]).encode()).hexdigest()[:64]

    query = """
    INSERT INTO candidate_vectors (candidate_id, resume_embedding, model_name, vector_dimension, content_hash, processed_at, processing_time_ms)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (candidate_id, model_name)
    DO UPDATE SET
        resume_embedding = $2,
        content_hash = $5,
        processed_at = $6,
        processing_time_ms = $7,
        updated_at = NOW()
    """

    await conn.execute(
        query,
        candidate_id,
        embedding,  # asyncpg handles list conversion to vector
        'all-MiniLM-L6-v2',
        384,
        content_hash,
        datetime.utcnow(),
        processing_time_ms
    )


async def generate_embeddings_batch(
    candidates: List[Dict[str, Any]],
    engine,
    batch_size: int = 5
) -> List[tuple]:
    """Generate embeddings for a batch of candidates."""
    results = []

    for i in range(0, len(candidates), batch_size):
        batch = candidates[i:i + batch_size]

        for candidate in batch:
            try:
                import time
                start = time.time()

                # Build text for embedding
                text = build_resume_text(candidate)

                # Generate embedding
                embedding = engine.generate_embedding(text)

                processing_time = int((time.time() - start) * 1000)

                if embedding:
                    results.append((candidate['candidate_id'], embedding, processing_time))
                    logger.info(f"Generated embedding for {candidate['first_name']} {candidate['last_name']}")
                else:
                    logger.warning(f"Failed to generate embedding for {candidate['candidate_id']}")

            except Exception as e:
                logger.error(f"Error processing candidate {candidate['candidate_id']}: {e}")

    return results


async def main():
    """Main function to generate embeddings."""
    parser = argparse.ArgumentParser(description='Generate embeddings for existing candidates')
    parser.add_argument('--batch-size', type=int, default=10, help='Batch size for processing')
    parser.add_argument('--limit', type=int, default=100, help='Maximum candidates to process')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be done without making changes')
    args = parser.parse_args()

    logger.info("=" * 60)
    logger.info("TrajectIQ Embedding Generator")
    logger.info("=" * 60)

    # Connect to database
    logger.info("Connecting to database...")
    conn = await get_database_connection()

    # Get statistics
    total_candidates = await get_total_candidate_count(conn)
    existing_embeddings = await get_embedding_count(conn)

    logger.info(f"Total candidates with resumes: {total_candidates}")
    logger.info(f"Candidates with embeddings: {existing_embeddings}")
    logger.info(f"Candidates needing embeddings: {total_candidates - existing_embeddings}")

    if args.dry_run:
        logger.info("\n[DRY RUN] Would process candidates without embeddings")
        candidates = await get_candidates_without_embeddings(conn, args.limit)
        logger.info(f"[DRY RUN] Found {len(candidates)} candidates to process")
        for c in candidates[:5]:
            logger.info(f"  - {c['first_name']} {c['last_name']} ({c['current_title']})")
        if len(candidates) > 5:
            logger.info(f"  ... and {len(candidates) - 5} more")
        await conn.close()
        return

    # Initialize embedding engine
    logger.info("\nInitializing embedding engine...")
    engine = get_embedding_engine()

    if not engine.is_available():
        logger.error("Embedding engine not available. Check sentence-transformers installation.")
        await conn.close()
        sys.exit(1)

    logger.info(f"Model: {engine.model_name}")
    logger.info(f"Dimension: {engine.dimension}")

    # Fetch candidates without embeddings
    logger.info("\nFetching candidates without embeddings...")
    candidates = await get_candidates_without_embeddings(conn, args.limit)

    if not candidates:
        logger.info("No candidates need embeddings. All caught up!")
        await conn.close()
        return

    logger.info(f"Found {len(candidates)} candidates to process")

    # Generate embeddings
    logger.info("\nGenerating embeddings...")
    results = await generate_embeddings_batch(candidates, engine, args.batch_size)

    # Save to database
    logger.info("\nSaving embeddings to database...")
    saved_count = 0
    for candidate_id, embedding, processing_time in results:
        try:
            await save_embedding(conn, candidate_id, embedding, processing_time)
            saved_count += 1
        except Exception as e:
            logger.error(f"Failed to save embedding for {candidate_id}: {e}")

    # Final statistics
    final_embeddings = await get_embedding_count(conn)

    logger.info("\n" + "=" * 60)
    logger.info("SUMMARY")
    logger.info("=" * 60)
    logger.info(f"Candidates processed: {len(candidates)}")
    logger.info(f"Embeddings generated: {len(results)}")
    logger.info(f"Embeddings saved: {saved_count}")
    logger.info(f"Total embeddings in database: {final_embeddings}")
    logger.info("=" * 60)

    await conn.close()
    logger.info("\nDone!")


if __name__ == "__main__":
    asyncio.run(main())
