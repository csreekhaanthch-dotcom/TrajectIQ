"""
TrajectIQ Enterprise - Secure Logging System
============================================
Structured JSON logging with encryption at rest and audit trail.
"""

import os
import sys
import json
import gzip
import hmac
import hashlib
import secrets
import logging
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional, Dict, Any, List, Union
from dataclasses import dataclass, field
from enum import Enum
from collections import deque
import traceback

# Encryption imports
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend


class LogLevel(Enum):
    """Log levels"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"
    AUDIT = "AUDIT"


@dataclass
class LogConfig:
    """Logging configuration"""
    log_dir: str = ""
    max_file_size_mb: int = 50
    retention_days: int = 90
    encrypt_logs: bool = True
    compress_old_logs: bool = True
    buffer_size: int = 1000
    flush_interval_seconds: int = 5
    include_stack_trace: bool = True
    audit_immutable: bool = True


@dataclass
class LogEntry:
    """Structured log entry"""
    timestamp: str
    level: str
    message: str
    logger_name: str
    module: str
    function: str
    line: int
    thread_id: int
    process_id: int
    tenant_id: str = "default"
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    correlation_id: Optional[str] = None
    extra: Dict[str, Any] = field(default_factory=dict)
    exception: Optional[str] = None
    stack_trace: Optional[str] = None
    integrity_hash: Optional[str] = None


class LogEncryptor:
    """
    AES-256-GCM encryption for log files.
    Each log entry is individually encrypted with a unique nonce.
    """
    
    NONCE_SIZE = 12  # 96 bits for GCM
    KEY_SIZE = 32    # 256 bits
    
    def __init__(self, key: Optional[bytes] = None):
        if key:
            self._key = key
        else:
            self._key = secrets.token_bytes(self.KEY_SIZE)
        
        self._aesgcm = AESGCM(self._key)
    
    def encrypt(self, plaintext: bytes) -> bytes:
        """
        Encrypt data with AES-256-GCM.
        
        Args:
            plaintext: Data to encrypt
        
        Returns:
            Encrypted data (nonce + ciphertext + tag)
        """
        nonce = secrets.token_bytes(self.NONCE_SIZE)
        ciphertext = self._aesgcm.encrypt(nonce, plaintext, None)
        return nonce + ciphertext
    
    def decrypt(self, ciphertext: bytes) -> bytes:
        """
        Decrypt data.
        
        Args:
            ciphertext: Encrypted data (nonce + ciphertext + tag)
        
        Returns:
            Decrypted plaintext
        """
        nonce = ciphertext[:self.NONCE_SIZE]
        ct = ciphertext[self.NONCE_SIZE:]
        return self._aesgcm.decrypt(nonce, ct, None)
    
    def derive_key(self, password: bytes, salt: bytes) -> bytes:
        """Derive encryption key from password"""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=self.KEY_SIZE,
            salt=salt,
            iterations=100000,
            backend=default_backend()
        )
        return kdf.derive(password)
    
    def save_key(self, path: Path, password: Optional[bytes] = None):
        """Save encryption key to file"""
        if password:
            salt = secrets.token_bytes(16)
            derived_key = self.derive_key(password, salt)
            # Encrypt the actual key with the derived key
            encryptor = LogEncryptor(derived_key)
            encrypted_key = encryptor.encrypt(self._key)
            data = {
                'salt': salt.hex(),
                'encrypted_key': encrypted_key.hex()
            }
        else:
            data = {'key': self._key.hex()}
        
        path.write_text(json.dumps(data))
        try:
            os.chmod(path, 0o600)
        except:
            pass
    
    @classmethod
    def load_key(cls, path: Path, password: Optional[bytes] = None) -> 'LogEncryptor':
        """Load encryption key from file"""
        data = json.loads(path.read_text())
        
        if password:
            salt = bytes.fromhex(data['salt'])
            encrypted_key = bytes.fromhex(data['encrypted_key'])
            derived_key = LogEncryptor().derive_key(password, salt)
            encryptor = LogEncryptor(derived_key)
            key = encryptor.decrypt(encrypted_key)
        else:
            key = bytes.fromhex(data['key'])
        
        return cls(key)


class StructuredJSONFormatter(logging.Formatter):
    """
    JSON formatter for structured logging.
    Outputs log entries as JSON objects with consistent structure.
    """
    
    def __init__(
        self,
        tenant_id: str = "default",
        include_integrity_hash: bool = True,
        encryption_key: Optional[bytes] = None
    ):
        super().__init__()
        self.tenant_id = tenant_id
        self.include_integrity_hash = include_integrity_hash
        self._encryptor = LogEncryptor(encryption_key) if encryption_key else None
        self._last_hash: Optional[str] = None
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON"""
        # Build entry
        entry = LogEntry(
            timestamp=datetime.now(timezone.utc).isoformat(),
            level=record.levelname,
            message=record.getMessage(),
            logger_name=record.name,
            module=record.module,
            function=record.funcName,
            line=record.lineno,
            thread_id=record.thread,
            process_id=record.process,
            tenant_id=getattr(record, 'tenant_id', self.tenant_id),
            user_id=getattr(record, 'user_id', None),
            session_id=getattr(record, 'session_id', None),
            correlation_id=getattr(record, 'correlation_id', None),
            extra=getattr(record, 'extra', {}),
        )
        
        # Add exception info if present
        if record.exc_info:
            entry.exception = str(record.exc_info[1])
            entry.stack_trace = ''.join(traceback.format_exception(*record.exc_info))
        
        # Add integrity hash for audit trail
        if self.include_integrity_hash:
            entry_dict = self._entry_to_dict(entry)
            # Chain hashes for immutability
            hash_input = json.dumps(entry_dict, sort_keys=True)
            if self._last_hash:
                hash_input += self._last_hash
            entry.integrity_hash = hashlib.sha256(hash_input.encode()).hexdigest()
            self._last_hash = entry.integrity_hash
        
        return json.dumps(self._entry_to_dict(entry), default=str)
    
    def _entry_to_dict(self, entry: LogEntry) -> Dict[str, Any]:
        """Convert entry to dictionary"""
        return {
            '@timestamp': entry.timestamp,
            '@level': entry.level,
            '@message': entry.message,
            '@logger': entry.logger_name,
            '@module': entry.module,
            '@function': entry.function,
            '@line': entry.line,
            '@thread': entry.thread_id,
            '@process': entry.process_id,
            '@tenant': entry.tenant_id,
            '@user': entry.user_id,
            '@session': entry.session_id,
            '@correlation': entry.correlation_id,
            '@extra': entry.extra,
            '@exception': entry.exception,
            '@stack_trace': entry.stack_trace,
            '@hash': entry.integrity_hash
        }


class EncryptedLogHandler(logging.Handler):
    """
    Log handler that encrypts entries before writing to file.
    Provides encryption at rest for sensitive audit logs.
    """
    
    def __init__(
        self,
        log_path: Path,
        encryptor: Optional[LogEncryptor] = None,
        max_size_mb: int = 50,
        backup_count: int = 10
    ):
        super().__init__()
        self.log_path = Path(log_path)
        self.log_path.parent.mkdir(parents=True, exist_ok=True)
        
        self.encryptor = encryptor or LogEncryptor()
        self.max_size = max_size_mb * 1024 * 1024
        self.backup_count = backup_count
        
        self._file = None
        self._lock = threading.Lock()
        self._buffer: deque = deque(maxlen=1000)
    
    def emit(self, record: logging.LogRecord):
        """Emit encrypted log record"""
        try:
            formatted = self.format(record)
            
            with self._lock:
                # Encrypt entry
                encrypted = self.encryptor.encrypt(formatted.encode())
                
                # Write with length prefix for parsing
                length = len(encrypted)
                self._write_entry(length.to_bytes(4, 'big') + encrypted)
                
                # Check for rotation
                self._check_rotation()
                
        except Exception:
            self.handleError(record)
    
    def _write_entry(self, data: bytes):
        """Write entry to file"""
        if self._file is None:
            self._file = open(self.log_path, 'ab')
        
        self._file.write(data)
        self._file.flush()
    
    def _check_rotation(self):
        """Check and perform log rotation"""
        if self._file and self.log_path.exists():
            if self.log_path.stat().st_size >= self.max_size:
                self._rotate()
    
    def _rotate(self):
        """Rotate log files"""
        if self._file:
            self._file.close()
            self._file = None
        
        # Rotate existing backups
        for i in range(self.backup_count - 1, 0, -1):
            src = self.log_path.with_suffix(f'.{i}.log.enc')
            dst = self.log_path.with_suffix(f'.{i+1}.log.enc')
            if src.exists():
                src.rename(dst)
        
        # Rotate current file
        if self.log_path.exists():
            self.log_path.rename(self.log_path.with_suffix('.1.log.enc'))
    
    def close(self):
        """Close the handler"""
        with self._lock:
            if self._file:
                self._file.close()
                self._file = None
        super().close()
    
    def read_entries(self, count: int = 100) -> List[Dict[str, Any]]:
        """Read and decrypt recent log entries"""
        entries = []
        
        if not self.log_path.exists():
            return entries
        
        with open(self.log_path, 'rb') as f:
            # Read from end
            f.seek(0, 2)
            file_size = f.tell()
            
            # Read backwards to find entries
            position = file_size
            while position > 0 and len(entries) < count:
                # Read length prefix
                if position < 4:
                    break
                
                f.seek(position - 4)
                length_bytes = f.read(4)
                length = int.from_bytes(length_bytes, 'big')
                
                # Read encrypted entry
                entry_start = position - 4 - length
                if entry_start < 0:
                    break
                
                f.seek(entry_start)
                encrypted = f.read(length)
                
                try:
                    decrypted = self.encryptor.decrypt(encrypted)
                    entry = json.loads(decrypted)
                    entries.insert(0, entry)
                except Exception:
                    pass
                
                position = entry_start
        
        return entries


class AuditLogHandler(logging.Handler):
    """
    Special handler for audit logs with immutability guarantees.
    Implements append-only semantics with integrity verification.
    """
    
    AUDIT_PREFIX = "[AUDIT] "
    
    def __init__(
        self,
        log_path: Path,
        config: Optional[LogConfig] = None
    ):
        super().__init__()
        self.log_path = Path(log_path)
        self.log_path.parent.mkdir(parents=True, exist_ok=True)
        self.config = config or LogConfig()
        
        self._last_hash: Optional[str] = None
        self._lock = threading.Lock()
        
        # Initialize chain from existing log
        self._initialize_chain()
    
    def _initialize_chain(self):
        """Initialize hash chain from existing log entries"""
        if not self.log_path.exists():
            return
        
        with open(self.log_path, 'r') as f:
            for line in f:
                try:
                    entry = json.loads(line.strip())
                    self._last_hash = entry.get('hash')
                except:
                    pass
    
    def emit(self, record: logging.LogRecord):
        """Emit audit log entry"""
        try:
            entry = {
                '@timestamp': datetime.now(timezone.utc).isoformat(),
                '@type': 'audit',
                '@action': getattr(record, 'action', record.getMessage()),
                '@user_id': getattr(record, 'user_id', None),
                '@session_id': getattr(record, 'session_id', None),
                '@tenant_id': getattr(record, 'tenant_id', 'default'),
                '@ip_address': getattr(record, 'ip_address', None),
                '@entity_type': getattr(record, 'entity_type', None),
                '@entity_id': getattr(record, 'entity_id', None),
                '@details': getattr(record, 'details', {}),
                '@result': getattr(record, 'result', 'success'),
            }
            
            # Add integrity hash (chain)
            hash_input = json.dumps(entry, sort_keys=True)
            if self._last_hash:
                hash_input += self._last_hash
            
            entry['@hash'] = hashlib.sha256(hash_input.encode()).hexdigest()
            self._last_hash = entry['@hash']
            
            # Append to log (append-only)
            with self._lock:
                with open(self.log_path, 'a') as f:
                    f.write(json.dumps(entry, default=str) + '\n')
                    
        except Exception:
            self.handleError(record)
    
    def verify_integrity(self) -> Tuple[bool, List[str]]:
        """
        Verify audit log integrity.
        
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []
        prev_hash = None
        
        if not self.log_path.exists():
            return True, []
        
        with open(self.log_path, 'r') as f:
            for line_num, line in enumerate(f, 1):
                try:
                    entry = json.loads(line.strip())
                    current_hash = entry.get('@hash')
                    
                    # Verify hash chain
                    hash_input = json.dumps(
                        {k: v for k, v in entry.items() if k != '@hash'},
                        sort_keys=True
                    )
                    if prev_hash:
                        hash_input += prev_hash
                    
                    expected_hash = hashlib.sha256(hash_input.encode()).hexdigest()
                    
                    if current_hash != expected_hash:
                        errors.append(
                            f"Line {line_num}: Hash mismatch - possible tampering"
                        )
                    
                    prev_hash = current_hash
                    
                except json.JSONDecodeError:
                    errors.append(f"Line {line_num}: Invalid JSON")
        
        return len(errors) == 0, errors


class TelemetryManager:
    """
    Telemetry collection and reporting with privacy controls.
    Requires explicit opt-in before any data is collected.
    """
    
    TELEMETRY_VERSION = 1
    
    def __init__(
        self,
        db=None,
        tenant_id: str = "default"
    ):
        self.db = db
        self.tenant_id = tenant_id
        self._consent_given = False
        self._config: Dict[str, Any] = {}
        self._load_consent()
    
    def _load_consent(self):
        """Load telemetry consent status"""
        if self.db:
            with self.db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT enabled, settings FROM telemetry_settings
                    WHERE tenant_id = ?
                """, (self.tenant_id,))
                row = cursor.fetchone()
                
                if row:
                    self._consent_given = bool(row['enabled'])
                    self._config = json.loads(row['settings'] or '{}')
    
    def set_consent(self, consent: bool, user_id: Optional[str] = None):
        """
        Set telemetry consent.
        
        Args:
            consent: Whether telemetry is allowed
            user_id: User who gave/revoked consent
        """
        self._consent_given = consent
        
        if self.db:
            now = datetime.now(timezone.utc).isoformat()
            with self.db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO telemetry_settings 
                    (tenant_id, enabled, consent_given_at, consent_revoked_at)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(tenant_id) DO UPDATE SET
                        enabled = ?,
                        consent_given_at = COALESCE(consent_given_at, ?),
                        consent_revoked_at = ?,
                        updated_at = ?
                """, (
                    self.tenant_id, consent, now if consent else None, now if not consent else None,
                    consent, now if consent else None, now if not consent else None, now
                ))
                conn.commit()
    
    def has_consent(self) -> bool:
        """Check if telemetry consent has been given"""
        return self._consent_given
    
    def track_event(
        self,
        event_name: str,
        properties: Optional[Dict[str, Any]] = None
    ):
        """
        Track a telemetry event (only if consent given).
        
        Args:
            event_name: Name of the event
            properties: Event properties
        """
        if not self._consent_given:
            return
        
        # Sanitize properties - remove any PII
        safe_properties = self._sanitize_properties(properties or {})
        
        event = {
            'v': self.TELEMETRY_VERSION,
            'ts': datetime.now(timezone.utc).isoformat(),
            'event': event_name,
            'props': safe_properties,
            'tenant': self._hash_tenant()
        }
        
        # Store locally (would be synced to server periodically)
        if self.db:
            self.db.log_analytics(
                event_type=f"telemetry_{event_name}",
                details=event,
                tenant_id=self.tenant_id
            )
    
    def _sanitize_properties(self, props: Dict[str, Any]) -> Dict[str, Any]:
        """Remove PII from properties"""
        # Keys to remove
        pii_keys = {
            'email', 'name', 'first_name', 'last_name', 'phone',
            'address', 'ip_address', 'user_agent', 'resume_text',
            'ssn', 'dob', 'date_of_birth'
        }
        
        safe = {}
        for k, v in props.items():
            if k.lower() in pii_keys:
                continue
            if isinstance(v, dict):
                safe[k] = self._sanitize_properties(v)
            elif isinstance(v, str):
                # Truncate long strings
                safe[k] = v[:200] if len(v) > 200 else v
            else:
                safe[k] = v
        
        return safe
    
    def _hash_tenant(self) -> str:
        """Hash tenant ID for privacy"""
        return hashlib.sha256(self.tenant_id.encode()).hexdigest()[:16]
    
    def get_telemetry_report(self) -> Dict[str, Any]:
        """Get summary of collected telemetry"""
        if not self.db:
            return {}
        
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT event_type, COUNT(*) as count
                FROM analytics
                WHERE tenant_id = ? AND event_type LIKE 'telemetry_%'
                AND timestamp >= datetime('now', '-30 days')
                GROUP BY event_type
            """, (self.tenant_id,))
            
            return {
                'consent': self._consent_given,
                'events': {row['event_type']: row['count'] for row in cursor.fetchall()}
            }


# =============================================================================
# LOGGING SETUP
# =============================================================================

def setup_secure_logging(
    log_dir: Optional[Path] = None,
    config: Optional[LogConfig] = None,
    tenant_id: str = "default"
) -> logging.Logger:
    """
    Set up secure structured logging.
    
    Args:
        log_dir: Directory for log files
        config: Logging configuration
        tenant_id: Default tenant ID for logs
    
    Returns:
        Configured logger
    """
    config = config or LogConfig()
    
    if not log_dir:
        log_dir = Path.home() / ".trajectiq" / "logs"
    
    log_dir.mkdir(parents=True, exist_ok=True)
    
    # Create encryptor
    encryptor = LogEncryptor()
    encryptor.save_key(log_dir / ".log_key")
    
    # Set up root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG)
    
    # Console handler (unencrypted for development)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_formatter = StructuredJSONFormatter(
        tenant_id=tenant_id,
        include_integrity_hash=False
    )
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)
    
    # Encrypted file handler
    file_handler = EncryptedLogHandler(
        log_path=log_dir / "trajectiq.log.enc",
        encryptor=encryptor,
        max_size_mb=config.max_file_size_mb
    )
    file_handler.setLevel(logging.DEBUG)
    file_formatter = StructuredJSONFormatter(
        tenant_id=tenant_id,
        include_integrity_hash=True
    )
    file_handler.setFormatter(file_formatter)
    root_logger.addHandler(file_handler)
    
    # Audit log handler (separate file)
    audit_handler = AuditLogHandler(
        log_path=log_dir / "audit.log",
        config=config
    )
    audit_handler.setLevel(logging.INFO)
    audit_handler.addFilter(lambda r: hasattr(r, 'action') or 'AUDIT' in r.levelname)
    root_logger.addHandler(audit_handler)
    
    return root_logger


# Convenience function for audit logging
def audit_log(
    action: str,
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
    tenant_id: str = "default",
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    details: Optional[Dict] = None,
    result: str = "success"
):
    """
    Log an audit event.
    
    Args:
        action: Action being performed
        user_id: User performing the action
        session_id: Session ID
        tenant_id: Tenant ID
        entity_type: Type of entity being acted on
        entity_id: ID of entity
        details: Additional details
        result: Result of action (success/failure)
    """
    logger = logging.getLogger('audit')
    
    # Create record with extra attributes
    record = logger.makeRecord(
        logger.name, logging.INFO, '', 0, action, (), None
    )
    record.action = action
    record.user_id = user_id
    record.session_id = session_id
    record.tenant_id = tenant_id
    record.entity_type = entity_type
    record.entity_id = entity_id
    record.details = details or {}
    record.result = result
    
    logger.handle(record)


# Global telemetry instance
_telemetry: Optional[TelemetryManager] = None


def get_telemetry() -> TelemetryManager:
    """Get global telemetry manager"""
    global _telemetry
    if _telemetry is None:
        _telemetry = TelemetryManager()
    return _telemetry
