"""
TrajectIQ Enterprise - API Gateway Layer
========================================
API gateway abstraction for SaaS mode with routing, rate limiting, and tenant isolation.
"""

import os
import json
import time
import logging
import secrets
import hashlib
import hmac
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional, Dict, Any, List, Callable, Union
from dataclasses import dataclass, field
from enum import Enum
from functools import wraps
from collections import defaultdict
import threading

try:
    from flask import Flask, Request, Response, jsonify, request, g
    FLASK_AVAILABLE = True
except ImportError:
    FLASK_AVAILABLE = False

try:
    from fastapi import FastAPI, Request, Response, Depends, HTTPException
    from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False


class HttpMethod(Enum):
    """HTTP methods"""
    GET = "GET"
    POST = "POST"
    PUT = "PUT"
    DELETE = "DELETE"
    PATCH = "PATCH"
    HEAD = "HEAD"
    OPTIONS = "OPTIONS"


@dataclass
class APIRoute:
    """API route definition"""
    path: str
    method: HttpMethod
    handler: Callable
    required_permissions: List[str] = field(default_factory=list)
    required_scope: str = ""
    rate_limit: int = 100  # requests per minute
    cache_ttl: int = 0  # seconds, 0 = no caching
    require_auth: bool = True
    tenant_isolated: bool = True


@dataclass
class RequestContext:
    """Request context with tenant and auth info"""
    request_id: str
    tenant_id: str
    user_id: Optional[str]
    session_id: Optional[str]
    roles: List[str]
    permissions: List[str]
    scopes: List[str]
    ip_address: str
    user_agent: str
    timestamp: datetime
    correlation_id: Optional[str] = None


@dataclass
class RouteMetrics:
    """Metrics for a route"""
    request_count: int = 0
    error_count: int = 0
    total_latency_ms: float = 0
    avg_latency_ms: float = 0
    last_request: Optional[datetime] = None


class APIGateway:
    """
    API Gateway abstraction layer.
    Provides routing, authentication, rate limiting, and tenant isolation.
    """
    
    def __init__(
        self,
        jwt_manager=None,
        rate_limiter=None,
        db=None,
        cache=None
    ):
        self.jwt_manager = jwt_manager
        self.rate_limiter = rate_limiter
        self.db = db
        self.cache = cache
        
        self._routes: Dict[str, APIRoute] = {}
        self._middleware: List[Callable] = []
        self._metrics: Dict[str, RouteMetrics] = defaultdict(RouteMetrics)
        self._logger = logging.getLogger(__name__)
        
        # Request tracking
        self._request_counts: Dict[str, List[float]] = defaultdict(list)
        self._lock = threading.Lock()
    
    def route(
        self,
        path: str,
        method: HttpMethod = HttpMethod.GET,
        permissions: Optional[List[str]] = None,
        scope: str = "",
        rate_limit: int = 100,
        cache_ttl: int = 0,
        require_auth: bool = True,
        tenant_isolated: bool = True
    ):
        """Decorator for registering routes"""
        def decorator(handler: Callable):
            route_key = f"{method.value}:{path}"
            
            self._routes[route_key] = APIRoute(
                path=path,
                method=method,
                handler=handler,
                required_permissions=permissions or [],
                required_scope=scope,
                rate_limit=rate_limit,
                cache_ttl=cache_ttl,
                require_auth=require_auth,
                tenant_isolated=tenant_isolated
            )
            
            @wraps(handler)
            def wrapper(*args, **kwargs):
                return self._handle_request(route_key, *args, **kwargs)
            
            return wrapper
        
        return decorator
    
    def add_middleware(self, middleware: Callable):
        """Add middleware function"""
        self._middleware.append(middleware)
    
    def _handle_request(self, route_key: str, *args, **kwargs):
        """Handle incoming request"""
        start_time = time.time()
        route = self._routes.get(route_key)
        
        if not route:
            raise HTTPError(404, "Route not found")
        
        request_id = secrets.token_urlsafe(16)
        
        try:
            # Create request context
            ctx = self._create_context(request_id)
            
            # Check authentication
            if route.require_auth:
                self._check_auth(ctx, route)
            
            # Check rate limit
            if self.rate_limiter:
                allowed, wait_time = self.rate_limiter.acquire(
                    f"{ctx.tenant_id}:{route.path}"
                )
                if not allowed:
                    raise HTTPError(429, f"Rate limited. Wait {wait_time:.1f}s")
            
            # Check cache
            if route.cache_ttl > 0 and self.cache:
                cache_key = self._cache_key(ctx, route)
                cached = self.cache.get(cache_key)
                if cached:
                    return cached
            
            # Run middleware
            for middleware in self._middleware:
                result = middleware(ctx, route)
                if result:
                    return result
            
            # Execute handler
            kwargs['_ctx'] = ctx
            result = route.handler(*args, **kwargs)
            
            # Cache result
            if route.cache_ttl > 0 and self.cache:
                self.cache.set(cache_key, result, route.cache_ttl)
            
            # Record metrics
            self._record_metrics(route_key, time.time() - start_time, success=True)
            
            return result
            
        except HTTPError:
            self._record_metrics(route_key, time.time() - start_time, success=False)
            raise
        except Exception as e:
            self._record_metrics(route_key, time.time() - start_time, success=False)
            self._logger.error(f"Request error: {e}")
            raise HTTPError(500, str(e))
    
    def _create_context(self, request_id: str) -> RequestContext:
        """Create request context from request"""
        # This would be implemented based on the web framework
        # For now, return a default context
        return RequestContext(
            request_id=request_id,
            tenant_id="default",
            user_id=None,
            session_id=None,
            roles=[],
            permissions=[],
            scopes=[],
            ip_address="127.0.0.1",
            user_agent="API",
            timestamp=datetime.now(timezone.utc)
        )
    
    def _check_auth(self, ctx: RequestContext, route: APIRoute):
        """Check authentication and authorization"""
        if not ctx.user_id:
            raise HTTPError(401, "Authentication required")
        
        # Check permissions
        for perm in route.required_permissions:
            if perm not in ctx.permissions:
                raise HTTPError(403, f"Missing permission: {perm}")
        
        # Check scope
        if route.required_scope:
            required = set(route.required_scope.split())
            if not required.issubset(set(ctx.scopes)):
                raise HTTPError(403, f"Missing scope: {route.required_scope}")
    
    def _cache_key(self, ctx: RequestContext, route: APIRoute) -> str:
        """Generate cache key"""
        key_data = f"{ctx.tenant_id}:{route.path}:{ctx.user_id}"
        return hashlib.sha256(key_data.encode()).hexdigest()
    
    def _record_metrics(self, route_key: str, latency: float, success: bool):
        """Record route metrics"""
        with self._lock:
            metrics = self._metrics[route_key]
            metrics.request_count += 1
            if not success:
                metrics.error_count += 1
            metrics.total_latency_ms += latency * 1000
            metrics.avg_latency_ms = metrics.total_latency_ms / metrics.request_count
            metrics.last_request = datetime.now(timezone.utc)
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get API metrics"""
        return {
            route_key: {
                "request_count": m.request_count,
                "error_count": m.error_count,
                "error_rate": m.error_count / m.request_count if m.request_count > 0 else 0,
                "avg_latency_ms": round(m.avg_latency_ms, 2),
                "last_request": m.last_request.isoformat() if m.last_request else None
            }
            for route_key, m in self._metrics.items()
        }
    
    def get_routes(self) -> List[Dict[str, Any]]:
        """Get registered routes"""
        return [
            {
                "path": route.path,
                "method": route.method.value,
                "require_auth": route.require_auth,
                "permissions": route.required_permissions,
                "rate_limit": route.rate_limit
            }
            for route in self._routes.values()
        ]


class HTTPError(Exception):
    """HTTP error"""
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(message)


# =============================================================================
# JSON SCHEMA VALIDATION
# =============================================================================

# ATS API response schemas
GREENHOUSE_CANDIDATE_SCHEMA = {
    "type": "object",
    "required": ["id"],
    "properties": {
        "id": {"type": "integer"},
        "first_name": {"type": "string"},
        "last_name": {"type": "string"},
        "email_addresses": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "value": {"type": "string", "format": "email"},
                    "type": {"type": "string"}
                }
            }
        },
        "phone_numbers": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "value": {"type": "string"},
                    "type": {"type": "string"}
                }
            }
        },
        "applications": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "job_id": {"type": "integer"},
                    "status": {"type": "string"}
                }
            }
        },
        "attachments": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "filename": {"type": "string"},
                    "type": {"type": "string"},
                    "url": {"type": "string", "format": "uri"}
                }
            }
        }
    }
}

LEVER_CANDIDATE_SCHEMA = {
    "type": "object",
    "required": ["data"],
    "properties": {
        "data": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["id"],
                "properties": {
                    "id": {"type": "string"},
                    "name": {"type": "string"},
                    "emails": {
                        "type": "array",
                        "items": {"type": "string", "format": "email"}
                    },
                    "phones": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "files": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "fileType": {"type": "string"},
                                "downloadUrl": {"type": "string", "format": "uri"}
                            }
                        }
                    },
                    "createdAt": {"type": "integer"},
                    "archived": {"type": "boolean"}
                }
            }
        }
    }
}

WORKABLE_CANDIDATE_SCHEMA = {
    "type": "object",
    "properties": {
        "candidates": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["id"],
                "properties": {
                    "id": {"type": "string"},
                    "firstname": {"type": "string"},
                    "lastname": {"type": "string"},
                    "email": {"type": "string", "format": "email"},
                    "phone": {"type": "string"},
                    "resume_url": {"type": "string", "format": "uri"},
                    "created_at": {"type": "string", "format": "date-time"},
                    "stage": {"type": "string"},
                    "job": {
                        "type": "object",
                        "properties": {
                            "shortcode": {"type": "string"},
                            "title": {"type": "string"}
                        }
                    }
                }
            }
        }
    }
}

# Evaluation request/response schemas
EVALUATION_REQUEST_SCHEMA = {
    "type": "object",
    "required": ["resume_text", "job_requirements"],
    "properties": {
        "resume_text": {"type": "string", "minLength": 50},
        "job_requirements": {
            "oneOf": [
                {"type": "string", "minLength": 20},
                {
                    "type": "object",
                    "required": ["skills"],
                    "properties": {
                        "skills": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "required": ["name"],
                                "properties": {
                                    "name": {"type": "string"},
                                    "classification": {"type": "string", "enum": ["mission_critical", "core", "supporting", "optional"]},
                                    "minimum_years": {"type": "number", "minimum": 0},
                                    "is_critical": {"type": "boolean"}
                                }
                            }
                        },
                        "title": {"type": "string"},
                        "department": {"type": "string"},
                        "experience_level": {"type": "string"}
                    }
                }
            ]
        },
        "weights": {
            "type": "object",
            "properties": {
                "skills": {"type": "number", "minimum": 0, "maximum": 1},
                "impact": {"type": "number", "minimum": 0, "maximum": 1},
                "trajectory": {"type": "number", "minimum": 0, "maximum": 1},
                "experience": {"type": "number", "minimum": 0, "maximum": 1}
            }
        },
        "ai_mode": {"type": "string", "enum": ["off", "advisory", "enhanced"]}
    }
}

EVALUATION_RESPONSE_SCHEMA = {
    "type": "object",
    "required": ["evaluation_id", "hiring_index", "grade", "recommendation"],
    "properties": {
        "evaluation_id": {"type": "string"},
        "timestamp": {"type": "string", "format": "date-time"},
        "hiring_index": {"type": "number", "minimum": 0, "maximum": 100},
        "grade": {"type": "string", "enum": ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F"]},
        "tier": {"type": "integer", "minimum": 1, "maximum": 5},
        "recommendation": {"type": "string", "enum": ["strong_hire", "hire", "consider", "pass", "strong_pass"]},
        "component_scores": {
            "type": "object",
            "properties": {
                "skill_score": {"type": "number"},
                "impact_score": {"type": "number"},
                "trajectory_score": {"type": "number"},
                "experience_score": {"type": "number"},
                "ai_signal": {"type": "number"}
            }
        },
        "key_strengths": {"type": "array", "items": {"type": "string"}},
        "key_concerns": {"type": "array", "items": {"type": "string"}},
        "explanation": {"type": "string"},
        "reproducibility_proof": {
            "type": "object",
            "properties": {
                "input_hash": {"type": "string"},
                "config_hash": {"type": "string"},
                "engine_version": {"type": "string"},
                "output_hash": {"type": "string"}
            }
        }
    }
}


class SchemaValidator:
    """JSON Schema validator for API requests/responses"""
    
    SCHEMAS = {
        "greenhouse_candidate": GREENHOUSE_CANDIDATE_SCHEMA,
        "lever_candidate": LEVER_CANDIDATE_SCHEMA,
        "workable_candidate": WORKABLE_CANDIDATE_SCHEMA,
        "evaluation_request": EVALUATION_REQUEST_SCHEMA,
        "evaluation_response": EVALUATION_RESPONSE_SCHEMA
    }
    
    def __init__(self):
        self._logger = logging.getLogger(__name__)
    
    def validate(self, data: Dict[str, Any], schema_name: str) -> Tuple[bool, List[str]]:
        """
        Validate data against schema.
        
        Args:
            data: Data to validate
            schema_name: Name of schema to use
        
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        import jsonschema
        
        schema = self.SCHEMAS.get(schema_name)
        if not schema:
            return False, [f"Unknown schema: {schema_name}"]
        
        try:
            jsonschema.validate(data, schema)
            return True, []
        except jsonschema.ValidationError as e:
            return False, [str(e)]
        except jsonschema.SchemaError as e:
            return False, [f"Schema error: {e}"]
    
    def validate_request(self, data: Dict[str, Any], schema_name: str) -> Dict[str, Any]:
        """
        Validate request data and return normalized data.
        
        Raises:
            HTTPError: If validation fails
        """
        is_valid, errors = self.validate(data, schema_name)
        
        if not is_valid:
            raise HTTPError(400, f"Validation error: {'; '.join(errors)}")
        
        return data


# =============================================================================
# PERFORMANCE BENCHMARKING
# =============================================================================

@dataclass
class PerformanceMetric:
    """Performance metric record"""
    operation: str
    duration_ms: float
    timestamp: datetime
    tenant_id: str
    success: bool
    details: Dict[str, Any] = field(default_factory=dict)


class PerformanceMonitor:
    """
    Performance monitoring and benchmarking.
    Tracks operation timing and ensures performance SLAs.
    """
    
    # Performance SLAs (Service Level Agreements)
    SLAS = {
        "resume_parse": 2000,  # 2 seconds
        "evaluation": 2000,   # 2 seconds
        "batch_evaluation_500": 60000,  # 1 minute for 500 resumes
        "api_request": 100,   # 100ms
        "db_query": 50,       # 50ms
        "cache_hit": 5,       # 5ms
    }
    
    def __init__(self, db=None):
        self.db = db
        self._metrics: List[PerformanceMetric] = []
        self._lock = threading.Lock()
        self._logger = logging.getLogger(__name__)
    
    def measure(
        self,
        operation: str,
        tenant_id: str = "default",
        sla_ms: Optional[float] = None
    ):
        """
        Context manager for measuring operation duration.
        
        Args:
            operation: Operation name
            tenant_id: Tenant ID
            sla_ms: Expected SLA in milliseconds
        """
        class MeasureContext:
            def __init__(ctx, monitor, op, tid, sla):
                ctx.monitor = monitor
                ctx.operation = op
                ctx.tenant_id = tid
                ctx.sla = sla or monitor.SLAS.get(op, float('inf'))
                ctx.start_time = None
                ctx.success = True
                ctx.details = {}
            
            def __enter__(ctx):
                ctx.start_time = time.time()
                return ctx
            
            def __exit__(ctx, exc_type, exc_val, exc_tb):
                duration_ms = (time.time() - ctx.start_time) * 1000
                ctx.success = exc_type is None
                
                # Record metric
                metric = PerformanceMetric(
                    operation=ctx.operation,
                    duration_ms=duration_ms,
                    timestamp=datetime.now(timezone.utc),
                    tenant_id=ctx.tenant_id,
                    success=ctx.success,
                    details=ctx.details
                )
                
                ctx.monitor._record(metric)
                
                # Check SLA
                if duration_ms > ctx.sla:
                    ctx.monitor._logger.warning(
                        f"SLA violation: {ctx.operation} took {duration_ms:.0f}ms "
                        f"(SLA: {ctx.sla}ms)"
                    )
                
                return False  # Don't suppress exceptions
        
        return MeasureContext(self, operation, tenant_id, sla_ms)
    
    def _record(self, metric: PerformanceMetric):
        """Record performance metric"""
        with self._lock:
            self._metrics.append(metric)
            
            # Keep only last 10000 metrics
            if len(self._metrics) > 10000:
                self._metrics = self._metrics[-10000:]
        
        # Store in database if available
        if self.db:
            self.db.log_analytics(
                event_type=f"perf_{metric.operation}",
                details={
                    "duration_ms": metric.duration_ms,
                    "success": metric.success,
                    "tenant_id": metric.tenant_id
                },
                tenant_id=metric.tenant_id
            )
    
    def get_stats(self, operation: Optional[str] = None) -> Dict[str, Any]:
        """Get performance statistics"""
        with self._lock:
            metrics = self._metrics
            
            if operation:
                metrics = [m for m in metrics if m.operation == operation]
            
            if not metrics:
                return {}
            
            durations = [m.duration_ms for m in metrics]
            
            return {
                "count": len(metrics),
                "avg_ms": sum(durations) / len(durations),
                "min_ms": min(durations),
                "max_ms": max(durations),
                "p50_ms": self._percentile(durations, 50),
                "p95_ms": self._percentile(durations, 95),
                "p99_ms": self._percentile(durations, 99),
                "sla_violations": sum(
                    1 for m in metrics
                    if m.duration_ms > self.SLAS.get(m.operation, float('inf'))
                )
            }
    
    @staticmethod
    def _percentile(values: List[float], p: float) -> float:
        """Calculate percentile"""
        if not values:
            return 0
        
        sorted_values = sorted(values)
        k = (len(sorted_values) - 1) * (p / 100)
        f = int(k)
        c = f + 1 if f + 1 < len(sorted_values) else f
        
        return sorted_values[f] + (k - f) * (sorted_values[c] - sorted_values[f])


# Global instances
_api_gateway: Optional[APIGateway] = None
_performance_monitor: Optional[PerformanceMonitor] = None


def get_api_gateway() -> APIGateway:
    """Get global API gateway"""
    global _api_gateway
    if _api_gateway is None:
        _api_gateway = APIGateway()
    return _api_gateway


def get_performance_monitor() -> PerformanceMonitor:
    """Get global performance monitor"""
    global _performance_monitor
    if _performance_monitor is None:
        _performance_monitor = PerformanceMonitor()
    return _performance_monitor
