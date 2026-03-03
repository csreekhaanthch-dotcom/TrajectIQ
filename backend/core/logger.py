"""
TrajectIQ Logging Infrastructure
================================
Comprehensive logging for auditability and debugging.
"""

import logging
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional
from dataclasses import dataclass, asdict
import hashlib


@dataclass
class AuditEntry:
    """Structured audit log entry"""
    timestamp: str
    action: str
    module: str
    candidate_id: Optional[str] = None
    job_id: Optional[str] = None
    actor: str = "system"
    details: Dict[str, Any] = None
    correlation_id: Optional[str] = None
    
    def __post_init__(self):
        if self.details is None:
            self.details = {}
        if self.correlation_id is None:
            # Generate deterministic correlation ID
            content = f"{self.timestamp}{self.action}{self.module}{self.candidate_id}"
            self.correlation_id = hashlib.sha256(content.encode()).hexdigest()[:16]


class StructuredFormatter(logging.Formatter):
    """Custom formatter for structured JSON logging"""
    
    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        # Add extra fields if present
        if hasattr(record, 'candidate_id'):
            log_entry['candidate_id'] = record.candidate_id
        if hasattr(record, 'job_id'):
            log_entry['job_id'] = record.job_id
        if hasattr(record, 'correlation_id'):
            log_entry['correlation_id'] = record.correlation_id
        if hasattr(record, 'extra_data'):
            log_entry['extra_data'] = record.extra_data
        
        return json.dumps(log_entry)


class TrajectIQLogger:
    """
    Main logging class for TrajectIQ.
    Provides structured logging with audit capabilities.
    """
    
    _instance: Optional["TrajectIQLogger"] = None
    _loggers: Dict[str, logging.Logger] = {}
    
    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(
        self,
        log_level: str = "INFO",
        log_path: Optional[Path] = None,
        enable_console: bool = True,
        enable_file: bool = True,
        enable_audit: bool = True
    ):
        if hasattr(self, '_initialized') and self._initialized:
            return
        
        self.log_level = getattr(logging, log_level.upper(), logging.INFO)
        self.log_path = log_path or Path("data/logs")
        self.enable_console = enable_console
        self.enable_file = enable_file
        self.enable_audit = enable_audit
        
        # Ensure log directory exists
        self.log_path.mkdir(parents=True, exist_ok=True)
        
        # Setup audit log
        self.audit_log_path = self.log_path / "audit.log"
        self.evaluation_log_path = self.log_path / "evaluations.log"
        
        self._initialized = True
    
    def get_logger(self, name: str) -> logging.Logger:
        """Get or create a logger for a specific module"""
        if name in self._loggers:
            return self._loggers[name]
        
        logger = logging.getLogger(name)
        logger.setLevel(self.log_level)
        logger.handlers.clear()
        
        # Console handler
        if self.enable_console:
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setLevel(self.log_level)
            console_formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            console_handler.setFormatter(console_formatter)
            logger.addHandler(console_handler)
        
        # File handler with structured format
        if self.enable_file:
            file_handler = logging.FileHandler(
                self.log_path / f"{name.replace('.', '_')}.log"
            )
            file_handler.setLevel(self.log_level)
            file_handler.setFormatter(StructuredFormatter())
            logger.addHandler(file_handler)
        
        self._loggers[name] = logger
        return logger
    
    def log_audit(self, entry: AuditEntry) -> None:
        """Log an audit entry"""
        if not self.enable_audit:
            return
        
        audit_logger = self.get_logger("audit")
        audit_logger.info(
            "AUDIT",
            extra={
                "candidate_id": entry.candidate_id,
                "job_id": entry.job_id,
                "correlation_id": entry.correlation_id,
                "extra_data": asdict(entry)
            }
        )
        
        # Also write to dedicated audit file
        with open(self.audit_log_path, "a") as f:
            f.write(json.dumps(asdict(entry)) + "\n")
    
    def log_evaluation(
        self,
        module: str,
        candidate_id: str,
        job_id: str,
        input_hash: str,
        output_hash: str,
        score: float,
        execution_time_ms: float
    ) -> None:
        """Log evaluation results for reproducibility"""
        entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "module": module,
            "candidate_id": candidate_id,
            "job_id": job_id,
            "input_hash": input_hash,
            "output_hash": output_hash,
            "score": score,
            "execution_time_ms": execution_time_ms
        }
        
        with open(self.evaluation_log_path, "a") as f:
            f.write(json.dumps(entry) + "\n")


# Global logger instance
def get_logger(name: str) -> logging.Logger:
    """Convenience function to get a logger"""
    from .config import config
    logger_instance = TrajectIQLogger(
        log_level=config.log_level,
        log_path=config.logs_path
    )
    return logger_instance.get_logger(name)


def log_audit(
    action: str,
    module: str,
    candidate_id: Optional[str] = None,
    job_id: Optional[str] = None,
    details: Optional[Dict] = None
) -> None:
    """Convenience function to log audit entries"""
    from .config import config
    logger_instance = TrajectIQLogger(
        log_level=config.log_level,
        log_path=config.logs_path
    )
    
    entry = AuditEntry(
        timestamp=datetime.utcnow().isoformat() + "Z",
        action=action,
        module=module,
        candidate_id=candidate_id,
        job_id=job_id,
        details=details or {}
    )
    logger_instance.log_audit(entry)
