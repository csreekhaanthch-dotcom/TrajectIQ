#!/usr/bin/env python3
"""
TrajectIQ Enterprise - Main Entry Point
========================================
Intelligence-Driven Hiring Platform
Enterprise Desktop Application
"""

import sys
import os
import argparse
from pathlib import Path
from typing import Optional

# ============================================================
# CRITICAL: Set up paths BEFORE any other imports
# ============================================================
def setup_paths():
    """Set up Python paths for both development and PyInstaller modes"""
    
    # Check if running as PyInstaller bundle
    if getattr(sys, 'frozen', False):
        # Running as compiled executable
        bundle_dir = Path(sys._MEIPASS)
        # Add bundle root to path
        if str(bundle_dir) not in sys.path:
            sys.path.insert(0, str(bundle_dir))
        # Add src directory in bundle
        src_in_bundle = bundle_dir / 'src'
        if src_in_bundle.exists() and str(src_in_bundle) not in sys.path:
            sys.path.insert(0, str(src_in_bundle))
        print(f"Running from bundle: {bundle_dir}")
    else:
        # Running as script - add src directory
        src_path = Path(__file__).parent
        if str(src_path) not in sys.path:
            sys.path.insert(0, str(src_path))
        # Also add parent directory for module imports
        parent_path = src_path.parent
        if str(parent_path) not in sys.path:
            sys.path.insert(0, str(parent_path))

# Set up paths FIRST
setup_paths()

# NOW we can import our modules
from security.license import MachineFingerprint, LicenseStatus, get_license_manager
from modules.scoring_engine import run_full_evaluation
from core.database import get_database


def show_error_dialog(title: str, message: str):
    """Show an error dialog using PyQt5"""
    try:
        from PyQt5.QtWidgets import QApplication, QMessageBox
        app = QApplication.instance()
        if app is None:
            app = QApplication(sys.argv)
        QMessageBox.critical(None, title, message)
    except Exception as e:
        # Fallback to console
        print(f"\n{'='*60}")
        print(f"ERROR: {title}")
        print(f"{'='*60}")
        print(message)
        print(f"{'='*60}\n")
        input("Press Enter to exit...")


def show_fingerprint():
    """Display machine fingerprint for license binding"""
    fingerprint = MachineFingerprint.generate()
    print("\n" + "=" * 50)
    print("  TrajectIQ Enterprise - Machine Fingerprint")
    print("=" * 50)
    print(f"\n  {fingerprint}\n")
    print("=" * 50)
    print("\nProvide this fingerprint when generating a license key.")
    print("This uniquely identifies this machine for license binding.\n")


def show_version():
    """Display version information"""
    print("""
TrajectIQ Enterprise v1.0.1
Intelligence-Driven Hiring Platform

Copyright (c) 2024 TrajectIQ. All rights reserved.

Licensed under the terms of your license agreement.
For support: support@trajectiq.com
""")


def load_embedded_public_key():
    """Load the public key from bundled resources"""
    try:
        if getattr(sys, 'frozen', False):
            # Running as compiled executable
            bundle_dir = Path(sys._MEIPASS)
            public_key_path = bundle_dir / "tools" / "keys" / "public_key.pem"
        else:
            # Running as script
            public_key_path = Path(__file__).parent.parent / "tools" / "keys" / "public_key.pem"
        
        if public_key_path.exists():
            public_key_pem = public_key_path.read_text()
            lm = get_license_manager()
            lm.set_public_key(public_key_pem)
            print(f"Loaded public key successfully")
            return True
        else:
            print(f"Warning: Public key not found at: {public_key_path}")
            # Create a default key for testing
            return create_default_key()
    except Exception as e:
        print(f"Error loading public key: {e}")
        return create_default_key()


def create_default_key():
    """Create a default key pair for initial testing"""
    try:
        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.backends import default_backend
        
        # Generate key
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=4096,
            backend=default_backend()
        )
        public_key = private_key.public_key()
        
        # Get public key PEM
        public_pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode()
        
        # Set in license manager
        lm = get_license_manager()
        lm.set_public_key(public_pem)
        
        # Save to file for future use
        if getattr(sys, 'frozen', False):
            bundle_dir = Path(sys._MEIPASS)
        else:
            bundle_dir = Path(__file__).parent.parent
        
        keys_dir = bundle_dir / "tools" / "keys"
        keys_dir.mkdir(parents=True, exist_ok=True)
        (keys_dir / "public_key.pem").write_bytes(public_pem.encode())
        
        print("Generated new public key for testing")
        return True
    except Exception as e:
        print(f"Could not create default key: {e}")
        return False


def run_cli():
    """Run command-line interface"""
    parser = argparse.ArgumentParser(
        description="TrajectIQ Enterprise - Intelligence-Driven Hiring",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument("--version", "-v", action="store_true", help="Show version information")
    parser.add_argument("--fingerprint", action="store_true", help="Show machine fingerprint")
    parser.add_argument("--gui", action="store_true", help="Launch GUI application (default)")
    parser.add_argument("--evaluate", type=str, help="Evaluate a resume file")
    parser.add_argument("--requirements", type=str, help="Job requirements JSON file")
    parser.add_argument("--output", type=str, help="Output file for results")
    
    args = parser.parse_args()
    
    if args.version:
        show_version()
        return 0
    
    if args.fingerprint:
        show_fingerprint()
        return 0
    
    if args.evaluate:
        return run_cli_evaluation(args.evaluate, args.requirements, args.output)
    
    return run_gui()


def run_cli_evaluation(resume_path: str, requirements_path: Optional[str], output_path: Optional[str]) -> int:
    """Run evaluation from command line"""
    import json
    
    load_embedded_public_key()
    
    lm = get_license_manager()
    status, info = lm.validate_license()
    
    if status != LicenseStatus.VALID:
        print("Error: Valid license required for evaluation.")
        print("Please activate your license using the GUI application.")
        return 1
    
    resume_path = Path(resume_path)
    if not resume_path.exists():
        print(f"Error: Resume file not found: {resume_path}")
        return 1
    
    with open(resume_path, 'r', encoding='utf-8') as f:
        resume_text = f.read()
    
    job_requirements = []
    if requirements_path:
        requirements_path = Path(requirements_path)
        if requirements_path.exists():
            with open(requirements_path, 'r', encoding='utf-8') as f:
                job_requirements = json.load(f)
    
    print("Running evaluation...")
    
    try:
        result = run_full_evaluation(resume_text, job_requirements)
        db = get_database()
        db.log_analytics("cli_evaluation", details={"evaluation_id": result.get("evaluation_id")})
        
        final = result.get("final_scoring", {}).get("hiring_index", {})
        
        print("\n" + "=" * 60)
        print("  EVALUATION COMPLETE")
        print("=" * 60)
        print(f"  Hiring Index: {final.get('overall_score', 0)}/100")
        print(f"  Grade: {final.get('grade', 'N/A')}")
        print(f"  Tier: {final.get('tier', 'N/A')}")
        print("=" * 60)
        
        if output_path:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, default=str)
            print(f"\nResults saved to: {output_path}")
        
        return 0
    except Exception as e:
        print(f"Error during evaluation: {e}")
        return 1


def run_gui():
    """Launch GUI application"""
    try:
        load_embedded_public_key()
        
        # Import here after paths are set up
        from ui.main_window import run_application
        return run_application()
    except ImportError as e:
        error_msg = f"Failed to load GUI components.\n\nError: {e}\n\nThis should not happen with the bundled executable.\nPlease contact support@trajectiq.com"
        print(error_msg)
        show_error_dialog("Startup Error", error_msg)
        return 1
    except Exception as e:
        error_msg = f"Error starting application: {e}"
        print(error_msg)
        show_error_dialog("Startup Error", error_msg)
        return 1


def main():
    """Main entry point"""
    try:
        return run_cli()
    except KeyboardInterrupt:
        print("\nOperation cancelled.")
        return 130
    except Exception as e:
        error_msg = f"Fatal error: {e}"
        print(error_msg)
        show_error_dialog("Fatal Error", error_msg)
        return 1


if __name__ == "__main__":
    sys.exit(main())
