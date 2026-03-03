"""
Test Suite for TrajectIQ Modules
=================================
Comprehensive tests for all evaluation modules.
"""

import json
import pytest
from pathlib import Path
import sys

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import config
from modules.resume_parser import ResumeParser
from modules.skill_evaluator import SkillEvaluator
from modules.impact_scorer import ImpactScorer
from modules.trajectory_analyzer import TrajectoryAnalyzer
from modules.ai_detector import AIDetector
from modules.scoring_engine import ScoringEngine


# ==================== Fixtures ====================

@pytest.fixture
def sample_resume_input():
    """Sample resume input for testing."""
    return {
        "source_type": "raw_text",
        "content": """
        JOHN DOE
        Senior Software Engineer
        john.doe@email.com | (555) 123-4567
        
        SUMMARY
        Experienced software engineer with 8+ years in Python development.
        
        EXPERIENCE
        TechCorp Inc. | Senior Software Engineer | 2020 - Present
        - Reduced API latency by 40% through optimization
        - Led migration to microservices, improving deployment frequency by 10x
        
        TechCorp Inc. | Software Engineer | 2018 - 2020
        - Built platform services serving 2M+ users
        
        SKILLS
        Python (Expert), Kubernetes (Advanced), PostgreSQL (Advanced), AWS (Advanced)
        
        EDUCATION
        Stanford University | MS Computer Science | 2016 - 2018
        """,
        "metadata": {
            "candidate_id": "TEST-CAND-001",
            "job_id": "TEST-JOB-001"
        }
    }


@pytest.fixture
def sample_job_requirements():
    """Sample job requirements for testing."""
    return {
        "job_id": "TEST-JOB-001",
        "job_title": "Senior Software Engineer",
        "required_skills": [
            {
                "name": "Python",
                "category": "Programming",
                "minimum_years": 5,
                "minimum_proficiency": "advanced",
                "weight": 1.0,
                "is_critical": True
            },
            {
                "name": "Kubernetes",
                "category": "Infrastructure",
                "minimum_years": 2,
                "minimum_proficiency": "intermediate",
                "weight": 0.8,
                "is_critical": True
            },
            {
                "name": "PostgreSQL",
                "category": "Database",
                "minimum_years": 3,
                "minimum_proficiency": "intermediate",
                "weight": 0.6,
                "is_critical": False
            }
        ],
        "preferred_skills": [
            {"name": "AWS", "category": "Cloud", "minimum_years": 2, "weight": 0.3}
        ]
    }


@pytest.fixture
def sample_candidate_skills():
    """Sample candidate skills for testing."""
    return {
        "technical": [
            {"name": "Python", "category": "Programming", "years_experience": 8, "proficiency": "expert"},
            {"name": "Kubernetes", "category": "Infrastructure", "years_experience": 4, "proficiency": "advanced"},
            {"name": "PostgreSQL", "category": "Database", "years_experience": 6, "proficiency": "advanced"},
            {"name": "AWS", "category": "Cloud", "years_experience": 5, "proficiency": "advanced"}
        ],
        "soft_skills": ["Leadership", "Communication"]
    }


@pytest.fixture
def sample_achievements():
    """Sample achievements for impact testing."""
    return [
        {
            "text": "Reduced API latency by 40% through optimization of database queries and caching implementation",
            "context": {
                "company": "TechCorp Inc.",
                "role": "Senior Software Engineer",
                "team_size": 8
            },
            "claimed_metrics": [
                {"value": "40%", "unit": "reduction", "type": "percentage"}
            ],
            "verification_data": {
                "has_links": False,
                "reference_available": True
            }
        },
        {
            "text": "Led migration of monolith to microservices architecture, improving deployment frequency by 10x",
            "context": {
                "company": "TechCorp Inc.",
                "role": "Senior Software Engineer",
                "team_size": 12
            },
            "claimed_metrics": [
                {"value": "10x", "unit": "improvement", "type": "other"}
            ],
            "verification_data": {
                "has_links": False,
                "reference_available": True
            }
        }
    ]


@pytest.fixture
def sample_work_history():
    """Sample work history for trajectory testing."""
    return [
        {
            "company": "StartupXYZ",
            "title": "Junior Software Engineer",
            "level": "junior",
            "start_date": "2016-06",
            "end_date": "2018-03",
            "is_current": False,
            "employment_type": "full-time"
        },
        {
            "company": "TechCorp Inc.",
            "title": "Software Engineer",
            "level": "mid",
            "start_date": "2018-04",
            "end_date": "2020-02",
            "is_current": False,
            "employment_type": "full-time"
        },
        {
            "company": "TechCorp Inc.",
            "title": "Senior Software Engineer",
            "level": "senior",
            "start_date": "2020-03",
            "end_date": None,
            "is_current": True,
            "employment_type": "full-time",
            "team_size_managed": 3
        }
    ]


# ==================== Resume Parser Tests ====================

class TestResumeParser:
    """Tests for ResumeParser module."""
    
    def test_initialization(self):
        """Test module initialization."""
        parser = ResumeParser()
        assert parser.module_name == "resume_parser"
        assert parser.version == "1.0.0"
    
    def test_validate_input_valid(self, sample_resume_input):
        """Test input validation with valid input."""
        parser = ResumeParser()
        assert parser.validate_input(sample_resume_input) is True
    
    def test_validate_input_missing_source_type(self):
        """Test input validation with missing source_type."""
        parser = ResumeParser()
        with pytest.raises(ValueError, match="source_type"):
            parser.validate_input({"content": "test"})
    
    def test_validate_input_missing_content(self):
        """Test input validation with missing content."""
        parser = ResumeParser()
        with pytest.raises(ValueError, match="content"):
            parser.validate_input({"source_type": "raw_text"})
    
    def test_process_raw_text(self, sample_resume_input):
        """Test processing raw text resume."""
        parser = ResumeParser()
        result = parser.execute(sample_resume_input)
        
        assert "parse_id" in result
        assert "timestamp" in result
        assert result["status"] in ["success", "partial"]
        assert "candidate_info" in result
        assert result["confidence_score"] >= 0
    
    def test_extract_email(self, sample_resume_input):
        """Test email extraction."""
        parser = ResumeParser()
        result = parser.execute(sample_resume_input)
        
        assert "email" in result["candidate_info"]
        assert "@" in result["candidate_info"]["email"]


# ==================== Skill Evaluator Tests ====================

class TestSkillEvaluator:
    """Tests for SkillEvaluator module."""
    
    def test_initialization(self):
        """Test module initialization."""
        evaluator = SkillEvaluator()
        assert evaluator.module_name == "skill_evaluator"
    
    def test_validate_input_valid(self, sample_candidate_skills, sample_job_requirements):
        """Test input validation."""
        evaluator = SkillEvaluator()
        
        input_data = {
            "candidate_skills": sample_candidate_skills,
            "job_requirements": sample_job_requirements
        }
        
        assert evaluator.validate_input(input_data) is True
    
    def test_skill_matching(self, sample_candidate_skills, sample_job_requirements):
        """Test skill matching functionality."""
        evaluator = SkillEvaluator()
        
        input_data = {
            "candidate_id": "TEST-001",
            "candidate_skills": sample_candidate_skills,
            "job_requirements": sample_job_requirements
        }
        
        result = evaluator.execute(input_data)
        
        assert "evaluation_id" in result
        assert "overall_score" in result
        assert "skill_matches" in result
        assert len(result["skill_matches"]) > 0
    
    def test_critical_skills_detection(self, sample_candidate_skills, sample_job_requirements):
        """Test critical skills detection."""
        evaluator = SkillEvaluator()
        
        input_data = {
            "candidate_id": "TEST-001",
            "candidate_skills": sample_candidate_skills,
            "job_requirements": sample_job_requirements
        }
        
        result = evaluator.execute(input_data)
        
        assert "critical_skills_status" in result
        assert result["critical_skills_status"]["all_critical_met"] is True
    
    def test_skill_gap_identification(self, sample_candidate_skills, sample_job_requirements):
        """Test skill gap identification."""
        evaluator = SkillEvaluator()
        
        # Add a skill requirement that candidate doesn't have
        job_req = sample_job_requirements.copy()
        job_req["required_skills"].append({
            "name": "Golang",
            "minimum_years": 2,
            "minimum_proficiency": "intermediate",
            "is_critical": False
        })
        
        input_data = {
            "candidate_id": "TEST-001",
            "candidate_skills": sample_candidate_skills,
            "job_requirements": job_req
        }
        
        result = evaluator.execute(input_data)
        
        assert "skill_gaps" in result
        gaps = result["skill_gaps"]
        assert any(g["skill"] == "Golang" for g in gaps)


# ==================== Impact Scorer Tests ====================

class TestImpactScorer:
    """Tests for ImpactScorer module."""
    
    def test_initialization(self):
        """Test module initialization."""
        scorer = ImpactScorer()
        assert scorer.module_name == "impact_scorer"
    
    def test_impact_scoring(self, sample_achievements):
        """Test impact scoring."""
        scorer = ImpactScorer()
        
        input_data = {
            "candidate_id": "TEST-001",
            "achievements": sample_achievements
        }
        
        result = scorer.execute(input_data)
        
        assert "evaluation_id" in result
        assert "overall_impact_score" in result
        assert "achievements_evaluation" in result
        assert result["overall_impact_score"]["normalized_score"] >= 0
    
    def test_metric_detection(self, sample_achievements):
        """Test metric detection in achievements."""
        scorer = ImpactScorer()
        
        input_data = {
            "candidate_id": "TEST-001",
            "achievements": sample_achievements
        }
        
        result = scorer.execute(input_data)
        
        for evaluation in result["achievements_evaluation"]:
            assert "metrics_analysis" in evaluation
            assert len(evaluation["metrics_analysis"]) > 0
    
    def test_authenticity_scoring(self, sample_achievements):
        """Test authenticity scoring."""
        scorer = ImpactScorer()
        
        input_data = {
            "candidate_id": "TEST-001",
            "achievements": sample_achievements
        }
        
        result = scorer.execute(input_data)
        
        for evaluation in result["achievements_evaluation"]:
            assert "authenticity_score" in evaluation
            assert 0 <= evaluation["authenticity_score"] <= 100


# ==================== Trajectory Analyzer Tests ====================

class TestTrajectoryAnalyzer:
    """Tests for TrajectoryAnalyzer module."""
    
    def test_initialization(self):
        """Test module initialization."""
        analyzer = TrajectoryAnalyzer()
        assert analyzer.module_name == "trajectory_analyzer"
    
    def test_trajectory_analysis(self, sample_work_history):
        """Test trajectory analysis."""
        analyzer = TrajectoryAnalyzer()
        
        input_data = {
            "candidate_id": "TEST-001",
            "work_history": sample_work_history
        }
        
        result = analyzer.execute(input_data)
        
        assert "analysis_id" in result
        assert "trajectory_score" in result
        assert "progression_analysis" in result
    
    def test_career_progression_detection(self, sample_work_history):
        """Test career progression detection."""
        analyzer = TrajectoryAnalyzer()
        
        input_data = {
            "candidate_id": "TEST-001",
            "work_history": sample_work_history
        }
        
        result = analyzer.execute(input_data)
        
        progression = result["progression_analysis"]
        assert progression["promotions_count"] > 0
        assert progression["positions_held"] == 3
    
    def test_stability_analysis(self, sample_work_history):
        """Test stability analysis."""
        analyzer = TrajectoryAnalyzer()
        
        input_data = {
            "candidate_id": "TEST-001",
            "work_history": sample_work_history
        }
        
        result = analyzer.execute(input_data)
        
        assert "stability_indicators" in result
        assert "job_hopping_risk" in result["stability_indicators"]


# ==================== AI Detector Tests ====================

class TestAIDetector:
    """Tests for AIDetector module."""
    
    def test_initialization(self):
        """Test module initialization."""
        detector = AIDetector()
        assert detector.module_name == "ai_detector"
    
    def test_ai_detection(self):
        """Test AI detection functionality."""
        detector = AIDetector()
        
        input_data = {
            "candidate_id": "TEST-001",
            "text_content": {
                "full_text": "I am a passionate software engineer with proven track record of delivering results-driven solutions. I spearheaded multiple cross-functional initiatives and leveraged synergies to drive business value.",
                "sections": {}
            }
        }
        
        result = detector.execute(input_data)
        
        assert "detection_id" in result
        assert "overall_assessment" in result
        assert "ai_likelihood_score" in result["overall_assessment"]
        assert 0 <= result["overall_assessment"]["ai_likelihood_score"] <= 100
    
    def test_authenticity_indicators(self):
        """Test authenticity indicator detection."""
        detector = AIDetector()
        
        input_data = {
            "candidate_id": "TEST-001",
            "text_content": {
                "full_text": "I built and deployed a real-time notification system that processes 5 million daily events. When I joined the team, the average latency was 500ms, and I reduced it to 150ms.",
                "sections": {}
            }
        }
        
        result = detector.execute(input_data)
        
        assert "authenticity_indicators" in result
        assert result["authenticity_indicators"]["human_authenticity_score"] > 50


# ==================== Scoring Engine Tests ====================

class TestScoringEngine:
    """Tests for ScoringEngine module."""
    
    def test_initialization(self):
        """Test module initialization."""
        engine = ScoringEngine()
        assert engine.module_name == "scoring_engine"
    
    def test_scoring_engine(self):
        """Test complete scoring engine."""
        engine = ScoringEngine()
        
        input_data = {
            "candidate_id": "TEST-001",
            "job_id": "TEST-JOB-001",
            "evaluation_results": {
                "skill_evaluation": {
                    "overall_score": {"normalized_score": 85},
                    "critical_skills_status": {"all_critical_met": True},
                    "skill_depth_analysis": {"skill_depth_score": 80, "skill_breadth_score": 75}
                },
                "impact_evaluation": {
                    "overall_impact_score": {"normalized_score": 75, "confidence": 0.7}
                },
                "trajectory_analysis": {
                    "trajectory_score": {"overall_score": 80, "momentum_score": 85},
                    "progression_analysis": {"total_experience_years": 7},
                    "stability_indicators": {"job_hopping_risk": "low"}
                },
                "ai_detection": {
                    "overall_assessment": {"ai_likelihood_score": 25, "risk_level": "low"}
                }
            }
        }
        
        result = engine.execute(input_data)
        
        assert "score_id" in result
        assert "final_score" in result
        assert "normalized_score" in result["final_score"]
        assert "grade" in result["final_score"]
        assert "recommendation" in result
    
    def test_grade_assignment(self):
        """Test grade assignment based on score."""
        engine = ScoringEngine()
        
        # High score should get good grade
        input_data = {
            "candidate_id": "TEST-001",
            "job_id": "TEST-JOB-001",
            "evaluation_results": {
                "skill_evaluation": {
                    "overall_score": {"normalized_score": 95},
                    "critical_skills_status": {"all_critical_met": True},
                    "skill_depth_analysis": {"skill_depth_score": 90, "skill_breadth_score": 85}
                },
                "impact_evaluation": {
                    "overall_impact_score": {"normalized_score": 90, "confidence": 0.8}
                },
                "trajectory_analysis": {
                    "trajectory_score": {"overall_score": 90, "momentum_score": 95},
                    "progression_analysis": {"total_experience_years": 10},
                    "stability_indicators": {"job_hopping_risk": "low"}
                },
                "ai_detection": {
                    "overall_assessment": {"ai_likelihood_score": 15, "risk_level": "minimal"}
                }
            }
        }
        
        result = engine.execute(input_data)
        
        assert result["final_score"]["grade"] in ["A+", "A", "A-"]
        assert result["recommendation"]["decision"] in ["strongly_recommend", "recommend"]


# ==================== Integration Tests ====================

class TestIntegration:
    """Integration tests for the complete pipeline."""
    
    def test_module_registry(self):
        """Test that all modules are registered."""
        from core.base_module import ModuleRegistry
        
        expected_modules = [
            "resume_parser",
            "skill_evaluator",
            "impact_scorer",
            "trajectory_analyzer",
            "ai_detector",
            "scoring_engine"
        ]
        
        for module_name in expected_modules:
            assert module_name in ModuleRegistry.list_modules()


# ==================== Run Tests ====================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
