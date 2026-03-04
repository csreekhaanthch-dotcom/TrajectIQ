"""
TrajectIQ Analytics Module
==========================
Privacy-respecting analytics for usage insights.

Design Principles:
1. No personally identifiable information (PII) collected
2. User opt-in required (disabled by default)
3. Anonymous, aggregated data only
4. Transparent about what is collected
5. Easy to disable at any time
"""

import json
import hashlib
import platform
import sys
from datetime import datetime
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
from pathlib import Path
import threading


@dataclass
class AnalyticsEvent:
    """Anonymous analytics event"""
    event_type: str
    timestamp: str
    metadata: Dict[str, Any]
    session_id: str  # Anonymous session identifier
    app_version: str
    platform: str


class PrivacyRespectingAnalytics:
    """
    Analytics system that respects user privacy.

    What is collected (when enabled):
    - Feature usage counts (e.g., "evaluations_run": 150)
    - Performance metrics (e.g., average evaluation time)
    - Error counts (no error details, just occurrence)
    - System info (OS, Python version - no hardware IDs)

    What is NOT collected:
    - Resume content or candidate information
    - Job descriptions
    - User credentials or personal data
    - Company names or identifiers
    - IP addresses
    - Hardware fingerprints
    """

    # Class-level configuration
    _enabled = False
    _endpoint = "https://analytics.trajectiq.com/v1/events"
    _session_id: Optional[str] = None
    _events: List[AnalyticsEvent] = []
    _lock = threading.Lock()

    VERSION = "3.0.2"

    # Metrics we track (aggregated only)
    AGGREGATED_METRICS = {
        "evaluations_run": 0,
        "resumes_processed": 0,
        "jobs_created": 0,
        "ats_connections": 0,
        "email_scans": 0,
        "bias_checks_run": 0,
        "reports_generated": 0,
        "errors_encountered": 0,
        "avg_evaluation_time_ms": 0.0,
        "session_duration_seconds": 0,
    }

    @classmethod
    def is_enabled(cls) -> bool:
        """Check if analytics is enabled"""
        return cls._enabled

    @classmethod
    def enable(cls, consent: bool = True):
        """
        Enable analytics with user consent.

        Args:
            consent: User has explicitly consented to analytics
        """
        if consent:
            cls._enabled = True
            cls._session_id = cls._generate_anonymous_session_id()
            cls._events = []
            cls._record_event("session_start", {"first_enable": True})

    @classmethod
    def disable(cls):
        """Disable analytics and clear any pending events"""
        cls._enabled = False
        cls._events = []
        cls._session_id = None

    @classmethod
    def toggle(cls, enabled: bool):
        """Toggle analytics on/off"""
        if enabled:
            cls.enable()
        else:
            cls.disable()

    @staticmethod
    def _generate_anonymous_session_id() -> str:
        """Generate an anonymous session ID (not traceable to user)"""
        import secrets
        return f"anon_{secrets.token_hex(16)}"

    @classmethod
    def _record_event(cls, event_type: str, metadata: Dict[str, Any] = None):
        """Record an analytics event (if enabled)"""
        if not cls._enabled:
            return

        event = AnalyticsEvent(
            event_type=event_type,
            timestamp=datetime.utcnow().isoformat(),
            metadata=metadata or {},
            session_id=cls._session_id or "unknown",
            app_version=cls.VERSION,
            platform=f"{platform.system()}-{platform.machine()}"
        )

        with cls._lock:
            cls._events.append(event)

    @classmethod
    def track_evaluation(cls, duration_ms: float, success: bool):
        """
        Track a resume evaluation.

        Args:
            duration_ms: Time taken for evaluation in milliseconds
            success: Whether evaluation completed successfully
        """
        if not cls._enabled:
            return

        with cls._lock:
            cls.AGGREGATED_METRICS["evaluations_run"] += 1
            cls.AGGREGATED_METRICS["resumes_processed"] += 1

            # Update rolling average
            current_avg = cls.AGGREGATED_METRICS["avg_evaluation_time_ms"]
            count = cls.AGGREGATED_METRICS["evaluations_run"]
            cls.AGGREGATED_METRICS["avg_evaluation_time_ms"] = (
                (current_avg * (count - 1) + duration_ms) / count
            )

        if not success:
            cls._record_event("evaluation_error", {"duration_ms": duration_ms})

    @classmethod
    def track_bias_check(cls, bias_detected: bool, bias_types: List[str] = None):
        """
        Track a bias detection run.

        Args:
            bias_detected: Whether bias was detected
            bias_types: Types of bias detected (anonymized)
        """
        if not cls._enabled:
            return

        with cls._lock:
            cls.AGGREGATED_METRICS["bias_checks_run"] += 1

        cls._record_event("bias_check", {
            "bias_detected": bias_detected,
            "bias_type_count": len(bias_types) if bias_types else 0
            # Note: We don't track specific bias types for privacy
        })

    @classmethod
    def track_ats_connection(cls, provider: str, success: bool):
        """
        Track an ATS connection attempt.

        Args:
            provider: ATS provider name (we only track success/failure)
            success: Whether connection succeeded
        """
        if not cls._enabled:
            return

        with cls._lock:
            if success:
                cls.AGGREGATED_METRICS["ats_connections"] += 1

        cls._record_event("ats_connection", {"success": success})

    @classmethod
    def track_email_scan(cls, emails_found: int, resumes_extracted: int):
        """
        Track an email scan for resumes.

        Args:
            emails_found: Number of emails scanned (no content tracked)
            resumes_extracted: Number of resumes found
        """
        if not cls._enabled:
            return

        with cls._lock:
            cls.AGGREGATED_METRICS["email_scans"] += 1
            cls.AGGREGATED_METRICS["resumes_processed"] += resumes_extracted

    @classmethod
    def track_error(cls, error_type: str):
        """
        Track an error occurrence (minimal info).

        Args:
            error_type: Generic error type (e.g., "database", "parsing", "network")
        """
        if not cls._enabled:
            return

        with cls._lock:
            cls.AGGREGATED_METRICS["errors_encountered"] += 1

        cls._record_event("error", {"error_type": error_type})

    @classmethod
    def track_report_generated(cls, report_type: str):
        """
        Track report generation.

        Args:
            report_type: Type of report (e.g., "compliance", "hiring_summary")
        """
        if not cls._enabled:
            return

        with cls._lock:
            cls.AGGREGATED_METRICS["reports_generated"] += 1

        cls._record_event("report_generated", {"report_type": report_type})

    @classmethod
    def get_session_summary(cls) -> Dict[str, Any]:
        """
        Get summary of current session analytics.

        Returns:
            Dictionary of aggregated metrics (safe to display to user)
        """
        return {
            "session_id": cls._session_id,
            "enabled": cls._enabled,
            "metrics": dict(cls.AGGREGATED_METRICS),
            "event_count": len(cls._events),
            "version": cls.VERSION,
        }

    @classmethod
    def get_privacy_notice(cls) -> str:
        """Get the privacy notice for analytics"""
        return """
# TrajectIQ Analytics Privacy Notice

## What We Collect (When Enabled)
- Feature usage counts (e.g., number of evaluations)
- Performance metrics (e.g., average processing time)
- Error occurrence counts (no error details)
- Basic system info (OS type, Python version)

## What We NEVER Collect
- Resume content or candidate information
- Job descriptions or requirements
- User credentials or personal data
- Company names or identifiers
- IP addresses or location data
- Hardware fingerprints or device IDs

## How to Disable
1. Go to Settings > Privacy
2. Toggle "Enable Analytics" to OFF
3. All pending data will be cleared

Your privacy is our priority. Analytics helps us improve TrajectIQ
while respecting your data.
"""

    @classmethod
    def flush(cls) -> Optional[Dict[str, Any]]:
        """
        Flush pending analytics data.

        In a real implementation, this would send data to the analytics server.
        For now, it returns the data that would be sent.

        Returns:
            Dictionary of analytics data (for testing/verification)
        """
        if not cls._enabled or not cls._events:
            return None

        payload = {
            "session_id": cls._session_id,
            "version": cls.VERSION,
            "platform": f"{platform.system()} {platform.release()}",
            "python_version": f"{sys.version_info.major}.{sys.version_info.minor}",
            "aggregated_metrics": dict(cls.AGGREGATED_METRICS),
            "event_count": len(cls._events),
            "flushed_at": datetime.utcnow().isoformat()
        }

        # In production, this would POST to analytics endpoint
        # For now, we just clear the events
        with cls._lock:
            cls._events = []

        return payload


# Convenience function
def track_event(event_type: str, metadata: Dict[str, Any] = None):
    """Track a custom analytics event"""
    PrivacyRespectingAnalytics._record_event(event_type, metadata)


# Initialize from config file if exists
def init_analytics_from_config():
    """Initialize analytics from configuration file"""
    config_path = Path.home() / ".trajectiq" / "config.json"
    if config_path.exists():
        try:
            with open(config_path) as f:
                config = json.load(f)
                if config.get("analytics_enabled", False):
                    PrivacyRespectingAnalytics.enable()
        except Exception:
            pass


# Auto-initialize on module load
init_analytics_from_config()
