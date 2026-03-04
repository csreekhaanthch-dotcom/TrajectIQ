"""
TrajectIQ Security RBAC Tests
=============================
Tests for Role-Based Access Control and security features.
"""

import pytest
import sys
from pathlib import Path
from datetime import datetime, timedelta
import hashlib

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from security.rbac import (
    RBACManager,
    Role,
    Permission,
    User,
    check_permission,
    get_role_permissions
)


class TestRoles:
    """Test role definitions and hierarchy"""

    def test_role_hierarchy(self):
        """Test that role hierarchy is properly defined"""
        assert Role.SUPER_ADMIN.value == "super_admin"
        assert Role.HR_ADMIN.value == "hr_admin"
        assert Role.RECRUITER.value == "recruiter"
        assert Role.AUDITOR.value == "auditor"

    def test_all_roles_have_permissions(self):
        """Test that all roles have defined permissions"""
        for role in Role:
            permissions = get_role_permissions(role)
            assert len(permissions) > 0, f"Role {role} has no permissions"


class TestPermissions:
    """Test permission system"""

    def test_permission_values(self):
        """Test permission enum values"""
        assert Permission.VIEW_CANDIDATES.value == "view_candidates"
        assert Permission.EVALUATE_RESUMES.value == "evaluate_resumes"
        assert Permission.MANAGE_USERS.value == "manage_users"
        assert Permission.VIEW_AUDIT_LOGS.value == "view_audit_logs"

    def test_permission_check_granted(self):
        """Test permission check when granted"""
        rbac = RBACManager()
        user = User(
            user_id="test-user",
            role=Role.RECRUITER,
            permissions=[Permission.VIEW_CANDIDATES, Permission.EVALUATE_RESUMES]
        )

        assert rbac.check_permission(user, Permission.VIEW_CANDIDATES) is True
        assert rbac.check_permission(user, Permission.EVALUATE_RESUMES) is True

    def test_permission_check_denied(self):
        """Test permission check when denied"""
        rbac = RBACManager()
        user = User(
            user_id="test-user",
            role=Role.RECRUITER,
            permissions=[Permission.VIEW_CANDIDATES]
        )

        assert rbac.check_permission(user, Permission.MANAGE_USERS) is False

    def test_super_admin_has_all_permissions(self):
        """Test that super admin has all permissions"""
        rbac = RBACManager()
        user = User(
            user_id="admin",
            role=Role.SUPER_ADMIN,
            permissions=[]  # No explicit permissions needed
        )

        for permission in Permission:
            assert rbac.check_permission(user, permission) is True


class TestUserManagement:
    """Test user management functionality"""

    @pytest.fixture
    def rbac(self):
        return RBACManager()

    def test_create_user(self, rbac):
        """Test user creation"""
        user = rbac.create_user(
            user_id="new-user",
            role=Role.RECRUITER,
            name="Test User",
            email="test@example.com"
        )

        assert user.user_id == "new-user"
        assert user.role == Role.RECRUITER
        assert user.name == "Test User"

    def test_get_user(self, rbac):
        """Test user retrieval"""
        rbac.create_user(
            user_id="test-user",
            role=Role.HR_ADMIN,
            name="HR User"
        )

        user = rbac.get_user("test-user")
        assert user is not None
        assert user.role == Role.HR_ADMIN

    def test_update_user_role(self, rbac):
        """Test updating user role"""
        rbac.create_user(
            user_id="promo-user",
            role=Role.RECRUITER
        )

        rbac.update_user_role("promo-user", Role.HR_ADMIN)
        user = rbac.get_user("promo-user")

        assert user.role == Role.HR_ADMIN

    def test_delete_user(self, rbac):
        """Test user deletion"""
        rbac.create_user(
            user_id="delete-me",
            role=Role.RECRUITER
        )

        rbac.delete_user("delete-me")
        user = rbac.get_user("delete-me")

        assert user is None

    def test_list_users_by_role(self, rbac):
        """Test listing users by role"""
        rbac.create_user("recruiter1", Role.RECRUITER)
        rbac.create_user("recruiter2", Role.RECRUITER)
        rbac.create_user("admin1", Role.HR_ADMIN)

        recruiters = rbac.list_users_by_role(Role.RECRUITER)
        assert len(recruiters) >= 2


class TestAccessControl:
    """Test access control enforcement"""

    @pytest.fixture
    def rbac(self):
        return RBACManager()

    def test_recruiter_cannot_manage_users(self, rbac):
        """Test recruiter cannot access user management"""
        user = User(
            user_id="recruiter",
            role=Role.RECRUITER,
            permissions=get_role_permissions(Role.RECRUITER)
        )

        assert not rbac.check_permission(user, Permission.MANAGE_USERS)
        assert not rbac.check_permission(user, Permission.MANAGE_LICENSES)

    def test_auditor_read_only_access(self, rbac):
        """Test auditor has read-only access"""
        user = User(
            user_id="auditor",
            role=Role.AUDITOR,
            permissions=get_role_permissions(Role.AUDITOR)
        )

        # Should be able to view
        assert rbac.check_permission(user, Permission.VIEW_CANDIDATES)
        assert rbac.check_permission(user, Permission.VIEW_AUDIT_LOGS)

        # Should not be able to modify
        assert not rbac.check_permission(user, Permission.EVALUATE_RESUMES)
        assert not rbac.check_permission(user, Permission.DELETE_CANDIDATES)

    def test_hr_admin_permissions(self, rbac):
        """Test HR admin has appropriate permissions"""
        user = User(
            user_id="hr-admin",
            role=Role.HR_ADMIN,
            permissions=get_role_permissions(Role.HR_ADMIN)
        )

        assert rbac.check_permission(user, Permission.VIEW_CANDIDATES)
        assert rbac.check_permission(user, Permission.EVALUATE_RESUMES)
        assert rbac.check_permission(user, Permission.MANAGE_JOBS)
        assert rbac.check_permission(user, Permission.VIEW_REPORTS)


class TestSessionManagement:
    """Test session and authentication"""

    @pytest.fixture
    def rbac(self):
        return RBACManager()

    def test_create_session(self, rbac):
        """Test session creation"""
        rbac.create_user("session-user", Role.RECRUITER)
        session = rbac.create_session("session-user")

        assert session is not None
        assert session.user_id == "session-user"
        assert session.token is not None

    def test_validate_session(self, rbac):
        """Test session validation"""
        rbac.create_user("session-user", Role.RECRUITER)
        session = rbac.create_session("session-user")

        validated = rbac.validate_session(session.token)
        assert validated is not None
        assert validated.user_id == "session-user"

    def test_invalidate_session(self, rbac):
        """Test session invalidation"""
        rbac.create_user("session-user", Role.RECRUITER)
        session = rbac.create_session("session-user")

        rbac.invalidate_session(session.token)
        validated = rbac.validate_session(session.token)

        assert validated is None

    def test_session_expiry(self, rbac):
        """Test session expiration"""
        rbac.create_user("session-user", Role.RECRUITER)

        # Create expired session
        session = rbac.create_session(
            "session-user",
            expires_at=datetime.utcnow() - timedelta(hours=1)
        )

        validated = rbac.validate_session(session.token)
        assert validated is None


class TestAuditLogging:
    """Test audit logging for RBAC actions"""

    @pytest.fixture
    def rbac(self):
        return RBACManager()

    def test_permission_check_logged(self, rbac):
        """Test that permission checks are logged"""
        user = User(
            user_id="test-user",
            role=Role.RECRUITER,
            permissions=[Permission.VIEW_CANDIDATES]
        )

        rbac.check_permission(user, Permission.MANAGE_USERS)

        logs = rbac.get_audit_logs(user_id="test-user")
        assert any("permission_check" in log.get("action", "") for log in logs)

    def test_role_change_logged(self, rbac):
        """Test that role changes are logged"""
        rbac.create_user("role-user", Role.RECRUITER)
        rbac.update_user_role("role-user", Role.HR_ADMIN)

        logs = rbac.get_audit_logs(user_id="role-user")
        assert any("role_change" in log.get("action", "") for log in logs)


class TestSecurityBestPractices:
    """Test security best practices"""

    def test_password_hashing(self):
        """Test that passwords are properly hashed"""
        from security.rbac import hash_password, verify_password

        password = "SecurePassword123!"
        hashed = hash_password(password)

        assert hashed != password
        assert verify_password(password, hashed)
        assert not verify_password("WrongPassword", hashed)

    def test_token_uniqueness(self):
        """Test that session tokens are unique"""
        rbac = RBACManager()
        rbac.create_user("user1", Role.RECRUITER)
        rbac.create_user("user2", Role.RECRUITER)

        session1 = rbac.create_session("user1")
        session2 = rbac.create_session("user2")

        assert session1.token != session2.token

    def test_permission_injection_prevention(self):
        """Test that permission injection is prevented"""
        rbac = RBACManager()
        user = User(
            user_id="malicious-user",
            role=Role.RECRUITER,
            permissions=[Permission.VIEW_CANDIDATES]
        )

        # Attempt to check for permission not granted
        assert not rbac.check_permission(user, "admin:all")
        assert not rbac.check_permission(user, None)
