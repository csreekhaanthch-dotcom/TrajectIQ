"""
TrajectIQ Multi-factor Deterministic Scoring Engine
===================================================
Combines all evaluation factors into a comprehensive score.
Fully explainable and auditable scoring system.
"""

import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from core.base_module import BaseModule, ModuleRegistry
from core.config import config


@ModuleRegistry.register
class ScoringEngine(BaseModule):
    """
    Multi-factor deterministic scoring engine.
    Combines skill, impact, trajectory, and AI detection scores.
    Produces explainable, auditable final scores.
    """
    
    module_name = "scoring_engine"
    version = "1.0.0"
    
    # Default weights
    DEFAULT_WEIGHTS = {
        "skills": 0.35,
        "impact": 0.25,
        "trajectory": 0.25,
        "experience": 0.15
    }
    
    # Grade thresholds
    GRADE_THRESHOLDS = {
        "A+": 95,
        "A": 90,
        "A-": 85,
        "B+": 80,
        "B": 75,
        "B-": 70,
        "C+": 65,
        "C": 60,
        "C-": 55,
        "D": 50,
        "F": 0
    }
    
    # Tier definitions
    TIER_THRESHOLDS = {
        "tier_1_top_candidate": 85,
        "tier_2_strong_candidate": 75,
        "tier_3_qualified": 60,
        "tier_4_consider": 45,
        "tier_5_not_recommended": 0
    }
    
    def validate_input(self, input_data: Dict[str, Any]) -> bool:
        """Validate input against schema"""
        if "candidate_id" not in input_data:
            raise ValueError("Missing required field: candidate_id")
        
        if "job_id" not in input_data:
            raise ValueError("Missing required field: job_id")
        
        if "evaluation_results" not in input_data:
            raise ValueError("Missing required field: evaluation_results")
        
        results = input_data["evaluation_results"]
        
        required_modules = ["skill_evaluation", "impact_evaluation", "trajectory_analysis"]
        for module in required_modules:
            if module not in results:
                raise ValueError(f"Missing required evaluation result: {module}")
        
        return True
    
    def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process comprehensive scoring"""
        
        candidate_id = input_data["candidate_id"]
        job_id = input_data["job_id"]
        evaluation_results = input_data["evaluation_results"]
        scoring_config = input_data.get("scoring_config", {})
        
        # Get weights
        weights = scoring_config.get("weight_overrides", self.DEFAULT_WEIGHTS)
        
        # Extract scores from evaluations
        skill_result = evaluation_results.get("skill_evaluation", {})
        impact_result = evaluation_results.get("impact_evaluation", {})
        trajectory_result = evaluation_results.get("trajectory_analysis", {})
        ai_result = evaluation_results.get("ai_detection", {})
        resume_result = evaluation_results.get("resume_parse", {})
        
        # Calculate factor scores
        factor_scores = self._calculate_factor_scores(
            skill_result,
            impact_result,
            trajectory_result,
            ai_result,
            weights
        )
        
        # Calculate final score
        final_score = self._calculate_final_score(factor_scores, weights)
        
        # Generate recommendation
        recommendation = self._generate_recommendation(
            final_score,
            factor_scores,
            skill_result,
            impact_result,
            trajectory_result,
            ai_result
        )
        
        # Check for disqualification
        disqualification_check = self._check_disqualification(
            skill_result,
            trajectory_result,
            scoring_config.get("critical_requirements", [])
        )
        
        # Generate score breakdown
        score_breakdown = self._generate_score_breakdown(
            final_score,
            factor_scores,
            skill_result,
            trajectory_result
        )
        
        return {
            "score_id": self.generate_id("SCORE"),
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "candidate_id": candidate_id,
            "job_id": job_id,
            "final_score": final_score,
            "factor_scores": factor_scores,
            "recommendation": recommendation,
            "disqualification_check": disqualification_check,
            "score_breakdown": score_breakdown,
            "comparative_context": {
                "candidates_evaluated_for_role": None,  # Filled by orchestration
                "rank": None,
                "average_score": None,
                "top_score": None
            },
            "audit_trail": {
                "algorithm_version": self.version,
                "scoring_model": "trajectiq_v1_deterministic",
                "rules_applied": [
                    "weighted_factor_scoring",
                    "critical_skill_requirement_check",
                    "trajectory_bonus",
                    "ai_signal_neutral_assessment"
                ],
                "weight_configuration": weights,
                "data_quality_flags": self._check_data_quality(evaluation_results),
                "explanation_available": True,
                "human_override_possible": True
            }
        }
    
    def _calculate_factor_scores(
        self,
        skill_result: Dict,
        impact_result: Dict,
        trajectory_result: Dict,
        ai_result: Dict,
        weights: Dict
    ) -> Dict:
        """Calculate individual factor scores"""
        
        factor_scores = {}
        
        # Skills factor
        skill_score = skill_result.get("overall_score", {}).get("normalized_score", 0)
        critical_skills_met = skill_result.get("critical_skills_status", {}).get("all_critical_met", True)
        
        factor_scores["skills"] = {
            "score": skill_score,
            "weight": weights.get("skills", 0.35),
            "weighted_contribution": round(skill_score * weights.get("skills", 0.35), 2),
            "critical_skills_met": critical_skills_met,
            "details": {
                "technical_match_score": skill_score,
                "depth_score": skill_result.get("skill_depth_analysis", {}).get("skill_depth_score", 0),
                "breadth_score": skill_result.get("skill_depth_analysis", {}).get("skill_breadth_score", 0)
            }
        }
        
        # Impact factor
        impact_score = impact_result.get("overall_impact_score", {}).get("normalized_score", 0)
        authenticity_confidence = impact_result.get("overall_impact_score", {}).get("confidence", 0.5)
        
        factor_scores["impact"] = {
            "score": impact_score,
            "weight": weights.get("impact", 0.25),
            "weighted_contribution": round(impact_score * weights.get("impact", 0.25), 2),
            "authenticity_confidence": authenticity_confidence,
            "details": {
                "achievement_quality": impact_result.get("impact_patterns", {}).get("high_impact_count", 0) * 20,
                "quantification_score": skill_result.get("skill_depth_analysis", {}).get("skill_depth_score", 50)
            }
        }
        
        # Trajectory factor
        trajectory_score = trajectory_result.get("trajectory_score", {}).get("overall_score", 0)
        trajectory_type = trajectory_result.get("trajectory_score", {}).get("trajectory_type", "unknown")
        
        factor_scores["trajectory"] = {
            "score": trajectory_score,
            "weight": weights.get("trajectory", 0.25),
            "weighted_contribution": round(trajectory_score * weights.get("trajectory", 0.25), 2),
            "trajectory_type": trajectory_type,
            "details": {
                "progression_score": trajectory_result.get("trajectory_score", {}).get("momentum_score", 50),
                "stability_score": trajectory_result.get("stability_indicators", {}).get("stability_score", 50),
                "growth_momentum": trajectory_result.get("trajectory_score", {}).get("momentum_score", 50)
            }
        }
        
        # Experience factor
        total_years = trajectory_result.get("progression_analysis", {}).get("total_experience_years", 0)
        relevant_years = total_years  # Simplified - would calculate relevant in production
        
        experience_score = min(100, total_years * 10)  # 10 points per year, max 100
        
        factor_scores["experience"] = {
            "score": experience_score,
            "weight": weights.get("experience", 0.15),
            "weighted_contribution": round(experience_score * weights.get("experience", 0.15), 2),
            "total_years": total_years,
            "relevant_years": relevant_years
        }
        
        # AI signal (informational only)
        ai_likelihood = ai_result.get("overall_assessment", {}).get("ai_likelihood_score", 0)
        ai_risk = ai_result.get("overall_assessment", {}).get("risk_level", "minimal")
        
        # AI signal impact (neutral - just informational)
        if ai_risk == "high":
            signal_impact = "verify_authenticity_recommended"
            verification_recommended = True
        elif ai_risk == "moderate":
            signal_impact = "verification_advised"
            verification_recommended = True
        else:
            signal_impact = "neutral_to_positive"
            verification_recommended = False
        
        factor_scores["ai_signal"] = {
            "score": 100 - ai_likelihood,  # Inverse - higher AI likelihood = lower authenticity score
            "signal_type": f"{ai_risk}_ai_likelihood",
            "impact_on_overall": signal_impact,
            "verification_recommended": verification_recommended
        }
        
        return factor_scores
    
    def _calculate_final_score(
        self,
        factor_scores: Dict,
        weights: Dict
    ) -> Dict:
        """Calculate final combined score"""
        
        # Calculate weighted sum
        weighted_sum = sum(
            factor["weighted_contribution"]
            for key, factor in factor_scores.items()
            if key != "ai_signal"
        )
        
        # Normalize to 0-100
        normalized_score = round(weighted_sum)
        
        # Apply bonuses/penalties
        base_score = normalized_score
        
        # Critical skills bonus
        if factor_scores["skills"].get("critical_skills_met"):
            base_score += 2
        
        # Strong trajectory bonus
        if factor_scores["trajectory"].get("trajectory_type") in ["strong_upward", "steady_upward"]:
            base_score += 3
        
        # Cap at 100
        normalized_score = min(100, base_score)
        
        # Determine grade
        grade = self._determine_grade(normalized_score)
        
        # Determine tier
        tier = self._determine_tier(normalized_score)
        
        return {
            "raw_score": round(weighted_sum, 2),
            "normalized_score": normalized_score,
            "percentile": None,  # Filled by orchestration
            "grade": grade,
            "tier": tier
        }
    
    def _determine_grade(self, score: int) -> str:
        """Determine letter grade from score"""
        
        for grade, threshold in sorted(self.GRADE_THRESHOLDS.items(), key=lambda x: -x[1]):
            if score >= threshold:
                return grade
        
        return "F"
    
    def _determine_tier(self, score: int) -> str:
        """Determine candidate tier from score"""
        
        for tier, threshold in sorted(self.TIER_THRESHOLDS.items(), key=lambda x: -x[1]):
            if score >= threshold:
                return tier
        
        return "tier_5_not_recommended"
    
    def _generate_recommendation(
        self,
        final_score: Dict,
        factor_scores: Dict,
        skill_result: Dict,
        impact_result: Dict,
        trajectory_result: Dict,
        ai_result: Dict
    ) -> Dict:
        """Generate hiring recommendation"""
        
        score = final_score["normalized_score"]
        tier = final_score["tier"]
        
        # Determine decision
        if score >= 85:
            decision = "strongly_recommend"
            confidence = 0.9
        elif score >= 75:
            decision = "recommend"
            confidence = 0.8
        elif score >= 60:
            decision = "consider"
            confidence = 0.6
        elif score >= 45:
            decision = "weak_consider"
            confidence = 0.4
        else:
            decision = "not_recommended"
            confidence = 0.8
        
        # Adjust confidence based on data quality
        if not skill_result.get("critical_skills_status", {}).get("all_critical_met", True):
            confidence *= 0.7
        
        # Generate summary
        summary = self._generate_summary(
            decision,
            factor_scores,
            skill_result,
            trajectory_result
        )
        
        # Identify key strengths
        key_strengths = self._identify_strengths(factor_scores, skill_result, trajectory_result)
        
        # Identify key concerns
        key_concerns = self._identify_concerns(factor_scores, skill_result, trajectory_result, ai_result)
        
        # Generate interview focus areas
        interview_focus = self._generate_interview_focus(
            factor_scores,
            skill_result,
            ai_result
        )
        
        return {
            "decision": decision,
            "confidence": round(confidence, 2),
            "summary": summary,
            "key_strengths": key_strengths,
            "key_concerns": key_concerns,
            "interview_focus_areas": interview_focus
        }
    
    def _generate_summary(
        self,
        decision: str,
        factor_scores: Dict,
        skill_result: Dict,
        trajectory_result: Dict
    ) -> str:
        """Generate human-readable summary"""
        
        skill_score = factor_scores["skills"]["score"]
        trajectory_type = factor_scores["trajectory"].get("trajectory_type", "unknown")
        critical_met = factor_scores["skills"].get("critical_skills_met", False)
        
        if decision == "strongly_recommend":
            return f"Exceptional candidate with strong technical skills (score: {skill_score}), excellent career trajectory ({trajectory_type}), and clear evidence of impact. All critical skill requirements met. Recommend fast-tracking to final interview stage."
        
        elif decision == "recommend":
            return f"Strong candidate with solid technical skills (score: {skill_score}), good career progression ({trajectory_type}), and quantifiable achievements. {'All critical skill requirements met' if critical_met else 'Most critical skill requirements met'}. Recommend advancing to technical interview stage."
        
        elif decision == "consider":
            return f"Qualified candidate with adequate technical skills (score: {skill_score}) and {'steady' if trajectory_type != 'unknown' else 'developing'} career trajectory. Some gaps to explore during interview process."
        
        elif decision == "weak_consider":
            return f"Marginal candidate with below-average technical skills (score: {skill_score}). Recommend careful evaluation of skill gaps and career trajectory concerns before proceeding."
        
        else:
            return f"Candidate does not meet minimum requirements. Technical skill score ({skill_score}) below threshold. Recommend not proceeding unless exceptional circumstances apply."
    
    def _identify_strengths(
        self,
        factor_scores: Dict,
        skill_result: Dict,
        trajectory_result: Dict
    ) -> List[str]:
        """Identify candidate key strengths"""
        
        strengths = []
        
        # Skills strengths
        if factor_scores["skills"]["score"] >= 80:
            strengths.append(f"Strong technical skill match (score: {factor_scores['skills']['score']})")
        
        if factor_scores["skills"].get("critical_skills_met"):
            strengths.append("All critical skill requirements satisfied")
        
        depth_score = skill_result.get("skill_depth_analysis", {}).get("skill_depth_score", 0)
        if depth_score >= 70:
            strengths.append("Deep expertise in core technical areas")
        
        # Trajectory strengths
        trajectory_type = factor_scores["trajectory"].get("trajectory_type", "")
        if trajectory_type in ["strong_upward", "steady_upward"]:
            strengths.append("Clear upward career trajectory")
        
        if trajectory_result.get("progression_analysis", {}).get("promotions_count", 0) > 0:
            strengths.append("History of career progression and promotions")
        
        # Impact strengths
        if factor_scores["impact"]["score"] >= 75:
            strengths.append("Strong quantifiable achievements with specific metrics")
        
        # Experience strengths
        total_years = factor_scores["experience"].get("total_years", 0)
        if total_years >= 5:
            strengths.append(f"Solid experience base ({total_years} years)")
        
        return strengths
    
    def _identify_concerns(
        self,
        factor_scores: Dict,
        skill_result: Dict,
        trajectory_result: Dict,
        ai_result: Dict
    ) -> List[str]:
        """Identify candidate concerns"""
        
        concerns = []
        
        # Skill concerns
        if not factor_scores["skills"].get("critical_skills_met", True):
            unmet = skill_result.get("critical_skills_status", {}).get("unmet_critical_skills", [])
            if unmet:
                concerns.append(f"Missing critical skills: {', '.join(unmet[:3])}")
        
        skill_gaps = skill_result.get("skill_gaps", [])
        if skill_gaps:
            gap_skills = [g["skill"] for g in skill_gaps[:3]]
            concerns.append(f"Skill gaps identified: {', '.join(gap_skills)}")
        
        # Trajectory concerns
        job_hopping_risk = trajectory_result.get("stability_indicators", {}).get("job_hopping_risk", "low")
        if job_hopping_risk in ["high", "very_high"]:
            concerns.append(f"High job-hopping risk detected ({job_hopping_risk})")
        
        backward_moves = trajectory_result.get("progression_analysis", {}).get("backward_moves_count", 0)
        if backward_moves > 0:
            concerns.append(f"Career regression detected ({backward_moves} backward moves)")
        
        # AI detection concerns
        ai_risk = ai_result.get("overall_assessment", {}).get("risk_level", "minimal")
        if ai_risk in ["moderate", "high"]:
            concerns.append("Resume may benefit from authenticity verification")
        
        return concerns
    
    def _generate_interview_focus(
        self,
        factor_scores: Dict,
        skill_result: Dict,
        ai_result: Dict
    ) -> List[str]:
        """Generate interview focus areas"""
        
        focus_areas = []
        
        # Skill verification
        skill_gaps = skill_result.get("skill_gaps", [])
        for gap in skill_gaps[:2]:
            skill = gap.get("skill", "")
            if skill:
                focus_areas.append(f"Assess {skill} knowledge through technical questions")
        
        # Critical skills deep dive
        if factor_scores["skills"].get("critical_skills_met"):
            critical_skills = skill_result.get("critical_skills_status", {}).get("critical_skills_details", [])
            for cs in critical_skills[:2]:
                if cs.get("met"):
                    focus_areas.append(f"Verify depth of {cs.get('skill')} experience")
        
        # AI verification
        ai_risk = ai_result.get("overall_assessment", {}).get("risk_level", "minimal")
        if ai_risk in ["moderate", "high"]:
            focus_areas.extend([
                "Verify specific achievement claims with detailed follow-up questions",
                "Assess depth of technical knowledge through scenario-based questions"
            ])
        
        # Default focus areas
        if not focus_areas:
            focus_areas.extend([
                "Verify key technical competencies",
                "Explore leadership and collaboration experience"
            ])
        
        return focus_areas[:5]  # Limit to 5 focus areas
    
    def _check_disqualification(
        self,
        skill_result: Dict,
        trajectory_result: Dict,
        critical_requirements: List
    ) -> Dict:
        """Check for disqualification criteria"""
        
        is_disqualified = False
        disqualification_reasons = []
        warning_flags = []
        
        # Check critical skills
        if not skill_result.get("critical_skills_status", {}).get("all_critical_met", True):
            unmet = skill_result.get("critical_skills_status", {}).get("unmet_critical_skills", [])
            
            # Check if any are "must-have"
            for req in critical_requirements:
                if req.get("is_must_have") and req.get("requirement_type") == "skill":
                    if req.get("name") in unmet:
                        is_disqualified = True
                        disqualification_reasons.append({
                            "reason": "missing_critical_skill",
                            "factor": "skills",
                            "threshold": req.get("threshold"),
                            "actual": 0
                        })
        
        # Check stability issues
        job_hopping_risk = trajectory_result.get("stability_indicators", {}).get("job_hopping_risk", "low")
        if job_hopping_risk == "very_high":
            warning_flags.append({
                "flag": "extreme_job_hopping",
                "severity": "warning",
                "recommendation": "Discuss career stability expectations during interview"
            })
        
        return {
            "is_disqualified": is_disqualified,
            "disqualification_reasons": disqualification_reasons,
            "warning_flags": warning_flags
        }
    
    def _generate_score_breakdown(
        self,
        final_score: Dict,
        factor_scores: Dict,
        skill_result: Dict,
        trajectory_result: Dict
    ) -> Dict:
        """Generate detailed score breakdown"""
        
        bonuses = []
        penalties = []
        
        # Calculate base score (before adjustments)
        base_score = sum(
            factor["weighted_contribution"]
            for key, factor in factor_scores.items()
            if key != "ai_signal"
        )
        
        # Identify bonuses
        if factor_scores["skills"].get("critical_skills_met"):
            bonuses.append({
                "bonus_type": "critical_skills_met",
                "points": 2.0,
                "reason": "All critical skill requirements satisfied"
            })
        
        if factor_scores["trajectory"].get("trajectory_type") in ["strong_upward", "steady_upward"]:
            bonuses.append({
                "bonus_type": "strong_trajectory",
                "points": 3.0,
                "reason": "Steady upward career trajectory"
            })
        
        if skill_result.get("skill_depth_analysis", {}).get("skill_depth_score", 0) >= 80:
            bonuses.append({
                "bonus_type": "deep_expertise",
                "points": 2.0,
                "reason": "Expert-level knowledge in key skills"
            })
        
        # Identify penalties
        if trajectory_result.get("progression_analysis", {}).get("backward_moves_count", 0) > 0:
            penalties.append({
                "penalty_type": "career_regression",
                "points": -2.0,
                "reason": "Backward career moves detected"
            })
        
        if trajectory_result.get("stability_indicators", {}).get("job_hopping_risk", "low") in ["high", "very_high"]:
            penalties.append({
                "penalty_type": "stability_concern",
                "points": -3.0,
                "reason": "High job-hopping risk"
            })
        
        # Calculate final adjusted score
        bonus_total = sum(b["points"] for b in bonuses)
        penalty_total = sum(p["points"] for p in penalties)
        final_adjusted = base_score + bonus_total + penalty_total
        
        return {
            "base_score": round(base_score, 2),
            "bonuses_applied": bonuses,
            "penalties_applied": penalties,
            "final_adjusted_score": round(min(100, max(0, final_adjusted)), 2)
        }
    
    def _check_data_quality(self, evaluation_results: Dict) -> List[str]:
        """Check for data quality issues"""
        
        flags = []
        
        # Check for missing evaluations
        required_modules = ["skill_evaluation", "impact_evaluation", "trajectory_analysis"]
        for module in required_modules:
            if not evaluation_results.get(module):
                flags.append(f"missing_{module}")
        
        # Check for low confidence
        impact_confidence = evaluation_results.get("impact_evaluation", {}).get(
            "overall_impact_score", {}
        ).get("confidence", 1.0)
        
        if impact_confidence < 0.5:
            flags.append("low_impact_confidence")
        
        return flags
