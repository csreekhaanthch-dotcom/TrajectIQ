"""
TrajectIQ Database Infrastructure
=================================
SQLite-based database for candidate data and evaluation results.
Supports PostgreSQL and MySQL for production deployments.
"""

import json
import sqlite3
import hashlib
from datetime import datetime
from typing import Any, Dict, List, Optional
from pathlib import Path
import threading

from core.config import config
from core.logger import get_logger, log_audit


class DatabaseManager:
    """
    Database manager for TrajectIQ.
    Provides thread-safe database operations.
    """
    
    _instance: Optional["DatabaseManager"] = None
    _lock = threading.Lock()
    
    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self, db_path: Optional[str] = None):
        """
        Initialize database manager.
        
        Args:
            db_path: Path to SQLite database file
        """
        if hasattr(self, '_initialized') and self._initialized:
            return
        
        self.logger = get_logger("trajectiq.database")
        self.db_path = db_path or str(config.data_path / "db" / "trajectiq.db")
        
        # Ensure directory exists
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        
        # Initialize database
        self._init_database()
        
        self._initialized = True
    
    def _init_database(self) -> None:
        """Initialize database schema"""
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Candidates table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS candidates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    candidate_id TEXT UNIQUE NOT NULL,
                    full_name TEXT,
                    email TEXT,
                    phone TEXT,
                    location TEXT,
                    source TEXT,
                    source_id TEXT,
                    raw_resume_data TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    metadata TEXT
                )
            """)
            
            # Jobs table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS jobs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_id TEXT UNIQUE NOT NULL,
                    title TEXT,
                    department TEXT,
                    description TEXT,
                    requirements TEXT,
                    status TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    metadata TEXT
                )
            """)
            
            # Evaluations table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS evaluations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    evaluation_id TEXT UNIQUE NOT NULL,
                    candidate_id TEXT NOT NULL,
                    job_id TEXT,
                    module TEXT NOT NULL,
                    status TEXT,
                    score REAL,
                    result_data TEXT,
                    input_hash TEXT,
                    output_hash TEXT,
                    execution_time_ms REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (candidate_id) REFERENCES candidates(candidate_id),
                    FOREIGN KEY (job_id) REFERENCES jobs(job_id)
                )
            """)
            
            # Final scores table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS final_scores (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    score_id TEXT UNIQUE NOT NULL,
                    candidate_id TEXT NOT NULL,
                    job_id TEXT,
                    normalized_score REAL,
                    grade TEXT,
                    tier TEXT,
                    recommendation TEXT,
                    confidence REAL,
                    result_data TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (candidate_id) REFERENCES candidates(candidate_id),
                    FOREIGN KEY (job_id) REFERENCES jobs(job_id)
                )
            """)
            
            # Audit log table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS audit_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    action TEXT NOT NULL,
                    module TEXT,
                    candidate_id TEXT,
                    job_id TEXT,
                    actor TEXT,
                    details TEXT
                )
            """)
            
            # Create indexes
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_evaluations_candidate ON evaluations(candidate_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_evaluations_job ON evaluations(job_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_final_scores_candidate ON final_scores(candidate_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_final_scores_job ON final_scores(job_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp)")
            
            conn.commit()
        
        self.logger.info("Database initialized")
    
    # ==================== Candidate Operations ====================
    
    def save_candidate(self, candidate_data: Dict[str, Any]) -> str:
        """
        Save or update a candidate.
        
        Args:
            candidate_data: Candidate data dictionary
            
        Returns:
            Candidate ID
        """
        candidate_id = candidate_data.get("candidate_id") or self._generate_id("CAND")
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Check if candidate exists
            cursor.execute(
                "SELECT id FROM candidates WHERE candidate_id = ?",
                (candidate_id,)
            )
            existing = cursor.fetchone()
            
            if existing:
                # Update
                cursor.execute("""
                    UPDATE candidates SET
                        full_name = ?,
                        email = ?,
                        phone = ?,
                        location = ?,
                        source = ?,
                        source_id = ?,
                        raw_resume_data = ?,
                        updated_at = ?,
                        metadata = ?
                    WHERE candidate_id = ?
                """, (
                    candidate_data.get("full_name"),
                    candidate_data.get("email"),
                    candidate_data.get("phone"),
                    json.dumps(candidate_data.get("location", {})),
                    candidate_data.get("source"),
                    candidate_data.get("source_id"),
                    json.dumps(candidate_data.get("raw_resume_data", {})),
                    datetime.utcnow().isoformat(),
                    json.dumps(candidate_data.get("metadata", {})),
                    candidate_id
                ))
            else:
                # Insert
                cursor.execute("""
                    INSERT INTO candidates (
                        candidate_id, full_name, email, phone, location,
                        source, source_id, raw_resume_data, metadata
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    candidate_id,
                    candidate_data.get("full_name"),
                    candidate_data.get("email"),
                    candidate_data.get("phone"),
                    json.dumps(candidate_data.get("location", {})),
                    candidate_data.get("source"),
                    candidate_data.get("source_id"),
                    json.dumps(candidate_data.get("raw_resume_data", {})),
                    json.dumps(candidate_data.get("metadata", {}))
                ))
            
            conn.commit()
        
        return candidate_id
    
    def get_candidate(self, candidate_id: str) -> Optional[Dict[str, Any]]:
        """Get candidate by ID"""
        
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute(
                "SELECT * FROM candidates WHERE candidate_id = ?",
                (candidate_id,)
            )
            
            row = cursor.fetchone()
            
            if row:
                return dict(row)
        
        return None
    
    def get_candidates(
        self,
        job_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get list of candidates"""
        
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            if job_id:
                cursor.execute("""
                    SELECT c.* FROM candidates c
                    JOIN final_scores fs ON c.candidate_id = fs.candidate_id
                    WHERE fs.job_id = ?
                    ORDER BY fs.normalized_score DESC
                    LIMIT ? OFFSET ?
                """, (job_id, limit, offset))
            else:
                cursor.execute("""
                    SELECT * FROM candidates
                    ORDER BY created_at DESC
                    LIMIT ? OFFSET ?
                """, (limit, offset))
            
            return [dict(row) for row in cursor.fetchall()]
    
    # ==================== Job Operations ====================
    
    def save_job(self, job_data: Dict[str, Any]) -> str:
        """Save or update a job"""
        
        job_id = job_data.get("job_id") or self._generate_id("JOB")
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO jobs (
                    job_id, title, department, description, requirements, status, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(job_id) DO UPDATE SET
                    title = excluded.title,
                    department = excluded.department,
                    description = excluded.description,
                    requirements = excluded.requirements,
                    status = excluded.status,
                    metadata = excluded.metadata,
                    updated_at = CURRENT_TIMESTAMP
            """, (
                job_id,
                job_data.get("title"),
                job_data.get("department"),
                job_data.get("description"),
                json.dumps(job_data.get("requirements", {})),
                job_data.get("status", "active"),
                json.dumps(job_data.get("metadata", {}))
            ))
            
            conn.commit()
        
        return job_id
    
    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get job by ID"""
        
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute(
                "SELECT * FROM jobs WHERE job_id = ?",
                (job_id,)
            )
            
            row = cursor.fetchone()
            
            if row:
                return dict(row)
        
        return None
    
    # ==================== Evaluation Operations ====================
    
    def save_evaluation(self, evaluation_data: Dict[str, Any]) -> str:
        """Save evaluation result"""
        
        evaluation_id = evaluation_data.get("evaluation_id") or self._generate_id("EVAL")
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Extract score if present
            score = None
            if "overall_score" in evaluation_data:
                score = evaluation_data["overall_score"].get("normalized_score")
            elif "overall_impact_score" in evaluation_data:
                score = evaluation_data["overall_impact_score"].get("normalized_score")
            elif "trajectory_score" in evaluation_data:
                score = evaluation_data["trajectory_score"].get("overall_score")
            elif "final_score" in evaluation_data:
                score = evaluation_data["final_score"].get("normalized_score")
            
            # Determine module type
            module = "unknown"
            if "skill_matches" in evaluation_data:
                module = "skill_evaluator"
            elif "achievements_evaluation" in evaluation_data:
                module = "impact_scorer"
            elif "progression_analysis" in evaluation_data:
                module = "trajectory_analyzer"
            elif "heuristic_analysis" in evaluation_data:
                module = "ai_detector"
            elif "factor_scores" in evaluation_data:
                module = "scoring_engine"
            
            processing_meta = evaluation_data.get("processing_metadata", {})
            
            cursor.execute("""
                INSERT INTO evaluations (
                    evaluation_id, candidate_id, job_id, module, status,
                    score, result_data, input_hash, output_hash, execution_time_ms
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                evaluation_id,
                evaluation_data.get("candidate_id"),
                evaluation_data.get("job_id"),
                module,
                evaluation_data.get("status", "complete"),
                score,
                json.dumps(evaluation_data),
                processing_meta.get("input_hash"),
                processing_meta.get("output_hash"),
                processing_meta.get("execution_time_ms")
            ))
            
            conn.commit()
        
        return evaluation_id
    
    def get_evaluations(
        self,
        candidate_id: str,
        module: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get evaluations for a candidate"""
        
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            if module:
                cursor.execute("""
                    SELECT * FROM evaluations
                    WHERE candidate_id = ? AND module = ?
                    ORDER BY created_at DESC
                """, (candidate_id, module))
            else:
                cursor.execute("""
                    SELECT * FROM evaluations
                    WHERE candidate_id = ?
                    ORDER BY created_at DESC
                """, (candidate_id,))
            
            return [dict(row) for row in cursor.fetchall()]
    
    # ==================== Score Operations ====================
    
    def save_final_score(self, score_data: Dict[str, Any]) -> str:
        """Save final scoring result"""
        
        score_id = score_data.get("score_id") or self._generate_id("SCORE")
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            final_score = score_data.get("final_score", {})
            recommendation = score_data.get("recommendation", {})
            
            cursor.execute("""
                INSERT INTO final_scores (
                    score_id, candidate_id, job_id, normalized_score,
                    grade, tier, recommendation, confidence, result_data
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                score_id,
                score_data.get("candidate_id"),
                score_data.get("job_id"),
                final_score.get("normalized_score"),
                final_score.get("grade"),
                final_score.get("tier"),
                recommendation.get("decision"),
                recommendation.get("confidence"),
                json.dumps(score_data)
            ))
            
            conn.commit()
        
        return score_id
    
    def get_final_scores(
        self,
        job_id: str,
        min_score: Optional[float] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get final scores for a job, ranked by score"""
        
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            if min_score is not None:
                cursor.execute("""
                    SELECT * FROM final_scores
                    WHERE job_id = ? AND normalized_score >= ?
                    ORDER BY normalized_score DESC
                    LIMIT ?
                """, (job_id, min_score, limit))
            else:
                cursor.execute("""
                    SELECT * FROM final_scores
                    WHERE job_id = ?
                    ORDER BY normalized_score DESC
                    LIMIT ?
                """, (job_id, limit))
            
            return [dict(row) for row in cursor.fetchall()]
    
    # ==================== Audit Operations ====================
    
    def log_audit(
        self,
        action: str,
        module: str,
        candidate_id: Optional[str] = None,
        job_id: Optional[str] = None,
        actor: str = "system",
        details: Optional[Dict] = None
    ) -> None:
        """Log audit entry"""
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO audit_log (action, module, candidate_id, job_id, actor, details)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                action,
                module,
                candidate_id,
                job_id,
                actor,
                json.dumps(details or {})
            ))
            
            conn.commit()
    
    def get_audit_log(
        self,
        candidate_id: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get audit log entries"""
        
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            if candidate_id:
                cursor.execute("""
                    SELECT * FROM audit_log
                    WHERE candidate_id = ?
                    ORDER BY timestamp DESC
                    LIMIT ?
                """, (candidate_id, limit))
            else:
                cursor.execute("""
                    SELECT * FROM audit_log
                    ORDER BY timestamp DESC
                    LIMIT ?
                """, (limit,))
            
            return [dict(row) for row in cursor.fetchall()]
    
    # ==================== Statistics ====================
    
    def get_statistics(self, job_id: Optional[str] = None) -> Dict[str, Any]:
        """Get evaluation statistics"""
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            stats = {
                "total_candidates": 0,
                "total_jobs": 0,
                "total_evaluations": 0,
                "avg_score": None,
                "score_distribution": {}
            }
            
            cursor.execute("SELECT COUNT(*) FROM candidates")
            stats["total_candidates"] = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM jobs")
            stats["total_jobs"] = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM evaluations")
            stats["total_evaluations"] = cursor.fetchone()[0]
            
            if job_id:
                cursor.execute("""
                    SELECT AVG(normalized_score) FROM final_scores WHERE job_id = ?
                """, (job_id,))
                stats["avg_score"] = cursor.fetchone()[0]
                
                # Score distribution
                cursor.execute("""
                    SELECT 
                        CASE 
                            WHEN normalized_score >= 90 THEN 'A'
                            WHEN normalized_score >= 80 THEN 'B'
                            WHEN normalized_score >= 70 THEN 'C'
                            WHEN normalized_score >= 60 THEN 'D'
                            ELSE 'F'
                        END as grade,
                        COUNT(*) as count
                    FROM final_scores
                    WHERE job_id = ?
                    GROUP BY grade
                """, (job_id,))
                
                for row in cursor.fetchall():
                    stats["score_distribution"][row[0]] = row[1]
            
            return stats
    
    def _generate_id(self, prefix: str) -> str:
        """Generate unique ID"""
        import time
        timestamp = int(time.time() * 1000)
        return f"{prefix}-{timestamp}-{hashlib.md5(str(timestamp).encode()).hexdigest()[:6]}"
