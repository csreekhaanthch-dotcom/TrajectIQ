"""
TrajectIQ Skill Depth & Critical Skill Evaluation Module
========================================================
Evaluates candidate skills against job requirements.
Deterministic scoring with explainable matching.
"""

import json
import re
from datetime import datetime, date
from typing import Any, Dict, List, Optional, Tuple
from difflib import SequenceMatcher

from core.base_module import BaseModule, ModuleRegistry
from core.config import config, PROFICIENCY_LEVELS, SKILL_SYNONYMS


@ModuleRegistry.register
class SkillEvaluator(BaseModule):
    """
    Skill depth and critical skill evaluation module.
    Provides deterministic, explainable skill matching scores.
    """
    
    module_name = "skill_evaluator"
    version = "1.0.0"
    
    def validate_input(self, input_data: Dict[str, Any]) -> bool:
        """Validate input against schema"""
        if "candidate_skills" not in input_data:
            raise ValueError("Missing required field: candidate_skills")
        
        if "job_requirements" not in input_data:
            raise ValueError("Missing required field: job_requirements")
        
        candidate_skills = input_data["candidate_skills"]
        if "technical" not in candidate_skills:
            raise ValueError("Missing technical skills in candidate_skills")
        
        job_requirements = input_data["job_requirements"]
        if "required_skills" not in job_requirements:
            raise ValueError("Missing required_skills in job_requirements")
        
        return True
    
    def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process skill evaluation"""
        
        candidate_id = input_data.get("candidate_id", "")
        job_id = input_data.get("job_requirements", {}).get("job_id", "")
        
        candidate_skills = input_data["candidate_skills"]
        job_requirements = input_data["job_requirements"]
        evaluation_options = input_data.get("evaluation_options", {})
        
        # Get configuration
        proficiency_weights = evaluation_options.get("proficiency_weights", {
            "beginner": 0.25,
            "intermediate": 0.50,
            "advanced": 0.75,
            "expert": 1.0
        })
        
        skill_synonyms = job_requirements.get("skill_synonyms", SKILL_SYNONYMS)
        required_skills = job_requirements["required_skills"]
        preferred_skills = job_requirements.get("preferred_skills", [])
        
        # Evaluate required skills
        skill_matches = []
        critical_skills_status = {
            "all_critical_met": True,
            "critical_skills_count": 0,
            "critical_skills_met_count": 0,
            "unmet_critical_skills": [],
            "critical_skills_details": []
        }
        
        for req_skill in required_skills:
            match_result = self._evaluate_skill_match(
                req_skill,
                candidate_skills.get("technical", []),
                proficiency_weights,
                skill_synonyms
            )
            skill_matches.append(match_result)
            
            # Track critical skills
            if req_skill.get("is_critical", False):
                critical_skills_status["critical_skills_count"] += 1
                
                met = match_result["match_score"] >= config.thresholds.critical_skill_min_match
                
                critical_skills_status["critical_skills_details"].append({
                    "skill": req_skill["name"],
                    "met": met,
                    "match_score": match_result["match_score"]
                })
                
                if met:
                    critical_skills_status["critical_skills_met_count"] += 1
                else:
                    critical_skills_status["all_critical_met"] = False
                    critical_skills_status["unmet_critical_skills"].append(req_skill["name"])
        
        # Calculate overall score
        overall_score = self._calculate_overall_score(skill_matches, critical_skills_status)
        
        # Analyze skill depth
        skill_depth_analysis = self._analyze_skill_depth(candidate_skills.get("technical", []))
        
        # Evaluate preferred skills
        preferred_skills_bonus = self._evaluate_preferred_skills(
            preferred_skills,
            candidate_skills.get("technical", []),
            skill_synonyms
        )
        
        # Identify skill gaps
        skill_gaps = self._identify_skill_gaps(skill_matches)
        
        return {
            "evaluation_id": self.generate_id("SKILL-EVAL"),
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "candidate_id": candidate_id,
            "job_id": job_id,
            "overall_score": overall_score,
            "skill_matches": skill_matches,
            "critical_skills_status": critical_skills_status,
            "skill_depth_analysis": skill_depth_analysis,
            "preferred_skills_bonus": preferred_skills_bonus,
            "skill_gaps": skill_gaps,
            "audit_trail": {
                "algorithm_version": self.version,
                "evaluation_criteria_hash": self.hash_content({
                    "proficiency_weights": proficiency_weights,
                    "critical_threshold": config.thresholds.critical_skill_min_match
                }),
                "scoring_breakdown_visible": True
            }
        }
    
    def _evaluate_skill_match(
        self,
        required_skill: Dict,
        candidate_skills: List[Dict],
        proficiency_weights: Dict,
        skill_synonyms: Dict
    ) -> Dict[str, Any]:
        """Evaluate how well candidate matches a required skill"""
        
        req_name = required_skill["name"].lower()
        req_min_years = required_skill.get("minimum_years", 0)
        req_min_proficiency = required_skill.get("minimum_proficiency", "intermediate")
        weight = required_skill.get("weight", 1.0)
        is_critical = required_skill.get("is_critical", False)
        category = required_skill.get("category", "General")
        
        # Find matching skill
        matched_skill = None
        match_status = "no_match"
        match_type = None
        
        # First try exact match
        for skill in candidate_skills:
            if skill["name"].lower() == req_name:
                matched_skill = skill
                match_status = "exact_match"
                match_type = "exact"
                break
        
        # Try synonym match if no exact match
        if not matched_skill:
            synonyms = skill_synonyms.get(req_name, [])
            synonyms = [s.lower() for s in synonyms]
            synonyms.append(req_name)
            
            for skill in candidate_skills:
                skill_name_lower = skill["name"].lower()
                
                # Check if skill name is a synonym
                if skill_name_lower in synonyms:
                    matched_skill = skill
                    match_status = "synonym_match"
                    match_type = "synonym"
                    break
                
                # Check fuzzy match
                for syn in synonyms:
                    similarity = SequenceMatcher(None, skill_name_lower, syn).ratio()
                    if similarity > 0.85:
                        matched_skill = skill
                        match_status = "synonym_match"
                        match_type = "fuzzy"
                        break
                
                if matched_skill:
                    break
        
        # Calculate match score
        if matched_skill:
            years_exp = matched_skill.get("years_experience") or 0
            proficiency = matched_skill.get("proficiency", "intermediate") or "intermediate"
            
            # Years score (0-1)
            years_score = min(1.0, years_exp / max(req_min_years, 1)) if req_min_years > 0 else 0.8
            
            # Proficiency score
            prof_weight = proficiency_weights.get(proficiency, 0.5)
            req_prof_weight = proficiency_weights.get(req_min_proficiency, 0.5)
            proficiency_score = min(1.0, prof_weight / req_prof_weight) if req_prof_weight > 0 else 1.0
            
            # Recency score (if last_used_date available)
            recency_score = 1.0
            if matched_skill.get("last_used_date"):
                try:
                    last_used = datetime.strptime(matched_skill["last_used_date"], "%Y-%m-%d").date()
                    days_since = (date.today() - last_used).days
                    recency_score = max(0.5, 1.0 - (days_since / 1825))  # Decay over 5 years
                except:
                    pass
            
            # Context score (if context available)
            context_score = 0.9 if matched_skill.get("context") else 0.7
            
            # Overall match score
            match_score = (years_score * 0.35 + proficiency_score * 0.35 + recency_score * 0.15 + context_score * 0.15)
            
            # Check requirements met
            years_met = years_exp >= req_min_years
            proficiency_met = PROFICIENCY_LEVELS.get(proficiency, 0) >= PROFICIENCY_LEVELS.get(req_min_proficiency, 0)
            is_overqualified = years_exp > req_min_years * 1.5 and PROFICIENCY_LEVELS.get(proficiency, 0) > PROFICIENCY_LEVELS.get(req_min_proficiency, 0)
            
            return {
                "required_skill": required_skill["name"],
                "skill_category": category,
                "is_critical": is_critical,
                "weight": weight,
                "match_status": match_status,
                "matched_candidate_skill": matched_skill["name"],
                "match_score": round(match_score, 3),
                "score_breakdown": {
                    "years_score": round(years_score, 3),
                    "proficiency_score": round(proficiency_score, 3),
                    "recency_score": round(recency_score, 3),
                    "context_score": round(context_score, 3)
                },
                "requirements_met": {
                    "years_requirement_met": years_met,
                    "proficiency_requirement_met": proficiency_met,
                    "is_overqualified": is_overqualified
                },
                "explanation": self._generate_match_explanation(
                    required_skill, matched_skill, match_score, years_met, proficiency_met
                )
            }
        else:
            return {
                "required_skill": required_skill["name"],
                "skill_category": category,
                "is_critical": is_critical,
                "weight": weight,
                "match_status": "no_match",
                "matched_candidate_skill": None,
                "match_score": 0.0,
                "score_breakdown": {
                    "years_score": 0.0,
                    "proficiency_score": 0.0,
                    "recency_score": 0.0,
                    "context_score": 0.0
                },
                "requirements_met": {
                    "years_requirement_met": False,
                    "proficiency_requirement_met": False,
                    "is_overqualified": False
                },
                "explanation": f"No {required_skill['name']} experience found in candidate profile."
            }
    
    def _generate_match_explanation(
        self,
        required: Dict,
        matched: Dict,
        match_score: float,
        years_met: bool,
        proficiency_met: bool
    ) -> str:
        """Generate human-readable explanation for skill match"""
        req_name = required["name"]
        req_years = required.get("minimum_years", 0)
        req_prof = required.get("minimum_proficiency", "intermediate")
        
        matched_name = matched["name"]
        matched_years = matched.get("years_experience", 0)
        matched_prof = matched.get("proficiency", "intermediate")
        
        parts = []
        
        if matched_name.lower() != req_name.lower():
            parts.append(f"Candidate's {matched_name} matches required {req_name}")
        else:
            parts.append(f"Candidate has {matched_years} years of {matched_name} experience")
        
        if years_met and proficiency_met:
            if matched_years > req_years * 1.5:
                parts.append(f"exceeding the {req_years}-year {req_prof} requirement.")
            else:
                parts.append(f"meeting the {req_years}-year {req_prof} requirement.")
        elif years_met:
            parts.append(f"meeting years requirement but {matched_prof} level is below {req_prof} requirement.")
        elif proficiency_met:
            parts.append(f"meeting proficiency requirement but {matched_years} years is below {req_years}-year requirement.")
        else:
            parts.append(f"below the {req_years}-year {req_prof} requirement.")
        
        return " ".join(parts)
    
    def _calculate_overall_score(
        self,
        skill_matches: List[Dict],
        critical_skills_status: Dict
    ) -> Dict[str, Any]:
        """Calculate overall skill evaluation score"""
        
        if not skill_matches:
            return {
                "raw_score": 0.0,
                "weighted_score": 0.0,
                "normalized_score": 0,
                "percentile": 0
            }
        
        # Raw score (average of match scores)
        raw_score = sum(m["match_score"] for m in skill_matches) / len(skill_matches)
        
        # Weighted score (considering skill weights)
        total_weight = sum(m["weight"] for m in skill_matches)
        weighted_sum = sum(m["match_score"] * m["weight"] for m in skill_matches)
        weighted_score = weighted_sum / total_weight if total_weight > 0 else 0
        
        # Normalized score (0-100)
        normalized_score = round(weighted_score * 100)
        
        # Apply critical skills bonus/penalty
        if critical_skills_status["critical_skills_count"] > 0:
            critical_ratio = critical_skills_status["critical_skills_met_count"] / critical_skills_status["critical_skills_count"]
            if critical_ratio == 1.0:
                normalized_score = min(100, normalized_score + 5)  # Bonus for all critical skills
            elif critical_ratio < 0.5:
                normalized_score = max(0, normalized_score - 10)  # Penalty for missing critical skills
        
        return {
            "raw_score": round(raw_score, 3),
            "weighted_score": round(weighted_score, 3),
            "normalized_score": normalized_score,
            "percentile": None  # Will be calculated when compared to other candidates
        }
    
    def _analyze_skill_depth(self, technical_skills: List[Dict]) -> Dict[str, Any]:
        """Analyze depth and breadth of technical skills"""
        
        if not technical_skills:
            return {
                "total_technical_skills": 0,
                "expert_level_skills": 0,
                "advanced_level_skills": 0,
                "average_years_per_skill": 0,
                "skill_breadth_score": 0,
                "skill_depth_score": 0
            }
        
        total = len(technical_skills)
        expert_count = sum(1 for s in technical_skills if s.get("proficiency") == "expert")
        advanced_count = sum(1 for s in technical_skills if s.get("proficiency") == "advanced")
        
        years_list = [s.get("years_experience") or 0 for s in technical_skills]
        avg_years = sum(years_list) / len(years_list) if years_list else 0
        
        # Categorize skills
        categories = set()
        for skill in technical_skills:
            cat = skill.get("category", "General")
            if cat:
                categories.add(cat)
        
        # Breadth score (based on number of categories)
        breadth_score = min(100, len(categories) * 15)
        
        # Depth score (based on expertise levels)
        depth_score = min(100, (expert_count * 25 + advanced_count * 15) / max(total, 1) * 100)
        
        return {
            "total_technical_skills": total,
            "expert_level_skills": expert_count,
            "advanced_level_skills": advanced_count,
            "average_years_per_skill": round(avg_years, 1),
            "skill_breadth_score": round(breadth_score),
            "skill_depth_score": round(depth_score)
        }
    
    def _evaluate_preferred_skills(
        self,
        preferred_skills: List[Dict],
        candidate_skills: List[Dict],
        skill_synonyms: Dict
    ) -> Dict[str, Any]:
        """Evaluate preferred skills and calculate bonus"""
        
        if not preferred_skills:
            return {
                "matched_count": 0,
                "total_count": 0,
                "bonus_points": 0,
                "details": []
            }
        
        matched = []
        for pref in preferred_skills:
            pref_name = pref["name"].lower()
            
            # Check if candidate has this skill
            found = False
            for skill in candidate_skills:
                skill_name = skill["name"].lower()
                
                # Direct match
                if skill_name == pref_name:
                    found = True
                    break
                
                # Synonym match
                synonyms = skill_synonyms.get(pref_name, [])
                if skill_name in [s.lower() for s in synonyms]:
                    found = True
                    break
            
            matched.append({
                "skill": pref["name"],
                "matched": found
            })
        
        matched_count = sum(1 for m in matched if m["matched"])
        bonus_points = matched_count * 3  # 3 points per preferred skill
        
        return {
            "matched_count": matched_count,
            "total_count": len(preferred_skills),
            "bonus_points": bonus_points,
            "details": matched
        }
    
    def _identify_skill_gaps(self, skill_matches: List[Dict]) -> List[Dict]:
        """Identify skill gaps between candidate and requirements"""
        
        gaps = []
        
        for match in skill_matches:
            if match["match_status"] == "no_match":
                gaps.append({
                    "skill": match["required_skill"],
                    "gap_type": "missing",
                    "current_level": "none",
                    "required_level": match.get("requirements_met", {}).get("required_proficiency", "intermediate"),
                    "years_gap": match.get("requirements_met", {}).get("required_years", 0),
                    "recommendation": f"Consider {match['required_skill']} training or certification"
                })
            elif match["match_score"] < 0.7:
                reqs = match.get("requirements_met", {})
                
                if not reqs.get("years_requirement_met"):
                    gaps.append({
                        "skill": match["required_skill"],
                        "gap_type": "insufficient_years",
                        "current_level": f"{match.get('score_breakdown', {}).get('years_score', 0) * 100:.0f}% of required years",
                        "required_level": "minimum years",
                        "years_gap": 0,  # Would need original requirement
                        "recommendation": f"Gain more experience with {match['required_skill']}"
                    })
                
                if not reqs.get("proficiency_requirement_met"):
                    # matched_candidate_skill is a string (skill name), not a dict
                    matched_skill_name = match.get("matched_candidate_skill", "unknown")
                    gaps.append({
                        "skill": match["required_skill"],
                        "gap_type": "insufficient_proficiency",
                        "current_level": matched_skill_name if isinstance(matched_skill_name, str) else matched_skill_name.get("proficiency", "unknown"),
                        "required_level": "advanced",
                        "years_gap": 0,
                        "recommendation": f"Develop deeper expertise in {match['required_skill']}"
                    })
        
        return gaps
