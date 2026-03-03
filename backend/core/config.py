"""
TrajectIQ Core Configuration
============================
Central configuration for all modules.
"""

import os
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from pathlib import Path


@dataclass
class OllamaConfig:
    """Configuration for Ollama LLM integration"""
    base_url: str = "http://localhost:11434"
    model: str = "llama3.2"
    temperature: float = 0.1  # Low temperature for deterministic outputs
    max_tokens: int = 4096
    timeout: int = 120
    retry_attempts: int = 3


@dataclass
class DatabaseConfig:
    """Configuration for database connections"""
    db_type: str = "sqlite"  # sqlite, postgresql, mysql
    db_path: str = "data/db/trajectiq.db"
    connection_string: Optional[str] = None


@dataclass
class ScoringWeights:
    """Default scoring weights for multi-factor evaluation"""
    skills: float = 0.35
    impact: float = 0.25
    trajectory: float = 0.25
    experience: float = 0.15


@dataclass
class ProficiencyWeights:
    """Proficiency level weights for skill scoring"""
    beginner: float = 0.25
    intermediate: float = 0.50
    advanced: float = 0.75
    expert: float = 1.0


@dataclass
class Thresholds:
    """Various thresholds for evaluation decisions"""
    critical_skill_min_match: float = 0.7
    job_hopping_max_tenure_years: float = 1.5
    trajectory_promotion_years: float = 3.0
    ai_detection_high_threshold: float = 70.0
    impact_authenticity_threshold: float = 0.6


@dataclass
class TrajectIQConfig:
    """Main configuration class for TrajectIQ"""
    
    # Application settings
    app_name: str = "TrajectIQ"
    version: str = "1.0.0"
    environment: str = "development"  # development, staging, production
    
    # Paths
    base_path: Path = field(default_factory=lambda: Path(__file__).parent.parent.parent)
    data_path: Path = field(default_factory=lambda: Path(__file__).parent.parent.parent / "data")
    logs_path: Path = field(default_factory=lambda: Path(__file__).parent.parent.parent / "data" / "logs")
    samples_path: Path = field(default_factory=lambda: Path(__file__).parent.parent.parent / "data" / "samples")
    
    # Module configurations
    ollama: OllamaConfig = field(default_factory=OllamaConfig)
    database: DatabaseConfig = field(default_factory=DatabaseConfig)
    scoring_weights: ScoringWeights = field(default_factory=ScoringWeights)
    proficiency_weights: ProficiencyWeights = field(default_factory=ProficiencyWeights)
    thresholds: Thresholds = field(default_factory=Thresholds)
    
    # Feature flags
    enable_ai_detection: bool = True
    enable_ocr: bool = False
    enable_web_dashboard: bool = True
    
    # Logging
    log_level: str = "INFO"
    log_format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    def __post_init__(self):
        """Ensure directories exist"""
        self.data_path.mkdir(parents=True, exist_ok=True)
        self.logs_path.mkdir(parents=True, exist_ok=True)
        self.samples_path.mkdir(parents=True, exist_ok=True)
    
    @classmethod
    def from_env(cls) -> "TrajectIQConfig":
        """Load configuration from environment variables"""
        config = cls()
        
        # Override from environment
        if os.getenv("OLLAMA_BASE_URL"):
            config.ollama.base_url = os.getenv("OLLAMA_BASE_URL")
        if os.getenv("OLLAMA_MODEL"):
            config.ollama.model = os.getenv("OLLAMA_MODEL")
        if os.getenv("ENVIRONMENT"):
            config.environment = os.getenv("ENVIRONMENT")
        if os.getenv("LOG_LEVEL"):
            config.log_level = os.getenv("LOG_LEVEL")
        
        return config


# Global configuration instance
config = TrajectIQConfig.from_env()


# Proficiency level mappings
PROFICIENCY_LEVELS = {
    "beginner": 1,
    "intermediate": 2,
    "advanced": 3,
    "expert": 4
}

# Job level mappings
JOB_LEVELS = {
    "entry": 1,
    "junior": 2,
    "mid": 3,
    "senior": 4,
    "lead": 5,
    "manager": 5,
    "director": 6,
    "vp": 7,
    "c_level": 8,
    "unknown": 0
}

# Common skill synonyms for matching
SKILL_SYNONYMS = {
    "python": ["python3", "py", "python programming"],
    "javascript": ["js", "ecmascript", "node.js", "nodejs"],
    "kubernetes": ["k8s", "kubernetes orchestration"],
    "docker": ["docker containers", "containerization", "containers"],
    "aws": ["amazon web services", "amazon-web-services"],
    "gcp": ["google cloud platform", "google cloud"],
    "azure": ["microsoft azure", "ms azure"],
    "postgresql": ["postgres", "psql", "postgresql database"],
    "mongodb": ["mongo", "mongodb database"],
    "react": ["react.js", "reactjs", "react js"],
    "vue": ["vue.js", "vuejs", "vue js"],
    "angular": ["angular.js", "angularjs"],
    "machine learning": ["ml", "ml algorithms", "machine learning models"],
    "deep learning": ["dl", "neural networks", "deep neural networks"],
    "natural language processing": ["nlp", "text processing"],
    "ci/cd": ["cicd", "continuous integration", "continuous deployment"],
}
