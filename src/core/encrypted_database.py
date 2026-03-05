"""
TrajectIQ Enterprise - Encrypted Database Layer
================================================
AES-256-GCM encrypted SQLite database using SQLCipher.
Provides transparent encryption at rest with Argon2 key derivation.
"""

import os
import json
import hashlib
import uuid
import secrets
import hmac
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
from contextlib import contextmanager
from dataclasses import dataclass
import threading
import logging

# Try to import sqlcipher3, fall back to regular sqlite3 for development
try:
    from sqlcipher3 import dbapi2 as sqlite3
    SQLCIPHER_AVAILABLE = True
except ImportError:
    import sqlite3
    SQLCIPHER_AVAILABLE = False
    logging.warning("SQLCipher not available - using unencrypted SQLite (development mode)")

# Argon2 for key derivation
try:
    from argon2.low_level import hash_secret_raw, Type
    ARGON2_AVAILABLE = True
except ImportError:
    ARGON2_AVAILABLE = False
    logging.warning("Argon2 not available - using PBKDF2 fallback")


@dataclass
class DatabaseConfig:
    """Database configuration"""
    db_path: str
    encryption_key: Optional[bytes] = None
    kdf_iterations: int = 100000
    cache_size: int = -64000  # 64MB cache
    wal_autocheckpoint: int = 1000


class KeyDerivation:
    """
    Secure key derivation using Argon2id or PBKDF2.
    Derives encryption keys from passwords/passphrases.
    """
    
    # Argon2 parameters (OWASP recommended)
    ARGON2_TIME_COST = 3  # iterations
    ARGON2_MEMORY_COST = 65536  # 64 MB
    ARGON2_PARALLELISM = 4
    ARGON2_HASH_LEN = 32  # 256 bits
    
    @staticmethod
    def derive_key_argon2(password: bytes, salt: bytes) -> bytes:
        """Derive key using Argon2id"""
        if not ARGON2_AVAILABLE:
            return KeyDerivation.derive_key_pbkdf2(password, salt)
        
        return hash_secret_raw(
            secret=password,
            salt=salt,
            time_cost=KeyDerivation.ARGON2_TIME_COST,
            memory_cost=KeyDerivation.ARGON2_MEMORY_COST,
            parallelism=KeyDerivation.ARGON2_PARALLELISM,
            hash_len=KeyDerivation.ARGON2_HASH_LEN,
            type=Type.ID
        )
    
    @staticmethod
    def derive_key_pbkdf2(password: bytes, salt: bytes, iterations: int = 100000) -> bytes:
        """Derive key using PBKDF2-HMAC-SHA256 (fallback)"""
        return hashlib.pbkdf2_hmac(
            'sha256',
            password,
            salt,
            iterations,
            dklen=32
        )
    
    @staticmethod
    def derive_key(password: bytes, salt: bytes) -> bytes:
        """Derive key using best available method"""
        if ARGON2_AVAILABLE:
            return KeyDerivation.derive_key_argon2(password, salt)
        return KeyDerivation.derive_key_pbkdf2(password, salt)
    
    @staticmethod
    def generate_salt() -> bytes:
        """Generate cryptographically secure salt"""
        return secrets.token_bytes(32)


class EncryptedDatabaseManager:
    """
    Thread-safe encrypted SQLite database manager.
    Uses SQLCipher for transparent AES-256-GCM encryption.
    
    Features:
    - AES-256-GCM encryption at rest
    - Argon2id key derivation
    - WAL mode for concurrency
    - Full audit trail
    - Schema versioning
    - Secure key storage
    """
    
    _instance = None
    _lock = threading.Lock()
    
    # Schema version for migrations
    SCHEMA_VERSION = 3
    
    def __new__(cls, config: Optional[DatabaseConfig] = None):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self, config: Optional[DatabaseConfig] = None):
        if hasattr(self, '_initialized') and self._initialized:
            return
        
        self.config = config or DatabaseConfig(
            db_path=str(Path.home() / ".trajectiq" / "data" / "trajectiq_encrypted.db")
        )
        
        self.db_path = Path(self.config.db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        self._local = threading.local()
        self._initialized = True
        self._logger = logging.getLogger(__name__)
        
        # Key storage path
        self._key_file = self.db_path.parent / ".keyring"
        
        # Initialize or load encryption key
        self._encryption_key = self._initialize_encryption()
        
        # Create schema
        self._create_schema()
        
        # Run migrations if needed
        self._run_migrations()
    
    def _initialize_encryption(self) -> Optional[bytes]:
        """Initialize or load encryption key"""
        if not SQLCIPHER_AVAILABLE:
            self._logger.warning("Running in unencrypted mode - SQLCipher not available")
            return None
        
        if self.config.encryption_key:
            return self.config.encryption_key
        
        # Check for existing key
        if self._key_file.exists():
            try:
                key_data = json.loads(self._key_file.read_text())
                salt = bytes.fromhex(key_data['salt'])
                key_hash = key_data.get('key_hash')
                
                # Derive key from stored salt and machine-specific secret
                machine_secret = self._get_machine_secret()
                derived_key = KeyDerivation.derive_key(machine_secret, salt)
                
                # Verify key integrity
                if key_hash:
                    expected_hash = hashlib.sha256(derived_key).hexdigest()
                    if not hmac.compare_digest(key_hash, expected_hash):
                        raise ValueError("Key integrity check failed")
                
                return derived_key
            except Exception as e:
                self._logger.error(f"Failed to load encryption key: {e}")
        
        # Generate new key
        return self._generate_new_key()
    
    def _generate_new_key(self) -> bytes:
        """Generate new encryption key"""
        salt = KeyDerivation.generate_salt()
        machine_secret = self._get_machine_secret()
        derived_key = KeyDerivation.derive_key(machine_secret, salt)
        
        # Store salt and key hash (not the key itself)
        key_data = {
            'salt': salt.hex(),
            'key_hash': hashlib.sha256(derived_key).hexdigest(),
            'created_at': datetime.utcnow().isoformat(),
            'kdf': 'argon2id' if ARGON2_AVAILABLE else 'pbkdf2'
        }
        
        # Secure file permissions
        self._key_file.write_text(json.dumps(key_data))
        try:
            os.chmod(self._key_file, 0o600)
        except Exception:
            pass
        
        return derived_key
    
    def _get_machine_secret(self) -> bytes:
        """Get machine-specific secret for key derivation"""
        import platform
        
        # Combine multiple machine identifiers
        components = [
            platform.node(),
            platform.machine(),
            str(uuid.getnode()),
            str(os.getuid() if hasattr(os, 'getuid') else 0)
        ]
        
        # Add stored random component if exists
        random_file = self.db_path.parent / ".entropy"
        if random_file.exists():
            components.append(random_file.read_text())
        else:
            entropy = secrets.token_hex(32)
            random_file.write_text(entropy)
            try:
                os.chmod(random_file, 0o600)
            except:
                pass
            components.append(entropy)
        
        return "|".join(components).encode()
    
    @contextmanager
    def get_connection(self):
        """Get thread-local encrypted database connection"""
        if not hasattr(self._local, 'connection') or self._local.connection is None:
            self._local.connection = sqlite3.connect(
                str(self.db_path),
                detect_types=sqlite3.PARSE_DECLTYPES | sqlite3.PARSE_COLNAMES
            )
            self._local.connection.row_factory = sqlite3.Row
            
            # Apply encryption if SQLCipher is available
            if SQLCIPHER_AVAILABLE and self._encryption_key:
                self._apply_encryption(self._local.connection)
            
            # Apply PRAGMA settings
            self._local.connection.execute("PRAGMA foreign_keys = ON")
            self._local.connection.execute("PRAGMA journal_mode = WAL")
            self._local.connection.execute(f"PRAGMA cache_size = {self.config.cache_size}")
            self._local.connection.execute(f"PRAGMA wal_autocheckpoint = {self.config.wal_autocheckpoint}")
            self._local.connection.execute("PRAGMA secure_delete = ON")
            self._local.connection.execute("PRAGMA synchronous = FULL")
        
        try:
            yield self._local.connection
        except Exception as e:
            self._local.connection.rollback()
            self._logger.error(f"Database error: {e}")
            raise
    
    def _apply_encryption(self, conn):
        """Apply SQLCipher encryption to connection"""
        key = self._encryption_key
        # SQLCipher key format
        conn.execute(f"PRAGMA key = \"x'{key.hex()}'\"")
        # Verify encryption is working
        try:
            conn.execute("SELECT count(*) FROM sqlite_master")
        except sqlite3.DatabaseError:
            raise ValueError("Failed to decrypt database - wrong key or corrupted database")
    
    def _create_schema(self):
        """Create complete database schema with all tables"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Schema version table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS schema_version (
                    version INTEGER PRIMARY KEY,
                    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    description TEXT
                )
            """)
            
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
                    tenant_id TEXT DEFAULT 'default',
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
                    tenant_id TEXT DEFAULT 'default',
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)
            
            # Audit log table (immutable)
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
                    tenant_id TEXT DEFAULT 'default',
                    integrity_hash TEXT,
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
                    tenant_id TEXT DEFAULT 'default',
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
                    
                    skill_score REAL,
                    skill_weight REAL DEFAULT 0.35,
                    skill_details TEXT,
                    
                    impact_score REAL,
                    impact_weight REAL DEFAULT 0.25,
                    impact_details TEXT,
                    
                    trajectory_score REAL,
                    trajectory_weight REAL DEFAULT 0.25,
                    trajectory_details TEXT,
                    
                    experience_score REAL,
                    experience_weight REAL DEFAULT 0.15,
                    experience_details TEXT,
                    
                    ai_detection_score REAL,
                    ai_detection_details TEXT,
                    
                    hiring_index REAL,
                    grade TEXT,
                    tier INTEGER,
                    recommendation TEXT,
                    
                    processing_time_ms REAL,
                    ai_enhanced INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    
                    input_hash TEXT,
                    output_hash TEXT,
                    config_hash TEXT,
                    
                    tenant_id TEXT DEFAULT 'default',
                    
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
                    tenant_id TEXT DEFAULT 'default',
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
                    tenant_id TEXT DEFAULT 'default',
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
                    tenant_id TEXT DEFAULT 'default',
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """)
            
            # Bias metrics table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS bias_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    analysis_date DATE NOT NULL,
                    total_evaluations INTEGER DEFAULT 0,
                    score_distribution TEXT,
                    potential_bias_flags TEXT,
                    fairness_score REAL,
                    recommendations TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    tenant_id TEXT DEFAULT 'default',
                    UNIQUE(analysis_date, tenant_id)
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
                    tenant_id TEXT DEFAULT 'default',
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
                    tenant_id TEXT DEFAULT 'default',
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
                    error_message TEXT,
                    tenant_id TEXT DEFAULT 'default'
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
                    tenant_id TEXT DEFAULT 'default',
                    FOREIGN KEY (changed_by) REFERENCES users(id)
                )
            """)
            
            # Tenants table (for SaaS mode)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS tenants (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tenant_id TEXT UNIQUE NOT NULL,
                    organization_name TEXT NOT NULL,
                    encryption_key_hash TEXT,
                    settings TEXT,
                    usage_quota INTEGER DEFAULT 1000,
                    usage_current INTEGER DEFAULT 0,
                    billing_email TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_active INTEGER DEFAULT 1
                )
            """)
            
            # API keys table (for SaaS mode)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS api_keys (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    key_id TEXT UNIQUE NOT NULL,
                    key_hash TEXT NOT NULL,
                    tenant_id TEXT NOT NULL,
                    name TEXT,
                    permissions TEXT,
                    created_by INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP,
                    last_used_at TIMESTAMP,
                    is_active INTEGER DEFAULT 1,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
                    FOREIGN KEY (created_by) REFERENCES users(id)
                )
            """)
            
            # License validation timestamps (for clock rollback protection)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS license_validation_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    validation_timestamp TIMESTAMP NOT NULL,
                    server_timestamp TIMESTAMP,
                    license_id TEXT,
                    machine_fingerprint TEXT,
                    validation_result TEXT,
                    drift_seconds INTEGER,
                    tenant_id TEXT DEFAULT 'default'
                )
            """)
            
            # Update system table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS update_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    from_version TEXT,
                    to_version TEXT NOT NULL,
                    update_type TEXT,
                    manifest_hash TEXT,
                    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    rollback_available INTEGER DEFAULT 1,
                    tenant_id TEXT DEFAULT 'default'
                )
            """)
            
            # Scoring weights configuration
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS scoring_config (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    config_id TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    weights TEXT NOT NULL,
                    is_default INTEGER DEFAULT 0,
                    created_by INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    tenant_id TEXT DEFAULT 'default',
                    FOREIGN KEY (created_by) REFERENCES users(id)
                )
            """)
            
            # Telemetry settings
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS telemetry_settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tenant_id TEXT UNIQUE NOT NULL DEFAULT 'default',
                    enabled INTEGER DEFAULT 0,
                    consent_given_at TIMESTAMP,
                    consent_revoked_at TIMESTAMP,
                    last_sync_at TIMESTAMP,
                    settings TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create indexes
            indexes = [
                "CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)",
                "CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)",
                "CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id)",
                "CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status)",
                "CREATE INDEX IF NOT EXISTS idx_candidates_tenant ON candidates(tenant_id)",
                "CREATE INDEX IF NOT EXISTS idx_evaluations_candidate ON evaluations(candidate_id)",
                "CREATE INDEX IF NOT EXISTS idx_evaluations_hiring_index ON evaluations(hiring_index)",
                "CREATE INDEX IF NOT EXISTS idx_evaluations_tenant ON evaluations(tenant_id)",
                "CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)",
                "CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)",
                "CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp)",
                "CREATE INDEX IF NOT EXISTS idx_bias_metrics_date ON bias_metrics(analysis_date)",
                "CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id)",
                "CREATE INDEX IF NOT EXISTS idx_tenant_isolation ON evaluations(tenant_id, created_at)",
            ]
            
            for index_sql in indexes:
                cursor.execute(index_sql)
            
            # Create default scoring config
            cursor.execute("""
                INSERT OR IGNORE INTO scoring_config (config_id, name, weights, is_default)
                VALUES ('default', 'Standard Software Engineering', 
                        '{"skills": 0.35, "impact": 0.25, "trajectory": 0.25, "experience": 0.15}', 1)
            """)
            
            conn.commit()
    
    def _run_migrations(self):
        """Run database migrations"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Check current version
            cursor.execute("SELECT COALESCE(MAX(version), 0) FROM schema_version")
            current_version = cursor.fetchone()[0]
            
            migrations = [
                (1, "Initial schema"),
                (2, "Add tenant isolation"),
                (3, "Add telemetry and update tracking"),
            ]
            
            for version, description in migrations:
                if version > current_version:
                    self._apply_migration(conn, version, description)
    
    def _apply_migration(self, conn, version: int, description: str):
        """Apply a single migration"""
        cursor = conn.cursor()
        
        # Migration-specific logic would go here
        # For now, just record the version
        cursor.execute(
            "INSERT INTO schema_version (version, description) VALUES (?, ?)",
            (version, description)
        )
        conn.commit()
        
        self._logger.info(f"Applied migration {version}: {description}")
    
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
        output_hash: Optional[str] = None,
        tenant_id: str = 'default'
    ) -> int:
        """Log an audit event with integrity hash"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Create integrity hash for immutability
            timestamp = datetime.utcnow().isoformat()
            integrity_data = f"{timestamp}|{action}|{user_id}|{entity_type}|{entity_id}"
            integrity_hash = hashlib.sha256(integrity_data.encode()).hexdigest()
            
            cursor.execute("""
                INSERT INTO audit_logs 
                (user_id, session_id, action, entity_type, entity_id, details, 
                 ip_address, input_hash, output_hash, tenant_id, integrity_hash)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id, session_id, action, entity_type, entity_id,
                json.dumps(details) if details else None,
                ip_address, input_hash, output_hash, tenant_id, integrity_hash
            ))
            conn.commit()
            return cursor.lastrowid
    
    def log_analytics(
        self,
        event_type: str,
        user_id: Optional[int] = None,
        details: Optional[Dict] = None,
        tenant_id: str = 'default'
    ) -> int:
        """Log an analytics event"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO analytics (event_type, user_id, details, tenant_id)
                VALUES (?, ?, ?, ?)
            """, (event_type, user_id, json.dumps(details) if details else None, tenant_id))
            conn.commit()
            return cursor.lastrowid
    
    def record_license_validation(
        self,
        license_id: str,
        machine_fingerprint: str,
        result: str,
        server_time: Optional[datetime] = None,
        tenant_id: str = 'default'
    ) -> Tuple[bool, int]:
        """
        Record license validation for clock rollback protection.
        Returns (is_valid, drift_seconds).
        """
        now = datetime.utcnow()
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Get last validation
            cursor.execute("""
                SELECT validation_timestamp FROM license_validation_history
                WHERE license_id = ? AND tenant_id = ?
                ORDER BY validation_timestamp DESC LIMIT 1
            """, (license_id, tenant_id))
            
            row = cursor.fetchone()
            drift_seconds = 0
            
            if row:
                last_validation = datetime.fromisoformat(row['validation_timestamp'])
                drift_seconds = int((now - last_validation).total_seconds())
                
                # Check for clock rollback (negative drift or unreasonable gap)
                if drift_seconds < -60:  # More than 60 seconds in the past
                    self._logger.warning(f"Possible clock rollback detected: {drift_seconds}s")
                    return False, drift_seconds
            
            # Record this validation
            cursor.execute("""
                INSERT INTO license_validation_history 
                (validation_timestamp, server_timestamp, license_id, 
                 machine_fingerprint, validation_result, drift_seconds, tenant_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (now, server_time, license_id, machine_fingerprint, result, drift_seconds, tenant_id))
            conn.commit()
            
            return True, drift_seconds
    
    def get_usage_stats(self, tenant_id: str = 'default') -> Dict[str, Any]:
        """Get usage statistics for a tenant"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Get tenant usage
            cursor.execute("""
                SELECT usage_quota, usage_current 
                FROM tenants WHERE tenant_id = ?
            """, (tenant_id,))
            tenant_row = cursor.fetchone()
            
            # Get evaluation count
            cursor.execute("""
                SELECT COUNT(*) as count FROM evaluations
                WHERE tenant_id = ? AND created_at >= datetime('now', '-30 days')
            """, (tenant_id,))
            eval_count = cursor.fetchone()['count']
            
            return {
                'quota': tenant_row['usage_quota'] if tenant_row else 1000,
                'current': tenant_row['usage_current'] if tenant_row else 0,
                'evaluations_30d': eval_count
            }
    
    def increment_usage(self, tenant_id: str = 'default', amount: int = 1) -> bool:
        """Increment usage counter for a tenant"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Check quota
            cursor.execute("""
                SELECT usage_quota, usage_current FROM tenants
                WHERE tenant_id = ? AND is_active = 1
            """, (tenant_id,))
            row = cursor.fetchone()
            
            if not row:
                # Create default tenant if not exists
                cursor.execute("""
                    INSERT OR IGNORE INTO tenants (tenant_id, organization_name)
                    VALUES (?, 'Default Organization')
                """, (tenant_id,))
                conn.commit()
                row = {'usage_quota': 1000, 'usage_current': 0}
            
            new_usage = (row['usage_current'] or 0) + amount
            if new_usage > row['usage_quota']:
                return False  # Over quota
            
            cursor.execute("""
                UPDATE tenants SET usage_current = ?, updated_at = ?
                WHERE tenant_id = ?
            """, (new_usage, datetime.utcnow(), tenant_id))
            conn.commit()
            
            return True
    
    @staticmethod
    def hash_content(content: str) -> str:
        """Generate SHA-256 hash of content"""
        return hashlib.sha256(content.encode()).hexdigest()
    
    @staticmethod
    def generate_id(prefix: str = "") -> str:
        """Generate unique ID with prefix"""
        return f"{prefix}-{uuid.uuid4().hex[:12].upper()}"


# Singleton instance
_encrypted_db_manager: Optional[EncryptedDatabaseManager] = None


def get_encrypted_database() -> EncryptedDatabaseManager:
    """Get global encrypted database manager"""
    global _encrypted_db_manager
    if _encrypted_db_manager is None:
        _encrypted_db_manager = EncryptedDatabaseManager()
    return _encrypted_db_manager
