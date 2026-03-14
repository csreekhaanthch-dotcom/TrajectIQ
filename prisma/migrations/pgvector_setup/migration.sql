-- ============================================
-- TrajectIQ Vector Search Setup
-- PostgreSQL pgvector Extension
-- ============================================
-- Run this migration on Neon PostgreSQL to enable vector search
-- This is NOT compatible with SQLite (local development uses JSON storage)

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- Candidate Embeddings Table (pgvector version)
-- ============================================
-- This table stores vector embeddings for semantic search
-- Uses pgvector's vector type for efficient similarity search

CREATE TABLE IF NOT EXISTS candidate_vectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    
    -- Resume embedding (384 dimensions for all-MiniLM-L6-v2)
    resume_embedding vector(384),
    
    -- Metadata
    model_name VARCHAR(100) DEFAULT 'all-MiniLM-L6-v2',
    vector_dimension INT DEFAULT 384,
    content_hash VARCHAR(64),
    
    -- Processing info
    processed_at TIMESTAMP DEFAULT NOW(),
    processing_time_ms INT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(candidate_id, model_name)
);

-- ============================================
-- Job Description Embeddings Table
-- ============================================
CREATE TABLE IF NOT EXISTS job_vectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
    
    -- Job description embedding
    description_embedding vector(384),
    
    -- Required skills embedding
    skills_embedding vector(384),
    
    -- Metadata
    model_name VARCHAR(100) DEFAULT 'all-MiniLM-L6-v2',
    vector_dimension INT DEFAULT 384,
    content_hash VARCHAR(64),
    
    processed_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(requirement_id, model_name)
);

-- ============================================
-- Vector Indexes for Fast Similarity Search
-- ============================================
-- IVFFlat index for approximate nearest neighbor search
-- Good balance between speed and accuracy

-- Index for candidate embeddings
CREATE INDEX IF NOT EXISTS candidate_vector_idx 
ON candidate_vectors 
USING ivfflat (resume_embedding vector_cosine_ops)
WITH (lists = 100);

-- Index for job description embeddings
CREATE INDEX IF NOT EXISTS job_desc_vector_idx 
ON job_vectors 
USING ivfflat (description_embedding vector_cosine_ops)
WITH (lists = 50);

CREATE INDEX IF NOT EXISTS job_skills_vector_idx 
ON job_vectors 
USING ivfflat (skills_embedding vector_cosine_ops)
WITH (lists = 50);

-- ============================================
-- Utility Functions for Vector Search
-- ============================================

-- Function to find similar candidates
CREATE OR REPLACE FUNCTION find_similar_candidates(
    query_embedding vector(384),
    match_threshold FLOAT DEFAULT 0.5,
    match_count INT DEFAULT 10
)
RETURNS TABLE (
    candidate_id UUID,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cv.candidate_id,
        1 - (cv.resume_embedding <=> query_embedding) as similarity
    FROM candidate_vectors cv
    WHERE 1 - (cv.resume_embedding <=> query_embedding) > match_threshold
    ORDER BY cv.resume_embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function to find candidates matching a job
CREATE OR REPLACE FUNCTION find_candidates_for_job(
    job_id UUID,
    match_threshold FLOAT DEFAULT 0.5,
    match_count INT DEFAULT 20
)
RETURNS TABLE (
    candidate_id UUID,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cv.candidate_id,
        1 - (cv.resume_embedding <=> jv.description_embedding) as similarity
    FROM candidate_vectors cv
    CROSS JOIN job_vectors jv
    WHERE jv.requirement_id = job_id
    AND 1 - (cv.resume_embedding <=> jv.description_embedding) > match_threshold
    ORDER BY cv.resume_embedding <=> jv.description_embedding
    LIMIT match_count;
END;
$$;

-- ============================================
-- Search Query Logging
-- ============================================
CREATE TABLE IF NOT EXISTS search_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    query_text TEXT NOT NULL,
    query_embedding vector(384),
    
    -- Results
    result_count INT DEFAULT 0,
    top_candidate_ids UUID[],
    top_scores FLOAT[],
    
    -- Performance
    search_time_ms INT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for search logs
CREATE INDEX IF NOT EXISTS search_logs_org_idx ON search_logs(organization_id);
CREATE INDEX IF NOT EXISTS search_logs_created_idx ON search_logs(created_at);

-- ============================================
-- HNSW Index (Alternative - for higher accuracy)
-- ============================================
-- Uncomment if you prefer HNSW over IVFFlat
-- HNSW provides better recall but uses more memory

-- CREATE INDEX IF NOT EXISTS candidate_vector_hnsw_idx 
-- ON candidate_vectors 
-- USING hnsw (resume_embedding vector_cosine_ops)
-- WITH (m = 16, ef_construction = 64);
