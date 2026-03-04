#!/usr/bin/env python3
"""
TrajectIQ Performance Benchmarks
================================
Comprehensive performance testing for the scoring engine.

Usage:
    python benchmarks/run_benchmarks.py [--resumes N] [--output DIR]
"""

import sys
import os
import time
import json
import random
import argparse
import statistics
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

# Import scoring engine components
try:
    from modules.scoring_engine import (
        run_full_evaluation,
        calculate_sdi,
        calculate_csig,
        calculate_iae,
        calculate_cta,
        calculate_err
    )
    from modules.bias_detection import BiasDetector
    SCORING_AVAILABLE = True
except ImportError:
    SCORING_AVAILABLE = False
    print("Warning: Scoring engine not available, using mock data")


@dataclass
class BenchmarkResult:
    """Benchmark result data"""
    name: str
    iterations: int
    total_time: float
    avg_time: float
    min_time: float
    max_time: float
    std_dev: float
    ops_per_second: float
    timestamp: str


@dataclass
class ResumeData:
    """Mock resume data for benchmarking"""
    skills: List[str]
    experience_years: float
    education_level: str
    certifications: List[str]
    job_history: List[Dict[str, Any]]
    location: str


# Sample data pools for realistic testing
SKILLS_POOL = [
    "Python", "JavaScript", "Java", "C++", "Go", "Rust", "TypeScript",
    "React", "Angular", "Vue", "Node.js", "Django", "Flask", "FastAPI",
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform",
    "PostgreSQL", "MongoDB", "Redis", "Elasticsearch", "Kafka",
    "Machine Learning", "Deep Learning", "NLP", "Computer Vision",
    "Data Science", "Data Engineering", "ETL", "Airflow",
    "Git", "CI/CD", "Agile", "Scrum", "Leadership", "Communication",
    "Project Management", "System Design", "Microservices", "REST API",
    "GraphQL", "OAuth", "Security", "Testing", "DevOps"
]

EDUCATION_LEVELS = ["High School", "Associate", "Bachelor", "Master", "PhD"]

CERTIFICATIONS_POOL = [
    "AWS Solutions Architect", "AWS DevOps Engineer", "Azure Administrator",
    "Google Cloud Professional", "Kubernetes Administrator (CKA)",
    "Certified Scrum Master", "PMP", "CISSP", "CEH", "CompTIA Security+",
    "Cisco CCNA", "MongoDB Developer", "PostgreSQL DBA", "Terraform Associate"
]

LOCATIONS = [
    "San Francisco, CA", "New York, NY", "Seattle, WA", "Austin, TX",
    "Boston, MA", "Denver, CO", "Chicago, IL", "Los Angeles, CA",
    "Remote - US", "Remote - Global", "London, UK", "Berlin, Germany",
    "Toronto, Canada", "Sydney, Australia", "Singapore"
]

COMPANIES = [
    "Google", "Microsoft", "Amazon", "Apple", "Meta", "Netflix",
    "Uber", "Airbnb", "Stripe", "Square", "Shopify", "Twitter",
    "LinkedIn", "Salesforce", "Adobe", "Oracle", "IBM", "Intel",
    "Startup Inc.", "Tech Corp", "Data Solutions LLC", "Cloud Systems"
]


def generate_resume() -> ResumeData:
    """Generate a random resume for testing"""
    num_skills = random.randint(5, 20)
    num_certs = random.randint(0, 5)
    num_jobs = random.randint(1, 6)

    job_history = []
    for i in range(num_jobs):
        job_history.append({
            "company": random.choice(COMPANIES),
            "title": random.choice(["Engineer", "Senior Engineer", "Lead", "Manager", "Director"]),
            "duration_years": round(random.uniform(0.5, 5.0), 1),
            "description": "Software development and system design"
        })

    return ResumeData(
        skills=random.sample(SKILLS_POOL, min(num_skills, len(SKILLS_POOL))),
        experience_years=round(random.uniform(0, 20), 1),
        education_level=random.choice(EDUCATION_LEVELS),
        certifications=random.sample(CERTIFICATIONS_POOL, min(num_certs, len(CERTIFICATIONS_POOL))),
        job_history=job_history,
        location=random.choice(LOCATIONS)
    )


def generate_job_description() -> Dict[str, Any]:
    """Generate a job description for matching"""
    return {
        "required_skills": random.sample(SKILLS_POOL, random.randint(5, 10)),
        "preferred_skills": random.sample(SKILLS_POOL, random.randint(3, 7)),
        "min_experience_years": random.randint(0, 8),
        "education_requirement": random.choice(EDUCATION_LEVELS),
        "preferred_certifications": random.sample(CERTIFICATIONS_POOL, random.randint(0, 3)),
        "location": random.choice(LOCATIONS),
        "remote_friendly": random.choice([True, False]),
        "title": "Senior Software Engineer",
        "department": "Engineering"
    }


def run_benchmark(
    name: str,
    func: callable,
    iterations: int,
    *args,
    **kwargs
) -> BenchmarkResult:
    """Run a benchmark and return results"""
    times = []

    print(f"Running benchmark: {name} ({iterations} iterations)...")

    for i in range(iterations):
        start = time.perf_counter()
        func(*args, **kwargs)
        end = time.perf_counter()
        times.append(end - start)

        if (i + 1) % 100 == 0:
            print(f"  Progress: {i + 1}/{iterations}")

    total_time = sum(times)
    avg_time = statistics.mean(times)
    min_time = min(times)
    max_time = max(times)
    std_dev = statistics.stdev(times) if len(times) > 1 else 0
    ops_per_second = 1 / avg_time if avg_time > 0 else 0

    return BenchmarkResult(
        name=name,
        iterations=iterations,
        total_time=round(total_time, 4),
        avg_time=round(avg_time, 6),
        min_time=round(min_time, 6),
        max_time=round(max_time, 6),
        std_dev=round(std_dev, 6),
        ops_per_second=round(ops_per_second, 2),
        timestamp=datetime.now().isoformat()
    )


def mock_scoring_evaluation(resume: ResumeData, job: Dict) -> Dict[str, float]:
    """Mock scoring when real engine isn't available"""
    return {
        "sdi": round(random.uniform(0.3, 0.95), 3),
        "csig": round(random.uniform(0.4, 0.92), 3),
        "iae": round(random.uniform(0.2, 0.88), 3),
        "cta": round(random.uniform(0.3, 0.85), 3),
        "err": round(random.uniform(0.5, 0.98), 3),
        "overall": round(random.uniform(0.4, 0.9), 3)
    }


def run_all_benchmarks(num_resumes: int = 1000, output_dir: str = "results") -> List[BenchmarkResult]:
    """Run all benchmarks and save results"""
    results = []

    # Create output directory
    output_path = Path(__file__).parent / output_dir
    output_path.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("TrajectIQ Performance Benchmarks")
    print(f"Resumes: {num_resumes}")
    print("=" * 60)

    # Generate test data
    print("\nGenerating test data...")
    resumes = [generate_resume() for _ in range(num_resumes)]
    jobs = [generate_job_description() for _ in range(10)]  # 10 job descriptions

    # Benchmark 1: Single resume scoring
    if SCORING_AVAILABLE:
        def score_single():
            resume = random.choice(resumes)
            job = random.choice(jobs)
            resume_dict = asdict(resume)
            return run_full_evaluation(resume_dict, job)
    else:
        def score_single():
            return mock_scoring_evaluation(random.choice(resumes), random.choice(jobs))

    results.append(run_benchmark(
        "single_resume_scoring",
        score_single,
        min(1000, num_resumes)
    ))

    # Benchmark 2: Batch scoring (100 resumes)
    def score_batch_100():
        batch_resumes = random.sample(resumes, min(100, len(resumes)))
        job = random.choice(jobs)
        for resume in batch_resumes:
            if SCORING_AVAILABLE:
                run_full_evaluation(asdict(resume), job)
            else:
                mock_scoring_evaluation(resume, job)

    results.append(run_benchmark(
        "batch_scoring_100",
        score_batch_100,
        max(10, num_resumes // 100)
    ))

    # Benchmark 3: Full pipeline (1000 resumes)
    def score_batch_1000():
        job = random.choice(jobs)
        for resume in resumes[:min(1000, len(resumes))]:
            if SCORING_AVAILABLE:
                run_full_evaluation(asdict(resume), job)
            else:
                mock_scoring_evaluation(resume, job)

    results.append(run_benchmark(
        "full_pipeline_1000",
        score_batch_1000,
        5
    ))

    # Benchmark 4: Resume parsing (mock)
    def parse_resume():
        return asdict(random.choice(resumes))

    results.append(run_benchmark(
        "resume_parsing",
        parse_resume,
        min(5000, num_resumes * 5)
    ))

    # Benchmark 5: Bias detection
    if SCORING_AVAILABLE:
        detector = BiasDetector()

        def detect_bias():
            resume = random.choice(resumes)
            return detector.detect_bias(asdict(resume))
    else:
        def detect_bias():
            return {"bias_detected": random.choice([True, False])}

    results.append(run_benchmark(
        "bias_detection",
        detect_bias,
        min(1000, num_resumes)
    ))

    # Save results
    results_file = output_path / f"benchmark_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    results_data = {
        "metadata": {
            "num_resumes": num_resumes,
            "scoring_engine": SCORING_AVAILABLE,
            "python_version": sys.version,
            "timestamp": datetime.now().isoformat()
        },
        "results": [asdict(r) for r in results]
    }

    with open(results_file, 'w') as f:
        json.dump(results_data, f, indent=2)

    print(f"\nResults saved to: {results_file}")

    # Print summary
    print("\n" + "=" * 60)
    print("BENCHMARK SUMMARY")
    print("=" * 60)
    print(f"{'Benchmark':<30} {'Avg Time':>12} {'Ops/sec':>12}")
    print("-" * 60)
    for r in results:
        print(f"{r.name:<30} {r.avg_time*1000:>10.2f}ms {r.ops_per_second:>12.0f}")
    print("=" * 60)

    return results


def main():
    parser = argparse.ArgumentParser(description="TrajectIQ Performance Benchmarks")
    parser.add_argument(
        "--resumes", "-n",
        type=int,
        default=1000,
        help="Number of resumes for testing (default: 1000)"
    )
    parser.add_argument(
        "--output", "-o",
        type=str,
        default="results",
        help="Output directory for results"
    )
    args = parser.parse_args()

    run_all_benchmarks(args.resumes, args.output)


if __name__ == "__main__":
    main()
