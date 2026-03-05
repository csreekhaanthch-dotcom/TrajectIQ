"""
TrajectIQ Enterprise - JWT/OAuth Authentication
================================================
JWT token management, OAuth 2.0 flows, and API authentication.
"""

import os
import json
import hmac
import hashlib
import secrets
import base64
import time
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple, Union
from dataclasses import dataclass, field
from enum import Enum
from functools import wraps

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding, ec
from cryptography.hazmat.backends import default_backend


class TokenType(Enum):
    """JWT token types"""
    ACCESS = "access"
    REFRESH = "refresh"
    API_KEY = "api_key"


class Algorithm(Enum):
    """Supported JWT algorithms"""
    RS256 = "RS256"
    RS512 = "RS512"
    ES256 = "ES256"
    HS256 = "HS256"
    HS512 = "HS512"


@dataclass
class JWTConfig:
    """JWT configuration"""
    issuer: str = "trajectiq.com"
    audience: str = "api.trajectiq.com"
    access_token_ttl_minutes: int = 15
    refresh_token_ttl_days: int = 7
    algorithm: Algorithm = Algorithm.RS256
    key_id: str = ""


@dataclass
class TokenPayload:
    """JWT token payload"""
    sub: str  # Subject (user ID)
    iss: str  # Issuer
    aud: str  # Audience
    exp: int  # Expiration timestamp
    iat: int  # Issued at timestamp
    jti: str  # JWT ID (unique identifier)
    type: TokenType = TokenType.ACCESS
    tenant_id: str = "default"
    roles: List[str] = field(default_factory=list)
    permissions: List[str] = field(default_factory=list)
    scope: str = ""


class JWTError(Exception):
    """JWT related errors"""
    pass


class TokenExpiredError(JWTError):
    """Token has expired"""
    pass


class TokenInvalidError(JWTError):
    """Token is invalid"""
    pass


class InsufficientScopeError(JWTError):
    """Token lacks required scope"""
    pass


class JWTManager:
    """
    JWT token management with RSA/ECDSA signing.
    Supports multiple algorithms and key rotation.
    """
    
    def __init__(
        self,
        config: Optional[JWTConfig] = None,
        private_key: Optional[bytes] = None,
        public_key: Optional[bytes] = None,
        secret_key: Optional[bytes] = None
    ):
        self.config = config or JWTConfig()
        self._logger = logging.getLogger(__name__)
        
        # Load or generate keys
        self._private_key = None
        self._public_key = None
        self._secret_key = secret_key or secrets.token_bytes(32)
        
        if private_key:
            self._load_private_key(private_key)
        if public_key:
            self._load_public_key(public_key)
        
        if not self._private_key and not self._public_key:
            # Generate new key pair
            self._generate_key_pair()
        
        # Key rotation support
        self._key_id = self.config.key_id or secrets.token_hex(8)
    
    def _generate_key_pair(self):
        """Generate new RSA key pair"""
        self._private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=4096,
            backend=default_backend()
        )
        self._public_key = self._private_key.public_key()
        self._logger.info("Generated new RSA-4096 key pair")
    
    def _load_private_key(self, key_data: bytes):
        """Load private key from PEM data"""
        self._private_key = serialization.load_pem_private_key(
            key_data,
            password=None,
            backend=default_backend()
        )
        self._public_key = self._private_key.public_key()
    
    def _load_public_key(self, key_data: bytes):
        """Load public key from PEM data"""
        self._public_key = serialization.load_pem_public_key(
            key_data,
            backend=default_backend()
        )
    
    def get_public_key_pem(self) -> bytes:
        """Get public key in PEM format"""
        return self._public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
    
    def get_private_key_pem(self) -> bytes:
        """Get private key in PEM format"""
        return self._private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
    
    def generate_token(
        self,
        user_id: str,
        roles: Optional[List[str]] = None,
        permissions: Optional[List[str]] = None,
        tenant_id: str = "default",
        token_type: TokenType = TokenType.ACCESS,
        scope: str = "",
        custom_claims: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate a JWT token.
        
        Args:
            user_id: User identifier
            roles: User roles
            permissions: User permissions
            tenant_id: Tenant identifier
            token_type: Token type (access/refresh)
            scope: OAuth scope string
            custom_claims: Additional custom claims
        
        Returns:
            JWT token string
        """
        now = datetime.now(timezone.utc)
        
        # Set expiration based on token type
        if token_type == TokenType.ACCESS:
            exp = now + timedelta(minutes=self.config.access_token_ttl_minutes)
        elif token_type == TokenType.REFRESH:
            exp = now + timedelta(days=self.config.refresh_token_ttl_days)
        else:
            exp = now + timedelta(hours=24)  # API key default
        
        payload = TokenPayload(
            sub=user_id,
            iss=self.config.issuer,
            aud=self.config.audience,
            exp=int(exp.timestamp()),
            iat=int(now.timestamp()),
            jti=secrets.token_urlsafe(16),
            type=token_type,
            tenant_id=tenant_id,
            roles=roles or [],
            permissions=permissions or [],
            scope=scope
        )
        
        # Build claims dict
        claims = {
            "sub": payload.sub,
            "iss": payload.iss,
            "aud": payload.aud,
            "exp": payload.exp,
            "iat": payload.iat,
            "jti": payload.jti,
            "typ": payload.type.value,
            "tid": payload.tenant_id,
            "roles": payload.roles,
            "perms": payload.permissions,
            "scope": payload.scope,
            "kid": self._key_id
        }
        
        # Add custom claims
        if custom_claims:
            claims.update(custom_claims)
        
        return self._encode(claims)
    
    def _encode(self, claims: Dict[str, Any]) -> str:
        """Encode claims to JWT token"""
        # Build header
        header = {
            "alg": self.config.algorithm.value,
            "typ": "JWT",
            "kid": self._key_id
        }
        
        # Encode header and payload
        header_b64 = self._base64url_encode(json.dumps(header).encode())
        payload_b64 = self._base64url_encode(json.dumps(claims).encode())
        
        # Create signature
        signing_input = f"{header_b64}.{payload_b64}".encode()
        signature = self._sign(signing_input)
        signature_b64 = self._base64url_encode(signature)
        
        return f"{header_b64}.{payload_b64}.{signature_b64}"
    
    def _sign(self, data: bytes) -> bytes:
        """Sign data using configured algorithm"""
        if self.config.algorithm in (Algorithm.RS256, Algorithm.RS512):
            hash_algo = hashes.SHA256() if self.config.algorithm == Algorithm.RS256 else hashes.SHA512()
            return self._private_key.sign(
                data,
                padding.PKCS1v15(),
                hash_algo
            )
        elif self.config.algorithm in (Algorithm.HS256, Algorithm.HS512):
            hash_algo = hashlib.sha256 if self.config.algorithm == Algorithm.HS256 else hashlib.sha512
            return hmac.new(self._secret_key, data, hash_algo).digest()
        else:
            raise JWTError(f"Unsupported algorithm: {self.config.algorithm}")
    
    def decode(self, token: str, verify: bool = True) -> Dict[str, Any]:
        """
        Decode and verify JWT token.
        
        Args:
            token: JWT token string
            verify: Whether to verify signature and claims
        
        Returns:
            Decoded claims dict
        
        Raises:
            TokenExpiredError: Token has expired
            TokenInvalidError: Token is invalid
        """
        try:
            parts = token.split(".")
            if len(parts) != 3:
                raise TokenInvalidError("Invalid token format")
            
            header_b64, payload_b64, signature_b64 = parts
            
            # Decode header and payload
            header = json.loads(self._base64url_decode(header_b64))
            payload = json.loads(self._base64url_decode(payload_b64))
            
            if verify:
                # Verify signature
                signing_input = f"{header_b64}.{payload_b64}".encode()
                signature = self._base64url_decode(signature_b64)
                
                if not self._verify(signing_input, signature, header.get("alg")):
                    raise TokenInvalidError("Invalid signature")
                
                # Verify claims
                now = time.time()
                
                if payload.get("exp", 0) < now:
                    raise TokenExpiredError("Token has expired")
                
                if payload.get("nbf", 0) > now:
                    raise TokenInvalidError("Token not yet valid")
                
                if payload.get("iss") != self.config.issuer:
                    raise TokenInvalidError(f"Invalid issuer: {payload.get('iss')}")
                
                if self.config.audience not in payload.get("aud", ""):
                    raise TokenInvalidError(f"Invalid audience")
            
            return payload
            
        except (json.JSONDecodeError, ValueError, base64.binascii.Error) as e:
            raise TokenInvalidError(f"Token decode error: {e}")
    
    def _verify(self, data: bytes, signature: bytes, alg: str) -> bool:
        """Verify signature using constant-time comparison"""
        try:
            algorithm = Algorithm(alg)
            
            if algorithm in (Algorithm.RS256, Algorithm.RS512):
                hash_algo = hashes.SHA256() if algorithm == Algorithm.RS256 else hashes.SHA512()
                self._public_key.verify(
                    signature,
                    data,
                    padding.PKCS1v15(),
                    hash_algo
                )
                return True
            elif algorithm in (Algorithm.HS256, Algorithm.HS512):
                hash_algo = hashlib.sha256 if algorithm == Algorithm.HS256 else hashlib.sha512
                expected = hmac.new(self._secret_key, data, hash_algo).digest()
                return hmac.compare_digest(expected, signature)
            
            return False
        except Exception:
            return False
    
    def refresh_token(self, refresh_token: str) -> Tuple[str, str]:
        """
        Refresh access token using refresh token.
        
        Args:
            refresh_token: Valid refresh token
        
        Returns:
            Tuple of (new_access_token, new_refresh_token)
        
        Raises:
            TokenInvalidError: If refresh token is invalid
        """
        claims = self.decode(refresh_token)
        
        if claims.get("typ") != TokenType.REFRESH.value:
            raise TokenInvalidError("Not a refresh token")
        
        # Generate new tokens
        user_id = claims["sub"]
        tenant_id = claims.get("tid", "default")
        roles = claims.get("roles", [])
        permissions = claims.get("perms", [])
        scope = claims.get("scope", "")
        
        new_access = self.generate_token(
            user_id=user_id,
            roles=roles,
            permissions=permissions,
            tenant_id=tenant_id,
            token_type=TokenType.ACCESS,
            scope=scope
        )
        
        new_refresh = self.generate_token(
            user_id=user_id,
            roles=roles,
            permissions=permissions,
            tenant_id=tenant_id,
            token_type=TokenType.REFRESH,
            scope=scope
        )
        
        return new_access, new_refresh
    
    def revoke_token(self, token: str):
        """
        Revoke a token (add to deny list).
        
        Args:
            token: Token to revoke
        """
        # This would typically involve adding the jti to a deny list
        # For now, we'll store in a file-based deny list
        deny_list_path = Path.home() / ".trajectiq" / "token_deny_list.json"
        deny_list_path.parent.mkdir(parents=True, exist_ok=True)
        
        try:
            claims = self.decode(token, verify=False)
            jti = claims.get("jti")
            
            if jti:
                deny_list = {}
                if deny_list_path.exists():
                    deny_list = json.loads(deny_list_path.read_text())
                
                deny_list[jti] = {
                    "revoked_at": datetime.now(timezone.utc).isoformat(),
                    "exp": claims.get("exp")
                }
                
                deny_list_path.write_text(json.dumps(deny_list))
        except Exception as e:
            self._logger.error(f"Failed to revoke token: {e}")
    
    def is_token_revoked(self, jti: str) -> bool:
        """Check if token is revoked"""
        deny_list_path = Path.home() / ".trajectiq" / "token_deny_list.json"
        
        if not deny_list_path.exists():
            return False
        
        try:
            deny_list = json.loads(deny_list_path.read_text())
            return jti in deny_list
        except Exception:
            return False
    
    @staticmethod
    def _base64url_encode(data: bytes) -> str:
        """Base64url encode without padding"""
        return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')
    
    @staticmethod
    def _base64url_decode(data: str) -> bytes:
        """Base64url decode with padding restoration"""
        padding = 4 - (len(data) % 4)
        if padding != 4:
            data += '=' * padding
        return base64.urlsafe_b64decode(data)


# =============================================================================
# OAUTH 2.0 FLOWS
# =============================================================================

@dataclass
class OAuthConfig:
    """OAuth 2.0 provider configuration"""
    provider_name: str
    authorization_url: str
    token_url: str
    userinfo_url: str
    client_id: str
    client_secret: str
    redirect_uri: str
    scope: str = "openid profile email"
    jwks_url: Optional[str] = None


class OAuthClient:
    """
    OAuth 2.0 client implementation.
    Supports Authorization Code flow and Client Credentials flow.
    """
    
    def __init__(
        self,
        config: OAuthConfig,
        jwt_manager: Optional[JWTManager] = None
    ):
        self.config = config
        self.jwt_manager = jwt_manager or JWTManager()
        self._logger = logging.getLogger(__name__)
        self._token_cache: Dict[str, Dict[str, Any]] = {}
    
    def get_authorization_url(
        self,
        state: Optional[str] = None,
        code_challenge: Optional[str] = None
    ) -> str:
        """
        Generate authorization URL for Authorization Code flow.
        
        Args:
            state: Optional state parameter for CSRF protection
            code_challenge: PKCE code challenge
        
        Returns:
            Authorization URL
        """
        from urllib.parse import urlencode
        
        params = {
            "response_type": "code",
            "client_id": self.config.client_id,
            "redirect_uri": self.config.redirect_uri,
            "scope": self.config.scope
        }
        
        if state:
            params["state"] = state
        else:
            params["state"] = secrets.token_urlsafe(16)
        
        if code_challenge:
            params["code_challenge"] = code_challenge
            params["code_challenge_method"] = "S256"
        
        return f"{self.config.authorization_url}?{urlencode(params)}"
    
    def generate_pkce_challenge(self) -> Tuple[str, str]:
        """
        Generate PKCE code verifier and challenge.
        
        Returns:
            Tuple of (verifier, challenge)
        """
        import base64
        import hashlib
        
        verifier = secrets.token_urlsafe(32)
        challenge = base64.urlsafe_b64encode(
            hashlib.sha256(verifier.encode()).digest()
        ).decode().rstrip('=')
        
        return verifier, challenge
    
    async def exchange_code_for_token(
        self,
        code: str,
        code_verifier: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Exchange authorization code for tokens.
        
        Args:
            code: Authorization code from callback
            code_verifier: PKCE code verifier
        
        Returns:
            Token response dict
        """
        import aiohttp
        
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": self.config.redirect_uri,
            "client_id": self.config.client_id,
            "client_secret": self.config.client_secret
        }
        
        if code_verifier:
            data["code_verifier"] = code_verifier
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                self.config.token_url,
                data=data,
                headers={"Accept": "application/json"}
            ) as response:
                response.raise_for_status()
                return await response.json()
    
    def get_client_credentials_token(self) -> Dict[str, Any]:
        """
        Get token using Client Credentials flow.
        
        Returns:
            Token response dict
        """
        import requests
        
        response = requests.post(
            self.config.token_url,
            data={
                "grant_type": "client_credentials",
                "client_id": self.config.client_id,
                "client_secret": self.config.client_secret,
                "scope": self.config.scope
            },
            headers={"Accept": "application/json"}
        )
        response.raise_for_status()
        return response.json()
    
    async def get_userinfo(self, access_token: str) -> Dict[str, Any]:
        """
        Get user info from provider.
        
        Args:
            access_token: OAuth access token
        
        Returns:
            User info dict
        """
        import aiohttp
        
        async with aiohttp.ClientSession() as session:
            async with session.get(
                self.config.userinfo_url,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json"
                }
            ) as response:
                response.raise_for_status()
                return await response.json()


# =============================================================================
# API KEY AUTHENTICATION
# =============================================================================

class APIKeyManager:
    """
    API key management for programmatic access.
    Keys are stored hashed, never in plaintext.
    """
    
    def __init__(self, db=None):
        self._db = db
        self._logger = logging.getLogger(__name__)
    
    def generate_api_key(
        self,
        tenant_id: str,
        name: str,
        permissions: List[str],
        expires_days: Optional[int] = None,
        created_by: Optional[int] = None
    ) -> Tuple[str, str]:
        """
        Generate new API key.
        
        Args:
            tenant_id: Tenant identifier
            name: Key name/description
            permissions: List of permissions
            expires_days: Optional expiration in days
            created_by: User ID who created the key
        
        Returns:
            Tuple of (key_id, api_key) - api_key shown only once!
        """
        # Generate key
        key_id = f"key_{secrets.token_urlsafe(8)}"
        key_secret = secrets.token_urlsafe(32)
        api_key = f"{key_id}.{key_secret}"
        
        # Hash the key for storage
        key_hash = hashlib.sha256(key_secret.encode()).hexdigest()
        
        expires_at = None
        if expires_days:
            expires_at = datetime.now(timezone.utc) + timedelta(days=expires_days)
        
        # Store in database
        if self._db:
            with self._db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO api_keys 
                    (key_id, key_hash, tenant_id, name, permissions, created_by, expires_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    key_id, key_hash, tenant_id, name,
                    json.dumps(permissions), created_by, expires_at
                ))
                conn.commit()
        
        return key_id, api_key
    
    def verify_api_key(self, api_key: str) -> Optional[Dict[str, Any]]:
        """
        Verify API key and return associated data.
        
        Args:
            api_key: Full API key (key_id.secret)
        
        Returns:
            Key data dict if valid, None otherwise
        """
        try:
            key_id, key_secret = api_key.split(".", 1)
            key_hash = hashlib.sha256(key_secret.encode()).hexdigest()
            
            if self._db:
                with self._db.get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        SELECT * FROM api_keys
                        WHERE key_id = ? AND key_hash = ? AND is_active = 1
                    """, (key_id, key_hash))
                    row = cursor.fetchone()
                    
                    if row:
                        # Check expiration
                        if row['expires_at']:
                            expires = datetime.fromisoformat(row['expires_at'])
                            if datetime.now(timezone.utc) > expires:
                                return None
                        
                        # Update last used
                        cursor.execute("""
                            UPDATE api_keys SET last_used_at = ?
                            WHERE key_id = ?
                        """, (datetime.now(timezone.utc), key_id))
                        conn.commit()
                        
                        return {
                            "key_id": row['key_id'],
                            "tenant_id": row['tenant_id'],
                            "name": row['name'],
                            "permissions": json.loads(row['permissions'])
                        }
            
            return None
            
        except Exception as e:
            self._logger.error(f"API key verification error: {e}")
            return None
    
    def revoke_api_key(self, key_id: str) -> bool:
        """Revoke an API key"""
        if self._db:
            with self._db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE api_keys SET is_active = 0
                    WHERE key_id = ?
                """, (key_id,))
                conn.commit()
                return cursor.rowcount > 0
        return False


# =============================================================================
# AUTHENTICATION DECORATORS
# =============================================================================

def require_auth(
    jwt_manager: Optional[JWTManager] = None,
    required_permissions: Optional[List[str]] = None,
    required_scope: Optional[str] = None
):
    """
    Decorator for requiring authentication.
    
    Args:
        jwt_manager: JWT manager instance
        required_permissions: List of required permissions
        required_scope: Required OAuth scope
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Extract token from context/headers
            # This would be implemented based on the web framework being used
            token = kwargs.get('_token') or kwargs.get('_auth_token')
            
            if not token:
                raise JWTError("Authentication required")
            
            manager = jwt_manager or JWTManager()
            claims = manager.decode(token)
            
            # Check if token is revoked
            if manager.is_token_revoked(claims.get("jti")):
                raise TokenInvalidError("Token has been revoked")
            
            # Check permissions
            if required_permissions:
                user_perms = set(claims.get("perms", []))
                for perm in required_permissions:
                    if perm not in user_perms:
                        raise InsufficientScopeError(f"Missing permission: {perm}")
            
            # Check scope
            if required_scope:
                user_scopes = set(claims.get("scope", "").split())
                required_scopes = set(required_scope.split())
                if not required_scopes.issubset(user_scopes):
                    raise InsufficientScopeError(f"Missing scope: {required_scope}")
            
            # Add claims to kwargs
            kwargs['_claims'] = claims
            
            return func(*args, **kwargs)
        
        return wrapper
    return decorator


def require_tenant(tenant_id_param: str = 'tenant_id'):
    """
    Decorator to enforce tenant isolation.
    Ensures user can only access their own tenant's data.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            claims = kwargs.get('_claims', {})
            user_tenant = claims.get('tid', 'default')
            requested_tenant = kwargs.get(tenant_id_param, user_tenant)
            
            # Super admins can access any tenant
            if 'super_admin' in claims.get('roles', []):
                return func(*args, **kwargs)
            
            # Regular users can only access their own tenant
            if user_tenant != requested_tenant:
                raise JWTError("Access denied - tenant isolation violation")
            
            return func(*args, **kwargs)
        
        return wrapper
    return decorator
