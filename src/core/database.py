"""
TrajectIQ Enterprise Database Manager
=====================================
SQLite database with encrypted storage and full audit trail.
"""

import sqlite3
import json
import hashlib
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
from contextlib import contextmanager
import threading


class DatabaseManager:
    """
    Thread-safe SQLite database manager with encryption support.
    Implements full audit trail and secure data handling.
    """
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls, db_path: str = None):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self, db_path: str = None):
        if hasattr(self, '_initialized') and self._initialized:
            return
        
        self.db_path = Path(db_path) if db_path else Path.home() / ".trajectiq" / "data" / "trajectiq.db"
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        self._local = threading.local()
        self._initialized = True
        
        self._create_schema()
    
    @contextmanager
    def get_connection(self):
        """Get thread-local database connection"""
        if not hasattr(self._local, 'connection') or self._local.connection is None:
            self._local.connection = sqlite3.connect(
                str(self.db_path),
                detect_types=sqlite3.PARSE_DECLTYPES | sqlite3.PARSE_COLNAMES
            )
            self._local.connection.row_factory = sqlite3.Row
            self._local.connection.execute("PRAGMA foreign_keys = ON")
            self._local.connection.execute("PRAGMA journal_mode = WAL")
        
        try:
            yield self._local.connection
        except Exception as e:
            self._local.connection.rollback()
            raise
    
    def _create_schema(self):
        """Create complete database schema"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Users table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    salt TEXT NOT NULL,
                    role TEXT NOT NULL CHECK(role IN ('super_admin', 'hr_admin', 'recruiter', 'auditor')),
                    full_name TEXT NOT NULL,
                    email TEXT,
                    is_active INTEGER DEFAULT 1,
                    failed_login_attempts INTEGER DEFAULT 0,
                    locked_until TIMESTAMP,
                    last_login TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_by INTEGER,
                    FOREIGN KEY (created_by) REFERENCES users(id)
                )
            """)
            
            # Sessions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT UNIQUE NOT NULL,
                    user_id INTEGER NOT NULL,
                    ip_address TEXT,
                    user_agent TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP NOT NULL,
                    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_active INTEGER DEFAULT 1,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)
            
            # Audit log table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    user_id INTEGER,
                    session_id TEXT,
                    action TEXT NOT NULL,
                    entity_type TEXT,
                    entity_id TEXT,
                    details TEXT,
                    ip_address TEXT,
                    input_hash TEXT,
                    output_hash TEXT,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """)
            
            # Candidates table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS candidates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    candidate_id TEXT UNIQUE NOT NULL,
                    first_name TEXT,
                    last_name TEXT,
                    email TEXT,
                    phone TEXT,
                    resume_path TEXT,
                    resume_text TEXT,
                    resume_hash TEXT,
                    source TEXT DEFAULT 'manual',
                    source_id TEXT,
                    job_id TEXT,
                    status TEXT DEFAULT 'pending',
                    assigned_recruiter_id INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    processed_at TIMESTAMP,
                    FOREIGN KEY (assigned_recruiter_id) REFERENCES users(id)
                )
            """)
            
            # Evaluations table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS evaluations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    evaluation_id TEXT UNIQUE NOT NULL,
                    candidate_id TEXT NOT NULL,
                    job_id TEXT,
                    user_id INTEGER NOT NULL,
                    ai_mode TEXT DEFAULT 'off',
                    
                    -- Skill scores
                    skill_score REAL,
                    skill_weight REAL DEFAULT 0.35,
                    skill_details TEXT,
                    
                    -- Impact scores
                    impact_score REAL,
                    impact_weight REAL DEFAULT 0.25,
                    impact_details TEXT,
                    
                    -- Trajectory scores
                    trajectory_score REAL,
                    trajectory_weight REAL DEFAULT 0.25,
                    trajectory_details TEXT,
                    
                    -- Experience scores
                    experience_score REAL,
                    experience_weight REAL DEFAULT 0.15,
                    experience_details TEXT,
                    
                    -- AI detection
                    ai_detection_score REAL,
                    ai_detection_details TEXT,
                    
                    -- Final scores
                    hiring_index REAL,
                    grade TEXT,
                    tier INTEGER,
                    recommendation TEXT,
                    
                    -- Metadata
                    processing_time_ms REAL,
                    ai_enhanced INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    
                    -- Audit
                    input_hash TEXT,
                    output_hash TEXT,
                    
                    FOREIGN KEY (candidate_id) REFERENCES candidates(candidate_id),
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """)
            
            # Risk flags table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS risk_flags (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    evaluation_id TEXT NOT NULL,
                    flag_type TEXT NOT NULL,
                    severity TEXT CHECK(severity IN ('info', 'warning', 'critical')),
                    description TEXT,
                    details TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (evaluation_id) REFERENCES evaluations(evaluation_id)
                )
            """)
            
            # Jobs table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS jobs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_id TEXT UNIQUE NOT NULL,
                    title TEXT NOT NULL,
                    department TEXT,
                    location TEXT,
                    description TEXT,
                    requirements TEXT,
                    status TEXT DEFAULT 'open',
                    created_by INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (created_by) REFERENCES users(id)
                )
            """)
            
            # Analytics table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS analytics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    event_type TEXT NOT NULL,
                    user_id INTEGER,
                    details TEXT,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """)
            
            # Bias metrics table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS bias_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    analysis_date DATE NOT NULL,
                    total_evaluations INTEGER DEFAULT 0,
                    
                    -- Score distributions
                    score_distribution TEXT,
                    
                    -- Detected patterns
                    potential_bias_flags TEXT,
                    fairness_score REAL,
                    
                    -- Recommendations
                    recommendations TEXT,
                    
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(analysis_date)
                )
            """)
            
            # License usage table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS license_usage (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    session_id TEXT,
                    user_id INTEGER,
                    action TEXT,
                    machine_fingerprint TEXT,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """)
            
            # Email processing queue
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS email_queue (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email_id TEXT UNIQUE NOT NULL,
                    sender TEXT,
                    subject TEXT,
                    received_at TIMESTAMP,
                    processed_at TIMESTAMP,
                    status TEXT DEFAULT 'pending',
                    resume_extracted INTEGER DEFAULT 0,
                    candidate_id TEXT,
                    error_message TEXT,
                    FOREIGN KEY (candidate_id) REFERENCES candidates(candidate_id)
                )
            """)
            
            # ATS sync log
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS ats_sync_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    provider TEXT NOT NULL,
                    sync_type TEXT NOT NULL,
                    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    completed_at TIMESTAMP,
                    status TEXT DEFAULT 'running',
                    records_processed INTEGER DEFAULT 0,
                    records_created INTEGER DEFAULT 0,
                    records_updated INTEGER DEFAULT 0,
                    error_message TEXT
                )
            """)
            
            # Configuration versions
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS config_versions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    version INTEGER NOT NULL,
                    config_hash TEXT NOT NULL,
                    changed_by INTEGER,
                    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    change_description TEXT,
                    FOREIGN KEY (changed_by) REFERENCES users(id)
                )
            """)
            
            # Create indexes
            indexes = [
                "CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)",
                "CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)",
                "CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status)",
                "CREATE INDEX IF NOT EXISTS idx_evaluations_candidate ON evaluations(candidate_id)",
                "CREATE INDEX IF NOT EXISTS idx_evaluations_hiring_index ON evaluations(hiring_index)",
                "CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)",
                "CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)",
                "CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp)",
                "CREATE INDEX IF NOT EXISTS idx_bias_metrics_date ON bias_metrics(analysis_date)"
            ]
            
            for index_sql in indexes:
                cursor.execute(index_sql)
            
            conn.commit()
    
    def log_audit(
        self,
        action: str,
        user_id: Optional[int] = None,
        session_id: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        details: Optional[Dict] = None,
        ip_address: Optional[str] = None,
        input_hash: Optional[str] = None,
        output_hash: Optional[str] = None
    ) -> int:
        """Log an audit event"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO audit_logs 
                (user_id, session_id, action, entity_type, entity_id, details, ip_address, input_hash, output_hash)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id, session_id, action, entity_type, entity_id,
                json.dumps(details) if details else None,
                ip_address, input_hash, output_hash
            ))
            conn.commit()
            return cursor.lastrowid
    
    def log_analytics(
        self,
        event_type: str,
        user_id: Optional[int] = None,
        details: Optional[Dict] = None
    ) -> int:
        """Log an analytics event"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO analytics (event_type, user_id, details)
                VALUES (?, ?, ?)
            """, (event_type, user_id, json.dumps(details) if details else None))
            conn.commit()
            return cursor.lastrowid
    
    @staticmethod
    def hash_content(content: str) -> str:
        """Generate SHA-256 hash of content"""
        return hashlib.sha256(content.encode()).hexdigest()
    
    @staticmethod
    def generate_id(prefix: str = "") -> str:
        """Generate unique ID with prefix"""
        return f"{prefix}-{uuid.uuid4().hex[:12].upper()}"


# Global database instance
db_manager: Optional[DatabaseManager] = None


def get_database() -> DatabaseManager:
    """Get global database manager"""
    global db_manager
    if db_manager is None:
        db_manager = DatabaseManager()
    return db_manager
