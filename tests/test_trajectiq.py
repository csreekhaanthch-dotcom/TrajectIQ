"""
TrajectIQ Enterprise - Comprehensive Test Suite
===============================================
Unit tests for scoring, license, RBAC, and all core modules.
"""

import os
import sys
import json
import hashlib
import secrets
import tempfile
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Dict, Any

import pytest

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))


# =============================================================================
# SCORING ENGINE TESTS
# =============================================================================

class TestResumeParser:
    """Tests for resume parsing"""
    
    @pytest.fixture
    def parser(self):
        from modules.scoring_engine import ResumeParser
        return ResumeParser()
    
    def test_parse_basic_resume(self, parser):
        """Test parsing a basic resume"""
        resume_text = """
        John Doe
        john.doe@email.com
        (555) 123-4567
        
        EXPERIENCE
        Senior Software Engineer at Google (2018 - Present)
        - Led development of microservices architecture
        - 5+ years Python, JavaScript experience
        
        SKILLS
        Python, JavaScript, React, Node.js, AWS, Docker
        
        EDUCATION
        BS Computer Science, MIT, 2016
        """
        
        result = parser.evaluate(resume_text)
        
        assert result["input_hash"] is not None
        assert result["output_hash"] is not None
        assert result["contact_info"]["email"] == "john.doe@email.com"
        assert len(result["skills"]["technical"]) > 0
        assert result["confidence_score"] > 0
    
    def test_parse_empty_resume(self, parser):
        """Test parsing empty input"""
        result = parser.evaluate("")
        
        assert result["input_hash"] == hashlib.sha256(b"").hexdigest()
        assert result["confidence_score"] == 0
    
    def test_deterministic_parsing(self, parser):
        """Test that parsing is deterministic"""
        resume_text = "Test Resume\nSkills: Python, Java\nExperience: 5 years"
        
        result1 = parser.evaluate(resume_text)
        result2 = parser.evaluate(resume_text)
        
        assert result1["input_hash"] == result2["input_hash"]
        assert result1["output_hash"] == result2["output_hash"]


class TestSkillEvaluator:
    """Tests for skill evaluation"""
    
    @pytest.fixture
    def evaluator(self):
        from modules.scoring_engine import SkillEvaluator
        return SkillEvaluator()
    
    @pytest.fixture
    def sample_requirements(self):
        return [
            {"name": "Python", "classification": "mission_critical", "minimum_years": 3, "is_critical": True},
            {"name": "JavaScript", "classification": "core", "minimum_years": 2},
            {"name": "AWS", "classification": "supporting", "minimum_years": 1}
        ]
    
    @pytest.fixture
    def sample_skills(self):
        return [
            {"name": "Python", "proficiency": "expert", "years_experience": 5},
            {"name": "JavaScript", "proficiency": "advanced", "years_experience": 4},
            {"name": "React", "proficiency": "advanced", "years_experience": 3}
        ]
    
    def test_skill_match(self, evaluator, sample_requirements, sample_skills):
        """Test skill matching"""
        result = evaluator.evaluate(sample_skills, sample_requirements)
        
        assert result["overall_score"] > 0
        assert result["critical_skills_met"] is True
        assert len(result["skill_scores"]) == 3
    
    def test_missing_critical_skill(self, evaluator, sample_requirements):
        """Test missing critical skill detection"""
        skills_without_python = [
            {"name": "JavaScript", "proficiency": "advanced", "years_experience": 4}
        ]
        
        result = evaluator.evaluate(skills_without_python, sample_requirements)
        
        assert result["critical_skills_met"] is False
        assert "Python" in result["critical_skills_unmet"]


class TestLicenseManager:
    """Tests for license management"""
    
    @pytest.fixture
    def license_manager(self, tmp_path):
        from security.license import LicenseManager
        config_dir = str(tmp_path / ".trajectiq")
        return LicenseManager(config_dir)
    
    def test_demo_license_activation(self, license_manager):
        """Test demo license activation"""
        from security.license import LicenseStatus
        
        status, info = license_manager.activate_license("TRAJECTIQ-DEMO-2024-FULL-ACCESS")
        
        assert status == LicenseStatus.VALID
        assert info.license_id == "DEMO-TRIAL-2024"
        assert info.ai_enabled is True
    
    def test_invalid_license(self, license_manager):
        """Test invalid license rejection"""
        from security.license import LicenseStatus
        
        status, info = license_manager.activate_license("INVALID-LICENSE-KEY")
        
        assert status == LicenseStatus.INVALID
        assert info is None


class TestRBACManager:
    """Tests for RBAC management"""
    
    def test_password_hashing(self):
        """Test bcrypt password hashing"""
        from security.rbac import RBACManager
        rbac = RBACManager.__new__(RBACManager)
        
        password = "SecurePassword123!"
        hash1, salt1 = rbac.hash_password(password)
        hash2, salt2 = rbac.hash_password(password)
        
        assert hash1 != hash2  # Different salts = different hashes
        assert rbac.verify_password(password, hash1) is True
        assert rbac.verify_password("wrongpassword", hash1) is False
    
    def test_password_policy(self):
        """Test password policy enforcement"""
        from security.rbac import RBACManager
        rbac = RBACManager.__new__(RBACManager)
        
        is_valid, issues = rbac.validate_password_strength("short")
        
        assert is_valid is False
        assert len(issues) > 0
        
        is_valid, issues = rbac.validate_password_strength("SecurePassword123!")
        
        assert is_valid is True
        assert len(issues) == 0


class TestSandboxedParser:
    """Tests for sandboxed resume parsing"""
    
    @pytest.fixture
    def parser(self):
        from modules.sandboxed_parser import SandboxedResumeParser, ParserConfig
        return SandboxedResumeParser(ParserConfig())
    
    def test_size_limit(self, parser):
        """Test file size limit enforcement"""
        from modules.sandboxed_parser import FileTooLargeError
        
        # Create oversized content
        large_content = b'x' * (parser.config.max_file_size_bytes + 1)
        
        with pytest.raises(FileTooLargeError):
            parser.parse_bytes(large_content, "test.txt")
    
    def test_mime_type_validation(self, parser):
        """Test MIME type validation"""
        from modules.sandboxed_parser import InvalidMimeTypeError
        
        # Try to parse an executable
        exe_content = b'MZ\x90\x00' + b'x' * 100
        
        with pytest.raises((InvalidMimeTypeError, Exception)):
            parser.parse_bytes(exe_content, "test.exe")
    
    def test_suspicious_content_detection(self, parser):
        """Test suspicious content detection"""
        from modules.sandboxed_parser import SuspiciousContentError
        
        # Content with script tag
        malicious_content = b'%PDF-1.4\n<script>alert("xss")</script>'
        
        with pytest.raises(SuspiciousContentError):
            parser.parse_bytes(malicious_content, "test.pdf")


# =============================================================================
# FUZZ TESTS
# =============================================================================

class TestFuzzParser:
    """Fuzz tests for resume parser"""
    
    @pytest.fixture
    def parser(self):
        from modules.scoring_engine import ResumeParser
        return ResumeParser()
    
    @pytest.mark.parametrize("random_input", [
        secrets.token_bytes(100) for _ in range(5)
    ])
    def test_fuzz_random_bytes(self, parser, random_input):
        """Test parser with random bytes"""
        try:
            text = random_input.decode('utf-8', errors='replace')
            result = parser.evaluate(text)
            
            # Should not crash, return valid result
            assert "input_hash" in result
            assert "output_hash" in result
        except Exception as e:
            pytest.fail(f"Parser crashed on random input: {e}")


# =============================================================================
# RUN TESTS
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
