"""
TrajectIQ Scoring Engine Tests
==============================
Comprehensive tests for all scoring evaluators.
"""

import pytest
import sys
from pathlib import Path
from datetime import datetime

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from modules.scoring_engine import (
    run_full_evaluation,
    calculate_sdi,
    calculate_csig,
    calculate_iae,
    calculate_cta,
    calculate_err,
    SkillMatchEvaluator,
    ExperienceEvaluator,
    EducationEvaluator,
    CertificationEvaluator
)


class TestSkillMatchEvaluator:
    """Tests for Skill Determinacy Index (SDI)"""

    @pytest.fixture
    def evaluator(self):
        return SkillMatchEvaluator()

    def test_exact_skill_match(self, evaluator):
        """Test 100% skill match scenario"""
        resume_skills = ["Python", "JavaScript", "React", "SQL"]
        job_skills = ["Python", "JavaScript", "React", "SQL"]

        result = evaluator.evaluate(resume_skills, job_skills)
        assert result["match_percentage"] == 100.0
        assert result["sdi_score"] >= 0.9

    def test_partial_skill_match(self, evaluator):
        """Test partial skill overlap"""
        resume_skills = ["Python", "JavaScript", "React"]
        job_skills = ["Python", "Java", "Spring", "SQL"]

        result = evaluator.evaluate(resume_skills, job_skills)
        assert 0 < result["match_percentage"] < 100
        assert 0 < result["sdi_score"] < 1.0

    def test_no_skill_match(self, evaluator):
        """Test zero skill overlap"""
        resume_skills = ["Python", "Django", "PostgreSQL"]
        job_skills = ["Java", "Spring", "MongoDB"]

        result = evaluator.evaluate(resume_skills, job_skills)
        assert result["match_percentage"] == 0.0
        assert result["sdi_score"] < 0.3

    def test_transferable_skills(self, evaluator):
        """Test transferable skill recognition"""
        resume_skills = ["Python", "FastAPI", "PostgreSQL"]
        job_skills = ["Python", "Django", "MySQL"]

        result = evaluator.evaluate(resume_skills, job_skills)
        # Should recognize database and Python framework transferability
        assert result["sdi_score"] > 0.3

    def test_empty_skills_lists(self, evaluator):
        """Test handling of empty skill lists"""
        result = evaluator.evaluate([], ["Python", "Java"])
        assert result["match_percentage"] == 0.0

        result = evaluator.evaluate(["Python"], [])
        assert result["match_percentage"] == 100.0

    def test_case_insensitive_matching(self, evaluator):
        """Test case-insensitive skill matching"""
        resume_skills = ["python", "JAVASCRIPT", "React"]
        job_skills = ["Python", "JavaScript", "REACT"]

        result = evaluator.evaluate(resume_skills, job_skills)
        assert result["match_percentage"] == 100.0


class TestExperienceEvaluator:
    """Tests for Career Span & Industry Growth (CSIG)"""

    @pytest.fixture
    def evaluator(self):
        return ExperienceEvaluator()

    def test_exact_experience_match(self, evaluator):
        """Test exact experience requirement match"""
        result = evaluator.evaluate(
            experience_years=5.0,
            required_years=5.0,
            job_history=[
                {"company": "TechCorp", "duration_years": 3},
                {"company": "StartupX", "duration_years": 2}
            ]
        )
        assert result["csig_score"] >= 0.9
        assert result["experience_ratio"] == 1.0

    def test_exceeds_experience(self, evaluator):
        """Test candidate exceeding requirements"""
        result = evaluator.evaluate(
            experience_years=10.0,
            required_years=5.0,
            job_history=[]
        )
        assert result["experience_ratio"] == 2.0
        assert result["csig_score"] >= 0.95

    def test_below_experience(self, evaluator):
        """Test candidate below requirements"""
        result = evaluator.evaluate(
            experience_years=2.0,
            required_years=5.0,
            job_history=[]
        )
        assert result["experience_ratio"] < 1.0
        assert result["csig_score"] < 0.7

    def test_job_tenure_stability(self, evaluator):
        """Test job stability scoring"""
        # Stable job history
        result = evaluator.evaluate(
            experience_years=6.0,
            required_years=5.0,
            job_history=[
                {"company": "CompanyA", "duration_years": 3},
                {"company": "CompanyB", "duration_years": 3}
            ]
        )
        stable_score = result["csig_score"]

        # Job hopping history
        result = evaluator.evaluate(
            experience_years=6.0,
            required_years=5.0,
            job_history=[
                {"company": "A", "duration_years": 0.5},
                {"company": "B", "duration_years": 0.5},
                {"company": "C", "duration_years": 1},
                {"company": "D", "duration_years": 1},
                {"company": "E", "duration_years": 1},
                {"company": "F", "duration_years": 2}
            ]
        )
        hopping_score = result["csig_score"]

        assert stable_score > hopping_score


class TestEducationEvaluator:
    """Tests for Institutional Authority Estimator (IAE)"""

    @pytest.fixture
    def evaluator(self):
        return EducationEvaluator()

    def test_exact_education_match(self, evaluator):
        """Test exact education level match"""
        result = evaluator.evaluate(
            education_level="Bachelor",
            required_level="Bachelor"
        )
        assert result["iae_score"] >= 0.8

    def test_higher_education(self, evaluator):
        """Test candidate with higher education"""
        result = evaluator.evaluate(
            education_level="PhD",
            required_level="Bachelor"
        )
        assert result["iae_score"] >= 0.9

    def test_lower_education(self, evaluator):
        """Test candidate below education requirement"""
        result = evaluator.evaluate(
            education_level="High School",
            required_level="Bachelor"
        )
        assert result["iae_score"] < 0.5

    def test_education_hierarchy(self, evaluator):
        """Test education level hierarchy"""
        levels = ["High School", "Associate", "Bachelor", "Master", "PhD"]
        scores = []

        for level in levels:
            result = evaluator.evaluate(
                education_level=level,
                required_level="Bachelor"
            )
            scores.append(result["iae_score"])

        # Higher education should yield higher scores
        assert scores == sorted(scores)


class TestCertificationEvaluator:
    """Tests for Certification Authority (CTA)"""

    @pytest.fixture
    def evaluator(self):
        return CertificationEvaluator()

    def test_relevant_certifications(self, evaluator):
        """Test matching certifications"""
        result = evaluator.evaluate(
            certifications=["AWS Solutions Architect", "Kubernetes Administrator"],
            required_certifications=["AWS Solutions Architect"],
            preferred_certifications=["Kubernetes Administrator"]
        )
        assert result["cta_score"] >= 0.9

    def test_no_certifications(self, evaluator):
        """Test candidate with no certifications"""
        result = evaluator.evaluate(
            certifications=[],
            required_certifications=["AWS Solutions Architect"],
            preferred_certifications=[]
        )
        assert result["cta_score"] < 0.5

    def test_partial_certification_match(self, evaluator):
        """Test partial certification match"""
        result = evaluator.evaluate(
            certifications=["AWS Developer"],
            required_certifications=["AWS Solutions Architect", "Kubernetes Administrator"],
            preferred_certifications=[]
        )
        assert 0 < result["cta_score"] < 1.0


class TestFullEvaluation:
    """Tests for complete evaluation pipeline"""

    @pytest.fixture
    def sample_resume(self):
        return {
            "skills": ["Python", "JavaScript", "React", "PostgreSQL", "Docker"],
            "experience_years": 5.0,
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
            "required_skills": ["Python", "JavaScript", "React", "AWS"],
            "preferred_skills": ["Docker", "Kubernetes"],
            "min_experience_years": 3,
            "education_requirement": "Bachelor",
            "required_certifications": [],
            "preferred_certifications": ["AWS Solutions Architect"]
        }

    def test_full_evaluation_returns_all_scores(self, sample_resume, sample_job):
        """Test that full evaluation returns all required scores"""
        result = run_full_evaluation(sample_resume, sample_job)

        assert "sdi" in result
        assert "csig" in result
        assert "iae" in result
        assert "cta" in result
        assert "err" in result
        assert "overall_score" in result

    def test_full_evaluation_score_ranges(self, sample_resume, sample_job):
        """Test that all scores are in valid range [0, 1]"""
        result = run_full_evaluation(sample_resume, sample_job)

        for key in ["sdi", "csig", "iae", "cta", "err", "overall_score"]:
            assert 0 <= result[key] <= 1.0, f"{key} out of range: {result[key]}"

    def test_perfect_candidate(self, sample_job):
        """Test evaluation of perfect candidate"""
        perfect_resume = {
            "skills": ["Python", "JavaScript", "React", "AWS", "Docker", "Kubernetes"],
            "experience_years": 10.0,
            "education_level": "PhD",
            "certifications": ["AWS Solutions Architect", "Kubernetes Administrator"],
            "job_history": [
                {"company": "BigTech", "duration_years": 5},
                {"company": "Startup", "duration_years": 5}
            ]
        }

        result = run_full_evaluation(perfect_resume, sample_job)
        assert result["overall_score"] >= 0.85

    def test_poor_candidate(self, sample_job):
        """Test evaluation of poorly matched candidate"""
        poor_resume = {
            "skills": ["Cobol", "Fortran"],
            "experience_years": 1.0,
            "education_level": "High School",
            "certifications": [],
            "job_history": [{"company": "OldCorp", "duration_years": 1}]
        }

        result = run_full_evaluation(poor_resume, sample_job)
        assert result["overall_score"] < 0.4


class TestEdgeCases:
    """Test edge cases and error handling"""

    def test_empty_resume(self):
        """Test evaluation with empty resume"""
        result = run_full_evaluation({}, {"required_skills": ["Python"]})
        assert result["overall_score"] < 0.5

    def test_empty_job(self):
        """Test evaluation with empty job description"""
        result = run_full_evaluation({"skills": ["Python"]}, {})
        assert "overall_score" in result

    def test_missing_optional_fields(self):
        """Test evaluation with missing optional fields"""
        result = run_full_evaluation(
            {"skills": ["Python"]},
            {"required_skills": ["Python"]}
        )
        assert result is not None

    def test_unicode_skills(self):
        """Test handling of unicode characters in skills"""
        result = run_full_evaluation(
            {"skills": ["Python", "数据科学", "Машинное обучение"]},
            {"required_skills": ["Python"]}
        )
        assert result["sdi"] > 0


class TestPerformance:
    """Performance benchmarks for scoring engine"""

    def test_single_evaluation_speed(self, benchmark, sample_resume, sample_job):
        """Benchmark single evaluation speed"""
        result = benchmark(run_full_evaluation, sample_resume, sample_job)
        assert result is not None

    def test_batch_evaluation_speed(self, benchmark, sample_resume, sample_job):
        """Benchmark batch evaluation speed"""
        def batch_evaluate():
            for _ in range(100):
                run_full_evaluation(sample_resume, sample_job)

        benchmark(batch_evaluate)


# Fixtures for performance tests
@pytest.fixture
def sample_resume():
    return {
        "skills": ["Python", "JavaScript", "React", "PostgreSQL", "Docker"],
        "experience_years": 5.0,
        "education_level": "Bachelor",
        "certifications": ["AWS Solutions Architect"],
        "job_history": [
            {"company": "TechCorp", "duration_years": 3},
            {"company": "StartupX", "duration_years": 2}
        ]
    }


@pytest.fixture
def sample_job():
    return {
        "required_skills": ["Python", "JavaScript", "React", "AWS"],
        "preferred_skills": ["Docker", "Kubernetes"],
        "min_experience_years": 3,
        "education_requirement": "Bachelor",
        "required_certifications": [],
        "preferred_certifications": ["AWS Solutions Architect"]
    }
