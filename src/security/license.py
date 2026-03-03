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
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import secrets

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.backends import default_backend
import requests


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
    ai_enabled: bool = False
    ats_enabled: bool = False
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
            self.issued_at = datetime.utcnow()
    
    def is_expired(self) -> bool:
        if self.expiration_date is None:
            return False
        return datetime.utcnow() > self.expiration_date
    
    def days_until_expiry(self) -> Optional[int]:
        if self.expiration_date is None:
            return None
        delta = self.expiration_date - datetime.utcnow()
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
        return cls(
            license_id=data.get("license_id", ""),
            organization_name=data.get("organization_name", ""),
            product_name=data.get("product_name", "TrajectIQ Enterprise"),
            product_version=data.get("product_version", "1.0.0"),
            issued_at=datetime.fromisoformat(data["issued_at"]) if data.get("issued_at") else None,
            expiration_date=datetime.fromisoformat(data["expiration_date"]) if data.get("expiration_date") else None,
            max_users=data.get("max_users", 1),
            ai_enabled=data.get("ai_enabled", False),
            ats_enabled=data.get("ats_enabled", False),
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
    """
    Generate unique machine fingerprint for license binding.
    Combines multiple hardware identifiers.
    """
    
    @staticmethod
    def generate() -> str:
        """Generate machine fingerprint"""
        components = []
        
        # Platform info
        components.append(platform.node())  # Hostname
        components.append(platform.machine())  # Architecture
        components.append(platform.system())  # OS
        
        # CPU info
        try:
            cpu_info = platform.processor()
            if cpu_info:
                components.append(cpu_info)
        except Exception:
            pass
        
        # MAC addresses (primary network interface)
        try:
            mac = uuid.getnode()
            components.append(f"MAC:{mac:012x}")
        except Exception:
            pass
        
        # Disk serial (Windows)
        if platform.system() == "Windows":
            try:
                import subprocess
                result = subprocess.run(
                    ['wmic', 'diskdrive', 'get', 'serialnumber'],
                    capture_output=True, text=True, timeout=5
                )
                if result.returncode == 0:
                    serials = [line.strip() for line in result.stdout.split('\n') 
                              if line.strip() and line.strip() != 'SerialNumber']
                    if serials:
                        components.append(f"DISK:{serials[0]}")
            except Exception:
                pass
        
        # Volume serial (Windows)
        if platform.system() == "Windows":
            try:
                import subprocess
                result = subprocess.run(
                    ['vol', 'c:'],
                    capture_output=True, text=True, shell=True, timeout=5
                )
                if result.returncode == 0:
                    # Extract serial from "Volume Serial Number is XXXX-XXXX"
                    for line in result.stdout.split('\n'):
                        if 'Serial Number' in line:
                            serial = line.split('is')[-1].strip()
                            components.append(f"VOL:{serial}")
                            break
            except Exception:
                pass
        
        # Create hash
        combined = "|".join(components)
        fingerprint = hashlib.sha256(combined.encode()).hexdigest()[:32]
        
        return fingerprint.upper()
    
    @staticmethod
    def verify(expected: str) -> bool:
        """Verify current machine matches expected fingerprint"""
        current = MachineFingerprint.generate()
        return current == expected


class LicenseManager:
    """
    License validation and management.
    Supports offline, floating, and cloud validation.
    """
    
    # Embedded public key (generated during build, embedded in exe)
    PUBLIC_KEY_PEM = None  # Set during build process
    
    def __init__(self, config_dir: Optional[str] = None):
        self.config_dir = config_dir or os.path.join(os.path.expanduser("~"), ".trajectiq")
        self.license_file = os.path.join(self.config_dir, "license.key")
        self.public_key = None
        self._license_info: Optional[LicenseInfo] = None
        self._validation_cache: Optional[Tuple[datetime, LicenseStatus]] = None
        
        self._load_public_key()
        self._load_license()
    
    def _load_public_key(self):
        """Load embedded public key for signature verification"""
        if self.PUBLIC_KEY_PEM:
            self.public_key = serialization.load_pem_public_key(
                self.PUBLIC_KEY_PEM.encode(),
                backend=default_backend()
            )
    
    def set_public_key(self, public_key_pem: str):
        """Set public key (for build process)"""
        self.public_key = serialization.load_pem_public_key(
            public_key_pem.encode(),
            backend=default_backend()
        )
        self.PUBLIC_KEY_PEM = public_key_pem
    
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
        # Set restrictive permissions
        os.chmod(self.license_file, 0o600)
    
    @staticmethod
    def generate_key_pair() -> Tuple[str, str]:
        """
        Generate RSA key pair for license signing.
        Returns (private_key_pem, public_key_pem).
        """
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=4096,
            backend=default_backend()
        )
        
        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ).decode()
        
        public_pem = private_key.public_key().public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode()
        
        return private_pem, public_pem
    
    @staticmethod
    def sign_license(license_data: Dict[str, Any], private_key_pem: str) -> str:
        """
        Sign license data with private key.
        Returns base64-encoded signature.
        """
        private_key = serialization.load_pem_private_key(
            private_key_pem.encode(),
            password=None,
            backend=default_backend()
        )
        
        # Create canonical JSON string
        message = json.dumps(license_data, sort_keys=True, separators=(',', ':')).encode()
        
        signature = private_key.sign(
            message,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        
        return base64.b64encode(signature).decode()
    
    def verify_signature(self, license_data: Dict[str, Any], signature: str) -> bool:
        """
        Verify license signature with public key.
        """
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
        """
        Activate license from license key string.
        License key is base64-encoded, signed JSON.
        """
        try:
            # Decode license key
            decoded = base64.b64decode(license_key)
            license_data = json.loads(decoded)
            
            # Extract signature
            signature = license_data.pop("signature", "")
            
            # Verify signature
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
            
            # If license has machine fingerprint, verify it
            if license_info.machine_fingerprint:
                if license_info.machine_fingerprint != current_fingerprint:
                    return LicenseStatus.MACHINE_MISMATCH, license_info
            else:
                # First activation - bind to current machine
                license_info.machine_fingerprint = current_fingerprint
            
            # Store license
            self._license_info = license_info
            self._save_license()
            
            return LicenseStatus.VALID, license_info
            
        except json.JSONDecodeError:
            return LicenseStatus.INVALID, None
        except Exception as e:
            return LicenseStatus.INVALID, None
    
    def validate_license(self, force_check: bool = False) -> Tuple[LicenseStatus, Optional[LicenseInfo]]:
        """
        Validate current license.
        Returns status and license info.
        """
        # Check cache (valid for 1 hour)
        if not force_check and self._validation_cache:
            cache_time, cached_status = self._validation_cache
            if datetime.utcnow() - cache_time < timedelta(hours=1):
                return cached_status, self._license_info
        
        if not self._license_info:
            return LicenseStatus.NOT_ACTIVATED, None
        
        # Check signature
        license_data = self._license_info.to_dict()
        signature = license_data.pop("signature", "")
        
        if not self.verify_signature(license_data, signature):
            return LicenseStatus.INVALID, self._license_info
        
        # Check expiration
        if self._license_info.is_expired():
            return LicenseStatus.EXPIRED, self._license_info
        
        # Check machine fingerprint
        if self._license_info.machine_fingerprint:
            if not MachineFingerprint.verify(self._license_info.machine_fingerprint):
                return LicenseStatus.MACHINE_MISMATCH, self._license_info
        
        # Cloud validation (if enabled)
        if self._license_info.cloud_validation_enabled:
            status = self._cloud_validate()
            if status != LicenseStatus.VALID:
                return status, self._license_info
        
        # Floating license check (if enabled)
        if self._license_info.floating_license_enabled:
            status = self._floating_validate()
            if status != LicenseStatus.VALID:
                return status, self._license_info
        
        # Cache result
        self._validation_cache = (datetime.utcnow(), LicenseStatus.VALID)
        
        return LicenseStatus.VALID, self._license_info
    
    def _cloud_validate(self) -> LicenseStatus:
        """
        Validate license against cloud server.
        """
        if not self._license_info or not self._license_info.cloud_validation_endpoint:
            return LicenseStatus.INVALID
        
        try:
            response = requests.post(
                self._license_info.cloud_validation_endpoint,
                json={
                    "license_id": self._license_info.license_id,
                    "machine_fingerprint": MachineFingerprint.generate(),
                    "product_version": self._license_info.product_version
                },
                timeout=10,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("valid"):
                    return LicenseStatus.VALID
                elif data.get("reason") == "expired":
                    return LicenseStatus.EXPIRED
                else:
                    return LicenseStatus.INVALID
            else:
                # Grace period on server error
                return LicenseStatus.VALID
                
        except requests.RequestException:
            # Grace period on network error
            return LicenseStatus.VALID
    
    def _floating_validate(self) -> LicenseStatus:
        """
        Validate against floating license server.
        """
        if not self._license_info or not self._license_info.floating_license_server:
            return LicenseStatus.INVALID
        
        try:
            response = requests.post(
                f"{self._license_info.floating_license_server}/seat/request",
                json={
                    "license_id": self._license_info.license_id,
                    "machine_fingerprint": MachineFingerprint.generate()
                },
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("granted"):
                    return LicenseStatus.VALID
                else:
                    return LicenseStatus.INVALID
            else:
                return LicenseStatus.SERVER_UNREACHABLE
                
        except requests.RequestException:
            return LicenseStatus.SERVER_UNREACHABLE
    
    def release_floating_seat(self):
        """Release floating license seat"""
        if not self._license_info or not self._license_info.floating_license_enabled:
            return
        
        try:
            requests.post(
                f"{self._license_info.floating_license_server}/seat/release",
                json={
                    "license_id": self._license_info.license_id,
                    "machine_fingerprint": MachineFingerprint.generate()
                },
                timeout=5
            )
        except requests.RequestException:
            pass
    
    def get_license_info(self) -> Optional[LicenseInfo]:
        """Get current license info"""
        return self._license_info
    
    def is_feature_enabled(self, feature: str) -> bool:
        """Check if a feature is enabled in license"""
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
        """Get maximum allowed users"""
        if self._license_info:
            return self._license_info.max_users
        return 0
    
    def deactivate(self):
        """Remove license"""
        self._license_info = None
        if os.path.exists(self.license_file):
            os.remove(self.license_file)
        self._validation_cache = None


# Global license manager
license_manager: Optional[LicenseManager] = None


def get_license_manager() -> LicenseManager:
    """Get global license manager"""
    global license_manager
    if license_manager is None:
        license_manager = LicenseManager()
    return license_manager
