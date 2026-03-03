"""
TrajectIQ Impact Authenticity Scoring Module
============================================
Evaluates authenticity and impact of candidate achievements.
Deterministic scoring with verification signals.
"""

import json
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from core.base_module import BaseModule, ModuleRegistry
from core.config import config


@ModuleRegistry.register
class ImpactScorer(BaseModule):
    """
    Impact authenticity scoring module.
    Evaluates achievement claims for authenticity and impact.
    """
    
    module_name = "impact_scorer"
    version = "1.0.0"
    
    # Achievement quality indicators
    POSITIVE_INDICATORS = [
        "specific_metrics",  # Quantifiable metrics present
        "context_provided",  # Context around achievement
        "clear_attribution",  # Clear individual contribution
        "verification_available",  # Links, references
        "realistic_claim",  # Claim is plausible
        "before_after_data",  # Baseline provided
    ]
    
    # Warning indicators
    WARNING_INDICATORS = [
        "vague_metric",  # Imprecise quantification
        "unrealistic_claim",  # Seems exaggerated
        "missing_baseline",  # No starting point
        "unclear_attribution",  # Team vs individual unclear
        "percentage_without_absolute",  # % without absolute numbers
        "timeframe_unclear",  # When did this happen
    ]
    
    # Industry benchmarks for common improvements
    INDUSTRY_BENCHMARKS = {
        "performance_improvement": {
            "typical_range": "10-30%",
            "outlier_threshold": 50  # Above 50% is unusual
        },
        "cost_reduction": {
            "typical_range": "10-25%",
            "outlier_threshold": 40
        },
        "revenue_increase": {
            "typical_range": "5-20%",
            "outlier_threshold": 35
        },
        "user_growth": {
            "typical_range": "20-100%",
            "outlier_threshold": 200
        },
        "efficiency_gain": {
            "typical_range": "15-40%",
            "outlier_threshold": 60
        }
    }
    
    # Common vague phrases to flag
    VAGUE_PHRASES = [
        "significant improvement",
        "substantial growth",
        "considerable impact",
        "major contribution",
        "helped with",
        "assisted in",
        "worked on",
        "participated in",
        "involved in"
    ]
    
    def validate_input(self, input_data: Dict[str, Any]) -> bool:
        """Validate input against schema"""
        if "candidate_id" not in input_data:
            raise ValueError("Missing required field: candidate_id")
        
        if "achievements" not in input_data:
            raise ValueError("Missing required field: achievements")
        
        if not isinstance(input_data["achievements"], list):
            raise ValueError("achievements must be a list")
        
        for achievement in input_data["achievements"]:
            if "text" not in achievement:
                raise ValueError("Each achievement must have 'text' field")
        
        return True
    
    def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process impact authenticity evaluation"""
        
        candidate_id = input_data["candidate_id"]
        achievements = input_data["achievements"]
        evaluation_config = input_data.get("evaluation_config", {})
        
        # Evaluate each achievement
        achievements_evaluation = []
        total_impact_score = 0
        total_authenticity_score = 0
        
        for achievement in achievements:
            evaluation = self._evaluate_achievement(achievement, evaluation_config)
            achievements_evaluation.append(evaluation)
            total_impact_score += evaluation["impact_score"]
            total_authenticity_score += evaluation["authenticity_score"]
        
        # Calculate overall scores
        count = len(achievements) if achievements else 1
        avg_impact = total_impact_score / count
        avg_authenticity = total_authenticity_score / count
        
        # Overall confidence based on verifiability
        confidence = self._calculate_confidence(achievements_evaluation)
        
        # Determine grade
        grade = self._determine_grade(avg_impact, avg_authenticity)
        
        # Analyze patterns
        impact_patterns = self._analyze_patterns(achievements_evaluation)
        
        # Benchmark comparison
        benchmark_comparison = self._compare_to_benchmarks(achievements_evaluation)
        
        return {
            "evaluation_id": self.generate_id("IMPACT-EVAL"),
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "candidate_id": candidate_id,
            "overall_impact_score": {
                "raw_score": round(avg_impact, 1),
                "normalized_score": round(avg_impact),
                "confidence": round(confidence, 2),
                "grade": grade
            },
            "achievements_evaluation": achievements_evaluation,
            "impact_patterns": impact_patterns,
            "benchmark_comparison": benchmark_comparison,
            "audit_trail": {
                "algorithm_version": self.version,
                "rules_applied": [
                    "quantification_scoring",
                    "authenticity_verification",
                    "industry_benchmark_comparison"
                ],
                "confidence_factors": self._get_confidence_factors(achievements_evaluation)
            }
        }
    
    def _evaluate_achievement(
        self,
        achievement: Dict,
        config: Dict
    ) -> Dict[str, Any]:
        """Evaluate a single achievement"""
        
        text = achievement["text"]
        context = achievement.get("context", {})
        claimed_metrics = achievement.get("claimed_metrics", [])
        verification = achievement.get("verification_data", {})
        
        # Initialize scores
        impact_score = 50  # Base score
        authenticity_score = 50
        flags = []
        
        # 1. Check for metrics
        has_metrics = self._check_metrics(text, claimed_metrics)
        if has_metrics:
            impact_score += 15
            flags.append({
                "type": "quantifiable",
                "severity": "info",
                "description": "Achievement includes specific, quantifiable metric"
            })
        else:
            # Check for vague phrases
            for phrase in self.VAGUE_PHRASES:
                if phrase.lower() in text.lower():
                    flags.append({
                        "type": "vague_metric",
                        "severity": "warning",
                        "description": f"Achievement uses vague phrasing: '{phrase}'"
                    })
                    impact_score -= 5
                    break
        
        # 2. Analyze claimed metrics
        metrics_analysis = self._analyze_metrics(claimed_metrics, context)
        
        for metric in metrics_analysis:
            if metric["plausibility"] == "unlikely":
                flags.append({
                    "type": "unrealistic_claim",
                    "severity": "warning",
                    "description": f"Claimed {metric['claimed_value']} may be unrealistic"
                })
                authenticity_score -= 10
            elif metric["plausibility"] == "highly_plausible":
                authenticity_score += 5
        
        # 3. Check for baseline/before-after data
        has_baseline = self._check_baseline(text)
        if not has_baseline and has_metrics:
            flags.append({
                "type": "missing_baseline",
                "severity": "warning",
                "description": "Improvement percentage without baseline context"
            })
            authenticity_score -= 5
        elif has_baseline:
            flags.append({
                "type": "positive_flag",
                "severity": "info",
                "description": "Achievement provides baseline context"
            })
            authenticity_score += 5
        
        # 4. Analyze attribution
        attribution = self._analyze_attribution(text, context)
        
        if attribution["attribution_clarity"] == "individual":
            authenticity_score += 10
            flags.append({
                "type": "positive_flag",
                "severity": "info",
                "description": "Clear individual contribution indicated"
            })
        elif attribution["attribution_clarity"] == "unclear":
            flags.append({
                "type": "unclear_attribution",
                "severity": "warning",
                "description": "Unclear if individual or team achievement"
            })
            authenticity_score -= 5
        
        # 5. Check verification data
        if verification.get("has_links"):
            authenticity_score += 10
        if verification.get("reference_available"):
            authenticity_score += 8
            flags.append({
                "type": "verifiable",
                "severity": "info",
                "description": "Reference available for verification"
            })
        
        # 6. Check percentage without absolute
        if self._has_percentage_without_absolute(text):
            flags.append({
                "type": "percentage_without_absolute",
                "severity": "warning",
                "description": "Percentage improvement without absolute values"
            })
        
        # 7. Check timeframe clarity
        timeframe = self._extract_timeframe(text)
        if not timeframe:
            flags.append({
                "type": "timeframe_unclear",
                "severity": "info",
                "description": "Timeframe for achievement not specified"
            })
        else:
            authenticity_score += 3
        
        # Determine verification status
        critical_flags = [f for f in flags if f["severity"] == "critical"]
        warning_flags = [f for f in flags if f["severity"] == "warning"]
        
        if critical_flags:
            verification_status = "flagged"
        elif verification.get("reference_available"):
            verification_status = "verified"
        elif len(warning_flags) <= 1:
            verification_status = "partially_verifiable"
        else:
            verification_status = "unverifiable"
        
        # Normalize scores
        impact_score = max(0, min(100, impact_score))
        authenticity_score = max(0, min(100, authenticity_score))
        
        # Generate improvement suggestions
        suggestions = self._generate_suggestions(flags, has_metrics, has_baseline)
        
        return {
            "achievement_text": text,
            "impact_score": round(impact_score),
            "authenticity_score": round(authenticity_score),
            "verification_status": verification_status,
            "flags": flags,
            "metrics_analysis": metrics_analysis,
            "attribution_analysis": attribution,
            "improvement_suggestions": suggestions
        }
    
    def _check_metrics(self, text: str, claimed_metrics: List) -> bool:
        """Check if achievement has quantifiable metrics"""
        
        if claimed_metrics:
            return True
        
        # Look for numbers in text
        number_patterns = [
            r'\d+(?:\.\d+)?%',  # Percentage
            r'\$\d+(?:\.\d+)?(?:[kmbKMB])?',  # Money
            r'\d+(?:,\d{3})*(?:\.\d+)?\s*(?:users?|customers?|clients?|people)',  # Counts
            r'\d+(?:\.\d+)?x',  # Multipliers
            r'(?:increased?|decreased?|reduced?|improved?|grew?)\s+(?:by\s+)?\d+',  # Changes
        ]
        
        for pattern in number_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return True
        
        return False
    
    def _analyze_metrics(
        self,
        claimed_metrics: List[Dict],
        context: Dict
    ) -> List[Dict]:
        """Analyze claimed metrics for plausibility"""
        
        if not claimed_metrics:
            return []
        
        analyses = []
        company_stage = context.get("company_stage", "unknown")
        
        for metric in claimed_metrics:
            value = metric.get("value", "")
            metric_type = metric.get("type", "other")
            
            plausibility = "plausible"
            context_adjustment = ""
            
            # Check against benchmarks
            if metric_type == "percentage":
                try:
                    num_value = float(re.search(r'(\d+(?:\.\d+)?)', value).group(1))
                    
                    # Determine improvement type
                    benchmark_key = "performance_improvement"  # Default
                    for key in self.INDUSTRY_BENCHMARKS:
                        if key.replace("_", " ") in value.lower():
                            benchmark_key = key
                            break
                    
                    benchmark = self.INDUSTRY_BENCHMARKS.get(benchmark_key, {})
                    outlier_threshold = benchmark.get("outlier_threshold", 50)
                    
                    if num_value > outlier_threshold:
                        plausibility = "questionable"
                        context_adjustment = f"{num_value}% is above typical {benchmark.get('typical_range', 'range')}"
                    else:
                        context_adjustment = f"{num_value}% improvement is within typical range"
                    
                    # Adjust for company stage
                    if company_stage == "startup" and num_value > 100:
                        plausibility = "plausible"  # High growth expected
                        context_adjustment += " (startup growth context)"
                    
                except (ValueError, AttributeError):
                    pass
            
            elif metric_type == "other":
                # Multipliers like "10x"
                match = re.search(r'(\d+(?:\.\d+)?)\s*x', value, re.IGNORECASE)
                if match:
                    mult_value = float(match.group(1))
                    if mult_value > 20:
                        plausibility = "questionable"
                        context_adjustment = f"{mult_value}x improvement is unusually high"
                    elif mult_value > 5:
                        plausibility = "plausible"
                        context_adjustment = f"{mult_value}x improvement achievable with significant changes"
            
            analyses.append({
                "claimed_value": value,
                "claimed_unit": metric.get("unit", ""),
                "type": metric_type,
                "plausibility": plausibility,
                "context_adjustment": context_adjustment
            })
        
        return analyses
    
    def _check_baseline(self, text: str) -> bool:
        """Check if baseline/before data is provided"""
        
        baseline_patterns = [
            r'from\s+(\d+)',
            r'(\d+)\s*(?:ms|milliseconds?|seconds?|minutes?)\s*to\s*(\d+)',
            r'(\d+)\s*%?\s*to\s*(\d+)',
            r'before[:\s]+(\d+)',
            r'baseline[:\s]+(\d+)',
            r'down\s+from\s+(\d+)',
            r'up\s+from\s+(\d+)'
        ]
        
        for pattern in baseline_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return True
        
        return False
    
    def _analyze_attribution(self, text: str, context: Dict) -> Dict:
        """Analyze achievement attribution clarity"""
        
        text_lower = text.lower()
        role = context.get("role", "")
        team_size = context.get("team_size", 0)
        
        # Check for individual indicators
        individual_indicators = [
            "i led", "i implemented", "i designed", "i built",
            "i developed", "i created", "i optimized", "my"
        ]
        
        # Check for team indicators
        team_indicators = [
            "we led", "team implemented", "we designed", "our team",
            "collaborated", "worked with", "team of", "together"
        ]
        
        # Check for leadership indicators
        leadership_indicators = [
            "led", "headed", "directed", "managed", "spearheaded",
            "drove", "orchestrated", "oversaw"
        ]
        
        has_individual = any(ind in text_lower for ind in individual_indicators)
        has_team = any(ind in text_lower for ind in team_indicators)
        has_leadership = any(ind in text_lower for ind in leadership_indicators)
        
        if has_individual and not has_team:
            attribution = "individual"
            role_appropriate = True
        elif has_leadership:
            attribution = "lead"
            role_appropriate = team_size > 0 or "manager" in role.lower() or "lead" in role.lower()
        elif has_team:
            attribution = "team_member"
            role_appropriate = True
        else:
            attribution = "unclear"
            role_appropriate = True  # Can't determine
        
        explanation = ""
        if attribution == "individual":
            explanation = "Clear individual contribution indicated by language used"
        elif attribution == "lead":
            explanation = "'Led' indicates leadership role, team contribution implied"
        elif attribution == "team_member":
            explanation = "Team-based achievement indicated"
        else:
            explanation = "Attribution unclear - could be individual or team effort"
        
        return {
            "attribution_clarity": attribution,
            "role_appropriate": role_appropriate,
            "explanation": explanation
        }
    
    def _has_percentage_without_absolute(self, text: str) -> bool:
        """Check if there's a percentage without absolute values"""
        
        has_percentage = bool(re.search(r'\d+(?:\.\d+)?%', text))
        has_absolute = bool(re.search(
            r'(?:from|to)\s+\d+|\d+\s*(?:users?|customers?|dollars?|\$|ms|seconds?)',
            text, re.IGNORECASE
        ))
        
        return has_percentage and not has_absolute
    
    def _extract_timeframe(self, text: str) -> Optional[str]:
        """Extract timeframe from achievement text"""
        
        patterns = [
            r'(?:in|within|over)\s+(\d+\s*(?:months?|years?|weeks?|days?))',
            r'(?:during|throughout)\s+(\d{4}|\w+\s+\d{4})',
            r'(\d+\s*(?:month|year|quarter)s?\s+period)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)
        
        return None
    
    def _generate_suggestions(
        self,
        flags: List[Dict],
        has_metrics: bool,
        has_baseline: bool
    ) -> List[str]:
        """Generate improvement suggestions for achievement description"""
        
        suggestions = []
        
        if not has_metrics:
            suggestions.append("Add specific, quantifiable metrics to strengthen the achievement")
        
        if not has_baseline:
            suggestions.append("Add baseline metric (e.g., 'from X to Y') for context")
        
        for flag in flags:
            if flag["type"] == "unclear_attribution":
                suggestions.append("Clarify individual vs team contribution")
            elif flag["type"] == "timeframe_unclear":
                suggestions.append("Specify the timeframe for this achievement")
        
        # Remove duplicates while preserving order
        return list(dict.fromkeys(suggestions))
    
    def _calculate_confidence(self, evaluations: List[Dict]) -> float:
        """Calculate overall confidence in impact scores"""
        
        if not evaluations:
            return 0.0
        
        # Base confidence
        confidence = 0.5
        
        # Adjust based on verification status
        for eval in evaluations:
            status = eval.get("verification_status", "unverifiable")
            if status == "verified":
                confidence += 0.15
            elif status == "partially_verifiable":
                confidence += 0.05
            elif status == "flagged":
                confidence -= 0.1
        
        # Normalize
        return max(0.1, min(1.0, confidence / len(evaluations)))
    
    def _determine_grade(self, impact: float, authenticity: float) -> str:
        """Determine impact grade"""
        
        combined = (impact * 0.6 + authenticity * 0.4)
        
        if combined >= 85:
            return "exceptional"
        elif combined >= 70:
            return "strong"
        elif combined >= 55:
            return "moderate"
        elif combined >= 40:
            return "limited"
        else:
            return "concerning"
    
    def _analyze_patterns(self, evaluations: List[Dict]) -> Dict:
        """Analyze patterns across all achievements"""
        
        total = len(evaluations)
        quantified = sum(1 for e in evaluations if any(
            f["type"] == "quantifiable" for f in e.get("flags", [])
        ))
        high_impact = sum(1 for e in evaluations if e["impact_score"] >= 75)
        flagged = sum(1 for e in evaluations if e["verification_status"] == "flagged")
        
        patterns = []
        
        # Quantification pattern
        if quantified > total * 0.7:
            patterns.append({
                "pattern": "quantified_achievements",
                "occurrence_count": quantified,
                "impact_on_score": 10.0
            })
        
        # Leadership pattern
        leadership_count = sum(1 for e in evaluations 
                              if e.get("attribution_analysis", {}).get("attribution_clarity") in ["lead", "individual"])
        if leadership_count > total * 0.5:
            patterns.append({
                "pattern": "leadership_indicated",
                "occurrence_count": leadership_count,
                "impact_on_score": 5.0
            })
        
        return {
            "total_achievements_analyzed": total,
            "quantified_achievements_count": quantified,
            "high_impact_count": high_impact,
            "flagged_count": flagged,
            "patterns_detected": patterns
        }
    
    def _compare_to_benchmarks(self, evaluations: List[Dict]) -> Dict:
        """Compare to industry benchmarks"""
        
        avg_score = sum(e["impact_score"] for e in evaluations) / len(evaluations) if evaluations else 0
        
        # Determine percentile (simplified - would use actual data in production)
        if avg_score >= 80:
            percentile = 85
            outlier_status = "above_typical"
        elif avg_score >= 65:
            percentile = 70
            outlier_status = "typical"
        elif avg_score >= 50:
            percentile = 50
            outlier_status = "typical"
        else:
            percentile = 25
            outlier_status = "below_typical"
        
        return {
            "percentile_vs_industry": percentile,
            "typical_score_range": "50-70",
            "outlier_status": outlier_status
        }
    
    def _get_confidence_factors(self, evaluations: List[Dict]) -> List[Dict]:
        """Get confidence factors for audit trail"""
        
        factors = []
        
        # Check for verifications
        verified_count = sum(1 for e in evaluations 
                           if e.get("verification_status") == "verified")
        if verified_count > 0:
            factors.append({"factor": "reference_available", "impact": 0.15})
        
        # Check for quantification
        quantified_count = sum(1 for e in evaluations 
                              if any(f["type"] == "quantifiable" for f in e.get("flags", [])))
        if quantified_count > 0:
            factors.append({"factor": "quantified_metrics", "impact": 0.20})
        
        # Check for missing baselines
        baseline_issues = sum(1 for e in evaluations 
                             if any(f["type"] == "missing_baseline" for f in e.get("flags", [])))
        if baseline_issues > 0:
            factors.append({"factor": "missing_baselines", "impact": -0.10})
        
        return factors
