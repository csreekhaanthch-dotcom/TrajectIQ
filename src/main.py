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

# Add src to path
src_path = Path(__file__).parent
if str(src_path) not in sys.path:
    sys.path.insert(0, str(src_path))


def show_fingerprint():
    """Display machine fingerprint for license binding"""
    from security.license import MachineFingerprint
    
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
TrajectIQ Enterprise v1.0.0
Intelligence-Driven Hiring Platform

Copyright (c) 2024 TrajectIQ. All rights reserved.

Licensed under the terms of your license agreement.
For support: support@trajectiq.com
""")


def run_cli():
    """Run command-line interface"""
    parser = argparse.ArgumentParser(
        description="TrajectIQ Enterprise - Intelligence-Driven Hiring",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument(
        "--version", "-v",
        action="store_true",
        help="Show version information"
    )
    
    parser.add_argument(
        "--fingerprint",
        action="store_true",
        help="Show machine fingerprint for license binding"
    )
    
    parser.add_argument(
        "--gui",
        action="store_true",
        help="Launch GUI application (default)"
    )
    
    parser.add_argument(
        "--evaluate",
        type=str,
        help="Evaluate a resume file (path to .txt file)"
    )
    
    parser.add_argument(
        "--requirements",
        type=str,
        help="Job requirements JSON file (for --evaluate)"
    )
    
    parser.add_argument(
        "--output",
        type=str,
        help="Output file for evaluation results (JSON)"
    )
    
    args = parser.parse_args()
    
    # Handle version
    if args.version:
        show_version()
        return 0
    
    # Handle fingerprint
    if args.fingerprint:
        show_fingerprint()
        return 0
    
    # Handle CLI evaluation
    if args.evaluate:
        return run_cli_evaluation(args.evaluate, args.requirements, args.output)
    
    # Default: launch GUI
    return run_gui()


def run_cli_evaluation(resume_path: str, requirements_path: Optional[str], output_path: Optional[str]) -> int:
    """Run evaluation from command line"""
    import json
    
    from modules.scoring_engine import run_full_evaluation
    from core.database import get_database
    
    # Check license
    from security.license import get_license_manager, LicenseStatus
    
    lm = get_license_manager()
    status, info = lm.validate_license()
    
    if status != LicenseStatus.VALID:
        print("Error: Valid license required for evaluation.")
        print("Please activate your license using the GUI application.")
        return 1
    
    # Read resume
    resume_path = Path(resume_path)
    if not resume_path.exists():
        print(f"Error: Resume file not found: {resume_path}")
        return 1
    
    with open(resume_path, 'r', encoding='utf-8') as f:
        resume_text = f.read()
    
    # Read requirements
    job_requirements = []
    if requirements_path:
        requirements_path = Path(requirements_path)
        if requirements_path.exists():
            with open(requirements_path, 'r', encoding='utf-8') as f:
                job_requirements = json.load(f)
    
    # Run evaluation
    print("Running evaluation...")
    
    try:
        result = run_full_evaluation(resume_text, job_requirements)
        
        # Log to database
        db = get_database()
        db.log_analytics("cli_evaluation", details={"evaluation_id": result.get("evaluation_id")})
        
        # Output results
        final = result.get("final_scoring", {}).get("hiring_index", {})
        
        print("\n" + "=" * 60)
        print("  EVALUATION COMPLETE")
        print("=" * 60)
        print(f"  Hiring Index: {final.get('overall_score', 0)}/100")
        print(f"  Grade: {final.get('grade', 'N/A')}")
        print(f"  Tier: {final.get('tier', 'N/A')}")
        print(f"  Recommendation: {final.get('recommendation', 'N/A')}")
        print("=" * 60)
        
        if output_path:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, default=str)
            print(f"\nResults saved to: {output_path}")
        else:
            print("\nDetailed Results:")
            print(json.dumps(result, indent=2, default=str))
        
        return 0
        
    except Exception as e:
        print(f"Error during evaluation: {e}")
        return 1


def run_gui():
    """Launch GUI application"""
    try:
        from ui.main_window import run_application
        return run_application()
    except ImportError as e:
        print(f"Error: GUI dependencies not available: {e}")
        print("Please ensure PyQt5 is installed: pip install PyQt5")
        return 1


def main():
    """Main entry point"""
    try:
        return run_cli()
    except KeyboardInterrupt:
        print("\nOperation cancelled.")
        return 130
    except Exception as e:
        print(f"Error: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
