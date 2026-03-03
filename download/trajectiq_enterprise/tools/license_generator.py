#!/usr/bin/env python3
"""
TrajectIQ License Generation Tool
=================================
Administrative tool for generating license keys.

SECURITY NOTE:
- Private key must be kept secure
- Never distribute this tool to end users
- Generated licenses should be transmitted securely
"""

import json
import base64
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, Any

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from security.license import LicenseManager, LicenseInfo, MachineFingerprint


class LicenseGenerator:
    """
    Administrative license generator.
    Generates signed license keys for TrajectIQ Enterprise.
    """
    
    def __init__(self, private_key_path: Optional[str] = None, public_key_path: Optional[str] = None):
        """
        Initialize license generator.
        
        Args:
            private_key_path: Path to private key file (for signing)
            public_key_path: Path to public key file (for embedding in app)
        """
        self.private_key_pem = None
        self.public_key_pem = None
        
        if private_key_path and os.path.exists(private_key_path):
            with open(private_key_path, 'r') as f:
                self.private_key_pem = f.read()
        
        if public_key_path and os.path.exists(public_key_path):
            with open(public_key_path, 'r') as f:
                self.public_key_pem = f.read()
    
    @staticmethod
    def generate_key_pair(output_dir: str) -> tuple:
        """
        Generate new RSA key pair.
        
        Args:
            output_dir: Directory to save keys
        
        Returns:
            Tuple of (private_key_path, public_key_path)
        """
        private_pem, public_pem = LicenseManager.generate_key_pair()
        
        os.makedirs(output_dir, exist_ok=True)
        
        private_path = os.path.join(output_dir, "private_key.pem")
        public_path = os.path.join(output_dir, "public_key.pem")
        
        with open(private_path, 'w') as f:
            f.write(private_pem)
        os.chmod(private_path, 0o600)  # Secure permissions
        
        with open(public_path, 'w') as f:
            f.write(public_pem)
        
        return private_path, public_path
    
    def generate_license(
        self,
        license_id: str,
        organization_name: str,
        expiration_days: Optional[int] = None,
        max_users: int = 1,
        ai_enabled: bool = False,
        ats_enabled: bool = False,
        analytics_enabled: bool = True,
        bias_module_enabled: bool = True,
        floating_license_enabled: bool = False,
        floating_license_server: str = "",
        cloud_validation_enabled: bool = False,
        cloud_validation_endpoint: str = "",
        machine_fingerprint: Optional[str] = None
    ) -> str:
        """
        Generate a signed license key.
        
        Args:
            license_id: Unique license identifier
            organization_name: Licensed organization name
            expiration_days: Days until expiration (None = perpetual)
            max_users: Maximum number of users
            ai_enabled: AI features enabled
            ats_enabled: ATS integration enabled
            analytics_enabled: Analytics module enabled
            bias_module_enabled: Bias detection module enabled
            floating_license_enabled: Floating license mode
            floating_license_server: Floating license server URL
            cloud_validation_enabled: Cloud validation enabled
            cloud_validation_endpoint: Cloud validation endpoint URL
            machine_fingerprint: Machine binding fingerprint (None = bind on first activation)
        
        Returns:
            Base64-encoded license key string
        """
        
        if not self.private_key_pem:
            raise ValueError("Private key not loaded. Cannot sign license.")
        
        # Calculate expiration
        expiration_date = None
        if expiration_days:
            expiration_date = datetime.utcnow() + timedelta(days=expiration_days)
        
        # Build license data
        license_data = {
            "license_id": license_id,
            "organization_name": organization_name,
            "product_name": "TrajectIQ Enterprise",
            "product_version": "1.0.0",
            "issued_at": datetime.utcnow().isoformat(),
            "expiration_date": expiration_date.isoformat() if expiration_date else None,
            "max_users": max_users,
            "ai_enabled": ai_enabled,
            "ats_enabled": ats_enabled,
            "analytics_enabled": analytics_enabled,
            "bias_module_enabled": bias_module_enabled,
            "floating_license_enabled": floating_license_enabled,
            "floating_license_server": floating_license_server,
            "cloud_validation_enabled": cloud_validation_enabled,
            "cloud_validation_endpoint": cloud_validation_endpoint,
            "machine_fingerprint": machine_fingerprint or ""
        }
        
        # Sign the license
        signature = LicenseManager.sign_license(license_data, self.private_key_pem)
        
        # Add signature to license data
        license_data["signature"] = signature
        
        # Encode as base64
        license_json = json.dumps(license_data, separators=(',', ':'))
        license_key = base64.b64encode(license_json.encode()).decode()
        
        return license_key
    
    def validate_license_key(self, license_key: str) -> Dict[str, Any]:
        """
        Validate a license key (for testing purposes).
        
        Args:
            license_key: Base64-encoded license key
        
        Returns:
            Validation result dict
        """
        
        # Create a temporary license manager with the public key
        lm = LicenseManager()
        if self.public_key_pem:
            lm.set_public_key(self.public_key_pem)
        
        status, info = lm.activate_license(license_key)
        
        return {
            "status": status.value,
            "license_info": info.to_dict() if info else None
        }


def interactive_license_generation():
    """Interactive CLI for license generation"""
    
    print("=" * 60)
    print("  TrajectIQ Enterprise - License Generator")
    print("=" * 60)
    print()
    
    # Check for keys
    keys_dir = Path(__file__).parent / "keys"
    private_key_path = keys_dir / "private_key.pem"
    public_key_path = keys_dir / "public_key.pem"
    
    generator = LicenseGenerator()
    
    # Generate keys if not exist
    if not private_key_path.exists():
        print("No key pair found. Generating new keys...")
        private_key_path, public_key_path = LicenseGenerator.generate_key_pair(str(keys_dir))
        print(f"Keys generated:")
        print(f"  Private: {private_key_path}")
        print(f"  Public:  {public_key_path}")
        print()
        
        # Reload generator with new keys
        generator = LicenseGenerator(str(private_key_path), str(public_key_path))
    else:
        generator = LicenseGenerator(str(private_key_path), str(public_key_path))
    
    # Get license details
    print("Enter license details:")
    print()
    
    license_id = input("License ID [AUTO]: ").strip()
    if not license_id or license_id == "AUTO":
        import uuid
        license_id = f"TQI-{uuid.uuid4().hex[:8].upper()}"
    
    organization = input("Organization Name: ").strip()
    while not organization:
        print("Organization name is required.")
        organization = input("Organization Name: ").strip()
    
    expiration = input("Expiration (days, 0=perpetual) [365]: ").strip()
    expiration_days = int(expiration) if expiration and expiration != "0" else None
    if expiration == "0":
        expiration_days = None
    elif not expiration:
        expiration_days = 365
    
    max_users = input("Max Users [1]: ").strip()
    max_users = int(max_users) if max_users else 1
    
    # Feature flags
    print("\nFeature Flags (y/n):")
    
    ai_enabled = input("  AI Features [n]: ").strip().lower() == 'y'
    ats_enabled = input("  ATS Integration [n]: ").strip().lower() == 'y'
    analytics_enabled = input("  Analytics [y]: ").strip().lower() != 'n'
    bias_enabled = input("  Bias Detection [y]: ").strip().lower() != 'n'
    
    # Floating license
    floating = input("\nFloating License Mode [n]: ").strip().lower() == 'y'
    floating_server = ""
    if floating:
        floating_server = input("  License Server URL: ").strip()
    
    # Cloud validation
    cloud = input("Cloud Validation [n]: ").strip().lower() == 'y'
    cloud_endpoint = ""
    if cloud:
        cloud_endpoint = input("  Validation Endpoint URL: ").strip()
    
    # Machine binding
    bind_machine = input("\nBind to Machine [n]: ").strip().lower() == 'y'
    machine_fp = ""
    if bind_machine:
        print("\nEnter machine fingerprint from target machine.")
        print("(Run 'TrajectIQ --fingerprint' on target machine to get it)")
        machine_fp = input("Machine Fingerprint: ").strip()
    
    # Generate license
    print("\n" + "=" * 60)
    print("Generating license...")
    
    try:
        license_key = generator.generate_license(
            license_id=license_id,
            organization_name=organization,
            expiration_days=expiration_days,
            max_users=max_users,
            ai_enabled=ai_enabled,
            ats_enabled=ats_enabled,
            analytics_enabled=analytics_enabled,
            bias_module_enabled=bias_enabled,
            floating_license_enabled=floating,
            floating_license_server=floating_server,
            cloud_validation_enabled=cloud,
            cloud_validation_endpoint=cloud_endpoint,
            machine_fingerprint=machine_fp if machine_fp else None
        )
        
        print("\nLICENSE GENERATED SUCCESSFULLY!")
        print("=" * 60)
        print(f"\nLicense ID: {license_id}")
        print(f"Organization: {organization}")
        print(f"Max Users: {max_users}")
        print(f"Expires: {'Perpetual' if not expiration_days else f'{expiration_days} days'}")
        print(f"\nFeatures: AI={ai_enabled}, ATS={ats_enabled}, Analytics={analytics_enabled}, Bias={bias_enabled}")
        
        # Save license to file
        output_dir = Path(__file__).parent / "licenses"
        output_dir.mkdir(exist_ok=True)
        
        output_file = output_dir / f"{license_id}.key"
        with open(output_file, 'w') as f:
            f.write(license_key)
        
        print(f"\nLicense saved to: {output_file}")
        
        # Also print the key
        print("\n" + "-" * 60)
        print("LICENSE KEY (copy this):")
        print("-" * 60)
        print(license_key)
        print("-" * 60)
        
    except Exception as e:
        print(f"\nError generating license: {e}")
        return 1
    
    return 0


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="TrajectIQ License Generator",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    # Generate command
    gen_parser = subparsers.add_parser("generate", help="Generate a license key")
    gen_parser.add_argument("--id", required=True, help="License ID")
    gen_parser.add_argument("--org", required=True, help="Organization name")
    gen_parser.add_argument("--days", type=int, default=365, help="Days until expiration")
    gen_parser.add_argument("--users", type=int, default=1, help="Max users")
    gen_parser.add_argument("--ai", action="store_true", help="Enable AI features")
    gen_parser.add_argument("--ats", action="store_true", help="Enable ATS integration")
    gen_parser.add_argument("--output", "-o", help="Output file path")
    
    # Keygen command
    key_parser = subparsers.add_parser("keygen", help="Generate RSA key pair")
    key_parser.add_argument("--output", "-o", default="keys", help="Output directory")
    
    # Validate command
    val_parser = subparsers.add_parser("validate", help="Validate a license key")
    val_parser.add_argument("key", help="License key to validate")
    
    # Interactive mode
    parser.add_argument("--interactive", "-i", action="store_true", 
                       help="Interactive license generation")
    
    args = parser.parse_args()
    
    # Interactive mode
    if args.interactive or not args.command:
        return interactive_license_generation()
    
    # Handle commands
    if args.command == "keygen":
        output_dir = args.output
        private_path, public_path = LicenseGenerator.generate_key_pair(output_dir)
        print(f"Keys generated:")
        print(f"  Private: {private_path}")
        print(f"  Public:  {public_path}")
        return 0
    
    elif args.command == "generate":
        keys_dir = Path(__file__).parent / "keys"
        generator = LicenseGenerator(
            str(keys_dir / "private_key.pem"),
            str(keys_dir / "public_key.pem")
        )
        
        expiration_days = args.days if args.days > 0 else None
        
        license_key = generator.generate_license(
            license_id=args.id,
            organization_name=args.org,
            expiration_days=expiration_days,
            max_users=args.users,
            ai_enabled=args.ai,
            ats_enabled=args.ats
        )
        
        if args.output:
            with open(args.output, 'w') as f:
                f.write(license_key)
            print(f"License saved to: {args.output}")
        else:
            print(license_key)
        
        return 0
    
    elif args.command == "validate":
        keys_dir = Path(__file__).parent / "keys"
        generator = LicenseGenerator(
            public_key_path=str(keys_dir / "public_key.pem")
        )
        
        result = generator.validate_license_key(args.key)
        print(json.dumps(result, indent=2))
        return 0
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
