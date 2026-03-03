"""
Impact Authenticity Scoring JSON Schema
=======================================
Schema for evaluating authenticity and impact of candidate achievements.
Deterministic scoring with clear audit trail.
"""

IMPACT_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "ImpactEvaluationInput",
    "description": "Input schema for impact authenticity evaluation",
    "type": "object",
    "required": ["candidate_id", "achievements"],
    "properties": {
        "candidate_id": {"type": "string"},
        "achievements": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["text", "context"],
                "properties": {
                    "text": {
                        "type": "string",
                        "description": "Full achievement text as written"
                    },
                    "context": {
                        "type": "object",
                        "properties": {
                            "company": {"type": "string"},
                            "role": {"type": "string"},
                            "team_size": {"type": "integer"},
                            "company_stage": {
                                "type": "string",
                                "enum": ["startup", "growth", "enterprise", "unknown"]
                            }
                        }
                    },
                    "claimed_metrics": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "value": {"type": "string"},
                                "unit": {"type": "string"},
                                "type": {
                                    "type": "string",
                                    "enum": ["percentage", "absolute", "time", "monetary", "user_count", "other"]
                                }
                            }
                        }
                    },
                    "verification_data": {
                        "type": "object",
                        "properties": {
                            "has_links": {"type": "boolean"},
                            "has_portfolio": {"type": "boolean"},
                            "reference_available": {"type": "boolean"}
                        }
                    }
                }
            }
        },
        "evaluation_config": {
            "type": "object",
            "properties": {
                "strict_mode": {"type": "boolean", "default": False},
                "industry_benchmarks": {
                    "type": "object",
                    "additionalProperties": {
                        "type": "object",
                        "properties": {
                            "typical_improvement_range": {"type": "string"},
                            "outlier_threshold": {"type": "number"}
                        }
                    }
                }
            }
        }
    }
}

IMPACT_OUTPUT_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "ImpactEvaluationOutput",
    "description": "Deterministic impact authenticity scoring results",
    "type": "object",
    "required": ["evaluation_id", "timestamp", "overall_impact_score", "achievements_evaluation"],
    "properties": {
        "evaluation_id": {"type": "string"},
        "timestamp": {"type": "string", "format": "date-time"},
        "candidate_id": {"type": "string"},
        "overall_impact_score": {
            "type": "object",
            "required": ["raw_score", "normalized_score", "confidence"],
            "properties": {
                "raw_score": {"type": "number"},
                "normalized_score": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 100
                },
                "confidence": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 1,
                    "description": "Confidence in impact score based on verifiability"
                },
                "grade": {
                    "type": "string",
                    "enum": ["exceptional", "strong", "moderate", "limited", "concerning"]
                }
            }
        },
        "achievements_evaluation": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["achievement_text", "impact_score", "authenticity_score", "flags"],
                "properties": {
                    "achievement_text": {"type": "string"},
                    "impact_score": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "Magnitude of claimed impact"
                    },
                    "authenticity_score": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 100,
                        "description": "Likelihood claim is accurate and attributable"
                    },
                    "verification_status": {
                        "type": "string",
                        "enum": ["verified", "partially_verifiable", "unverifiable", "flagged"]
                    },
                    "flags": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "type": {
                                    "type": "string",
                                    "enum": [
                                        "vague_metric",
                                        "unrealistic_claim",
                                        "missing_baseline",
                                        "unclear_attribution",
                                        "team_vs_individual",
                                        "percentage_without_absolute",
                                        "timeframe_unclear",
                                        "positive_flag",
                                        "quantifiable",
                                        "verifiable"
                                    ]
                                },
                                "severity": {
                                    "type": "string",
                                    "enum": ["info", "warning", "critical"]
                                },
                                "description": {"type": "string"}
                            }
                        }
                    },
                    "metrics_analysis": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "claimed_value": {"type": "string"},
                                "claimed_unit": {"type": "string"},
                                "type": {"type": "string"},
                                "plausibility": {
                                    "type": "string",
                                    "enum": ["highly_plausible", "plausible", "questionable", "unlikely"]
                                },
                                "context_adjustment": {
                                    "type": "string",
                                    "description": "How company context affects plausibility"
                                }
                            }
                        }
                    },
                    "attribution_analysis": {
                        "type": "object",
                        "properties": {
                            "attribution_clarity": {
                                "type": "string",
                                "enum": ["individual", "lead", "team_member", "unclear"]
                            },
                            "role_appropriate": {"type": "boolean"},
                            "explanation": {"type": "string"}
                        }
                    },
                    "improvement_suggestions": {
                        "type": "array",
                        "items": {"type": "string"}
                    }
                }
            }
        },
        "impact_patterns": {
            "type": "object",
            "properties": {
                "total_achievements_analyzed": {"type": "integer"},
                "quantified_achievements_count": {"type": "integer"},
                "high_impact_count": {"type": "integer"},
                "flagged_count": {"type": "integer"},
                "patterns_detected": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "pattern": {"type": "string"},
                            "occurrence_count": {"type": "integer"},
                            "impact_on_score": {"type": "number"}
                        }
                    }
                }
            }
        },
        "benchmark_comparison": {
            "type": "object",
            "properties": {
                "percentile_vs_industry": {"type": "number"},
                "typical_score_range": {"type": "string"},
                "outlier_status": {
                    "type": "string",
                    "enum": ["below_typical", "typical", "above_typical", "significant_outlier"]
                }
            }
        },
        "audit_trail": {
            "type": "object",
            "properties": {
                "algorithm_version": {"type": "string"},
                "rules_applied": {"type": "array", "items": {"type": "string"}},
                "confidence_factors": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "factor": {"type": "string"},
                            "impact": {"type": "number"}
                        }
                    }
                }
            }
        }
    }
}

# Example input
IMPACT_INPUT_EXAMPLE = {
    "candidate_id": "CAND-2024-001",
    "achievements": [
        {
            "text": "Reduced API latency by 40% through optimization of database queries and caching implementation",
            "context": {
                "company": "TechCorp Inc.",
                "role": "Senior Software Engineer",
                "team_size": 8,
                "company_stage": "growth"
            },
            "claimed_metrics": [
                {"value": "40%", "unit": "reduction", "type": "percentage"}
            ],
            "verification_data": {
                "has_links": False,
                "has_portfolio": False,
                "reference_available": True
            }
        },
        {
            "text": "Led migration of monolith to microservices architecture, improving deployment frequency by 10x",
            "context": {
                "company": "TechCorp Inc.",
                "role": "Senior Software Engineer",
                "team_size": 12,
                "company_stage": "growth"
            },
            "claimed_metrics": [
                {"value": "10x", "unit": "improvement", "type": "other"}
            ],
            "verification_data": {
                "has_links": False,
                "has_portfolio": False,
                "reference_available": True
            }
        }
    ]
}

# Example output
IMPACT_OUTPUT_EXAMPLE = {
    "evaluation_id": "IMPACT-EVAL-2024-001-A3F2B1",
    "timestamp": "2024-01-15T10:33:22.789Z",
    "candidate_id": "CAND-2024-001",
    "overall_impact_score": {
        "raw_score": 78.5,
        "normalized_score": 78,
        "confidence": 0.72,
        "grade": "strong"
    },
    "achievements_evaluation": [
        {
            "achievement_text": "Reduced API latency by 40% through optimization of database queries and caching implementation",
            "impact_score": 82,
            "authenticity_score": 75,
            "verification_status": "partially_verifiable",
            "flags": [
                {
                    "type": "quantifiable",
                    "severity": "info",
                    "description": "Achievement includes specific, quantifiable metric"
                },
                {
                    "type": "missing_baseline",
                    "severity": "warning",
                    "description": "Original latency value not provided for context"
                }
            ],
            "metrics_analysis": [
                {
                    "claimed_value": "40%",
                    "claimed_unit": "reduction",
                    "type": "percentage",
                    "plausibility": "plausible",
                    "context_adjustment": "40% improvement is reasonable for optimization work in growth-stage company"
                }
            ],
            "attribution_analysis": {
                "attribution_clarity": "individual",
                "role_appropriate": True,
                "explanation": "Clear individual contribution indicated by language used"
            },
            "improvement_suggestions": [
                "Add baseline metric (e.g., 'from 500ms to 300ms')",
                "Include specific technologies used in optimization"
            ]
        },
        {
            "achievement_text": "Led migration of monolith to microservices architecture, improving deployment frequency by 10x",
            "impact_score": 88,
            "authenticity_score": 70,
            "verification_status": "partially_verifiable",
            "flags": [
                {
                    "type": "positive_flag",
                    "severity": "info",
                    "description": "Leadership role clearly indicated"
                },
                {
                    "type": "percentage_without_absolute",
                    "severity": "warning",
                    "description": "10x improvement without baseline context"
                }
            ],
            "metrics_analysis": [
                {
                    "claimed_value": "10x",
                    "claimed_unit": "improvement",
                    "type": "other",
                    "plausibility": "plausible",
                    "context_adjustment": "10x improvement in deployment frequency is achievable with microservices adoption"
                }
            ],
            "attribution_analysis": {
                "attribution_clarity": "lead",
                "role_appropriate": True,
                "explanation": "'Led' indicates leadership role, team contribution implied"
            },
            "improvement_suggestions": [
                "Specify deployment frequency before and after (e.g., 'monthly to weekly')",
                "Mention specific technologies or patterns implemented"
            ]
        }
    ],
    "impact_patterns": {
        "total_achievements_analyzed": 2,
        "quantified_achievements_count": 2,
        "high_impact_count": 2,
        "flagged_count": 0,
        "patterns_detected": [
            {
                "pattern": "quantified_achievements",
                "occurrence_count": 2,
                "impact_on_score": 10.0
            },
            {
                "pattern": "leadership_indicated",
                "occurrence_count": 1,
                "impact_on_score": 5.0
            }
        ]
    },
    "benchmark_comparison": {
        "percentile_vs_industry": 72,
        "typical_score_range": "50-70",
        "outlier_status": "above_typical"
    },
    "audit_trail": {
        "algorithm_version": "1.0.0",
        "rules_applied": [
            "quantification_bonus",
            "baseline_context_penalty",
            "leadership_bonus",
            "reference_availability_bonus"
        ],
        "confidence_factors": [
            {"factor": "reference_available", "impact": 0.15},
            {"factor": "quantified_metrics", "impact": 0.20},
            {"factor": "missing_baselines", "impact": -0.10}
        ]
    }
}
