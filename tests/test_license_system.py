"""
TrajectIQ License System Tests
==============================
Tests for license activation, validation, and management.
"""

import pytest
import sys
import os
from pathlib import Path
from datetime import datetime, timedelta
import tempfile
import json

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from security.license import (
    LicenseManager,
    LicenseStatus,
    LicenseType,
    validate_license,
    generate_machine_fingerprint
)


class TestLicenseGeneration:
    """Tests for license key generation"""

    @pytest.fixture
    def license_manager(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            keys_dir = Path(tmpdir) / "keys"
            keys_dir.mkdir()
            yield LicenseManager(keys_dir=str(keys_dir))

    def test_generate_trial_license(self, license_manager):
        """Test trial license generation"""
        license_key = license_manager.generate_license(
            license_type=LicenseType.TRIAL,
            days=14,
            max_users=1
        )

        assert license_key is not None
        assert license_key.startswith("TRAJECTIQ-TRIAL-")

    def test_generate_enterprise_license(self, license_manager):
        """Test enterprise license generation"""
        license_key = license_manager.generate_license(
            license_type=LicenseType.ENTERPRISE,
            days=365,
            max_users=100,
            features=["ats_integration", "api_access", "sso"]
        )

        assert license_key is not None
        assert license_key.startswith("TRAJECTIQ-ENT-")

    def test_generate_demo_license(self, license_manager):
        """Test demo license generation"""
        license_key = license_manager.generate_license(
            license_type=LicenseType.DEMO,
            days=30,
            max_users=5
        )

        assert "DEMO" in license_key


class TestLicenseActivation:
    """Tests for license activation process"""

    @pytest.fixture
    def license_manager(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            keys_dir = Path(tmpdir) / "keys"
            keys_dir.mkdir()
            db_path = Path(tmpdir) / "licenses.db"
            yield LicenseManager(
                keys_dir=str(keys_dir),
                db_path=str(db_path)
            )

    def test_activate_valid_license(self, license_manager):
        """Test activating a valid license"""
        license_key = license_manager.generate_license(
            license_type=LicenseType.ENTERPRISE,
            days=365
        )

        result = license_manager.activate_license(license_key)

        assert result.success is True
        assert result.status == LicenseStatus.ACTIVE

    def test_activate_invalid_license(self, license_manager):
        """Test activating an invalid license"""
        result = license_manager.activate_license("INVALID-KEY")

        assert result.success is False
        assert result.status == LicenseStatus.INVALID

    def test_activate_expired_license(self, license_manager):
        """Test activating an expired license"""
        license_key = license_manager.generate_license(
            license_type=LicenseType.ENTERPRISE,
            days=-1  # Already expired
        )

        result = license_manager.activate_license(license_key)

        assert result.success is False
        assert result.status == LicenseStatus.EXPIRED

    def test_activate_already_used_license(self, license_manager):
        """Test activating a license that's already been used"""
        license_key = license_manager.generate_license(
            license_type=LicenseType.ENTERPRISE,
            days=365,
            max_activations=1
        )

        # First activation should succeed
        result1 = license_manager.activate_license(license_key)
        assert result1.success is True

        # Second activation should fail
        result2 = license_manager.activate_license(license_key)
        assert result2.success is False
        assert result2.status == LicenseStatus.MAX_ACTIVATIONS


class TestLicenseValidation:
    """Tests for license validation"""

    @pytest.fixture
    def license_manager(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            keys_dir = Path(tmpdir) / "keys"
            keys_dir.mkdir()
            db_path = Path(tmpdir) / "licenses.db"
            lm = LicenseManager(
                keys_dir=str(keys_dir),
                db_path=str(db_path)
            )
            yield lm

    def test_validate_active_license(self, license_manager):
        """Test validating an active license"""
        license_key = license_manager.generate_license(days=365)
        license_manager.activate_license(license_key)

        status = license_manager.validate_license(license_key)

        assert status == LicenseStatus.ACTIVE

    def test_validate_expired_license(self, license_manager):
        """Test validating an expired license"""
        license_key = license_manager.generate_license(days=-1)

        status = license_manager.validate_license(license_key)

        assert status == LicenseStatus.EXPIRED

    def test_validate_revoked_license(self, license_manager):
        """Test validating a revoked license"""
        license_key = license_manager.generate_license(days=365)
        license_manager.activate_license(license_key)
        license_manager.revoke_license(license_key)

        status = license_manager.validate_license(license_key)

        assert status == LicenseStatus.REVOKED


class TestMachineFingerprint:
    """Tests for machine fingerprint binding"""

    def test_generate_fingerprint(self):
        """Test fingerprint generation"""
        fingerprint = generate_machine_fingerprint()

        assert fingerprint is not None
        assert len(fingerprint) == 64  # SHA-256 hex digest

    def test_fingerprint_consistency(self):
        """Test that fingerprint is consistent"""
        fp1 = generate_machine_fingerprint()
        fp2 = generate_machine_fingerprint()

        assert fp1 == fp2

    def test_fingerprint_binding(self):
        """Test machine binding for license"""
        with tempfile.TemporaryDirectory() as tmpdir:
            keys_dir = Path(tmpdir) / "keys"
            keys_dir.mkdir()
            db_path = Path(tmpdir) / "licenses.db"

            lm = LicenseManager(
                keys_dir=str(keys_dir),
                db_path=str(db_path),
                bind_to_machine=True
            )

            license_key = lm.generate_license(days=365)
            result = lm.activate_license(license_key)

            assert result.success is True
            assert result.machine_fingerprint is not None


class TestLicenseFeatures:
    """Tests for license feature restrictions"""

    @pytest.fixture
    def license_manager(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            keys_dir = Path(tmpdir) / "keys"
            keys_dir.mkdir()
            db_path = Path(tmpdir) / "licenses.db"
            yield LicenseManager(
                keys_dir=str(keys_dir),
                db_path=str(db_path)
            )

    def test_feature_enabled(self, license_manager):
        """Test checking enabled features"""
        license_key = license_manager.generate_license(
            days=365,
            features=["ats_integration", "api_access"]
        )
        license_manager.activate_license(license_key)

        assert license_manager.is_feature_enabled("ats_integration")
        assert license_manager.is_feature_enabled("api_access")

    def test_feature_disabled(self, license_manager):
        """Test checking disabled features"""
        license_key = license_manager.generate_license(
            days=365,
            features=["ats_integration"]
        )
        license_manager.activate_license(license_key)

        assert not license_manager.is_feature_enabled("sso")
        assert not license_manager.is_feature_enabled("white_label")

    def test_user_limit_enforcement(self, license_manager):
        """Test user limit enforcement"""
        license_key = license_manager.generate_license(
            days=365,
            max_users=5
        )
        license_manager.activate_license(license_key)

        assert license_manager.get_max_users() == 5
        assert license_manager.can_add_user(4)  # 4 < 5
        assert not license_manager.can_add_user(5)  # 5 == 5 (at limit)


class TestDemoLicense:
    """Tests specifically for demo license functionality"""

    DEMO_LICENSE = "TRAJECTIQ-DEMO-2024-FULL-ACCESS"

    @pytest.fixture
    def license_manager(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            keys_dir = Path(tmpdir) / "keys"
            keys_dir.mkdir()
            db_path = Path(tmpdir) / "licenses.db"
            lm = LicenseManager(
                keys_dir=str(keys_dir),
                db_path=str(db_path)
            )
            # Register demo license
            lm.register_demo_license()
            yield lm

    def test_demo_license_valid(self, license_manager):
        """Test that demo license is valid"""
        status = license_manager.validate_license(self.DEMO_LICENSE)
        assert status == LicenseStatus.ACTIVE

    def test_demo_license_features(self, license_manager):
        """Test demo license has expected features"""
        license_manager.activate_license(self.DEMO_LICENSE)

        assert license_manager.is_feature_enabled("scoring")
        assert license_manager.is_feature_enabled("bias_detection")
        assert license_manager.is_feature_enabled("basic_integrations")


class TestLicenseRenewal:
    """Tests for license renewal"""

    @pytest.fixture
    def license_manager(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            keys_dir = Path(tmpdir) / "keys"
            keys_dir.mkdir()
            db_path = Path(tmpdir) / "licenses.db"
            yield LicenseManager(
                keys_dir=str(keys_dir),
                db_path=str(db_path)
            )

    def test_renew_license(self, license_manager):
        """Test license renewal"""
        license_key = license_manager.generate_license(days=30)
        license_manager.activate_license(license_key)

        # Renew for another year
        new_expiry = license_manager.renew_license(license_key, days=365)

        assert new_expiry > datetime.utcnow() + timedelta(days=360)

    def test_renewal_extends_features(self, license_manager):
        """Test that renewal preserves features"""
        license_key = license_manager.generate_license(
            days=30,
            features=["ats_integration", "sso"]
        )
        license_manager.activate_license(license_key)

        license_manager.renew_license(license_key, days=365)

        assert license_manager.is_feature_enabled("ats_integration")
        assert license_manager.is_feature_enabled("sso")


class TestLicenseAudit:
    """Tests for license audit trail"""

    @pytest.fixture
    def license_manager(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            keys_dir = Path(tmpdir) / "keys"
            keys_dir.mkdir()
            db_path = Path(tmpdir) / "licenses.db"
            yield LicenseManager(
                keys_dir=str(keys_dir),
                db_path=str(db_path)
            )

    def test_activation_logged(self, license_manager):
        """Test that activations are logged"""
        license_key = license_manager.generate_license(days=365)
        license_manager.activate_license(license_key)

        logs = license_manager.get_audit_logs()
        assert any("activation" in str(log).lower() for log in logs)

    def test_validation_logged(self, license_manager):
        """Test that validations are logged"""
        license_key = license_manager.generate_license(days=365)
        license_manager.activate_license(license_key)

        license_manager.validate_license(license_key)

        logs = license_manager.get_audit_logs()
        assert any("validation" in str(log).lower() for log in logs)
