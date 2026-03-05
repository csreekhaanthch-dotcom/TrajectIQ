"""
TrajectIQ Test Configuration
============================
Pytest configuration and fixtures.
"""

import sys
import os
from pathlib import Path

# Add src to path
src_path = Path(__file__).parent.parent / "src"
if str(src_path) not in sys.path:
    sys.path.insert(0, str(src_path))

import pytest


@pytest.fixture
def sample_resume():
    """Sample resume text for testing"""
    return """
    John Doe
    Senior Software Engineer
    
    EXPERIENCE
    ===========
    Senior Software Engineer at TechCorp (2020-Present)
    - Led development of microservices architecture
    - Implemented CI/CD pipelines using Jenkins and GitHub Actions
    - Mentored junior developers
    
    Software Engineer at StartupXYZ (2017-2020)
    - Developed REST APIs using Python and Flask
    - Built data pipelines for analytics platform
    
    SKILLS
    ======
    Python, JavaScript, TypeScript, AWS, Docker, Kubernetes, 
    PostgreSQL, MongoDB, Redis, Git, CI/CD
    
    EDUCATION
    =========
    BS Computer Science, University of Technology (2017)
    """


@pytest.fixture
def sample_job_requirements():
    """Sample job requirements for testing"""
    return [
        {"name": "Python", "classification": "mission_critical", "minimum_years": 3},
        {"name": "AWS", "classification": "important", "minimum_years": 2},
        {"name": "Docker", "classification": "important"},
        {"name": "CI/CD", "classification": "nice_to_have"},
    ]


@pytest.fixture
def default_weights():
    """Default scoring weights"""
    return {
        "skills": 0.3,
        "impact": 0.25,
        "trajectory": 0.2,
        "experience": 0.25
    }
