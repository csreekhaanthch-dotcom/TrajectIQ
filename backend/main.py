#!/usr/bin/env python3
"""
TrajectIQ - Intelligence-Driven Hiring Platform
================================================

Main entry point for the TrajectIQ application.
Supports CLI and programmatic usage.
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, Any, Optional, List

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from core.config import config
from core.logger import get_logger
from orchestration.pipeline import TrajectIQPipeline


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="TrajectIQ - Intelligence-Driven Hiring Platform",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Evaluate a single resume
  python main.py evaluate --resume /path/to/resume.pdf --job job_requirements.json

  # Batch evaluate multiple resumes
  python main.py batch --resumes /path/to/resumes/ --job job_requirements.json

  # Get leaderboard for a job
  python main.py leaderboard --job-id JOB-2024-001

  # Start API server
  python main.py serve --port 8000

  # Show statistics
  python main.py stats --job-id JOB-2024-001
        """
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Evaluate command
    eval_parser = subparsers.add_parser("evaluate", help="Evaluate a single candidate")
    eval_parser.add_argument("--resume", "-r", required=True, help="Path to resume file (PDF/DOCX)")
    eval_parser.add_argument("--job", "-j", required=True, help="Path to job requirements JSON file")
    eval_parser.add_argument("--candidate-id", "-c", help="Optional candidate ID")
    eval_parser.add_argument("--output", "-o", help="Output file for results (JSON)")
    eval_parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")

    # Batch command
    batch_parser = subparsers.add_parser("batch", help="Batch evaluate multiple candidates")
    batch_parser.add_argument("--resumes", "-r", required=True, help="Path to directory containing resumes")
    batch_parser.add_argument("--job", "-j", required=True, help="Path to job requirements JSON file")
    batch_parser.add_argument("--output", "-o", help="Output file for results (JSON)")
    batch_parser.add_argument("--parallel", "-p", action="store_true", help="Enable parallel processing")
    batch_parser.add_argument("--workers", "-w", type=int, default=4, help="Number of parallel workers")

    # Leaderboard command
    lb_parser = subparsers.add_parser("leaderboard", help="Get candidate leaderboard")
    lb_parser.add_argument("--job-id", "-j", required=True, help="Job ID")
    lb_parser.add_argument("--limit", "-l", type=int, default=50, help="Maximum candidates to show")
    lb_parser.add_argument("--output", "-o", help="Output file (JSON)")

    # Stats command
    stats_parser = subparsers.add_parser("stats", help="Show evaluation statistics")
    stats_parser.add_argument("--job-id", "-j", help="Job ID (optional, shows overall stats if not provided)")

    # Serve command
    serve_parser = subparsers.add_parser("serve", help="Start API server")
    serve_parser.add_argument("--host", "-H", default="0.0.0.0", help="Host to bind to")
    serve_parser.add_argument("--port", "-p", type=int, default=8000, help="Port to bind to")

    # Config command
    config_parser = subparsers.add_parser("config", help="Show or modify configuration")
    config_parser.add_argument("--show", action="store_true", help="Show current configuration")

    return parser.parse_args()


def load_job_requirements(job_path: str) -> Dict[str, Any]:
    """Load job requirements from JSON file."""
    with open(job_path, "r") as f:
        return json.load(f)


def evaluate_single(
    resume_path: str,
    job_path: str,
    candidate_id: Optional[str] = None,
    output_path: Optional[str] = None,
    verbose: bool = False
) -> Dict[str, Any]:
    """Evaluate a single candidate."""
    logger = get_logger("trajectiq.cli")

    # Load job requirements
    job_requirements = load_job_requirements(job_path)

    # Initialize pipeline
    pipeline = TrajectIQPipeline()

    # Run evaluation
    logger.info(f"Evaluating candidate: {resume_path}")

    result = pipeline.evaluate_candidate(
        resume_path=resume_path,
        job_requirements=job_requirements,
        candidate_id=candidate_id
    )

    # Print summary
    if result.get("status") == "complete":
        score = result["final_scoring"]["final_score"]["normalized_score"]
        grade = result["final_scoring"]["final_score"]["grade"]
        recommendation = result["final_scoring"]["recommendation"]["decision"]

        print(f"\n{'='*60}")
        print(f"EVALUATION COMPLETE")
        print(f"{'='*60}")
        print(f"Candidate ID: {result['candidate_id']}")
        print(f"Score: {score}/100")
        print(f"Grade: {grade}")
        print(f"Recommendation: {recommendation.upper()}")
        print(f"{'='*60}\n")

        if verbose:
            print("\nDetailed Results:")
            print(json.dumps(result, indent=2, default=str))
    else:
        print(f"\nEvaluation failed: {result.get('errors', ['Unknown error'])}")

    # Save output if requested
    if output_path:
        with open(output_path, "w") as f:
            json.dump(result, f, indent=2, default=str)
        print(f"Results saved to: {output_path}")

    return result


def batch_evaluate(
    resumes_dir: str,
    job_path: str,
    output_path: Optional[str] = None,
    parallel: bool = False,
    workers: int = 4
) -> List[Dict[str, Any]]:
    """Batch evaluate multiple candidates."""
    logger = get_logger("trajectiq.cli")

    # Load job requirements
    job_requirements = load_job_requirements(job_path)

    # Find all resume files
    resumes_path = Path(resumes_dir)
    resume_files = list(resumes_path.glob("*.pdf")) + list(resumes_path.glob("*.docx"))

    if not resume_files:
        print(f"No resume files found in {resumes_dir}")
        return []

    print(f"Found {len(resume_files)} resume(s) to evaluate")

    # Initialize pipeline
    pipeline = TrajectIQPipeline()

    # Run batch evaluation
    results = pipeline.batch_evaluate(
        resume_paths=[str(f) for f in resume_files],
        job_requirements=job_requirements,
        parallel=parallel,
        max_workers=workers
    )

    # Print summary
    successful = sum(1 for r in results if r.get("status") == "complete")
    print(f"\nCompleted: {successful}/{len(results)} evaluations")

    # Save output if requested
    if output_path:
        with open(output_path, "w") as f:
            json.dump(results, f, indent=2, default=str)
        print(f"Results saved to: {output_path}")

    return results


def show_leaderboard(job_id: str, limit: int = 50, output_path: Optional[str] = None):
    """Show candidate leaderboard for a job."""
    from core.database import DatabaseManager

    db = DatabaseManager()
    leaderboard = db.get_final_scores(job_id, limit=limit)

    print(f"\n{'='*80}")
    print(f"LEADERBOARD: {job_id}")
    print(f"{'='*80}")
    print(f"{'Rank':<6} {'Candidate':<30} {'Score':<8} {'Grade':<6} {'Recommendation':<15}")
    print(f"{'-'*80}")

    for i, entry in enumerate(leaderboard, 1):
        candidate = db.get_candidate(entry["candidate_id"])
        name = candidate.get("full_name", "Unknown") if candidate else "Unknown"
        print(f"{i:<6} {name[:28]:<30} {entry['normalized_score']:<8} {entry['grade']:<6} {entry['recommendation']:<15}")

    print(f"{'='*80}\n")

    if output_path:
        with open(output_path, "w") as f:
            json.dump(leaderboard, f, indent=2, default=str)
        print(f"Results saved to: {output_path}")


def show_stats(job_id: Optional[str] = None):
    """Show evaluation statistics."""
    from core.database import DatabaseManager

    db = DatabaseManager()
    stats = db.get_statistics(job_id)

    print(f"\n{'='*60}")
    print(f"TRAVECTIQ STATISTICS")
    print(f"{'='*60}")

    if job_id:
        print(f"Job ID: {job_id}")

    print(f"Total Candidates: {stats['total_candidates']}")
    print(f"Total Jobs: {stats['total_jobs']}")
    print(f"Total Evaluations: {stats['total_evaluations']}")

    if stats.get('avg_score'):
        print(f"Average Score: {stats['avg_score']:.1f}")

    if stats.get('score_distribution'):
        print(f"\nScore Distribution:")
        for grade, count in sorted(stats['score_distribution'].items()):
            print(f"  {grade}: {count}")

    print(f"{'='*60}\n")


def show_config():
    """Show current configuration."""
    print(f"\n{'='*60}")
    print(f"TRAVECTIQ CONFIGURATION")
    print(f"{'='*60}")
    print(f"Version: {config.version}")
    print(f"Environment: {config.environment}")
    print(f"Log Level: {config.log_level}")
    print(f"\nOllama Configuration:")
    print(f"  Base URL: {config.ollama.base_url}")
    print(f"  Model: {config.ollama.model}")
    print(f"  Temperature: {config.ollama.temperature}")
    print(f"\nScoring Weights:")
    print(f"  Skills: {config.scoring_weights.skills}")
    print(f"  Impact: {config.scoring_weights.impact}")
    print(f"  Trajectory: {config.scoring_weights.trajectory}")
    print(f"  Experience: {config.scoring_weights.experience}")
    print(f"\nThresholds:")
    print(f"  Critical Skill Min Match: {config.thresholds.critical_skill_min_match}")
    print(f"  Job Hopping Max Tenure: {config.thresholds.job_hopping_max_tenure_years} years")
    print(f"{'='*60}\n")


def start_server(host: str, port: int):
    """Start the API server."""
    try:
        import uvicorn
        from api.main import app

        print(f"\nStarting TrajectIQ API server on {host}:{port}")
        uvicorn.run(app, host=host, port=port)
    except ImportError:
        print("Error: uvicorn not installed. Install with: pip install uvicorn fastapi")
        sys.exit(1)


def main():
    """Main entry point."""
    args = parse_args()

    if args.command == "evaluate":
        evaluate_single(
            resume_path=args.resume,
            job_path=args.job,
            candidate_id=args.candidate_id,
            output_path=args.output,
            verbose=args.verbose
        )

    elif args.command == "batch":
        batch_evaluate(
            resumes_dir=args.resumes,
            job_path=args.job,
            output_path=args.output,
            parallel=args.parallel,
            workers=args.workers
        )

    elif args.command == "leaderboard":
        show_leaderboard(
            job_id=args.job_id,
            limit=args.limit,
            output_path=args.output
        )

    elif args.command == "stats":
        show_stats(job_id=args.job_id)

    elif args.command == "serve":
        start_server(host=args.host, port=args.port)

    elif args.command == "config":
        if args.show:
            show_config()
        else:
            print("Use --show to display configuration")

    else:
        print("No command specified. Use --help for usage information.")
        sys.exit(1)


if __name__ == "__main__":
    main()
