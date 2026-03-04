"""
TrajectIQ Bias Detection Tests
==============================
Tests for fairness monitoring and bias detection algorithms.
"""

import pytest
import sys
from pathlib import Path
from typing import Dict, Any

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from modules.bias_detection import (
    BiasDetector,
    BiasType,
    BiasReport,
    detect_gender_bias,
    detect_age_bias,
    detect_nationality_bias,
    calculate_fairness_score
)


class TestGenderBiasDetection:
    """Tests for gender bias detection"""

    @pytest.fixture
    def detector(self):
        return BiasDetector()

    def test_no_gender_bias(self, detector):
        """Test text with no gender bias"""
        text = "We are looking for a software engineer with Python experience."
        result = detector.detect_gender_bias(text)

        assert result.bias_detected is False
        assert result.bias_score < 0.2

    def test_masculine_coded_language(self, detector):
        """Test detection of masculine-coded language"""
        text = "We need a strong, aggressive leader who can dominate the market."
        result = detector.detect_gender_bias(text)

        assert result.bias_detected is True
        assert BiasType.GENDER in result.bias_types

    def test_feminine_coded_language(self, detector):
        """Test detection of feminine-coded language"""
        text = "We need someone nurturing and supportive for this role."
        result = detector.detect_gender_bias(text)

        assert result.bias_detected is True
        assert BiasType.GENDER in result.bias_types

    def test_gendered_pronouns(self, detector):
        """Test detection of gendered pronouns"""
        text = "He will be responsible for managing the team and she will assist."
        result = detector.detect_gender_bias(text)

        assert result.bias_detected is True

    def test_gender_neutral_alternatives(self, detector):
        """Test that gender-neutral language passes"""
        text = "The ideal candidate will manage the team and collaborate effectively."
        result = detector.detect_gender_bias(text)

        assert result.bias_detected is False


class TestAgeBiasDetection:
    """Tests for age bias detection"""

    @pytest.fixture
    def detector(self):
        return BiasDetector()

    def test_no_age_bias(self, detector):
        """Test text with no age bias"""
        text = "Looking for 5 years of experience with Python development."
        result = detector.detect_age_bias(text)

        assert result.bias_detected is False

    def test_young_bias_language(self, detector):
        """Test detection of young-bias language"""
        text = "We want a digital native who is a recent graduate with fresh ideas."
        result = detector.detect_age_bias(text)

        assert result.bias_detected is True
        assert BiasType.AGE in result.bias_types

    def test_older_bias_language(self, detector):
        """Test detection of older-bias language"""
        text = "Looking for a seasoned veteran with traditional experience."
        result = detector.detect_age_bias(text)

        assert result.bias_detected is True

    def test_age_requirement_violation(self, detector):
        """Test detection of explicit age requirements"""
        text = "Must be under 30 years old. Recent graduates preferred."
        result = detector.detect_age_bias(text)

        assert result.bias_detected is True
        assert result.severity == "high"


class TestNationalityBiasDetection:
    """Tests for nationality/ethnicity bias detection"""

    @pytest.fixture
    def detector(self):
        return BiasDetector()

    def test_no_nationality_bias(self, detector):
        """Test text with no nationality bias"""
        text = "Must be authorized to work in the United States."
        result = detector.detect_nationality_bias(text)

        assert result.bias_detected is False

    def test_native_speaker_requirement(self, detector):
        """Test detection of native speaker requirement"""
        text = "Must be a native English speaker from the US or UK."
        result = detector.detect_nationality_bias(text)

        assert result.bias_detected is True
        assert BiasType.NATIONALITY in result.bias_types

    def test_citizenship_discrimination(self, detector):
        """Test detection of citizenship discrimination"""
        text = "Only US citizens will be considered for this role."
        result = detector.detect_nationality_bias(text)

        assert result.bias_detected is True

    def test_ethnic_name_references(self, detector):
        """Test detection of ethnic name references"""
        text = "Looking for candidates with American-sounding names."
        result = detector.detect_nationality_bias(text)

        assert result.bias_detected is True


class TestResumeBiasScanning:
    """Tests for bias scanning in resumes"""

    @pytest.fixture
    def detector(self):
        return BiasDetector()

    def test_scan_resume_for_bias(self, detector):
        """Test scanning a resume for potential bias indicators"""
        resume = {
            "name": "John Smith",
            "summary": "Experienced software engineer with strong leadership skills",
            "experience": [
                {"title": "Senior Developer", "description": "Led team of aggressive developers"}
            ]
        }

        result = detector.scan_resume(resume)

        assert "bias_score" in result
        assert "recommendations" in result

    def test_scan_job_description(self, detector):
        """Test scanning a job description for bias"""
        job = {
            "title": "Software Engineer",
            "description": "We are looking for a young, energetic developer",
            "requirements": ["Recent graduate", "Digital native"]
        }

        result = detector.scan_job_description(job)

        assert result.bias_detected is True
        assert len(result.recommendations) > 0

    def test_clean_job_description(self, detector):
        """Test that clean job descriptions pass"""
        job = {
            "title": "Software Engineer",
            "description": "Looking for a skilled developer",
            "requirements": ["3+ years Python", "Bachelor's degree"]
        }

        result = detector.scan_job_description(job)

        assert result.bias_detected is False


class TestFairnessScoring:
    """Tests for fairness scoring algorithms"""

    @pytest.fixture
    def detector(self):
        return BiasDetector()

    def test_fairness_score_calculation(self, detector):
        """Test fairness score calculation"""
        evaluation_results = [
            {"candidate_id": "1", "score": 0.8, "gender": "male"},
            {"candidate_id": "2", "score": 0.7, "gender": "female"},
            {"candidate_id": "3", "score": 0.75, "gender": "male"},
            {"candidate_id": "4", "score": 0.72, "gender": "female"},
        ]

        fairness = calculate_fairness_score(evaluation_results, group_by="gender")

        assert 0 <= fairness <= 1.0
        assert fairness > 0.8  # Should be fairly balanced

    def test_disparate_impact_detection(self, detector):
        """Test detection of disparate impact"""
        # Simulated selection rates by group
        selection_rates = {
            "group_a": 0.45,
            "group_b": 0.30,  # Below 80% of highest
            "group_c": 0.42
        }

        has_impact = detector.check_disparate_impact(selection_rates)

        assert has_impact is True  # group_b is below threshold

    def test_four_fifths_rule(self, detector):
        """Test 4/5 rule compliance"""
        # Selection rates that pass 4/5 rule
        selection_rates_pass = {
            "group_a": 0.50,
            "group_b": 0.45,  # 90% of group_a
            "group_c": 0.48
        }

        has_impact = detector.check_disparate_impact(selection_rates_pass)
        assert has_impact is False

        # Selection rates that fail 4/5 rule
        selection_rates_fail = {
            "group_a": 0.50,
            "group_b": 0.35,  # 70% of group_a - fails 4/5
        }

        has_impact = detector.check_disparate_impact(selection_rates_fail)
        assert has_impact is True


class TestBiasMitigation:
    """Tests for bias mitigation recommendations"""

    @pytest.fixture
    def detector(self):
        return BiasDetector()

    def test_get_mitigation_recommendations(self, detector):
        """Test getting mitigation recommendations"""
        bias_report = BiasReport(
            bias_detected=True,
            bias_types=[BiasType.GENDER, BiasType.AGE],
            bias_score=0.6,
            severity="medium"
        )

        recommendations = detector.get_mitigation_recommendations(bias_report)

        assert len(recommendations) > 0
        assert any("gender" in r.lower() for r in recommendations)
        assert any("age" in r.lower() for r in recommendations)

    def test_apply_auto_corrections(self, detector):
        """Test automatic correction application"""
        text = "He will be responsible for managing the team."
        corrected = detector.apply_gender_neutral_corrections(text)

        assert "He" not in corrected
        assert "they" in corrected.lower() or "the candidate" in corrected.lower()


class TestBiasReporting:
    """Tests for bias reporting functionality"""

    @pytest.fixture
    def detector(self):
        return BiasDetector()

    def test_generate_bias_report(self, detector):
        """Test bias report generation"""
        job = {
            "title": "Engineer",
            "description": "Young, aggressive developer wanted"
        }

        report = detector.generate_report(job, scan_type="job_description")

        assert report is not None
        assert report.bias_detected is True
        assert len(report.bias_types) > 0

    def test_report_includes_statistics(self, detector):
        """Test that reports include statistical analysis"""
        job = {"title": "Engineer", "description": "Normal description"}
        report = detector.generate_report(job, scan_type="job_description")

        assert hasattr(report, "statistics")
        assert "word_count" in report.statistics


class TestBiasDetectorPerformance:
    """Performance tests for bias detection"""

    @pytest.fixture
    def detector(self):
        return BiasDetector()

    def test_detection_speed(self, detector, benchmark):
        """Benchmark bias detection speed"""
        text = "We are looking for an experienced developer with strong skills."

        result = benchmark(detector.detect_all_bias, text)
        assert result is not None

    def test_batch_detection(self, detector, benchmark):
        """Benchmark batch bias detection"""
        texts = [
            "Looking for an experienced engineer.",
            "Must be a young, energetic developer.",
            "Strong leader needed for the team.",
        ] * 100

        def batch_detect():
            return [detector.detect_all_bias(t) for t in texts]

        results = benchmark(batch_detect)
        assert len(results) == 300
