"""
TrajectIQ Enterprise - Analytics Engine
=======================================
Core analytics engine for recruitment metrics and insights.
"""

import json
import logging
import statistics
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict


class MetricType(Enum):
    CANDIDATE_COUNT = "candidate_count"
    CANDIDATE_SCORE = "candidate_score"
    SDI_SCORE = "sdi_score"
    CSIG_SCORE = "csig_score"
    IAE_SCORE = "iae_score"
    CTA_SCORE = "cta_score"
    ERR_SCORE = "err_score"
    OVERALL_SCORE = "overall_score"
    TIME_TO_HIRE = "time_to_hire"
    QUALITY_RATE = "quality_rate"
    BIAS_SCORE = "bias_score"
    TEAM_PRODUCTIVITY = "team_productivity"


class TimeGranularity(Enum):
    HOUR = "hour"
    DAY = "day"
    WEEK = "week"
    MONTH = "month"


class AggregationType(Enum):
    SUM = "sum"
    AVG = "avg"
    MIN = "min"
    MAX = "max"
    COUNT = "count"
    MEDIAN = "median"


@dataclass
class MetricPoint:
    timestamp: str
    value: float
    count: int = 1
    metadata: Dict = field(default_factory=dict)

    def to_dict(self) -> Dict:
        return {"timestamp": self.timestamp, "value": self.value, "count": self.count, "metadata": self.metadata}


@dataclass
class MetricSeries:
    metric_type: MetricType
    granularity: TimeGranularity
    points: List[MetricPoint] = field(default_factory=list)

    def aggregate(self, agg_type: AggregationType) -> float:
        if not self.points:
            return 0.0
        values = [p.value for p in self.points]
        if agg_type == AggregationType.SUM:
            return sum(values)
        elif agg_type == AggregationType.AVG:
            return statistics.mean(values)
        elif agg_type == AggregationType.MIN:
            return min(values)
        elif agg_type == AggregationType.MAX:
            return max(values)
        elif agg_type == AggregationType.COUNT:
            return len(values)
        elif agg_type == AggregationType.MEDIAN:
            return statistics.median(values)
        return sum(values)


@dataclass
class AnalyticsInsight:
    insight_id: str
    insight_type: str
    title: str
    description: str
    severity: str
    metric_type: MetricType
    value: float
    change_percent: Optional[float] = None
    recommendations: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict:
        return {
            "insight_id": self.insight_id,
            "insight_type": self.insight_type,
            "title": self.title,
            "description": self.description,
            "severity": self.severity,
            "metric_type": self.metric_type.value,
            "value": self.value,
            "change_percent": self.change_percent,
            "recommendations": self.recommendations
        }


class AnalyticsEngine:
    """Core analytics engine for recruitment intelligence."""

    def __init__(self):
        self.metrics: Dict[str, MetricSeries] = {}
        self.insights: List[AnalyticsInsight] = []
        self._logger = logging.getLogger(__name__)
        self.benchmarks = {
            MetricType.TIME_TO_HIRE: {"good": 30, "average": 45, "poor": 60},
            MetricType.QUALITY_RATE: {"good": 0.85, "average": 0.70, "poor": 0.55},
            MetricType.OVERALL_SCORE: {"good": 75, "average": 55, "poor": 35}
        }

    def record_metric(self, metric_type: MetricType, value: float, timestamp: str = None,
                     granularity: TimeGranularity = TimeGranularity.DAY, metadata: Dict = None):
        key = f"{metric_type.value}_{granularity.value}"
        if key not in self.metrics:
            self.metrics[key] = MetricSeries(metric_type=metric_type, granularity=granularity)
        self.metrics[key].points.append(MetricPoint(
            timestamp=timestamp or datetime.utcnow().isoformat(),
            value=value,
            metadata=metadata or {}
        ))

    def record_candidate_score(self, candidate_id: str, scores: Dict[str, float], job_id: str = None):
        timestamp = datetime.utcnow().isoformat()
        metadata = {"candidate_id": candidate_id, "job_id": job_id}
        score_mapping = {
            "sdi": MetricType.SDI_SCORE, "csig": MetricType.CSIG_SCORE,
            "iae": MetricType.IAE_SCORE, "cta": MetricType.CTA_SCORE,
            "err": MetricType.ERR_SCORE, "overall": MetricType.OVERALL_SCORE
        }
        for key, score in scores.items():
            if key in score_mapping:
                self.record_metric(score_mapping[key], score, timestamp, metadata=metadata)

    def get_aggregated_metric(self, metric_type: MetricType, aggregation: AggregationType = AggregationType.AVG,
                             granularity: TimeGranularity = TimeGranularity.DAY) -> float:
        key = f"{metric_type.value}_{granularity.value}"
        if key in self.metrics:
            return self.metrics[key].aggregate(aggregation)
        return 0.0

    def get_trend(self, metric_type: MetricType, granularity: TimeGranularity = TimeGranularity.DAY, periods: int = 7) -> Dict:
        key = f"{metric_type.value}_{granularity.value}"
        if key not in self.metrics or len(self.metrics[key].points) < 2:
            return {"trend": "insufficient_data", "direction": "neutral"}
        
        values = [p.value for p in self.metrics[key].points[-periods:]]
        if len(values) < 2:
            return {"trend": "insufficient_data", "direction": "neutral"}
        
        first_half = statistics.mean(values[:len(values)//2])
        second_half = statistics.mean(values[len(values)//2:])
        change_percent = ((second_half - first_half) / first_half * 100) if first_half != 0 else 0
        
        if change_percent > 5:
            direction, trend = "up", "increasing"
        elif change_percent < -5:
            direction, trend = "down", "decreasing"
        else:
            direction, trend = "neutral", "stable"
        
        return {
            "trend": trend, "direction": direction, "change_percent": round(change_percent, 2),
            "current_value": values[-1], "min_value": min(values), "max_value": max(values)
        }

    def detect_anomalies(self, metric_type: MetricType, threshold: float = 2.0) -> List[Dict]:
        key = f"{metric_type.value}_{TimeGranularity.DAY.value}"
        if key not in self.metrics or len(self.metrics[key].points) < 3:
            return []
        
        values = [p.value for p in self.metrics[key].points]
        mean, stddev = statistics.mean(values), statistics.stdev(values) if len(values) > 1 else 0
        if stddev == 0:
            return []
        
        anomalies = []
        for point in self.metrics[key].points:
            z_score = abs(point.value - mean) / stddev
            if z_score > threshold:
                anomalies.append({
                    "timestamp": point.timestamp, "value": point.value, "z_score": round(z_score, 2),
                    "severity": "high" if z_score > 3 else "medium"
                })
        return anomalies

    def get_score_distribution(self) -> Dict:
        key = f"{MetricType.OVERALL_SCORE.value}_{TimeGranularity.DAY.value}"
        if key not in self.metrics or not self.metrics[key].points:
            return {"distribution": {}, "percentiles": {}}
        
        values = sorted([p.value for p in self.metrics[key].points])
        bins = defaultdict(int)
        for v in values:
            bins[f"{int(v // 10) * 10}-{int(v // 10) * 10 + 9}"] += 1
        
        percentiles = {}
        for p in [10, 25, 50, 75, 90]:
            idx = int(len(values) * p / 100)
            percentiles[f"p{p}"] = values[idx] if idx < len(values) else values[-1]
        
        return {
            "distribution": dict(bins), "percentiles": percentiles,
            "mean": round(statistics.mean(values), 2),
            "median": round(statistics.median(values), 2)
        }

    def generate_insights(self) -> List[AnalyticsInsight]:
        self.insights = []
        for metric_type in [MetricType.OVERALL_SCORE, MetricType.TIME_TO_HIRE, MetricType.QUALITY_RATE]:
            trend = self.get_trend(metric_type)
            if trend["trend"] != "insufficient_data" and abs(trend["change_percent"]) > 10:
                self.insights.append(AnalyticsInsight(
                    insight_id=f"trend_{metric_type.value}",
                    insight_type="trend",
                    title=f"{metric_type.value.replace('_', ' ').title()} Trend",
                    description=f"{metric_type.value.replace('_', ' ').title()} has {trend['trend']} by {abs(trend['change_percent'])}%",
                    severity="info",
                    metric_type=metric_type,
                    value=trend["current_value"],
                    change_percent=trend["change_percent"]
                ))
        return self.insights

    def get_dashboard_metrics(self) -> Dict:
        metrics = {}
        for metric_type in [MetricType.CANDIDATE_COUNT, MetricType.OVERALL_SCORE, MetricType.QUALITY_RATE]:
            key = f"{metric_type.value}_{TimeGranularity.DAY.value}"
            if key in self.metrics and self.metrics[key].points:
                values = [p.value for p in self.metrics[key].points]
                metrics[metric_type.value] = {
                    "current": values[-1], "avg": round(statistics.mean(values), 2),
                    "min": min(values), "max": max(values), "trend": self.get_trend(metric_type)
                }
        return metrics

    def export_metrics(self, format: str = "json") -> str:
        data = {
            "exported_at": datetime.utcnow().isoformat(),
            "metrics": {k: {"points": [p.to_dict() for p in v.points]} for k, v in self.metrics.items()},
            "insights": [i.to_dict() for i in self.insights]
        }
        return json.dumps(data, indent=2, default=str)
