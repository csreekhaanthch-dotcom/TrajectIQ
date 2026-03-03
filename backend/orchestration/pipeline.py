"""
TrajectIQ Orchestration Pipeline
================================
Main orchestration for running the complete evaluation pipeline.
Coordinates all modules and manages data flow.
"""

import json
import asyncio
import time
from datetime import datetime
from typing import Any, Dict, List, Optional
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import config
from core.logger import get_logger, log_audit
from core.database import DatabaseManager
from modules.resume_parser import ResumeParser
from modules.skill_evaluator import SkillEvaluator
from modules.impact_scorer import ImpactScorer
from modules.trajectory_analyzer import TrajectoryAnalyzer
from modules.ai_detector import AIDetector
from modules.scoring_engine import ScoringEngine


class TrajectIQPipeline:
    """
    Main orchestration pipeline for TrajectIQ.
    Coordinates all evaluation modules in sequence.
    """
    
    def __init__(self, ollama_client: Optional[Any] = None):
        """
        Initialize the pipeline with all modules.
        
        Args:
            ollama_client: Optional Ollama client for LLM operations
        """
        self.logger = get_logger("trajectiq.pipeline")
        self.db = DatabaseManager()
        
        # Initialize modules
        self.resume_parser = ResumeParser(ollama_client)
        self.skill_evaluator = SkillEvaluator(ollama_client)
        self.impact_scorer = ImpactScorer(ollama_client)
        self.trajectory_analyzer = TrajectoryAnalyzer(ollama_client)
        self.ai_detector = AIDetector(ollama_client)
        self.scoring_engine = ScoringEngine(ollama_client)
        
        self.ollama_client = ollama_client
    
    def evaluate_candidate(
        self,
        resume_path: str,
        job_requirements: Dict[str, Any],
        candidate_id: Optional[str] = None,
        job_id: Optional[str] = None,
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Run complete evaluation pipeline for a candidate.
        
        Args:
            resume_path: Path to resume file
            job_requirements: Job requirements dictionary
            candidate_id: Optional candidate ID
            job_id: Optional job ID
            options: Optional pipeline options
            
        Returns:
            Complete evaluation results
        """
        start_time = time.time()
        options = options or {}
        
        self.logger.info(f"Starting evaluation for candidate: {candidate_id or 'new'}")
        
        # Generate IDs if not provided
        candidate_id = candidate_id or f"CAND-{int(time.time())}"
        job_id = job_id or job_requirements.get("job_id", f"JOB-{int(time.time())}")
        
        results = {
            "candidate_id": candidate_id,
            "job_id": job_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "status": "processing",
            "modules_completed": [],
            "errors": []
        }
        
        try:
            # Step 1: Parse Resume
            self.logger.info("Step 1: Parsing resume...")
            resume_result = self._parse_resume(resume_path, candidate_id, job_id)
            results["resume_parse"] = resume_result
            
            if resume_result.get("status") != "success":
                results["errors"].append("Resume parsing failed")
                results["status"] = "partial"
                return results
            
            results["modules_completed"].append("resume_parser")
            
            # Extract candidate info for database
            candidate_info = resume_result.get("candidate_info", {})
            self.db.save_candidate({
                "candidate_id": candidate_id,
                "full_name": candidate_info.get("full_name"),
                "email": candidate_info.get("email"),
                "phone": candidate_info.get("phone"),
                "location": candidate_info.get("location"),
                "raw_resume_data": resume_result
            })
            
            # Save job requirements
            self.db.save_job({
                "job_id": job_id,
                **job_requirements
            })
            
            # Step 2: Skill Evaluation
            self.logger.info("Step 2: Evaluating skills...")
            skill_result = self._evaluate_skills(
                resume_result,
                job_requirements,
                candidate_id,
                job_id
            )
            results["skill_evaluation"] = skill_result
            results["modules_completed"].append("skill_evaluator")
            self.db.save_evaluation(skill_result)
            
            # Step 3: Impact Scoring
            self.logger.info("Step 3: Scoring impact...")
            impact_result = self._score_impact(
                resume_result,
                candidate_id,
                job_id
            )
            results["impact_evaluation"] = impact_result
            results["modules_completed"].append("impact_scorer")
            self.db.save_evaluation(impact_result)
            
            # Step 4: Trajectory Analysis
            self.logger.info("Step 4: Analyzing trajectory...")
            trajectory_result = self._analyze_trajectory(
                resume_result,
                candidate_id,
                job_id,
                job_requirements
            )
            results["trajectory_analysis"] = trajectory_result
            results["modules_completed"].append("trajectory_analyzer")
            self.db.save_evaluation(trajectory_result)
            
            # Step 5: AI Detection (optional, based on config)
            if config.enable_ai_detection:
                self.logger.info("Step 5: Detecting AI assistance...")
                ai_result = self._detect_ai(
                    resume_result,
                    candidate_id
                )
                results["ai_detection"] = ai_result
                results["modules_completed"].append("ai_detector")
                self.db.save_evaluation(ai_result)
            
            # Step 6: Final Scoring
            self.logger.info("Step 6: Computing final score...")
            final_score = self._compute_final_score(
                results,
                candidate_id,
                job_id,
                options.get("scoring_config", {})
            )
            results["final_scoring"] = final_score
            results["modules_completed"].append("scoring_engine")
            self.db.save_final_score(final_score)
            
            # Update status
            results["status"] = "complete"
            
            # Log completion
            execution_time = (time.time() - start_time) * 1000
            results["execution_time_ms"] = round(execution_time, 2)
            
            log_audit(
                action="pipeline_complete",
                module="pipeline",
                candidate_id=candidate_id,
                job_id=job_id,
                details={
                    "status": "complete",
                    "modules_completed": results["modules_completed"],
                    "execution_time_ms": execution_time,
                    "final_score": final_score.get("final_score", {}).get("normalized_score")
                }
            )
            
            self.logger.info(
                f"Evaluation complete for {candidate_id}. "
                f"Score: {final_score.get('final_score', {}).get('normalized_score')}, "
                f"Time: {execution_time:.0f}ms"
            )
            
        except Exception as e:
            results["status"] = "error"
            results["errors"].append(str(e))
            
            self.logger.error(f"Pipeline error for {candidate_id}: {str(e)}")
            
            log_audit(
                action="pipeline_error",
                module="pipeline",
                candidate_id=candidate_id,
                job_id=job_id,
                details={"error": str(e)}
            )
        
        return results
    
    def _parse_resume(
        self,
        resume_path: str,
        candidate_id: str,
        job_id: str
    ) -> Dict[str, Any]:
        """Parse resume file"""
        
        input_data = {
            "source_type": "file_path",
            "content": resume_path,
            "file_extension": Path(resume_path).suffix.lstrip("."),
            "metadata": {
                "candidate_id": candidate_id,
                "job_id": job_id
            }
        }
        
        return self.resume_parser.execute(input_data)
    
    def _evaluate_skills(
        self,
        resume_result: Dict,
        job_requirements: Dict,
        candidate_id: str,
        job_id: str
    ) -> Dict[str, Any]:
        """Evaluate skills against job requirements"""
        
        input_data = {
            "candidate_id": candidate_id,
            "candidate_skills": {
                "technical": resume_result.get("skills", {}).get("technical", []),
                "soft_skills": resume_result.get("skills", {}).get("soft_skills", [])
            },
            "job_requirements": job_requirements
        }
        
        return self.skill_evaluator.execute(input_data)
    
    def _score_impact(
        self,
        resume_result: Dict,
        candidate_id: str,
        job_id: str
    ) -> Dict[str, Any]:
        """Score impact of achievements"""
        
        # Extract achievements from experience
        achievements = []
        
        for exp in resume_result.get("experience", []):
            for achievement in exp.get("achievements", []):
                achievements.append({
                    "text": achievement.get("text", ""),
                    "context": {
                        "company": exp.get("company"),
                        "role": exp.get("title"),
                        "company_stage": "unknown"
                    },
                    "claimed_metrics": achievement.get("metrics", [])
                })
        
        # Add summary as achievement if present
        summary = resume_result.get("candidate_info", {}).get("summary", "")
        if summary:
            achievements.append({
                "text": summary,
                "context": {"company": "", "role": ""},
                "claimed_metrics": []
            })
        
        input_data = {
            "candidate_id": candidate_id,
            "achievements": achievements
        }
        
        return self.impact_scorer.execute(input_data)
    
    def _analyze_trajectory(
        self,
        resume_result: Dict,
        candidate_id: str,
        job_id: str,
        job_requirements: Dict
    ) -> Dict[str, Any]:
        """Analyze career trajectory"""
        
        input_data = {
            "candidate_id": candidate_id,
            "work_history": resume_result.get("experience", []),
            "education_history": resume_result.get("education", []),
            "analysis_config": {
                "target_role": job_requirements.get("job_title", ""),
                "target_level": self._infer_target_level(job_requirements),
                "industry_focus": job_requirements.get("industry", "")
            }
        }
        
        return self.trajectory_analyzer.execute(input_data)
    
    def _detect_ai(
        self,
        resume_result: Dict,
        candidate_id: str
    ) -> Dict[str, Any]:
        """Detect AI assistance in resume"""
        
        # Build full text from resume
        text_parts = []
        
        if resume_result.get("candidate_info", {}).get("summary"):
            text_parts.append(resume_result["candidate_info"]["summary"])
        
        for exp in resume_result.get("experience", []):
            if exp.get("description"):
                text_parts.append(exp["description"])
            for ach in exp.get("achievements", []):
                if ach.get("text"):
                    text_parts.append(ach["text"])
        
        full_text = " ".join(text_parts)
        
        input_data = {
            "candidate_id": candidate_id,
            "text_content": {
                "full_text": full_text,
                "sections": {
                    "summary": resume_result.get("candidate_info", {}).get("summary", ""),
                    "experience": " ".join(
                        exp.get("description", "") for exp in resume_result.get("experience", [])
                    )
                }
            }
        }
        
        return self.ai_detector.execute(input_data)
    
    def _compute_final_score(
        self,
        results: Dict,
        candidate_id: str,
        job_id: str,
        scoring_config: Dict
    ) -> Dict[str, Any]:
        """Compute final multi-factor score"""
        
        input_data = {
            "candidate_id": candidate_id,
            "job_id": job_id,
            "evaluation_results": {
                "resume_parse": results.get("resume_parse", {}),
                "skill_evaluation": results.get("skill_evaluation", {}),
                "impact_evaluation": results.get("impact_evaluation", {}),
                "trajectory_analysis": results.get("trajectory_analysis", {}),
                "ai_detection": results.get("ai_detection", {})
            },
            "scoring_config": scoring_config
        }
        
        return self.scoring_engine.execute(input_data)
    
    def _infer_target_level(self, job_requirements: Dict) -> str:
        """Infer target job level from requirements"""
        
        title = job_requirements.get("job_title", "").lower()
        
        if "senior" in title or "lead" in title:
            return "senior"
        elif "staff" in title or "principal" in title:
            return "lead"
        elif "manager" in title or "director" in title:
            return "manager"
        elif "junior" in title or "entry" in title:
            return "junior"
        else:
            return "mid"
    
    def batch_evaluate(
        self,
        resume_paths: List[str],
        job_requirements: Dict[str, Any],
        parallel: bool = True,
        max_workers: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Evaluate multiple candidates.
        
        Args:
            resume_paths: List of resume file paths
            job_requirements: Job requirements
            parallel: Run evaluations in parallel
            max_workers: Maximum parallel workers
            
        Returns:
            List of evaluation results
        """
        results = []
        
        if parallel:
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = []
                
                for resume_path in resume_paths:
                    future = executor.submit(
                        self.evaluate_candidate,
                        resume_path,
                        job_requirements
                    )
                    futures.append(future)
                
                for future in futures:
                    try:
                        result = future.result(timeout=300)
                        results.append(result)
                    except Exception as e:
                        results.append({
                            "status": "error",
                            "error": str(e)
                        })
        else:
            for resume_path in resume_paths:
                result = self.evaluate_candidate(resume_path, job_requirements)
                results.append(result)
        
        # Update comparative context
        self._update_comparative_context(results, job_requirements.get("job_id"))
        
        return results
    
    def _update_comparative_context(
        self,
        results: List[Dict],
        job_id: str
    ) -> None:
        """Update percentile rankings"""
        
        scores = [
            r.get("final_scoring", {}).get("final_score", {}).get("normalized_score", 0)
            for r in results
            if r.get("status") == "complete"
        ]
        
        if not scores:
            return
        
        scores.sort(reverse=True)
        total = len(scores)
        
        for result in results:
            if result.get("status") != "complete":
                continue
            
            score = result.get("final_scoring", {}).get("final_score", {}).get("normalized_score", 0)
            
            # Calculate percentile
            rank = scores.index(score) + 1 if score in scores else total
            percentile = round((1 - (rank - 1) / total) * 100)
            
            # Update result
            if "final_scoring" in result:
                result["final_scoring"]["final_score"]["percentile"] = percentile
                result["final_scoring"]["comparative_context"] = {
                    "candidates_evaluated_for_role": total,
                    "rank": rank,
                    "average_score": round(sum(scores) / total, 1),
                    "top_score": scores[0]
                }
    
    def get_leaderboard(
        self,
        job_id: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get ranked list of candidates for a job.
        
        Args:
            job_id: Job ID
            limit: Maximum candidates to return
            
        Returns:
            List of candidate summaries ranked by score
        """
        
        scores = self.db.get_final_scores(job_id, limit=limit)
        
        leaderboard = []
        
        for i, score in enumerate(scores):
            candidate = self.db.get_candidate(score["candidate_id"])
            
            leaderboard.append({
                "rank": i + 1,
                "candidate_id": score["candidate_id"],
                "full_name": candidate.get("full_name") if candidate else "",
                "email": candidate.get("email") if candidate else "",
                "normalized_score": score["normalized_score"],
                "grade": score["grade"],
                "tier": score["tier"],
                "recommendation": score["recommendation"],
                "confidence": score["confidence"],
                "evaluated_at": score["created_at"]
            })
        
        return leaderboard


# Convenience function for quick evaluation
def evaluate_resume(
    resume_path: str,
    job_requirements: Dict[str, Any],
    ollama_client: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Convenience function to evaluate a single resume.
    
    Args:
        resume_path: Path to resume file
        job_requirements: Job requirements dictionary
        ollama_client: Optional Ollama client
        
    Returns:
        Complete evaluation results
    """
    pipeline = TrajectIQPipeline(ollama_client)
    return pipeline.evaluate_candidate(resume_path, job_requirements)
