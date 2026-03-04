"""
TrajectIQ Integration Tests
===========================
End-to-end tests for the complete pipeline.
"""

import pytest
import sys
from pathlib import Path
from datetime import datetime
import tempfile
import json
import os

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from modules.scoring_engine import run_full_evaluation
from modules.bias_detection import BiasDetector
from security.license import LicenseManager, LicenseType
from security.rbac import RBACManager, Role, Permission, User
from connectors.ats_connector import get_ats_connector
from connectors.email_connector import EmailMessage, EmailAttachment


class TestEndToEndPipeline:
    """End-to-end pipeline tests"""

    @pytest.fixture
    def sample_resume(self):
        return {
            "skills": ["Python", "Django", "PostgreSQL", "Docker", "AWS"],
            "experience_years": 5,
            "education_level": "Bachelor",
            "certifications": ["AWS Solutions Architect"],
            "job_history": [
                {"company": "TechCorp", "duration_years": 3},
                {"company": "StartupX", "duration_years": 2}
            ]
        }

    @pytest.fixture
    def sample_job(self):
        return {
            "required_skills": ["Python", "AWS", "PostgreSQL"],
            "preferred_skills": ["Docker", "Kubernetes"],
            "min_experience_years": 3,
            "education_requirement": "Bachelor",
            "required_certifications": [],
            "preferred_certifications": ["AWS Solutions Architect"]
        }

    def test_complete_evaluation_pipeline(self, sample_resume, sample_job):
        """Test complete evaluation from resume to score"""
        # Step 1: Check for bias in job description
        detector = BiasDetector()
        bias_result = detector.scan_job_description(sample_job)
        assert bias_result.bias_detected is False

        # Step 2: Run evaluation
        evaluation = run_full_evaluation(sample_resume, sample_job)

        # Step 3: Verify all scores present
        assert all(key in evaluation for key in
                   ["sdi", "csig", "iae", "cta", "err", "overall_score"])

        # Step 4: Check scores are in valid range
        for key, value in evaluation.items():
            if key != "recommendations":
                assert 0 <= value <= 1, f"{key} out of range"

    def test_pipeline_with_bias_detection(self, sample_resume):
        """Test pipeline with biased job description"""
        biased_job = {
            "required_skills": ["Python"],
            "description": "Looking for a young, aggressive developer",
            "min_experience_years": 2
        }

        detector = BiasDetector()
        bias_result = detector.scan_job_description(biased_job)

        assert bias_result.bias_detected is True
        assert len(bias_result.recommendations) > 0


class TestLicenseAndRBACIntegration:
    """Integration tests for license and RBAC"""

    @pytest.fixture
    def setup_environment(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            keys_dir = Path(tmpdir) / "keys"
            keys_dir.mkdir()

            license_mgr = LicenseManager(keys_dir=str(keys_dir))
            rbac_mgr = RBACManager()

            yield {
                "license_mgr": license_mgr,
                "rbac_mgr": rbac_mgr,
                "tmpdir": tmpdir
            }

    def test_license_activation_enables_features(self, setup_environment):
        """Test that license activation enables correct features"""
        license_mgr = setup_environment["license_mgr"]
        rbac_mgr = setup_environment["rbac_mgr"]

        # Generate and activate license
        license_key = license_mgr.generate_license(
            license_type=LicenseType.ENTERPRISE,
            days=365,
            features=["ats_integration", "api_access"]
        )
        result = license_mgr.activate_license(license_key)

        assert result.success is True
        assert license_mgr.is_feature_enabled("ats_integration")

    def test_user_permissions_match_role(self, setup_environment):
        """Test that user permissions correctly match role"""
        rbac_mgr = setup_environment["rbac_mgr"]

        # Create users with different roles
        recruiter = rbac_mgr.create_user(
            user_id="recruiter1",
            role=Role.RECRUITER
        )
        admin = rbac_mgr.create_user(
            user_id="admin1",
            role=Role.HR_ADMIN
        )

        # Check permissions
        assert rbac_mgr.check_permission(recruiter, Permission.EVALUATE_RESUMES)
        assert not rbac_mgr.check_permission(recruiter, Permission.MANAGE_USERS)
        assert rbac_mgr.check_permission(admin, Permission.MANAGE_USERS)


class TestATSIntegrationFlow:
    """Integration tests for ATS connector flow"""

    def test_ats_candidate_import(self):
        """Test importing candidates from ATS"""
        connector = get_ats_connector("greenhouse", api_key="test-key")

        # Mock the API response
        with patch.object(connector, '_request') as mock_request:
            mock_request.return_value = {
                "candidates": [
                    {
                        "id": "c1",
                        "first_name": "John",
                        "last_name": "Doe",
                        "email": "john@example.com"
                    }
                ]
            }

            candidates = connector.get_candidates()
            assert len(candidates) == 1


class TestScoringPerformanceIntegration:
    """Integration tests for scoring performance"""

    @pytest.fixture
    def large_resume_set(self):
        """Generate a large set of resumes for testing"""
        resumes = []
        for i in range(100):
            resumes.append({
                "skills": [f"skill_{j}" for j in range(10)],
                "experience_years": i % 10 + 1,
                "education_level": ["Bachelor", "Master", "PhD"][i % 3],
                "certifications": [],
                "job_history": []
            })
        return resumes

    @pytest.fixture
    def sample_job(self):
        return {
            "required_skills": ["skill_0", "skill_1", "skill_2"],
            "min_experience_years": 3,
            "education_requirement": "Bachelor"
        }

    def test_batch_scoring_performance(self, large_resume_set, sample_job):
        """Test performance of batch scoring"""
        start_time = datetime.now()

        results = []
        for resume in large_resume_set:
            result = run_full_evaluation(resume, sample_job)
            results.append(result)

        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()

        # Should process 100 resumes in under 5 seconds
        assert duration < 5.0
        assert len(results) == 100


class TestDataPersistence:
    """Integration tests for data persistence"""

    @pytest.fixture
    def temp_db(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "test.db"
            yield str(db_path)

    def test_evaluation_results_persistence(self, temp_db):
        """Test that evaluation results can be persisted"""
        resume = {"skills": ["Python"], "experience_years": 5}
        job = {"required_skills": ["Python"], "min_experience_years": 3}

        result = run_full_evaluation(resume, job)

        # Save results
        with open(temp_db.replace('.db', '.json'), 'w') as f:
            json.dump(result, f)

        # Load results
        with open(temp_db.replace('.db', '.json'), 'r') as f:
            loaded = json.load(f)

        assert loaded["overall_score"] == result["overall_score"]


class TestErrorRecovery:
    """Integration tests for error recovery"""

    def test_graceful_degradation_on_error(self):
        """Test graceful degradation when components fail"""
        # Simulate a partial failure scenario
        resume = {
            "skills": ["Python"],
            # Missing other fields
        }

        job = {
            "required_skills": ["Python", "Java"],
            "min_experience_years": 3
        }

        # Should still produce a result
        result = run_full_evaluation(resume, job)
        assert result is not None
        assert "overall_score" in result

    def test_retry_mechanism(self):
        """Test retry mechanism for transient failures"""
        connector = get_ats_connector("greenhouse", api_key="test-key")

        call_count = 0

        def failing_request(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise Exception("Temporary failure")
            return {"candidates": []}

        with patch.object(connector, '_request', failing_request):
            # Should eventually succeed after retries
            candidates = connector.get_candidates()
            assert candidates == []


class TestSecurityIntegration:
    """Integration tests for security features"""

    def test_encrypted_data_storage(self):
        """Test that sensitive data is encrypted at rest"""
        with tempfile.TemporaryDirectory() as tmpdir:
            from core.encrypted_database import EncryptedDatabase

            db = EncryptedDatabase(
                db_path=Path(tmpdir) / "encrypted.db",
                encryption_key="test-encryption-key-32-bytes!"
            )

            # Store sensitive data
            db.store("candidates", {
                "id": "1",
                "ssn": "123-45-6789",  # Sensitive
                "email": "test@example.com"
            })

            # Verify encryption
            raw_file = Path(tmpdir) / "encrypted.db"
            with open(raw_file, 'rb') as f:
                content = f.read()

            # SSN should not be visible in raw file
            assert b"123-45-6789" not in content

    def test_session_security(self):
        """Test session security features"""
        rbac = RBACManager()

        user = rbac.create_user("test-user", Role.RECRUITER)
        session = rbac.create_session("test-user")

        # Session should be valid
        assert rbac.validate_session(session.token) is not None

        # Session should have expiry
        assert session.expires_at > datetime.now()

        # Invalid session should be rejected
        assert rbac.validate_session("invalid-token") is None


class TestComplianceIntegration:
    """Integration tests for compliance features"""

    def test_audit_trail_complete(self):
        """Test that audit trail captures all actions"""
        with tempfile.TemporaryDirectory() as tmpdir:
            rbac = RBACManager(audit_log_path=Path(tmpdir) / "audit.log")

            user = rbac.create_user("audited-user", Role.RECRUITER)
            rbac.check_permission(user, Permission.EVALUATE_RESUMES)

            logs = rbac.get_audit_logs()

            # Should have logs for user creation and permission check
            assert len(logs) >= 2

    def test_data_retention_policy(self):
        """Test data retention policy enforcement"""
        with tempfile.TemporaryDirectory() as tmpdir:
            from core.database import Database

            db = Database(Path(tmpdir) / "retention.db")
            db.set_retention_days(30)

            # Store data with old timestamp
            old_date = datetime.now() - timedelta(days=60)
            db.store_with_timestamp("old_data", {"value": "test"}, old_date)

            # Run cleanup
            db.cleanup_expired_data()

            # Old data should be removed
            result = db.get("old_data")
            assert result is None


# Import required modules for tests
from datetime import timedelta
from unittest.mock import patch
