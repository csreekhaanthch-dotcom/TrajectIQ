"""
TrajectIQ Enterprise Configuration
===================================
Central configuration with encryption support.
"""

import os
import json
from pathlib import Path
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from enum import Enum

# Security imports
from cryptography.fernet import Fernet
import hashlib
import base64


class AIMode(Enum):
    OFF = "off"
    LOCAL = "local"
    API = "api"


@dataclass
class ScoringWeights:
    """Deterministic scoring weights - never random"""
    skills: float = 0.35
    impact: float = 0.25
    trajectory: float = 0.25
    experience: float = 0.15
    
    def validate(self):
        total = self.skills + self.impact + self.trajectory + self.experience
        if abs(total - 1.0) > 0.001:
            raise ValueError(f"Scoring weights must sum to 1.0, got {total}")
        return True


@dataclass
class Thresholds:
    """System thresholds for evaluation decisions"""
    critical_skill_min_match: float = 0.7
    job_hopping_max_tenure_years: float = 1.5
    trajectory_promotion_years: float = 3.0
    ai_detection_high_threshold: float = 70.0
    impact_authenticity_threshold: float = 0.6
    bias_alert_threshold: float = 0.15


@dataclass
class SecurityConfig:
    """Security settings"""
    session_timeout_minutes: int = 30
    max_login_attempts: int = 5
    lockout_duration_minutes: int = 15
    password_min_length: int = 12
    password_require_uppercase: bool = True
    password_require_lowercase: bool = True
    password_require_numbers: bool = True
    password_require_special: bool = True
    encryption_key_rotation_days: int = 90


@dataclass
class LicenseConfig:
    """License settings"""
    organization_name: str = ""
    license_id: str = ""
    max_users: int = 1
    ai_enabled: bool = False
    ats_enabled: bool = False
    analytics_enabled: bool = True
    bias_module_enabled: bool = True
    floating_license_enabled: bool = False
    floating_license_server: str = ""
    expiration_date: Optional[str] = None


@dataclass
class DatabaseConfig:
    """Database configuration"""
    db_type: str = "sqlite"
    db_path: str = "data/trajectiq.db"
    backup_enabled: bool = True
    backup_interval_hours: int = 24
    backup_max_count: int = 7


@dataclass
class AIConfig:
    """AI enhancement configuration"""
    mode: AIMode = AIMode.OFF
    local_model_path: str = ""
    api_endpoint: str = ""
    api_key: str = ""
    temperature: float = 0.1  # Low for deterministic outputs
    max_tokens: int = 4096
    timeout_seconds: int = 120


class ConfigManager:
    """
    Encrypted configuration manager.
    Stores all settings in encrypted format.
    """
    
    def __init__(self, config_dir: Optional[Path] = None):
        self.config_dir = config_dir or Path.home() / ".trajectiq"
        self.config_dir.mkdir(parents=True, exist_ok=True)
        
        self.config_file = self.config_dir / "config.enc"
        self.key_file = self.config_dir / ".key"
        
        self._fernet = None
        self._config_data = {}
        
        self._initialize_encryption()
        self._load_or_create_config()
    
    def _initialize_encryption(self):
        """Initialize or load encryption key"""
        if self.key_file.exists():
            with open(self.key_file, 'rb') as f:
                key = f.read()
        else:
            key = Fernet.generate_key()
            # Secure file permissions
            with open(self.key_file, 'wb') as f:
                f.write(key)
            os.chmod(self.key_file, 0o600)
        
        self._fernet = Fernet(key)
    
    def _load_or_create_config(self):
        """Load existing config or create defaults"""
        if self.config_file.exists():
            try:
                with open(self.config_file, 'rb') as f:
                    encrypted = f.read()
                decrypted = self._fernet.decrypt(encrypted)
                self._config_data = json.loads(decrypted.decode())
            except Exception:
                self._config_data = self._create_default_config()
                self._save_config()
        else:
            self._config_data = self._create_default_config()
            self._save_config()
    
    def _create_default_config(self) -> Dict:
        """Create default configuration"""
        return {
            "scoring_weights": {
                "skills": 0.35,
                "impact": 0.25,
                "trajectory": 0.25,
                "experience": 0.15
            },
            "thresholds": {
                "critical_skill_min_match": 0.7,
                "job_hopping_max_tenure_years": 1.5,
                "trajectory_promotion_years": 3.0,
                "ai_detection_high_threshold": 70.0,
                "impact_authenticity_threshold": 0.6,
                "bias_alert_threshold": 0.15
            },
            "security": {
                "session_timeout_minutes": 30,
                "max_login_attempts": 5,
                "lockout_duration_minutes": 15,
                "password_min_length": 12,
                "password_require_uppercase": True,
                "password_require_lowercase": True,
                "password_require_numbers": True,
                "password_require_special": True
            },
            "license": {
                "organization_name": "",
                "license_id": "",
                "max_users": 1,
                "ai_enabled": False,
                "ats_enabled": False,
                "analytics_enabled": True,
                "bias_module_enabled": True,
                "floating_license_enabled": False,
                "floating_license_server": "",
                "expiration_date": None
            },
            "ai": {
                "mode": "off",
                "local_model_path": "",
                "api_endpoint": "",
                "api_key": "",
                "temperature": 0.1,
                "max_tokens": 4096,
                "timeout_seconds": 120
            },
            "database": {
                "db_type": "sqlite",
                "db_path": str(self.config_dir / "data" / "trajectiq.db"),
                "backup_enabled": True,
                "backup_interval_hours": 24,
                "backup_max_count": 7
            },
            "email": {
                "enabled": False,
                "imap_server": "",
                "imap_port": 993,
                "username": "",
                "password": "",
                "polling_interval_minutes": 15
            },
            "ats": {
                "enabled": False,
                "provider": "",
                "api_key": "",
                "api_endpoint": ""
            }
        }
    
    def _save_config(self):
        """Save configuration encrypted"""
        encrypted = self._fernet.encrypt(json.dumps(self._config_data).encode())
        with open(self.config_file, 'wb') as f:
            f.write(encrypted)
        os.chmod(self.config_file, 0o600)
    
    def get(self, *keys, default=None):
        """Get configuration value by path"""
        value = self._config_data
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return default
        return value
    
    def set(self, *keys_and_value):
        """Set configuration value by path"""
        if len(keys_and_value) < 2:
            raise ValueError("Need at least one key and a value")
        
        *keys, value = keys_and_value
        data = self._config_data
        
        for key in keys[:-1]:
            if key not in data:
                data[key] = {}
            data = data[key]
        
        data[keys[-1]] = value
        self._save_config()
    
    def get_scoring_weights(self) -> ScoringWeights:
        """Get scoring weights"""
        weights = self._config_data.get("scoring_weights", {})
        return ScoringWeights(**weights)
    
    def get_thresholds(self) -> Thresholds:
        """Get thresholds"""
        thresholds = self._config_data.get("thresholds", {})
        return Thresholds(**thresholds)
    
    def get_security_config(self) -> SecurityConfig:
        """Get security configuration"""
        security = self._config_data.get("security", {})
        return SecurityConfig(**security)
    
    def get_license_config(self) -> LicenseConfig:
        """Get license configuration"""
        license_data = self._config_data.get("license", {})
        return LicenseConfig(**license_data)
    
    def get_ai_config(self) -> AIConfig:
        """Get AI configuration"""
        ai = self._config_data.get("ai", {})
        ai["mode"] = AIMode(ai.get("mode", "off"))
        return AIConfig(**ai)
    
    def update_license(self, license_config: LicenseConfig):
        """Update license configuration"""
        license_data = {
            "organization_name": license_config.organization_name,
            "license_id": license_config.license_id,
            "max_users": license_config.max_users,
            "ai_enabled": license_config.ai_enabled,
            "ats_enabled": license_config.ats_enabled,
            "analytics_enabled": license_config.analytics_enabled,
            "bias_module_enabled": license_config.bias_module_enabled,
            "floating_license_enabled": license_config.floating_license_enabled,
            "floating_license_server": license_config.floating_license_server,
            "expiration_date": license_config.expiration_date
        }
        self._config_data["license"] = license_data
        self._save_config()
    
    def is_feature_enabled(self, feature: str) -> bool:
        """Check if a feature is enabled by license"""
        license_config = self.get_license_config()
        feature_map = {
            "ai": license_config.ai_enabled,
            "ats": license_config.ats_enabled,
            "analytics": license_config.analytics_enabled,
            "bias": license_config.bias_module_enabled,
            "floating_license": license_config.floating_license_enabled
        }
        return feature_map.get(feature, False)


# Global config instance
config_manager: Optional[ConfigManager] = None


def get_config() -> ConfigManager:
    """Get global configuration manager"""
    global config_manager
    if config_manager is None:
        config_manager = ConfigManager()
    return config_manager
