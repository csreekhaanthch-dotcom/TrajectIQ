"""
TrajectIQ Career Trajectory Analysis Module
==========================================
Analyzes career progression patterns and predicts future trajectory.
Deterministic analysis with explainable scoring.
"""

import json
import re
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from typing import Any, Dict, List, Optional, Tuple

from core.base_module import BaseModule, ModuleRegistry
from core.config import config, JOB_LEVELS


@ModuleRegistry.register
class TrajectoryAnalyzer(BaseModule):
    """
    Career trajectory analysis module.
    Evaluates career progression patterns and stability.
    """
    
    module_name = "trajectory_analyzer"
    version = "1.0.0"
    
    # Company tier classification (simplified)
    COMPANY_TIERS = {
        "faang": ["google", "amazon", "apple", "meta", "facebook", "netflix", "microsoft"],
        "tier_1": ["airbnb", "uber", "lyft", "stripe", "square", "spotify", "twitter", "x.com", "linkedin", "salesforce"],
        "tier_2": ["adobe", "oracle", "ibm", "cisco", "intel", "vmware", "atlassian", "shopify", "dropbox"]
    }
    
    def validate_input(self, input_data: Dict[str, Any]) -> bool:
        """Validate input against schema"""
        if "candidate_id" not in input_data:
            raise ValueError("Missing required field: candidate_id")
        
        if "work_history" not in input_data:
            raise ValueError("Missing required field: work_history")
        
        if not isinstance(input_data["work_history"], list):
            raise ValueError("work_history must be a list")
        
        for position in input_data["work_history"]:
            if "company" not in position:
                raise ValueError("Each position must have 'company' field")
            if "title" not in position:
                raise ValueError("Each position must have 'title' field")
            if "start_date" not in position:
                raise ValueError("Each position must have 'start_date' field")
        
        return True
    
    def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process career trajectory analysis"""
        
        candidate_id = input_data["candidate_id"]
        work_history = input_data["work_history"]
        education_history = input_data.get("education_history", [])
        analysis_config = input_data.get("analysis_config", {})
        
        # Sort work history chronologically
        sorted_history = self._sort_work_history(work_history)
        
        # Calculate progression metrics
        progression_analysis = self._analyze_progression(sorted_history)
        
        # Analyze trajectory score
        trajectory_score = self._calculate_trajectory_score(
            sorted_history,
            progression_analysis
        )
        
        # Analyze company trajectory
        company_trajectory = self._analyze_company_trajectory(sorted_history)
        
        # Identify growth patterns
        growth_patterns = self._identify_growth_patterns(
            sorted_history,
            progression_analysis
        )
        
        # Analyze stability
        stability_indicators = self._analyze_stability(
            sorted_history,
            progression_analysis
        )
        
        # Evaluate fit for target role
        fit_for_target = self._evaluate_target_fit(
            sorted_history,
            progression_analysis,
            analysis_config
        )
        
        # Generate predictions
        predictions = self._generate_predictions(
            sorted_history,
            progression_analysis,
            trajectory_score
        )
        
        return {
            "analysis_id": self.generate_id("TRAJ-ANALYSIS"),
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "candidate_id": candidate_id,
            "trajectory_score": trajectory_score,
            "progression_analysis": progression_analysis,
            "company_trajectory": company_trajectory,
            "growth_patterns": growth_patterns,
            "stability_indicators": stability_indicators,
            "fit_for_target": fit_for_target,
            "predictions": predictions,
            "audit_trail": {
                "algorithm_version": self.version,
                "rules_applied": [
                    "level_progression_scoring",
                    "tenure_analysis",
                    "company_tier_evaluation",
                    "management_progression"
                ],
                "data_quality_score": self._calculate_data_quality(sorted_history)
            }
        }
    
    def _sort_work_history(self, work_history: List[Dict]) -> List[Dict]:
        """Sort work history chronologically (oldest first)"""
        
        def parse_date(date_str: str) -> date:
            if not date_str:
                return date.today()
            
            # Try various date formats
            formats = ["%Y-%m", "%m/%Y", "%Y", "%b %Y", "%B %Y"]
            
            for fmt in formats:
                try:
                    parsed = datetime.strptime(date_str, fmt)
                    return parsed.date()
                except ValueError:
                    continue
            
            # Fallback
            return date(2000, 1, 1)
        
        return sorted(
            work_history,
            key=lambda x: parse_date(x.get("start_date", "2000-01"))
        )
    
    def _analyze_progression(self, work_history: List[Dict]) -> Dict:
        """Analyze career progression metrics"""
        
        if not work_history:
            return {
                "total_experience_years": 0,
                "positions_held": 0,
                "companies_worked": 0,
                "average_tenure_years": 0,
                "longest_tenure_years": 0,
                "shortest_tenure_years": 0,
                "tenure_consistency": "insufficient_data",
                "level_progression": [],
                "promotions_count": 0,
                "lateral_moves_count": 0,
                "backward_moves_count": 0,
                "average_time_between_promotions_years": 0
            }
        
        # Calculate total experience
        total_years = 0
        tenures = []
        level_progression = []
        
        prev_level_score = 0
        prev_company = None
        promotions = 0
        lateral_moves = 0
        backward_moves = 0
        promotion_times = []
        
        for i, position in enumerate(work_history):
            # Parse dates
            start_date = self._parse_date(position.get("start_date"))
            end_date = self._parse_date(position.get("end_date"))
            
            if position.get("is_current"):
                end_date = date.today()
            
            # Calculate tenure
            if start_date and end_date:
                tenure_years = (end_date - start_date).days / 365.25
                tenures.append(tenure_years)
                total_years += tenure_years
            
            # Level progression
            level = position.get("level", "unknown")
            level_score = JOB_LEVELS.get(level, 0)
            
            is_promotion = level_score > prev_level_score
            is_lateral = level_score == prev_level_score and i > 0
            is_backward = level_score < prev_level_score and i > 0
            
            level_progression.append({
                "position": i + 1,
                "title": position.get("title", ""),
                "level": level,
                "level_score": level_score,
                "is_promotion": is_promotion if i > 0 else False,
                "is_lateral": is_lateral,
                "is_step_back": is_backward
            })
            
            # Count transitions
            if i > 0:
                if is_promotion:
                    promotions += 1
                    # Time since last position
                    prev_start = self._parse_date(work_history[i-1].get("start_date"))
                    if start_date and prev_start:
                        promotion_times.append((start_date - prev_start).days / 365.25)
                elif is_lateral:
                    lateral_moves += 1
                elif is_backward:
                    backward_moves += 1
            
            prev_level_score = level_score
            prev_company = position.get("company")
        
        # Calculate averages
        avg_tenure = sum(tenures) / len(tenures) if tenures else 0
        longest_tenure = max(tenures) if tenures else 0
        shortest_tenure = min(tenures) if tenures else 0
        
        # Determine tenure consistency
        if len(tenures) >= 2:
            variance = sum((t - avg_tenure) ** 2 for t in tenures) / len(tenures)
            std_dev = variance ** 0.5
            
            if std_dev < 0.5:
                tenure_consistency = "consistent"
            elif std_dev < 1.5:
                tenure_consistency = "variable"
            else:
                if avg_tenure < config.thresholds.job_hopping_max_tenure_years:
                    tenure_consistency = "job_hopper"
                else:
                    tenure_consistency = "stable"
        else:
            tenure_consistency = "insufficient_data"
        
        # Unique companies
        companies = set(p.get("company", "") for p in work_history)
        
        # Average time between promotions
        avg_promo_time = sum(promotion_times) / len(promotion_times) if promotion_times else 0
        
        return {
            "total_experience_years": round(total_years, 1),
            "positions_held": len(work_history),
            "companies_worked": len(companies),
            "average_tenure_years": round(avg_tenure, 1),
            "longest_tenure_years": round(longest_tenure, 1),
            "shortest_tenure_years": round(shortest_tenure, 1),
            "tenure_consistency": tenure_consistency,
            "level_progression": level_progression,
            "promotions_count": promotions,
            "lateral_moves_count": lateral_moves,
            "backward_moves_count": backward_moves,
            "average_time_between_promotions_years": round(avg_promo_time, 1)
        }
    
    def _parse_date(self, date_str: Optional[str]) -> Optional[date]:
        """Parse date string to date object"""
        
        if not date_str:
            return None
        
        formats = ["%Y-%m", "%m/%Y", "%Y", "%b %Y", "%B %Y"]
        
        for fmt in formats:
            try:
                parsed = datetime.strptime(date_str, fmt)
                return parsed.date()
            except ValueError:
                continue
        
        return None
    
    def _calculate_trajectory_score(
        self,
        work_history: List[Dict],
        progression: Dict
    ) -> Dict:
        """Calculate overall trajectory score"""
        
        if not work_history:
            return {
                "overall_score": 0,
                "momentum_score": 0,
                "consistency_score": 0,
                "trajectory_type": "insufficient_data"
            }
        
        # Base scores
        momentum_score = 50
        consistency_score = 50
        
        # Momentum factors
        promotions = progression.get("promotions_count", 0)
        positions = progression.get("positions_held", 1)
        promotion_ratio = promotions / (positions - 1) if positions > 1 else 0
        
        momentum_score += promotion_ratio * 30
        
        # Recent growth (last 2 positions)
        level_prog = progression.get("level_progression", [])
        if len(level_prog) >= 2:
            recent = level_prog[-2:]
            if recent[-1].get("is_promotion"):
                momentum_score += 15
        
        # Consistency factors
        avg_tenure = progression.get("average_tenure_years", 0)
        
        if avg_tenure >= 2:
            consistency_score += 20
        elif avg_tenure >= 1.5:
            consistency_score += 10
        elif avg_tenure < 1:
            consistency_score -= 15
        
        # Backward moves penalty
        backward = progression.get("backward_moves_count", 0)
        consistency_score -= backward * 10
        
        # Company loyalty bonus (if stayed and grew)
        companies = progression.get("companies_worked", 1)
        if companies < positions and promotions > 0:
            consistency_score += 10  # Internal promotion
        
        # Normalize scores
        momentum_score = max(0, min(100, momentum_score))
        consistency_score = max(0, min(100, consistency_score))
        
        # Overall score (weighted)
        overall_score = momentum_score * 0.6 + consistency_score * 0.4
        
        # Determine trajectory type
        if overall_score >= 80 and promotion_ratio > 0.3:
            trajectory_type = "strong_upward"
        elif overall_score >= 65:
            trajectory_type = "steady_upward"
        elif overall_score >= 50:
            trajectory_type = "stable"
        elif overall_score >= 35:
            trajectory_type = "plateaued"
        elif backward > 0:
            trajectory_type = "declining"
        else:
            trajectory_type = "inconsistent"
        
        # Check for early career
        total_years = progression.get("total_experience_years", 0)
        if total_years < 3:
            trajectory_type = "early_career"
        
        return {
            "overall_score": round(overall_score),
            "momentum_score": round(momentum_score),
            "consistency_score": round(consistency_score),
            "trajectory_type": trajectory_type
        }
    
    def _analyze_company_trajectory(self, work_history: List[Dict]) -> Dict:
        """Analyze company quality progression"""
        
        if not work_history:
            return {
                "company_progression": "unknown",
                "industry_changes": 0,
                "company_tier_progression": [],
                "notable_companies": []
            }
        
        company_progression = []
        notable_companies = []
        industries = set()
        prev_tier = None
        tier_moves = {"up": 0, "down": 0, "same": 0}
        
        for position in work_history:
            company = position.get("company", "").lower()
            industry = position.get("company_industry", "")
            
            if industry:
                industries.add(industry)
            
            # Determine company tier
            tier = self._get_company_tier(company)
            
            if prev_tier:
                if tier < prev_tier:
                    tier_moves["up"] += 1
                elif tier > prev_tier:
                    tier_moves["down"] += 1
                else:
                    tier_moves["same"] += 1
            
            tier_name = self._tier_to_name(tier)
            company_progression.append({
                "company": position.get("company"),
                "tier": tier_name,
                "tier_change": "entry" if prev_tier is None else (
                    "upward" if tier < prev_tier else (
                        "downward" if tier > prev_tier else "same"
                    )
                )
            })
            
            # Track notable companies
            if tier <= 2:
                notable_companies.append(position.get("company"))
            
            prev_tier = tier
        
        # Determine overall company progression
        if tier_moves["up"] > tier_moves["down"]:
            progression = "upward"
        elif tier_moves["down"] > tier_moves["up"]:
            progression = "downward"
        elif tier_moves["same"] > 0 or not tier_moves["up"]:
            progression = "stable"
        else:
            progression = "varied"
        
        return {
            "company_progression": progression,
            "industry_changes": len(industries) - 1 if industries else 0,
            "company_tier_progression": company_progression,
            "notable_companies": list(set(notable_companies))
        }
    
    def _get_company_tier(self, company: str) -> int:
        """Get company tier (lower is better)"""
        
        company_lower = company.lower().strip()
        
        for tier_name, companies in self.COMPANY_TIERS.items():
            for tier_company in companies:
                if tier_company in company_lower:
                    return 1 if tier_name == "faang" else 2
        
        # Check for startup indicators
        if any(ind in company_lower for ind in ["startup", "inc", "llc"]):
            return 4
        
        return 3  # Default mid-tier
    
    def _tier_to_name(self, tier: int) -> str:
        """Convert tier number to name"""
        
        names = {
            1: "faang",
            2: "tier_1",
            3: "mid_tier",
            4: "startup",
            5: "unknown"
        }
        return names.get(tier, "unknown")
    
    def _identify_growth_patterns(
        self,
        work_history: List[Dict],
        progression: Dict
    ) -> Dict:
        """Identify career growth patterns"""
        
        if not work_history:
            return {
                "primary_growth_pattern": "insufficient_data",
                "specialization_trend": "unknown",
                "responsibility_growth": "unknown",
                "management_progression": {
                    "has_management_experience": False,
                    "max_team_size": 0,
                    "management_years": 0,
                    "management_trajectory": "none"
                }
            }
        
        # Analyze titles for patterns
        titles = [p.get("title", "").lower() for p in work_history]
        
        # Detect primary pattern
        has_management = any(
            any(role in t for role in ["manager", "director", "lead", "head", "vp", "chief"])
            for t in titles
        )
        
        has_specialist = any(
            any(role in t for role in ["senior", "staff", "principal", "architect"])
            for t in titles
        )
        
        # Check company loyalty
        companies = [p.get("company") for p in work_history]
        same_company_stays = sum(1 for i, c in enumerate(companies) 
                                 if i > 0 and c == companies[i-1])
        
        # Determine primary pattern
        if has_management and progression.get("promotions_count", 0) >= 2:
            primary_pattern = "management_track"
        elif has_specialist and progression.get("promotions_count", 0) >= 2:
            primary_pattern = "vertical_climber"
        elif same_company_stays > len(work_history) / 2:
            primary_pattern = "company_loyalist"
        elif len(set(companies)) == len(companies):
            primary_pattern = "explorer"
        elif has_specialist:
            primary_pattern = "specialist_deepener"
        else:
            primary_pattern = "mixed"
        
        # Specialization trend
        # Simplified - would analyze skill domains in production
        specialization_trend = "stable"
        
        # Responsibility growth
        level_scores = [lp.get("level_score", 0) for lp in progression.get("level_progression", [])]
        if level_scores and len(level_scores) >= 2:
            if level_scores[-1] > level_scores[0]:
                responsibility_growth = "strong_growth" if level_scores[-1] - level_scores[0] >= 2 else "moderate_growth"
            else:
                responsibility_growth = "stable"
        else:
            responsibility_growth = "unknown"
        
        # Management progression
        management_info = self._analyze_management_progression(work_history)
        
        return {
            "primary_growth_pattern": primary_pattern,
            "specialization_trend": specialization_trend,
            "responsibility_growth": responsibility_growth,
            "management_progression": management_info
        }
    
    def _analyze_management_progression(self, work_history: List[Dict]) -> Dict:
        """Analyze management experience progression"""
        
        has_management = False
        max_team_size = 0
        management_years = 0
        team_sizes = []
        
        for position in work_history:
            title = position.get("title", "").lower()
            team_size = position.get("team_size_managed", 0)
            
            is_management = any(role in title for role in ["manager", "director", "lead", "head", "vp", "chief"])
            
            if is_management or team_size > 0:
                has_management = True
                max_team_size = max(max_team_size, team_size)
                team_sizes.append(team_size)
                
                # Estimate management years
                start = self._parse_date(position.get("start_date"))
                end = self._parse_date(position.get("end_date")) or date.today()
                
                if start:
                    management_years += (end - start).days / 365.25
        
        # Determine trajectory
        if not has_management:
            trajectory = "none"
        elif len(team_sizes) >= 2 and team_sizes[-1] > team_sizes[0]:
            trajectory = "growing"
        elif len(team_sizes) >= 2 and team_sizes[-1] < team_sizes[0]:
            trajectory = "declining"
        else:
            trajectory = "stable"
        
        return {
            "has_management_experience": has_management,
            "max_team_size": max_team_size,
            "management_years": round(management_years, 1),
            "management_trajectory": trajectory
        }
    
    def _analyze_stability(
        self,
        work_history: List[Dict],
        progression: Dict
    ) -> Dict:
        """Analyze career stability indicators"""
        
        red_flags = []
        positive_indicators = []
        
        # Check tenure issues
        avg_tenure = progression.get("average_tenure_years", 0)
        
        if avg_tenure < config.thresholds.job_hopping_max_tenure_years:
            risk = "high" if avg_tenure < 1 else "medium"
            red_flags.append({
                "flag_type": "short_tenure",
                "severity": "warning" if risk == "medium" else "critical",
                "details": f"Average tenure of {avg_tenure:.1f} years indicates potential job-hopping pattern"
            })
        
        # Check for gaps
        # (Simplified - would do detailed gap analysis in production)
        
        # Check for backward moves
        backward = progression.get("backward_moves_count", 0)
        if backward > 0:
            red_flags.append({
                "flag_type": "level_regression",
                "severity": "warning",
                "details": f"{backward} backward career moves detected"
            })
        
        # Positive indicators
        if avg_tenure >= 3:
            positive_indicators.append({
                "indicator_type": "long_tenure",
                "details": f"Average tenure of {avg_tenure:.1f} years shows commitment"
            })
        
        if progression.get("promotions_count", 0) > 0:
            # Check for internal promotions
            companies = [p.get("company") for p in work_history]
            for i in range(1, len(companies)):
                if companies[i] == companies[i-1]:
                    positive_indicators.append({
                        "indicator_type": "promotion_within_company",
                        "details": f"Promoted within {companies[i]}"
                    })
                    break
        
        # Check for increasing responsibility
        level_prog = progression.get("level_progression", [])
        if len(level_prog) >= 2:
            if level_prog[-1].get("level_score", 0) > level_prog[0].get("level_score", 0):
                positive_indicators.append({
                    "indicator_type": "increasing_responsibility",
                    "details": "Clear progression in job levels over career"
                })
        
        # Determine job hopping risk
        if avg_tenure < 1:
            job_hopping_risk = "very_high"
            stability_score = 30
        elif avg_tenure < 1.5:
            job_hopping_risk = "high"
            stability_score = 45
        elif avg_tenure < 2:
            job_hopping_risk = "medium"
            stability_score = 60
        elif avg_tenure < 3:
            job_hopping_risk = "low"
            stability_score = 75
        else:
            job_hopping_risk = "low"
            stability_score = 85
        
        # Adjust for backward moves
        stability_score -= backward * 5
        
        return {
            "job_hopping_risk": job_hopping_risk,
            "stability_score": max(0, min(100, stability_score)),
            "red_flags": red_flags,
            "positive_indicators": positive_indicators
        }
    
    def _evaluate_target_fit(
        self,
        work_history: List[Dict],
        progression: Dict,
        config: Dict
    ) -> Dict:
        """Evaluate fit for target role"""
        
        target_role = config.get("target_role", "")
        target_level = config.get("target_level", "")
        
        if not target_level:
            return {
                "target_role": target_role,
                "target_level": "",
                "readiness_score": 0,
                "readiness_level": "unknown",
                "gap_analysis": [],
                "trajectory_alignment": "unknown"
            }
        
        current_level = 0
        if work_history:
            latest = work_history[-1]
            current_level = JOB_LEVELS.get(latest.get("level", "unknown"), 0)
        
        target_level_score = JOB_LEVELS.get(target_level, 0)
        
        # Calculate readiness
        if current_level >= target_level_score:
            readiness_score = 90
            readiness_level = "ready_now" if current_level == target_level_score else "overqualified"
        elif current_level >= target_level_score - 1:
            readiness_score = 75
            readiness_level = "near_ready"
        elif current_level >= target_level_score - 2:
            readiness_score = 50
            readiness_level = "developing"
        else:
            readiness_score = 25
            readiness_level = "not_ready"
        
        # Gap analysis
        gaps = []
        
        total_years = progression.get("total_experience_years", 0)
        if target_level in ["lead", "manager", "director"] and total_years < 5:
            gaps.append({
                "gap_type": "experience_level",
                "current_state": f"{total_years} years experience",
                "required_state": "5+ years typically required for leadership roles",
                "recommendation": "Assess leadership potential through structured interview"
            })
        
        management = progression.get("management_progression", {})
        if target_level in ["manager", "director"] and not management.get("has_management_experience"):
            gaps.append({
                "gap_type": "management_experience",
                "current_state": "No direct management experience",
                "required_state": "Team management experience required",
                "recommendation": "Evaluate leadership aptitude and mentoring experience"
            })
        
        # Trajectory alignment
        trajectory_type = "aligned" if readiness_level in ["ready_now", "near_ready", "overqualified"] else "partially_aligned"
        
        return {
            "target_role": target_role,
            "target_level": target_level,
            "readiness_score": readiness_score,
            "readiness_level": readiness_level,
            "gap_analysis": gaps,
            "trajectory_alignment": trajectory_type
        }
    
    def _generate_predictions(
        self,
        work_history: List[Dict],
        progression: Dict,
        trajectory_score: Dict
    ) -> Dict:
        """Generate career predictions"""
        
        if not work_history:
            return {
                "next_likely_role": "",
                "time_to_next_level_years": 0,
                "retention_risk": "unknown",
                "prediction_confidence": 0
            }
        
        # Predict next role
        latest = work_history[-1]
        current_title = latest.get("title", "")
        current_level = JOB_LEVELS.get(latest.get("level", "unknown"), 0)
        
        if current_level >= 5:  # Management level
            next_role = "Director" if "Manager" in current_title else current_title
        elif current_level >= 4:  # Senior level
            next_role = "Staff Engineer" if "Engineer" in current_title else "Lead " + current_title
        else:
            next_role = "Senior " + current_title if current_title else "Unknown"
        
        # Time to next level
        avg_promo_time = progression.get("average_time_between_promotions_years", 3)
        tenure_at_current = 0
        
        start = self._parse_date(latest.get("start_date"))
        if start:
            tenure_at_current = (date.today() - start).days / 365.25
        
        time_to_next = max(0.5, avg_promo_time - tenure_at_current)
        
        # Retention risk
        retention_risk = "low"
        if progression.get("average_tenure_years", 0) < 2:
            retention_risk = "high"
        elif progression.get("average_tenure_years", 0) < 3:
            retention_risk = "medium"
        
        # Confidence
        confidence = 0.7 if len(work_history) >= 3 else 0.5
        
        return {
            "next_likely_role": next_role,
            "time_to_next_level_years": round(time_to_next, 1),
            "retention_risk": retention_risk,
            "prediction_confidence": confidence
        }
    
    def _calculate_data_quality(self, work_history: List[Dict]) -> float:
        """Calculate data quality score"""
        
        if not work_history:
            return 0.0
        
        total_fields = 0
        filled_fields = 0
        
        required_fields = ["company", "title", "start_date"]
        optional_fields = ["end_date", "level", "company_industry", "team_size_managed"]
        
        for position in work_history:
            for field in required_fields:
                total_fields += 1
                if position.get(field):
                    filled_fields += 1
            
            for field in optional_fields:
                total_fields += 0.5
                if position.get(field):
                    filled_fields += 0.5
        
        return round(filled_fields / total_fields if total_fields > 0 else 0, 2)
