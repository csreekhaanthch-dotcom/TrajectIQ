"""
TrajectIQ Enterprise - Integrity & Tamper Detection
====================================================
Security module for executable integrity validation,
tamper detection, and debug mode detection.
"""

import os
import sys
import hashlib
import logging
import platform
import subprocess
import json
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List
from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class IntegrityStatus(Enum):
    VALID = "valid"
    TAMPERED = "tampered"
    CHECKSUM_MISMATCH = "checksum_mismatch"
    DEBUG_DETECTED = "debug_detected"
    EMULATOR_DETECTED = "emulator_detected"
    CRITICAL_FAILURE = "critical_failure"


@dataclass
class IntegrityCheckResult:
    """Result of integrity check"""
    status: IntegrityStatus
    is_valid: bool
    checksum_match: bool
    debug_detected: bool
    emulator_detected: bool
    tamper_indicators: List[str]
    warnings: List[str]
    timestamp: datetime


class IntegrityValidator:
    """
    Validates application integrity and detects tampering.
    
    Security features:
    - Executable checksum validation
    - Tamper detection
    - Debug mode detection
    - Emulator/VM detection
    - Secure fail states
    """
    
    # Known good checksums (set during build)
    EXPECTED_CHECKSUMS = {}
    
    # Debug indicators
    DEBUG_INDICATORS = [
        'pydevd', 'pdb', 'debugpy', 'breakpoint',
        'PYDEVD_USE_CYTHON', 'DEBUG', 'DEVELOPMENT'
    ]
    
    # Emulator/VM indicators
    VM_INDICATORS = [
        'vmware', 'virtualbox', 'qemu', 'xen', 'parallels',
        'vbox', 'virtual', 'sandbox', 'analyz'
    ]
    
    # Suspicious process names
    SUSPICIOUS_PROCESSES = [
        'procmon', 'processhacker', 'procexp', 'ollydbg',
        'x64dbg', 'ida', 'ghidra', 'cheatengine', 'dnspy',
        'windbg', 'immunity', 'radare', 'cutter'
    ]
    
    def __init__(self):
        self._logger = logging.getLogger(__name__)
        self._cached_checksum = None
    
    def validate_full(self) -> IntegrityCheckResult:
        """
        Perform comprehensive integrity validation.
        
        Returns:
            IntegrityCheckResult with detailed findings
        """
        result = IntegrityCheckResult(
            status=IntegrityStatus.VALID,
            is_valid=True,
            checksum_match=True,
            debug_detected=False,
            emulator_detected=False,
            tamper_indicators=[],
            warnings=[],
            timestamp=datetime.utcnow()
        )
        
        # 1. Checksum validation
        checksum_result = self._validate_checksum()
        if not checksum_result[0]:
            result.checksum_match = False
            result.tamper_indicators.append(checksum_result[1])
            result.status = IntegrityStatus.CHECKSUM_MISMATCH
            result.is_valid = False
        
        # 2. Debug detection
        if self._detect_debugger():
            result.debug_detected = True
            result.tamper_indicators.append("Debugger detected")
            result.status = IntegrityStatus.DEBUG_DETECTED
            result.is_valid = False
        
        # 3. Emulator/VM detection
        if self._detect_vm():
            result.emulator_detected = True
            result.warnings.append("Running in virtual environment")
        
        # 4. Process analysis
        suspicious = self._detect_suspicious_processes()
        if suspicious:
            result.tamper_indicators.extend(suspicious)
            result.warnings.extend([f"Suspicious process: {p}" for p in suspicious])
        
        # 5. Environment check
        env_issues = self._check_environment()
        if env_issues:
            result.tamper_indicators.extend(env_issues)
        
        # Update final status
        if not result.is_valid:
            if result.debug_detected:
                result.status = IntegrityStatus.DEBUG_DETECTED
            elif not result.checksum_match:
                result.status = IntegrityStatus.CHECKSUM_MISMATCH
            elif result.tamper_indicators:
                result.status = IntegrityStatus.TAMPERED
        
        return result
    
    def _validate_checksum(self) -> Tuple[bool, str]:
        """
        Validate executable checksum.
        
        Returns:
            Tuple of (is_valid, message)
        """
        try:
            # Get current executable path
            if getattr(sys, 'frozen', False):
                exe_path = sys.executable
            else:
                # Running in development mode
                return (True, "Development mode - checksum validation skipped")
            
            # Calculate current checksum
            current_checksum = self._calculate_file_checksum(exe_path)
            
            if not current_checksum:
                return (False, "Failed to calculate checksum")
            
            # Check against expected checksums
            if self.EXPECTED_CHECKSUMS:
                expected = self.EXPECTED_CHECKSUMS.get(Path(exe_path).name)
                
                if expected and current_checksum != expected:
                    return (False, f"Checksum mismatch for {Path(exe_path).name}")
            
            self._cached_checksum = current_checksum
            return (True, "Checksum valid")
            
        except Exception as e:
            return (False, f"Checksum validation error: {str(e)}")
    
    def _calculate_file_checksum(self, filepath: str, algorithm: str = 'sha256') -> Optional[str]:
        """Calculate file checksum"""
        try:
            hash_func = hashlib.new(algorithm)
            
            with open(filepath, 'rb') as f:
                for chunk in iter(lambda: f.read(8192), b''):
                    hash_func.update(chunk)
            
            return hash_func.hexdigest()
        except Exception as e:
            self._logger.error(f"Checksum calculation error: {e}")
            return None
    
    def _detect_debugger(self) -> bool:
        """
        Detect if running under a debugger.
        
        Returns:
            True if debugger detected
        """
        # Check environment variables
        for indicator in self.DEBUG_INDICATORS:
            if indicator in os.environ:
                return True
        
        # Check Python debugger modules
        for module_name in ['pydevd', 'pdb', 'debugpy']:
            if module_name in sys.modules:
                return True
        
        # Check for breakpoint presence (Python 3.7+)
        if hasattr(sys, 'breakpointhook'):
            if sys.breakpointhook.__module__ != 'sys':
                return True
        
        # Platform-specific checks
        if platform.system() == 'Windows':
            return self._windows_debugger_check()
        
        return False
    
    def _windows_debugger_check(self) -> bool:
        """Windows-specific debugger detection"""
        try:
            import ctypes
            
            # Check IsDebuggerPresent
            kernel32 = ctypes.windll.kernel32
            if kernel32.IsDebuggerPresent():
                return True
            
            # Check for remote debugger
            if kernel32.CheckRemoteDebuggerPresent(kernel32.GetCurrentProcess(), ctypes.byref(ctypes.c_int())):
                return True
            
        except Exception:
            pass
        
        return False
    
    def _detect_vm(self) -> bool:
        """
        Detect if running in a virtual machine.
        
        Returns:
            True if VM detected
        """
        system = platform.system().lower()
        
        # Check system info for VM indicators
        system_info = f"{platform.system()} {platform.machine()} {platform.processor()}".lower()
        
        for indicator in self.VM_INDICATORS:
            if indicator in system_info:
                return True
        
        # Check MAC addresses (common VM prefixes)
        if system == 'windows':
            try:
                result = subprocess.run(
                    ['getmac', '/fo', 'csv', '/nh'],
                    capture_output=True, text=True, timeout=5
                )
                mac_output = result.stdout.lower()
                vm_macs = ['00-05-69', '00-0c-29', '00-50-56',  # VMware
                          '08-00-27',  # VirtualBox
                          '00-16-3e']  # Xen
                
                for vm_mac in vm_macs:
                    if vm_mac.lower() in mac_output:
                        return True
            except:
                pass
        
        # Check for VM-specific files/registry
        if system == 'windows':
            vm_paths = [
                r'C:\Windows\System32\drivers\vmmouse.sys',
                r'C:\Windows\System32\drivers\vmhgfs.sys',
                r'C:\Windows\System32\drivers\VBoxMouse.sys',
                r'C:\Windows\System32\drivers\VBoxGuest.sys'
            ]
            for path in vm_paths:
                if os.path.exists(path):
                    return True
        
        return False
    
    def _detect_suspicious_processes(self) -> List[str]:
        """
        Detect suspicious analysis tools running.
        
        Returns:
            List of detected suspicious process names
        """
        detected = []
        
        try:
            if platform.system() == 'Windows':
                result = subprocess.run(
                    ['tasklist', '/fo', 'csv', '/nh'],
                    capture_output=True, text=True, timeout=10
                )
                process_list = result.stdout.lower()
                
                for proc in self.SUSPICIOUS_PROCESSES:
                    if proc.lower() in process_list:
                        detected.append(proc)
        except Exception:
            pass
        
        return detected
    
    def _check_environment(self) -> List[str]:
        """
        Check for suspicious environment configurations.
        
        Returns:
            List of detected issues
        """
        issues = []
        
        # Check for analysis environment variables
        analysis_env_vars = [
            'SANDBOX', 'MALWARE', 'SAMPLE', 'VIRUS',
            'ANYRUN', 'JOESANDBOX', 'CWSANDBOX'
        ]
        
        for var in analysis_env_vars:
            if var in os.environ:
                issues.append(f"Suspicious environment variable: {var}")
        
        # Check for timing anomalies (quick execution start)
        # This could indicate sandbox environment
        if hasattr(sys, 'frozen'):
            import time
            startup_time = time.time()  # Approximate
            
        return issues
    
    def secure_fail(self, reason: str = "Integrity check failed"):
        """
        Handle integrity check failure securely.
        
        Logs the failure and safely terminates.
        """
        self._logger.critical(f"SECURE FAIL: {reason}")
        
        # Log security event
        log_entry = {
            "event": "integrity_failure",
            "reason": reason,
            "timestamp": datetime.utcnow().isoformat(),
            "platform": platform.system(),
            "python_version": platform.python_version()
        }
        
        # Attempt to write to secure log
        try:
            log_path = Path.home() / ".trajectiq" / "security.log"
            log_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(log_path, 'a') as f:
                f.write(json.dumps(log_entry) + '\n')
        except:
            pass
        
        # Secure termination
        sys.exit(1)
    
    def get_current_checksum(self) -> Optional[str]:
        """Get cached or calculate current executable checksum"""
        if self._cached_checksum:
            return self._cached_checksum
        
        if getattr(sys, 'frozen', False):
            return self._calculate_file_checksum(sys.executable)
        
        return None


# Singleton instance
_integrity_validator: Optional[IntegrityValidator] = None


def get_integrity_validator() -> IntegrityValidator:
    """Get global integrity validator instance"""
    global _integrity_validator
    if _integrity_validator is None:
        _integrity_validator = IntegrityValidator()
    return _integrity_validator


def check_integrity_on_startup() -> bool:
    """
    Perform startup integrity check.
    Call this early in application initialization.
    
    Returns:
        True if integrity check passes, False otherwise
    """
    validator = get_integrity_validator()
    result = validator.validate_full()
    
    if not result.is_valid:
        # Log but don't necessarily terminate in development
        if getattr(sys, 'frozen', False):
            # Production build - strict enforcement
            validator.secure_fail(result.status.value)
        else:
            # Development mode - warning only
            logging.warning(f"Integrity check issues: {result.tamper_indicators}")
    
    return result.is_valid
