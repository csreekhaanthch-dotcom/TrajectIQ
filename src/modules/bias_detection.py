"""
TrajectIQ Bias Detection & Fairness Monitoring
==============================================
Monitors for potential bias in scoring without using protected attributes.
"""

import json
import statistics
from datetime import datetime, date, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from collections import defaultdict

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from core.database import get_database, DatabaseManager


@dataclass
class BiasIndicator:
    """Potential bias indicator"""
    indicator_type: str
    description: str
    severity: str  # low, medium, high
    affected_count: int
    recommendation: str


@dataclass
class FairnessReport:
    """Fairness monitoring report"""
    report_date: date
    total_evaluations: int
    fairness_score: float  # 0-100
    score_distribution: Dict[str, int]
    potential_bias_indicators: List[BiasIndicator]
    recommendations: List[str]
    compliance_notes: List[str]


class BiasDetector:
    """
    Bias detection and fairness monitoring system.
    
    IMPORTANT: Never uses protected attributes (race, gender, age, etc.) in scoring.
    Only monitors for patterns that might indicate potential bias.
    """
    
    # Words that might be proxies for protected attributes (for monitoring only)
    POTENTIAL_PROXY_WORDS = {
        "age_related": ["junior", "senior", "experienced", "fresh", "recent graduate", 
                       "veteran", "young", "older", "mature", "entry-level"],
        "education_prestige": ["ivy league", "top tier", "elite", "prestigious"],
        "location_proxy": ["native", "citizen", "visa", "relocate", "remote"]
    }
    
    def __init__(self, db: Optional[DatabaseManager] = None):
        self.db = db or get_database()
    
    def analyze_daily(self, target_date: Optional[date] = None) -> FairnessReport:
        """
        Perform daily bias analysis.
        
        Args:
            target_date: Date to analyze (defaults to today)
        
        Returns:
            FairnessReport with findings
        """
        
        target_date = target_date or date.today()
        
        # Get evaluations for the date
        evaluations = self._get_evaluations_for_date(target_date)
        
        if not evaluations:
            return FairnessReport(
                report_date=target_date,
                total_evaluations=0,
                fairness_score=100.0,
                score_distribution={},
                potential_bias_indicators=[],
                recommendations=["No evaluations to analyze"],
                compliance_notes=["Insufficient data for meaningful analysis"]
            )
        
        # Analyze score distribution
        score_distribution = self._analyze_score_distribution(evaluations)
        
        # Check for potential bias patterns
        bias_indicators = self._detect_bias_patterns(evaluations)
        
        # Calculate fairness score
        fairness_score = self._calculate_fairness_score(evaluations, bias_indicators)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(bias_indicators, fairness_score)
        
        # Compliance notes
        compliance_notes = self._generate_compliance_notes(evaluations)
        
        report = FairnessReport(
            report_date=target_date,
            total_evaluations=len(evaluations),
            fairness_score=fairness_score,
            score_distribution=score_distribution,
            potential_bias_indicators=bias_indicators,
            recommendations=recommendations,
            compliance_notes=compliance_notes
        )
        
        # Store report
        self._store_report(report)
        
        return report
    
    def _get_evaluations_for_date(self, target_date: date) -> List[Dict]:
        """Get evaluations for a specific date"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            
            start = datetime.combine(target_date, datetime.min.time())
            end = datetime.combine(target_date, datetime.max.time())
            
            cursor.execute("""
                SELECT * FROM evaluations
                WHERE created_at >= ? AND created_at <= ?
            """, (start, end))
            
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def _analyze_score_distribution(self, evaluations: List[Dict]) -> Dict[str, int]:
        """Analyze distribution of scores"""
        distribution = defaultdict(int)
        
        for eval in evaluations:
            score = eval.get("hiring_index", 0)
            if score is None:
                continue
            
            if score >= 90:
                distribution["A"] += 1
            elif score >= 80:
                distribution["B"] += 1
            elif score >= 70:
                distribution["C"] += 1
            elif score >= 60:
                distribution["D"] += 1
            else:
                distribution["F"] += 1
        
        return dict(distribution)
    
    def _detect_bias_patterns(self, evaluations: List[Dict]) -> List[BiasIndicator]:
        """Detect potential bias patterns"""
        indicators = []
        
        # Check for score anomalies
        scores = [e.get("hiring_index", 0) for e in evaluations if e.get("hiring_index") is not None]
        
        if scores:
            mean_score = statistics.mean(scores)
            std_dev = statistics.stdev(scores) if len(scores) > 1 else 0
            
            # Check for unusual clustering
            if std_dev < 5 and len(scores) > 10:
                indicators.append(BiasIndicator(
                    indicator_type="score_clustering",
                    description=f"Unusual score clustering around mean ({mean_score:.1f})",
                    severity="medium",
                    affected_count=len(scores),
                    recommendation="Review evaluation criteria for potential systematic bias"
                ))
            
            # Check for extreme outliers
            if std_dev > 20:
                indicators.append(BiasIndicator(
                    indicator_type="high_variance",
                    description=f"High score variance (σ={std_dev:.1f}) detected",
                    severity="low",
                    affected_count=len(scores),
                    recommendation="Monitor for consistent application of criteria"
                ))
        
        # Check for proxy word usage in evaluations
        resume_texts = []
        for eval in evaluations:
            if eval.get("skill_details"):
                resume_texts.append(str(eval.get("skill_details", "")))
        
        proxy_counts = defaultdict(int)
        for category, words in self.POTENTIAL_PROXY_WORDS.items():
            for word in words:
                count = sum(1 for text in resume_texts if word.lower() in text.lower())
                if count > 0:
                    proxy_counts[f"{category}:{word}"] = count
        
        if proxy_counts:
            # Only flag if certain words appear disproportionately
            for proxy, count in proxy_counts.items():
                if count > len(evaluations) * 0.3:  # More than 30%
                    indicators.append(BiasIndicator(
                        indicator_type="proxy_word_usage",
                        description=f"Potential proxy word detected: {proxy}",
                        severity="low",
                        affected_count=count,
                        recommendation="Ensure scoring criteria do not rely on proxy indicators"
                    ))
        
        # Check for recruiter-specific patterns
        recruiter_scores = defaultdict(list)
        for eval in evaluations:
            user_id = eval.get("user_id")
            score = eval.get("hiring_index")
            if user_id and score is not None:
                recruiter_scores[user_id].append(score)
        
        for user_id, user_scores in recruiter_scores.items():
            if len(user_scores) >= 5:
                user_mean = statistics.mean(user_scores)
                overall_mean = statistics.mean(scores)
                
                # Flag significant deviation
                if abs(user_mean - overall_mean) > 15:
                    indicators.append(BiasIndicator(
                        indicator_type="recruiter_deviation",
                        description=f"Recruiter {user_id} shows significant scoring deviation",
                        severity="medium",
                        affected_count=len(user_scores),
                        recommendation="Review recruiter's evaluation patterns for consistency"
                    ))
        
        return indicators
    
    def _calculate_fairness_score(
        self,
        evaluations: List[Dict],
        indicators: List[BiasIndicator]
    ) -> float:
        """Calculate overall fairness score"""
        
        base_score = 100.0
        
        # Deduct for each indicator
        for indicator in indicators:
            if indicator.severity == "high":
                base_score -= 15
            elif indicator.severity == "medium":
                base_score -= 8
            else:
                base_score -= 3
        
        return max(0.0, min(100.0, base_score))
    
    def _generate_recommendations(
        self,
        indicators: List[BiasIndicator],
        fairness_score: float
    ) -> List[str]:
        """Generate fairness recommendations"""
        
        recommendations = []
        
        if fairness_score < 70:
            recommendations.append(
                "CRITICAL: Fairness score below threshold. Conduct immediate review."
            )
        elif fairness_score < 85:
            recommendations.append(
                "Fairness score indicates potential issues. Review bias indicators."
            )
        else:
            recommendations.append(
                "Fairness score within acceptable range. Continue monitoring."
            )
        
        # Add indicator-specific recommendations
        seen_types = set()
        for indicator in indicators:
            if indicator.indicator_type not in seen_types:
                recommendations.append(indicator.recommendation)
                seen_types.add(indicator.indicator_type)
        
        return recommendations[:10]  # Max 10
    
    def _generate_compliance_notes(self, evaluations: List[Dict]) -> List[str]:
        """Generate compliance notes"""
        
        notes = []
        
        notes.append(
            "All evaluations use deterministic scoring without protected attributes."
        )
        
        notes.append(
            "No race, gender, age, or other protected characteristics used in scoring."
        )
        
        notes.append(
            "AI detection signal is advisory only and never used for rejection."
        )
        
        # Add evaluation count
        notes.append(f"Total evaluations analyzed: {len(evaluations)}")
        
        return notes
    
    def _store_report(self, report: FairnessReport):
        """Store bias report in database"""
        
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT OR REPLACE INTO bias_metrics 
                (analysis_date, total_evaluations, score_distribution, 
                 potential_bias_flags, fairness_score, recommendations)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                report.report_date,
                report.total_evaluations,
                json.dumps(report.score_distribution),
                json.dumps([{
                    "type": i.indicator_type,
                    "description": i.description,
                    "severity": i.severity,
                    "count": i.affected_count
                } for i in report.potential_bias_indicators]),
                report.fairness_score,
                json.dumps(report.recommendations)
            ))
            
            conn.commit()
    
    def get_historical_reports(self, days: int = 30) -> List[Dict]:
        """Get historical bias reports"""
        
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT * FROM bias_metrics
                WHERE analysis_date >= date('now', ?)
                ORDER BY analysis_date DESC
            """, (f'-{days} days',))
            
            return [dict(row) for row in cursor.fetchall()]
    
    def get_bias_trend(self, days: int = 30) -> Dict[str, Any]:
        """Get bias trend over time"""
        
        reports = self.get_historical_reports(days)
        
        if not reports:
            return {"trend": "no_data", "data_points": 0}
        
        fairness_scores = [r.get("fairness_score", 0) for r in reports]
        
        if len(fairness_scores) > 1:
            trend = "improving" if fairness_scores[0] > fairness_scores[-1] else "declining"
        else:
            trend = "stable"
        
        return {
            "trend": trend,
            "data_points": len(reports),
            "average_fairness": statistics.mean(fairness_scores) if fairness_scores else 0,
            "min_fairness": min(fairness_scores) if fairness_scores else 0,
            "max_fairness": max(fairness_scores) if fairness_scores else 0
        }


class AnalyticsManager:
    """
    Usage analytics tracking and reporting.
    """
    
    def __init__(self, db: Optional[DatabaseManager] = None):
        self.db = db or get_database()
    
    def track_event(
        self,
        event_type: str,
        user_id: Optional[int] = None,
        details: Optional[Dict] = None
    ):
        """Track analytics event"""
        
        self.db.log_analytics(event_type, user_id, details)
    
    def get_dashboard_stats(self, days: int = 30) -> Dict[str, Any]:
        """Get dashboard statistics"""
        
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            
            # Resumes processed
            cursor.execute("""
                SELECT COUNT(*) as count FROM evaluations
                WHERE created_at >= datetime('now', ?)
            """, (f'-{days} days',))
            resumes_processed = cursor.fetchone()["count"]
            
            # Average hiring index
            cursor.execute("""
                SELECT AVG(hiring_index) as avg FROM evaluations
                WHERE created_at >= datetime('now', ?) AND hiring_index IS NOT NULL
            """, (f'-{days} days',))
            avg_score = cursor.fetchone()["avg"] or 0
            
            # Recruiter activity
            cursor.execute("""
                SELECT u.username, COUNT(e.id) as count
                FROM evaluations e
                JOIN users u ON e.user_id = u.id
                WHERE e.created_at >= datetime('now', ?)
                GROUP BY u.id
                ORDER BY count DESC
                LIMIT 10
            """, (f'-{days} days',))
            recruiter_activity = [dict(row) for row in cursor.fetchall()]
            
            # AI usage rate
            cursor.execute("""
                SELECT 
                    COUNT(CASE WHEN ai_enhanced = 1 THEN 1 END) as ai_count,
                    COUNT(*) as total
                FROM evaluations
                WHERE created_at >= datetime('now', ?)
            """, (f'-{days} days',))
            ai_row = cursor.fetchone()
            ai_usage_rate = (ai_row["ai_count"] / ai_row["total"] * 100) if ai_row["total"] > 0 else 0
            
            # Time metrics (estimated)
            cursor.execute("""
                SELECT AVG(processing_time_ms) as avg_time
                FROM evaluations
                WHERE created_at >= datetime('now', ?)
            """, (f'-{days} days',))
            avg_time = cursor.fetchone()["avg_time"] or 0
            
            # Score distribution
            cursor.execute("""
                SELECT 
                    CASE 
                        WHEN hiring_index >= 90 THEN 'A'
                        WHEN hiring_index >= 80 THEN 'B'
                        WHEN hiring_index >= 70 THEN 'C'
                        WHEN hiring_index >= 60 THEN 'D'
                        ELSE 'F'
                    END as grade,
                    COUNT(*) as count
                FROM evaluations
                WHERE created_at >= datetime('now', ?) AND hiring_index IS NOT NULL
                GROUP BY grade
            """, (f'-{days} days',))
            score_distribution = {row["grade"]: row["count"] for row in cursor.fetchall()}
            
            # User count
            cursor.execute("SELECT COUNT(*) as count FROM users WHERE is_active = 1")
            active_users = cursor.fetchone()["count"]
            
            # Error count
            cursor.execute("""
                SELECT COUNT(*) as count FROM audit_logs
                WHERE action LIKE '%error%' AND timestamp >= datetime('now', ?)
            """, (f'-{days} days',))
            errors = cursor.fetchone()["count"]
            
            return {
                "period_days": days,
                "resumes_processed": resumes_processed,
                "average_hiring_index": round(avg_score, 1),
                "average_processing_time_ms": round(avg_time, 0),
                "ai_usage_rate": round(ai_usage_rate, 1),
                "active_users": active_users,
                "errors": errors,
                "recruiter_activity": recruiter_activity,
                "score_distribution": score_distribution
            }
    
    def get_evaluation_trend(self, days: int = 30) -> List[Dict]:
        """Get evaluation count trend"""
        
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT 
                    date(created_at) as date,
                    COUNT(*) as count,
                    AVG(hiring_index) as avg_score
                FROM evaluations
                WHERE created_at >= datetime('now', ?)
                GROUP BY date(created_at)
                ORDER BY date
            """, (f'-{days} days',))
            
            return [dict(row) for row in cursor.fetchall()]
    
    def export_report(self, start_date: date, end_date: date, format: str = "json") -> str:
        """Export analytics report"""
        
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT * FROM evaluations
                WHERE date(created_at) >= ? AND date(created_at) <= ?
            """, (start_date, end_date))
            
            evaluations = [dict(row) for row in cursor.fetchall()]
        
        report = {
            "report_period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "generated_at": datetime.utcnow().isoformat(),
            "total_evaluations": len(evaluations),
            "evaluations": evaluations
        }
        
        if format == "json":
            return json.dumps(report, indent=2, default=str)
        else:
            # Could add CSV export
            return json.dumps(report, indent=2, default=str)


# Global instances
bias_detector: Optional[BiasDetector] = None
analytics_manager: Optional[AnalyticsManager] = None


def get_bias_detector() -> BiasDetector:
    global bias_detector
    if bias_detector is None:
        bias_detector = BiasDetector()
    return bias_detector


def get_analytics() -> AnalyticsManager:
    global analytics_manager
    if analytics_manager is None:
        analytics_manager = AnalyticsManager()
    return analytics_manager
