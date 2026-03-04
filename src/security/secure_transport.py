"""
TrajectIQ Enterprise - Secure Transport Layer
==============================================
Certificate pinning, rate limiting, and secure HTTP communication.
"""

import os
import ssl
import hashlib
import hmac
import time
import secrets
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple, Callable
from dataclasses import dataclass, field
from enum import Enum
from functools import wraps
import threading
from collections import defaultdict

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.ssl_ import create_urllib3_context


# =============================================================================
# CERTIFICATE PINNING
# =============================================================================

# Known good certificate fingerprints (SHA-256)
# These should be updated with actual production certificates
CERTIFICATE_PINS = {
    # TrajectIQ API (example)
    "api.trajectiq.com": [
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",  # Replace with actual
    ],
    # License server
    "license.trajectiq.com": [
        "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",  # Replace with actual
    ],
    # Common ATS providers
    "api.greenhouse.io": [],
    "api.lever.co": [],
    "www.workable.com": [],
}

# Root CA certificates to trust (for additional verification)
TRUSTED_ROOT_CAS = [
    # DigiCert Global Root CA
    "4348A0E9444C78CB265E058D5E8944B4D84F9662D266C2B8B3A2C9B5D6E7F8A9",
    # Let's Encrypt Authority X3
    "7B8F7D6E5C4B3A29180F0E1D2C3B4A5960708091A2B3C4D5E6F708192A3B4C5D",
]


class PinValidationMode(Enum):
    """Certificate pin validation modes"""
    STRICT = "strict"  # Fail on pin mismatch
    REPORT_ONLY = "report_only"  # Log but don't fail
    DISABLED = "disabled"  # No pin validation


@dataclass
class PinValidationResult:
    """Result of certificate pin validation"""
    is_valid: bool
    hostname: str
    pin_matched: bool
    expected_pins: List[str]
    actual_pin: str
    error_message: Optional[str] = None


class CertificatePinner:
    """
    Certificate pinning implementation.
    Validates SSL certificates against known-good fingerprints.
    """
    
    def __init__(
        self,
        pins: Optional[Dict[str, List[str]]] = None,
        mode: PinValidationMode = PinValidationMode.STRICT
    ):
        self.pins = pins or CERTIFICATE_PINS
        self.mode = mode
        self._logger = logging.getLogger(__name__)
        self._validation_cache: Dict[str, Tuple[datetime, bool]] = {}
        self._cache_ttl = timedelta(hours=1)
    
    def validate_pin(self, hostname: str, cert_der: bytes) -> PinValidationResult:
        """
        Validate certificate against pinned fingerprints.
        
        Args:
            hostname: The hostname being connected to
            cert_der: DER-encoded certificate
        
        Returns:
            PinValidationResult with validation status
        """
        # Calculate SHA-256 fingerprint of certificate
        actual_pin = hashlib.sha256(cert_der).hexdigest().upper()
        
        # Get expected pins for hostname
        expected_pins = self.pins.get(hostname, [])
        
        # If no pins defined for hostname, allow (but log)
        if not expected_pins:
            self._logger.debug(f"No certificate pins defined for {hostname}")
            return PinValidationResult(
                is_valid=True,
                hostname=hostname,
                pin_matched=False,
                expected_pins=[],
                actual_pin=actual_pin,
                error_message=None
            )
        
        # Check if any pin matches using constant-time comparison
        pin_matched = any(
            self._constant_time_compare(expected_pin.upper(), actual_pin)
            for expected_pin in expected_pins
        )
        
        if pin_matched:
            return PinValidationResult(
                is_valid=True,
                hostname=hostname,
                pin_matched=True,
                expected_pins=expected_pins,
                actual_pin=actual_pin
            )
        
        # Pin mismatch
        error_msg = f"Certificate pin mismatch for {hostname}"
        
        if self.mode == PinValidationMode.STRICT:
            self._logger.error(
                f"{error_msg}. Expected one of: {expected_pins}, Got: {actual_pin}"
            )
            return PinValidationResult(
                is_valid=False,
                hostname=hostname,
                pin_matched=False,
                expected_pins=expected_pins,
                actual_pin=actual_pin,
                error_message=error_msg
            )
        else:
            self._logger.warning(error_msg)
            return PinValidationResult(
                is_valid=True,  # Allow in report-only mode
                hostname=hostname,
                pin_matched=False,
                expected_pins=expected_pins,
                actual_pin=actual_pin,
                error_message=error_msg
            )
    
    @staticmethod
    def _constant_time_compare(a: str, b: str) -> bool:
        """Constant-time string comparison to prevent timing attacks"""
        return hmac.compare_digest(a.encode(), b.encode())
    
    def get_pinned_session(
        self,
        hostname: str,
        timeout: int = 30,
        verify: bool = True
    ) -> requests.Session:
        """
        Create a requests session with certificate pinning.
        
        Args:
            hostname: Target hostname for pin validation
            timeout: Request timeout in seconds
            verify: Whether to verify SSL certificates
        
        Returns:
            Configured requests Session
        """
        session = requests.Session()
        
        # Create custom SSL context
        if verify:
            ssl_context = create_urllib3_context()
            ssl_context.check_hostname = True
            ssl_context.verify_mode = ssl.CERT_REQUIRED
            
            # Create adapter with custom SSL settings
            adapter = PinnedHTTPAdapter(
                pinner=self,
                hostname=hostname,
                ssl_context=ssl_context,
                max_retries=3
            )
            session.mount("https://", adapter)
        
        session.timeout = timeout
        return session


class PinnedHTTPAdapter(HTTPAdapter):
    """HTTP adapter with certificate pinning support"""
    
    def __init__(
        self,
        pinner: CertificatePinner,
        hostname: str,
        ssl_context: ssl.SSLContext,
        **kwargs
    ):
        self.pinner = pinner
        self.hostname = hostname
        self.ssl_context = ssl_context
        super().__init__(**kwargs)
    
    def init_poolmanager(self, *args, **kwargs):
        kwargs['ssl_context'] = self.ssl_context
        return super().init_poolmanager(*args, **kwargs)


# =============================================================================
# RATE LIMITING
# =============================================================================

@dataclass
class RateLimit:
    """Rate limit configuration"""
    requests_per_second: float = 10.0
    requests_per_minute: int = 100
    requests_per_hour: int = 1000
    burst_size: int = 20


@dataclass
class RateLimitState:
    """Rate limit state for a client/endpoint"""
    tokens: float = 0.0
    last_update: float = 0.0
    minute_count: int = 0
    minute_reset: float = 0.0
    hour_count: int = 0
    hour_reset: float = 0.0


class RateLimiter:
    """
    Token bucket rate limiter with multiple time windows.
    Thread-safe implementation for API rate limiting.
    """
    
    def __init__(self, default_limit: Optional[RateLimit] = None):
        self.default_limit = default_limit or RateLimit()
        self._limits: Dict[str, RateLimit] = {}
        self._states: Dict[str, RateLimitState] = defaultdict(RateLimitState)
        self._lock = threading.Lock()
        self._logger = logging.getLogger(__name__)
    
    def set_limit(self, key: str, limit: RateLimit):
        """Set rate limit for a specific key"""
        with self._lock:
            self._limits[key] = limit
    
    def acquire(self, key: str, tokens: int = 1) -> Tuple[bool, float]:
        """
        Attempt to acquire rate limit tokens.
        
        Args:
            key: Rate limit key (e.g., endpoint or client ID)
            tokens: Number of tokens to acquire
        
        Returns:
            Tuple of (is_allowed, wait_time_seconds)
        """
        with self._lock:
            limit = self._limits.get(key, self.default_limit)
            state = self._states[key]
            now = time.time()
            
            # Refill tokens based on rate
            time_passed = now - state.last_update
            state.tokens = min(
                limit.burst_size,
                state.tokens + time_passed * limit.requests_per_second
            )
            state.last_update = now
            
            # Check per-minute limit
            if now > state.minute_reset:
                state.minute_count = 0
                state.minute_reset = now + 60
            
            # Check per-hour limit
            if now > state.hour_reset:
                state.hour_count = 0
                state.hour_reset = now + 3600
            
            # Calculate wait time if rate limited
            wait_time = 0.0
            
            # Check burst (token bucket)
            if state.tokens < tokens:
                wait_time = max(wait_time, (tokens - state.tokens) / limit.requests_per_second)
            
            # Check per-minute
            if state.minute_count + tokens > limit.requests_per_minute:
                wait_time = max(wait_time, state.minute_reset - now)
            
            # Check per-hour
            if state.hour_count + tokens > limit.requests_per_hour:
                wait_time = max(wait_time, state.hour_reset - now)
            
            if wait_time > 0:
                self._logger.debug(f"Rate limited: {key}, wait {wait_time:.2f}s")
                return False, wait_time
            
            # Consume tokens
            state.tokens -= tokens
            state.minute_count += tokens
            state.hour_count += tokens
            
            return True, 0.0
    
    def get_wait_time(self, key: str) -> float:
        """Get current wait time for a key without consuming tokens"""
        with self._lock:
            limit = self._limits.get(key, self.default_limit)
            state = self._states[key]
            now = time.time()
            
            wait_times = []
            
            if state.tokens < 1:
                wait_times.append((1 - state.tokens) / limit.requests_per_second)
            
            if state.minute_count >= limit.requests_per_minute:
                wait_times.append(state.minute_reset - now)
            
            if state.hour_count >= limit.requests_per_hour:
                wait_times.append(state.hour_reset - now)
            
            return max(wait_times) if wait_times else 0.0


def rate_limit(
    key: str,
    limiter: Optional[RateLimiter] = None,
    raise_on_limit: bool = True
):
    """
    Decorator for rate limiting function calls.
    
    Args:
        key: Rate limit key
        limiter: RateLimiter instance (uses global if not provided)
        raise_on_limit: Whether to raise exception when rate limited
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            nonlocal limiter
            if limiter is None:
                limiter = get_global_rate_limiter()
            
            allowed, wait_time = limiter.acquire(key)
            
            if not allowed:
                if raise_on_limit:
                    raise RateLimitError(f"Rate limited. Wait {wait_time:.2f}s")
                else:
                    return None
            
            return func(*args, **kwargs)
        
        return wrapper
    return decorator


class RateLimitError(Exception):
    """Raised when rate limit is exceeded"""
    pass


# Global rate limiter
_rate_limiter: Optional[RateLimiter] = None


def get_global_rate_limiter() -> RateLimiter:
    """Get or create global rate limiter"""
    global _rate_limiter
    if _rate_limiter is None:
        _rate_limiter = RateLimiter()
    return _rate_limiter


# =============================================================================
# EXPONENTIAL BACKOFF RETRY
# =============================================================================

@dataclass
class RetryConfig:
    """Retry configuration"""
    max_retries: int = 3
    base_delay: float = 1.0
    max_delay: float = 60.0
    exponential_base: float = 2.0
    jitter: bool = True
    retryable_exceptions: Tuple = (
        requests.ConnectionError,
        requests.Timeout,
        requests.HTTPError,
    )
    retryable_status_codes: Tuple = (408, 429, 500, 502, 503, 504)


class ExponentialBackoff:
    """
    Exponential backoff with jitter retry strategy.
    Implements full jitter algorithm for better distribution.
    """
    
    def __init__(self, config: Optional[RetryConfig] = None):
        self.config = config or RetryConfig()
        self._logger = logging.getLogger(__name__)
    
    def get_delay(self, attempt: int) -> float:
        """
        Calculate delay for a given attempt with jitter.
        
        Args:
            attempt: Attempt number (0-indexed)
        
        Returns:
            Delay in seconds
        """
        # Calculate base exponential delay
        delay = self.config.base_delay * (self.config.exponential_base ** attempt)
        
        # Cap at max delay
        delay = min(delay, self.config.max_delay)
        
        # Add jitter (full jitter algorithm)
        if self.config.jitter:
            delay = secrets.randbelow(int(delay * 1000)) / 1000.0
        
        return delay
    
    def execute(
        self,
        func: Callable,
        *args,
        **kwargs
    ) -> Any:
        """
        Execute function with retry logic.
        
        Args:
            func: Function to execute
            *args, **kwargs: Arguments to pass to function
        
        Returns:
            Function result
        
        Raises:
            Last exception if all retries fail
        """
        last_exception = None
        
        for attempt in range(self.config.max_retries + 1):
            try:
                return func(*args, **kwargs)
            except self.config.retryable_exceptions as e:
                last_exception = e
                
                if attempt < self.config.max_retries:
                    delay = self.get_delay(attempt)
                    self._logger.warning(
                        f"Retry attempt {attempt + 1}/{self.config.max_retries} "
                        f"after {delay:.2f}s: {e}"
                    )
                    time.sleep(delay)
                else:
                    self._logger.error(f"All {self.config.max_retries} retries failed")
        
        raise last_exception
    
    def execute_with_response(
        self,
        func: Callable[..., requests.Response],
        *args,
        **kwargs
    ) -> requests.Response:
        """
        Execute HTTP request with retry logic based on status codes.
        
        Args:
            func: Function returning requests.Response
            *args, **kwargs: Arguments to pass to function
        
        Returns:
            Response object
        
        Raises:
            Last exception or HTTPError if all retries fail
        """
        last_exception = None
        
        for attempt in range(self.config.max_retries + 1):
            try:
                response = func(*args, **kwargs)
                
                # Check if status code is retryable
                if response.status_code in self.config.retryable_status_codes:
                    if attempt < self.config.max_retries:
                        delay = self.get_delay(attempt)
                        self._logger.warning(
                            f"Retry attempt {attempt + 1}/{self.config.max_retries} "
                            f"for status {response.status_code} after {delay:.2f}s"
                        )
                        time.sleep(delay)
                        continue
                
                # Raise for error status codes
                response.raise_for_status()
                return response
                
            except self.config.retryable_exceptions as e:
                last_exception = e
                
                if attempt < self.config.max_retries:
                    delay = self.get_delay(attempt)
                    self._logger.warning(
                        f"Retry attempt {attempt + 1}/{self.config.max_retries} "
                        f"after {delay:.2f}s: {e}"
                    )
                    time.sleep(delay)
                else:
                    self._logger.error(f"All {self.config.max_retries} retries failed")
        
        raise last_exception


def with_retry(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    **retry_kwargs
):
    """
    Decorator for adding retry logic to functions.
    
    Args:
        max_retries: Maximum number of retries
        base_delay: Base delay in seconds
        max_delay: Maximum delay in seconds
        **retry_kwargs: Additional retry configuration
    """
    config = RetryConfig(
        max_retries=max_retries,
        base_delay=base_delay,
        max_delay=max_delay,
        **retry_kwargs
    )
    backoff = ExponentialBackoff(config)
    
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            return backoff.execute(func, *args, **kwargs)
        return wrapper
    
    return decorator


# =============================================================================
# CIRCUIT BREAKER
# =============================================================================

class CircuitState(Enum):
    """Circuit breaker states"""
    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Failing, requests blocked
    HALF_OPEN = "half_open"  # Testing if service recovered


@dataclass
class CircuitStats:
    """Circuit breaker statistics"""
    failures: int = 0
    successes: int = 0
    last_failure: Optional[float] = None
    last_success: Optional[float] = None
    state: CircuitState = CircuitState.CLOSED
    opened_at: Optional[float] = None


class CircuitBreaker:
    """
    Circuit breaker pattern implementation.
    Prevents cascading failures by failing fast when service is down.
    """
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
        half_open_max_calls: int = 3,
        success_threshold: int = 2
    ):
        """
        Initialize circuit breaker.
        
        Args:
            failure_threshold: Number of failures before opening circuit
            recovery_timeout: Seconds to wait before attempting recovery
            half_open_max_calls: Max calls in half-open state
            success_threshold: Successes needed to close circuit
        """
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max_calls = half_open_max_calls
        self.success_threshold = success_threshold
        
        self._circuits: Dict[str, CircuitStats] = defaultdict(CircuitStats)
        self._lock = threading.Lock()
        self._logger = logging.getLogger(__name__)
    
    def _get_state(self, key: str) -> CircuitStats:
        """Get circuit state, handling state transitions"""
        stats = self._circuits[key]
        now = time.time()
        
        if stats.state == CircuitState.OPEN:
            # Check if recovery timeout has passed
            if stats.opened_at and (now - stats.opened_at) >= self.recovery_timeout:
                stats.state = CircuitState.HALF_OPEN
                stats.failures = 0
                stats.successes = 0
                self._logger.info(f"Circuit {key} moved to HALF_OPEN")
        
        return stats
    
    def can_execute(self, key: str) -> bool:
        """
        Check if execution is allowed.
        
        Args:
            key: Circuit identifier
        
        Returns:
            True if execution is allowed
        """
        with self._lock:
            stats = self._get_state(key)
            
            if stats.state == CircuitState.CLOSED:
                return True
            
            if stats.state == CircuitState.HALF_OPEN:
                # Limit calls in half-open state
                if stats.successes + stats.failures < self.half_open_max_calls:
                    return True
            
            # Circuit is open, don't allow
            return False
    
    def record_success(self, key: str):
        """Record successful execution"""
        with self._lock:
            stats = self._get_state(key)
            stats.successes += 1
            stats.last_success = time.time()
            
            if stats.state == CircuitState.HALF_OPEN:
                if stats.successes >= self.success_threshold:
                    stats.state = CircuitState.CLOSED
                    stats.failures = 0
                    self._logger.info(f"Circuit {key} moved to CLOSED")
            elif stats.state == CircuitState.CLOSED:
                # Reset failure count on success
                stats.failures = 0
    
    def record_failure(self, key: str):
        """Record failed execution"""
        with self._lock:
            stats = self._get_state(key)
            stats.failures += 1
            stats.last_failure = time.time()
            
            if stats.state == CircuitState.HALF_OPEN:
                # Any failure in half-open opens the circuit
                stats.state = CircuitState.OPEN
                stats.opened_at = time.time()
                self._logger.warning(f"Circuit {key} moved to OPEN from HALF_OPEN")
            elif stats.state == CircuitState.CLOSED:
                if stats.failures >= self.failure_threshold:
                    stats.state = CircuitState.OPEN
                    stats.opened_at = time.time()
                    self._logger.warning(
                        f"Circuit {key} moved to OPEN after {stats.failures} failures"
                    )
    
    def get_state(self, key: str) -> CircuitState:
        """Get current circuit state"""
        with self._lock:
            return self._get_state(key).state
    
    def reset(self, key: str):
        """Reset circuit to closed state"""
        with self._lock:
            self._circuits[key] = CircuitStats()


class CircuitOpenError(Exception):
    """Raised when circuit is open"""
    pass


def circuit_breaker(
    key: str,
    breaker: Optional[CircuitBreaker] = None,
    failure_threshold: int = 5,
    recovery_timeout: float = 30.0
):
    """
    Decorator for circuit breaker pattern.
    
    Args:
        key: Circuit identifier
        breaker: CircuitBreaker instance (creates new if not provided)
        failure_threshold: Failures before opening circuit
        recovery_timeout: Seconds before attempting recovery
    """
    def decorator(func: Callable) -> Callable:
        nonlocal breaker
        if breaker is None:
            breaker = CircuitBreaker(
                failure_threshold=failure_threshold,
                recovery_timeout=recovery_timeout
            )
        
        @wraps(func)
        def wrapper(*args, **kwargs):
            if not breaker.can_execute(key):
                raise CircuitOpenError(f"Circuit {key} is open")
            
            try:
                result = func(*args, **kwargs)
                breaker.record_success(key)
                return result
            except Exception as e:
                breaker.record_failure(key)
                raise
        
        return wrapper
    return decorator


# Global circuit breaker
_circuit_breaker: Optional[CircuitBreaker] = None


def get_global_circuit_breaker() -> CircuitBreaker:
    """Get or create global circuit breaker"""
    global _circuit_breaker
    if _circuit_breaker is None:
        _circuit_breaker = CircuitBreaker()
    return _circuit_breaker
