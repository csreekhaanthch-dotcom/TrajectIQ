"""
TrajectIQ Enterprise License System
===================================
RSA-based license validation with machine fingerprint binding.
Supports offline, floating, and cloud validation modes.
"""

import json
import hashlib
import platform
import uuid
import base64
import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import secrets

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.backends import default_backend

try:
    import requests
except ImportError:
    requests = None


class LicenseStatus(Enum):
    VALID = "valid"
    EXPIRED = "expired"
    INVALID = "invalid"
    NOT_ACTIVATED = "not_activated"
    MACHINE_MISMATCH = "machine_mismatch"
    SERVER_UNREACHABLE = "server_unreachable"
    FEATURE_DISABLED = "feature_disabled"


class LicenseMode(Enum):
    OFFLINE = "offline"
    FLOATING = "floating"
    CLOUD = "cloud"


@dataclass
class LicenseInfo:
    """License information"""
    license_id: str
    organization_name: str
    product_name: str = "TrajectIQ Enterprise"
    product_version: str = "1.0.0"
    issued_at: datetime = None
    expiration_date: datetime = None
    max_users: int = 1
    ai_enabled: bool = True
    ats_enabled: bool = True
    analytics_enabled: bool = True
    bias_module_enabled: bool = True
    floating_license_enabled: bool = False
    floating_license_server: str = ""
    cloud_validation_enabled: bool = False
    cloud_validation_endpoint: str = ""
    machine_fingerprint: str = ""
    signature: str = ""
    
    def __post_init__(self):
        if self.issued_at is None:
            self.issued_at = datetime.now(timezone.utc)
    
    def is_expired(self) -> bool:
        if self.expiration_date is None:
            return False
        return datetime.now(timezone.utc) > self.expiration_date
    
    def days_until_expiry(self) -> Optional[int]:
        if self.expiration_date is None:
            return None
        delta = self.expiration_date - datetime.now(timezone.utc)
        return max(0, delta.days)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "license_id": self.license_id,
            "organization_name": self.organization_name,
            "product_name": self.product_name,
            "product_version": self.product_version,
            "issued_at": self.issued_at.isoformat() if self.issued_at else None,
            "expiration_date": self.expiration_date.isoformat() if self.expiration_date else None,
            "max_users": self.max_users,
            "ai_enabled": self.ai_enabled,
            "ats_enabled": self.ats_enabled,
            "analytics_enabled": self.analytics_enabled,
            "bias_module_enabled": self.bias_module_enabled,
            "floating_license_enabled": self.floating_license_enabled,
            "floating_license_server": self.floating_license_server,
            "cloud_validation_enabled": self.cloud_validation_enabled,
            "cloud_validation_endpoint": self.cloud_validation_endpoint,
            "machine_fingerprint": self.machine_fingerprint,
            "signature": self.signature
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'LicenseInfo':
        def parse_datetime(dt_str):
            if not dt_str:
                return None
            try:
                # Handle both with and without timezone
                if dt_str.endswith('Z'):
                    dt_str = dt_str[:-1] + '+00:00'
                return datetime.fromisoformat(dt_str)
            except:
                return None
        
        return cls(
            license_id=data.get("license_id", ""),
            organization_name=data.get("organization_name", ""),
            product_name=data.get("product_name", "TrajectIQ Enterprise"),
            product_version=data.get("product_version", "1.0.0"),
            issued_at=parse_datetime(data.get("issued_at")),
            expiration_date=parse_datetime(data.get("expiration_date")),
            max_users=data.get("max_users", 1),
            ai_enabled=data.get("ai_enabled", True),
            ats_enabled=data.get("ats_enabled", True),
            analytics_enabled=data.get("analytics_enabled", True),
            bias_module_enabled=data.get("bias_module_enabled", True),
            floating_license_enabled=data.get("floating_license_enabled", False),
            floating_license_server=data.get("floating_license_server", ""),
            cloud_validation_enabled=data.get("cloud_validation_enabled", False),
            cloud_validation_endpoint=data.get("cloud_validation_endpoint", ""),
            machine_fingerprint=data.get("machine_fingerprint", ""),
            signature=data.get("signature", "")
        )


class MachineFingerprint:
    """Generate unique machine fingerprint for license binding."""
    
    @staticmethod
    def generate() -> str:
        """Generate machine fingerprint"""
        components = []
        
        components.append(platform.node())
        components.append(platform.machine())
        components.append(platform.system())
        
        try:
            cpu_info = platform.processor()
            if cpu_info:
                components.append(cpu_info)
        except Exception:
            pass
        
        try:
            mac = uuid.getnode()
            components.append(f"MAC:{mac:012x}")
        except Exception:
            pass
        
        combined = "|".join(str(c) for c in components)
        fingerprint = hashlib.sha256(combined.encode()).hexdigest()[:32]
        
        return fingerprint.upper()
    
    @staticmethod
    def verify(expected: str) -> bool:
        current = MachineFingerprint.generate()
        return current == expected


class LicenseManager:
    """License validation and management."""
    
    # Demo/Trial license key - works without signature verification
    DEMO_LICENSE_KEY = "TRAJECTIQ-DEMO-2024-FULL-ACCESS"
    
    def __init__(self, config_dir: Optional[str] = None):
        self.config_dir = config_dir or os.path.join(os.path.expanduser("~"), ".trajectiq")
        self.license_file = os.path.join(self.config_dir, "license.key")
        self.public_key = None
        self._license_info: Optional[LicenseInfo] = None
        self._validation_cache: Optional[Tuple[datetime, LicenseStatus]] = None
        
        self._load_license()
    
    def set_public_key(self, public_key_pem: str):
        """Set public key for verification"""
        try:
            self.public_key = serialization.load_pem_public_key(
                public_key_pem.encode(),
                backend=default_backend()
            )
        except Exception:
            self.public_key = None
    
    def _load_license(self):
        """Load license from file"""
        if os.path.exists(self.license_file):
            try:
                with open(self.license_file, 'r') as f:
                    license_data = json.load(f)
                self._license_info = LicenseInfo.from_dict(license_data)
            except Exception:
                self._license_info = None
    
    def _save_license(self):
        """Save license to file"""
        os.makedirs(self.config_dir, exist_ok=True)
        with open(self.license_file, 'w') as f:
            json.dump(self._license_info.to_dict(), f, indent=2)
        try:
            os.chmod(self.license_file, 0o600)
        except Exception:
            pass
    
    def verify_signature(self, license_data: Dict[str, Any], signature: str) -> bool:
        """Verify license signature"""
        if not self.public_key:
            return False
        
        try:
            message = json.dumps(license_data, sort_keys=True, separators=(',', ':')).encode()
            signature_bytes = base64.b64decode(signature)
            
            self.public_key.verify(
                signature_bytes,
                message,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            return True
        except Exception:
            return False
    
    def activate_license(self, license_key: str) -> Tuple[LicenseStatus, Optional[LicenseInfo]]:
        """Activate license from license key string"""
        
        # Check for demo/trial key
        if license_key.strip() == self.DEMO_LICENSE_KEY:
            return self._activate_demo_license()
        
        # Check for JSON license key (base64 encoded)
        try:
            decoded = base64.b64decode(license_key.strip())
            license_data = json.loads(decoded)
            
            # Extract signature
            signature = license_data.pop("signature", "")
            
            # If no public key, skip signature verification (development mode)
            if self.public_key and signature:
                if not self.verify_signature(license_data, signature):
                    return LicenseStatus.INVALID, None
            
            # Create license info
            license_info = LicenseInfo.from_dict(license_data)
            license_info.signature = signature
            
            # Check expiration
            if license_info.is_expired():
                return LicenseStatus.EXPIRED, license_info
            
            # Bind to machine
            current_fingerprint = MachineFingerprint.generate()
            
            if license_info.machine_fingerprint:
                if license_info.machine_fingerprint != current_fingerprint:
                    return LicenseStatus.MACHINE_MISMATCH, license_info
            else:
                license_info.machine_fingerprint = current_fingerprint
            
            self._license_info = license_info
            self._save_license()
            
            return LicenseStatus.VALID, license_info
            
        except json.JSONDecodeError:
            return LicenseStatus.INVALID, None
        except Exception:
            return LicenseStatus.INVALID, None
    
    def _activate_demo_license(self) -> Tuple[LicenseStatus, Optional[LicenseInfo]]:
        """Activate demo/trial license"""
        demo_info = LicenseInfo(
            license_id="DEMO-TRIAL-2024",
            organization_name="TrajectIQ Trial User",
            product_name="TrajectIQ Enterprise",
            product_version="1.0.0",
            issued_at=datetime.now(timezone.utc),
            expiration_date=datetime.now(timezone.utc) + timedelta(days=30),
            max_users=1,
            ai_enabled=True,
            ats_enabled=True,
            analytics_enabled=True,
            bias_module_enabled=True,
            floating_license_enabled=False,
            machine_fingerprint=MachineFingerprint.generate()
        )
        
        self._license_info = demo_info
        self._save_license()
        
        return LicenseStatus.VALID, demo_info
    
    def validate_license(self, force_check: bool = False) -> Tuple[LicenseStatus, Optional[LicenseInfo]]:
        """Validate current license"""
        
        if not self._license_info:
            return LicenseStatus.NOT_ACTIVATED, None
        
        # Check expiration
        if self._license_info.is_expired():
            return LicenseStatus.EXPIRED, self._license_info
        
        # Check machine fingerprint
        if self._license_info.machine_fingerprint:
            if not MachineFingerprint.verify(self._license_info.machine_fingerprint):
                return LicenseStatus.MACHINE_MISMATCH, self._license_info
        
        return LicenseStatus.VALID, self._license_info
    
    def get_license_info(self) -> Optional[LicenseInfo]:
        return self._license_info
    
    def is_feature_enabled(self, feature: str) -> bool:
        status, info = self.validate_license()
        if status != LicenseStatus.VALID:
            return False
        
        feature_map = {
            "ai": info.ai_enabled,
            "ats": info.ats_enabled,
            "analytics": info.analytics_enabled,
            "bias": info.bias_module_enabled,
            "floating_license": info.floating_license_enabled
        }
        return feature_map.get(feature, False)
    
    def get_max_users(self) -> int:
        if self._license_info:
            return self._license_info.max_users
        return 0
    
    def deactivate(self):
        self._license_info = None
        if os.path.exists(self.license_file):
            try:
                os.remove(self.license_file)
            except Exception:
                pass
        self._validation_cache = None


# Global license manager
_license_manager: Optional[LicenseManager] = None


def get_license_manager() -> LicenseManager:
    """Get global license manager"""
    global _license_manager
    if _license_manager is None:
        _license_manager = LicenseManager()
    return _license_manager
