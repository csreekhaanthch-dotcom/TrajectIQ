"""
TrajectIQ Enterprise RBAC System
================================
Role-Based Access Control with secure authentication.
"""

import bcrypt
import secrets
import hashlib
import uuid
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List, Dict, Set, Any, Tuple
from enum import Enum
from dataclasses import dataclass
from functools import wraps
import json

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from core.database import get_database, DatabaseManager


class Role(Enum):
    SUPER_ADMIN = "super_admin"
    HR_ADMIN = "hr_admin"
    RECRUITER = "recruiter"
    AUDITOR = "auditor"


# Role permissions mapping
ROLE_PERMISSIONS: Dict[Role, Set[str]] = {
    Role.SUPER_ADMIN: {
        # Full system control
        "system.configure",
        "system.shutdown",
        "system.backup",
        "system.restore",
        # License management
        "license.view",
        "license.update",
        "license.activate",
        "license.deactivate",
        # User management
        "users.create",
        "users.view",
        "users.update",
        "users.delete",
        "users.manage_roles",
        # AI control
        "ai.configure",
        "ai.toggle",
        # Scoring control
        "scoring.configure",
        "scoring.view_weights",
        "scoring.update_weights",
        # Candidates
        "candidates.view_all",
        "candidates.view_assigned",
        "candidates.create",
        "candidates.update",
        "candidates.delete",
        "candidates.assign",
        # Evaluations
        "evaluations.view_all",
        "evaluations.run",
        "evaluations.export",
        # Reports
        "reports.view",
        "reports.export",
        "reports.analytics",
        # Audit
        "audit.view",
        "audit.export",
        # Bias monitoring
        "bias.view",
        "bias.export",
        # Email/ATS
        "integrations.configure",
        "integrations.view",
        # Analytics
        "analytics.view",
        "analytics.export"
    },
    Role.HR_ADMIN: {
        # User management (limited)
        "users.view",
        "users.create",
        "users.update",
        # Candidates
        "candidates.view_all",
        "candidates.view_assigned",
        "candidates.create",
        "candidates.update",
        "candidates.assign",
        # Evaluations
        "evaluations.view_all",
        "evaluations.run",
        "evaluations.export",
        # Reports
        "reports.view",
        "reports.export",
        "reports.analytics",
        # Audit (limited)
        "audit.view",
        # Bias monitoring
        "bias.view",
        # Email/ATS
        "integrations.view",
        "integrations.configure",
        # Analytics
        "analytics.view",
        "analytics.export"
    },
    Role.RECRUITER: {
        # Candidates (assigned only)
        "candidates.view_assigned",
        "candidates.create",
        # Evaluations
        "evaluations.run",
        "evaluations.view_all",
        # Reports (own only)
        "reports.view",
        # Analytics (limited)
        "analytics.view"
    },
    Role.AUDITOR: {
        # Read-only access
        "audit.view",
        "audit.export",
        "bias.view",
        "bias.export",
        "analytics.view",
        "reports.view"
    }
}


@dataclass
class User:
    """User model"""
    id: int
    username: str
    role: Role
    full_name: str
    email: Optional[str]
    is_active: bool
    failed_login_attempts: int
    locked_until: Optional[datetime]
    last_login: Optional[datetime]
    created_at: datetime


@dataclass
class Session:
    """Session model"""
    id: int
    session_id: str
    user_id: int
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime
    expires_at: datetime
    last_activity: datetime
    is_active: bool


class AuthenticationError(Exception):
    """Authentication related errors"""
    pass


class AuthorizationError(Exception):
    """Authorization related errors"""
    pass


class AccountLockedError(AuthenticationError):
    """Account is locked"""
    pass


class PasswordPolicyError(AuthenticationError):
    """Password doesn't meet policy"""
    pass


class RBACManager:
    """
    Role-Based Access Control Manager.
    Handles authentication, authorization, and session management.
    """
    
    def __init__(self, db: Optional[DatabaseManager] = None):
        self.db = db or get_database()
        self._current_user: Optional[User] = None
        self._current_session: Optional[Session] = None
    
    @staticmethod
    def hash_password(password: str) -> Tuple[str, str]:
        """
        Hash password with bcrypt.
        Returns (password_hash, salt).
        """
        salt = bcrypt.gensalt(rounds=12)
        password_hash = bcrypt.hashpw(password.encode('utf-8'), salt)
        return password_hash.decode('utf-8'), salt.decode('utf-8')
    
    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        """Verify password against hash"""
        try:
            return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
        except Exception:
            return False
    
    @staticmethod
    def validate_password_strength(password: str) -> Tuple[bool, List[str]]:
        """
        Validate password meets security policy.
        Returns (is_valid, list_of_issues).
        """
        issues = []
        
        if len(password) < 12:
            issues.append("Password must be at least 12 characters")
        
        if not any(c.isupper() for c in password):
            issues.append("Password must contain uppercase letter")
        
        if not any(c.islower() for c in password):
            issues.append("Password must contain lowercase letter")
        
        if not any(c.isdigit() for c in password):
            issues.append("Password must contain digit")
        
        if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
            issues.append("Password must contain special character")
        
        # Check common patterns
        common_patterns = ['password', '123456', 'qwerty', 'admin', 'letmein']
        for pattern in common_patterns:
            if pattern in password.lower():
                issues.append(f"Password contains common pattern: {pattern}")
                break
        
        return len(issues) == 0, issues
    
    def create_user(
        self,
        username: str,
        password: str,
        role: Role,
        full_name: str,
        email: Optional[str] = None,
        created_by: Optional[int] = None
    ) -> User:
        """Create a new user"""
        
        # Validate password strength
        is_valid, issues = self.validate_password_strength(password)
        if not is_valid:
            raise PasswordPolicyError("; ".join(issues))
        
        # Hash password
        password_hash, salt = self.hash_password(password)
        
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            
            try:
                cursor.execute("""
                    INSERT INTO users (username, password_hash, salt, role, full_name, email, created_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (username, password_hash, salt, role.value, full_name, email, created_by))
                
                user_id = cursor.lastrowid
                conn.commit()
                
                # Audit log
                self.db.log_audit(
                    action="user_created",
                    user_id=created_by,
                    entity_type="user",
                    entity_id=str(user_id),
                    details={"username": username, "role": role.value}
                )
                
                return self.get_user_by_id(user_id)
                
            except sqlite3.IntegrityError:
                raise AuthenticationError(f"Username '{username}' already exists")
    
    def get_user_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            
            if row:
                return self._row_to_user(row)
            return None
    
    def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
            row = cursor.fetchone()
            
            if row:
                return self._row_to_user(row)
            return None
    
    def _row_to_user(self, row) -> User:
        """Convert database row to User object"""
        return User(
            id=row['id'],
            username=row['username'],
            role=Role(row['role']),
            full_name=row['full_name'],
            email=row['email'],
            is_active=bool(row['is_active']),
            failed_login_attempts=row['failed_login_attempts'],
            locked_until=datetime.fromisoformat(row['locked_until']) if row['locked_until'] else None,
            last_login=datetime.fromisoformat(row['last_login']) if row['last_login'] else None,
            created_at=datetime.fromisoformat(row['created_at'])
        )
    
    def authenticate(
        self,
        username: str,
        password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        session_timeout_minutes: int = 30
    ) -> Tuple[User, Session]:
        """
        Authenticate user and create session.
        Returns (User, Session) on success.
        """
        from core.config import get_config
        config = get_config()
        security = config.get_security_config()
        
        user = self.get_user_by_username(username)
        
        if not user:
            # Log failed attempt (don't reveal if user exists)
            self.db.log_audit(
                action="login_failed",
                details={"username": username, "reason": "user_not_found"},
                ip_address=ip_address
            )
            raise AuthenticationError("Invalid credentials")
        
        # Check if account is active
        if not user.is_active:
            self.db.log_audit(
                action="login_failed",
                user_id=user.id,
                details={"reason": "account_inactive"},
                ip_address=ip_address
            )
            raise AuthenticationError("Account is disabled")
        
        # Check if account is locked
        if user.locked_until and user.locked_until > datetime.utcnow():
            remaining = (user.locked_until - datetime.utcnow()).seconds // 60
            self.db.log_audit(
                action="login_failed",
                user_id=user.id,
                details={"reason": "account_locked", "remaining_minutes": remaining},
                ip_address=ip_address
            )
            raise AccountLockedError(f"Account locked. Try again in {remaining} minutes")
        
        # Verify password
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT password_hash FROM users WHERE id = ?", (user.id,))
            row = cursor.fetchone()
            
            if not self.verify_password(password, row['password_hash']):
                # Increment failed attempts
                new_attempts = user.failed_login_attempts + 1
                lock_until = None
                
                if new_attempts >= security.max_login_attempts:
                    lock_until = datetime.utcnow() + timedelta(minutes=security.lockout_duration_minutes)
                    cursor.execute("""
                        UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?
                    """, (new_attempts, lock_until, user.id))
                else:
                    cursor.execute("""
                        UPDATE users SET failed_login_attempts = ? WHERE id = ?
                    """, (new_attempts, user.id))
                
                conn.commit()
                
                self.db.log_audit(
                    action="login_failed",
                    user_id=user.id,
                    details={"reason": "invalid_password", "attempts": new_attempts},
                    ip_address=ip_address
                )
                
                if lock_until:
                    raise AccountLockedError(f"Account locked for {security.lockout_duration_minutes} minutes")
                raise AuthenticationError("Invalid credentials")
        
        # Authentication successful - create session
        session = self._create_session(
            user.id, ip_address, user_agent, session_timeout_minutes
        )
        
        # Reset failed attempts and update last login
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE users 
                SET failed_login_attempts = 0, locked_until = NULL, last_login = ? 
                WHERE id = ?
            """, (datetime.utcnow(), user.id))
            conn.commit()
        
        # Update user object
        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_login = datetime.utcnow()
        
        # Log successful login
        self.db.log_audit(
            action="login_success",
            user_id=user.id,
            session_id=session.session_id,
            ip_address=ip_address
        )
        
        self._current_user = user
        self._current_session = session
        
        return user, session
    
    def _create_session(
        self,
        user_id: int,
        ip_address: Optional[str],
        user_agent: Optional[str],
        timeout_minutes: int
    ) -> Session:
        """Create new session"""
        session_id = secrets.token_urlsafe(32)
        now = datetime.utcnow()
        expires = now + timedelta(minutes=timeout_minutes)
        
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO sessions (session_id, user_id, ip_address, user_agent, expires_at)
                VALUES (?, ?, ?, ?, ?)
            """, (session_id, user_id, ip_address, user_agent, expires))
            conn.commit()
            
            return Session(
                id=cursor.lastrowid,
                session_id=session_id,
                user_id=user_id,
                ip_address=ip_address,
                user_agent=user_agent,
                created_at=now,
                expires_at=expires,
                last_activity=now,
                is_active=True
            )
    
    def validate_session(self, session_id: str) -> Optional[Session]:
        """Validate session and extend if valid"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM sessions 
                WHERE session_id = ? AND is_active = 1 AND expires_at > ?
            """, (session_id, datetime.utcnow()))
            
            row = cursor.fetchone()
            
            if row:
                # Extend session
                new_expires = datetime.utcnow() + timedelta(minutes=30)
                cursor.execute("""
                    UPDATE sessions SET expires_at = ?, last_activity = ? 
                    WHERE session_id = ?
                """, (new_expires, datetime.utcnow(), session_id))
                conn.commit()
                
                return Session(
                    id=row['id'],
                    session_id=row['session_id'],
                    user_id=row['user_id'],
                    ip_address=row['ip_address'],
                    user_agent=row['user_agent'],
                    created_at=datetime.fromisoformat(row['created_at']),
                    expires_at=new_expires,
                    last_activity=datetime.utcnow(),
                    is_active=True
                )
            
            return None
    
    def logout(self, session_id: str):
        """End session"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE sessions SET is_active = 0 WHERE session_id = ?
            """, (session_id,))
            conn.commit()
            
            self.db.log_audit(
                action="logout",
                session_id=session_id
            )
        
        self._current_user = None
        self._current_session = None
    
    def has_permission(self, user: User, permission: str) -> bool:
        """Check if user has specific permission"""
        role_permissions = ROLE_PERMISSIONS.get(user.role, set())
        return permission in role_permissions
    
    def check_permission(self, permission: str):
        """Decorator to check permission"""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                if not self._current_user:
                    raise AuthorizationError("Not authenticated")
                
                if not self.has_permission(self._current_user, permission):
                    raise AuthorizationError(f"Permission denied: {permission}")
                
                return func(*args, **kwargs)
            return wrapper
        return decorator
    
    def get_users(self, role: Optional[Role] = None) -> List[User]:
        """Get all users, optionally filtered by role"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            
            if role:
                cursor.execute("SELECT * FROM users WHERE role = ?", (role.value,))
            else:
                cursor.execute("SELECT * FROM users")
            
            return [self._row_to_user(row) for row in cursor.fetchall()]
    
    def update_user(
        self,
        user_id: int,
        full_name: Optional[str] = None,
        email: Optional[str] = None,
        role: Optional[Role] = None,
        is_active: Optional[bool] = None
    ) -> User:
        """Update user details"""
        updates = []
        params = []
        
        if full_name is not None:
            updates.append("full_name = ?")
            params.append(full_name)
        
        if email is not None:
            updates.append("email = ?")
            params.append(email)
        
        if role is not None:
            updates.append("role = ?")
            params.append(role.value)
        
        if is_active is not None:
            updates.append("is_active = ?")
            params.append(1 if is_active else 0)
        
        if not updates:
            return self.get_user_by_id(user_id)
        
        params.append(user_id)
        
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f"""
                UPDATE users SET {', '.join(updates)}, updated_at = ? WHERE id = ?
            """, [datetime.utcnow()] + params)
            conn.commit()
        
        self.db.log_audit(
            action="user_updated",
            user_id=self._current_user.id if self._current_user else None,
            entity_type="user",
            entity_id=str(user_id)
        )
        
        return self.get_user_by_id(user_id)
    
    def change_password(self, user_id: int, old_password: str, new_password: str) -> bool:
        """Change user password"""
        user = self.get_user_by_id(user_id)
        
        if not user:
            raise AuthenticationError("User not found")
        
        # Verify old password
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT password_hash FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            
            if not self.verify_password(old_password, row['password_hash']):
                raise AuthenticationError("Invalid current password")
        
        # Validate new password
        is_valid, issues = self.validate_password_strength(new_password)
        if not is_valid:
            raise PasswordPolicyError("; ".join(issues))
        
        # Update password
        password_hash, salt = self.hash_password(new_password)
        
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE users SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?
            """, (password_hash, salt, datetime.utcnow(), user_id))
            conn.commit()
        
        self.db.log_audit(
            action="password_changed",
            user_id=user_id
        )
        
        return True
    
    def delete_user(self, user_id: int) -> bool:
        """Delete user (soft delete by deactivating)"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?
            """, (datetime.utcnow(), user_id))
            conn.commit()
        
        self.db.log_audit(
            action="user_deleted",
            user_id=self._current_user.id if self._current_user else None,
            entity_type="user",
            entity_id=str(user_id)
        )
        
        return True
    
    def get_current_user(self) -> Optional[User]:
        """Get currently authenticated user"""
        return self._current_user
    
    def get_current_session(self) -> Optional[Session]:
        """Get current session"""
        return self._current_session


# Global RBAC manager
rbac_manager: Optional[RBACManager] = None


def get_rbac() -> RBACManager:
    """Get global RBAC manager"""
    global rbac_manager
    if rbac_manager is None:
        rbac_manager = RBACManager()
    return rbac_manager
