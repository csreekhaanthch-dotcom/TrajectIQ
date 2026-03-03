"""
Career Trajectory Analysis JSON Schema
======================================
Schema for analyzing career progression patterns and trajectory.
Deterministic analysis with clear progression metrics.
"""

TRAJECTORY_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "TrajectoryAnalysisInput",
    "description": "Input schema for career trajectory analysis",
    "type": "object",
    "required": ["candidate_id", "work_history"],
    "properties": {
        "candidate_id": {"type": "string"},
        "work_history": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["company", "title", "start_date"],
                "properties": {
                    "company": {"type": "string"},
                    "company_industry": {"type": "string"},
                    "company_size": {
                        "type": "string",
                        "enum": ["startup", "small", "medium", "large", "enterprise", "unknown"]
                    },
                    "title": {"type": "string"},
                    "level": {
                        "type": "string",
                        "enum": ["entry", "junior", "mid", "senior", "lead", "manager", "director", "vp", "c_level", "unknown"]
                    },
                    "start_date": {"type": "string"},
                    "end_date": {"type": "string"},
                    "is_current": {"type": "boolean"},
                    "employment_type": {
                        "type": "string",
                        "enum": ["full-time", "part-time", "contract", "freelance", "internship", "volunteer"]
                    },
                    "team_size_managed": {"type": "integer"},
                    "description": {"type": "string"},
                    "achievements": {
                        "type": "array",
                        "items": {"type": "string"}
                    }
                }
            }
        },
        "education_history": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "institution": {"type": "string"},
                    "degree": {"type": "string"},
                    "field_of_study": {"type": "string"},
                    "graduation_date": {"type": "string"}
                }
            }
        },
        "analysis_config": {
            "type": "object",
            "properties": {
                "target_role": {"type": "string"},
                "target_level": {"type": "string"},
                "industry_focus": {"type": "string"},
                "minimum_years_for_trend": {"type": "integer", "default": 3}
            }
        }
    }
}

TRAJECTORY_OUTPUT_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "TrajectoryAnalysisOutput",
    "description": "Deterministic career trajectory analysis results",
    "type": "object",
    "required": ["analysis_id", "timestamp", "trajectory_score", "progression_analysis"],
    "properties": {
        "analysis_id": {"type": "string"},
        "timestamp": {"type": "string", "format": "date-time"},
        "candidate_id": {"type": "string"},
        "trajectory_score": {
            "type": "object",
            "required": ["overall_score", "momentum_score", "consistency_score"],
            "properties": {
                "overall_score": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 100,
                    "description": "Overall trajectory quality score"
                },
                "momentum_score": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 100,
                    "description": "Score based on recent career momentum"
                },
                "consistency_score": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 100,
                    "description": "Score based on career stability and consistency"
                },
                "trajectory_type": {
                    "type": "string",
                    "enum": [
                        "strong_upward",
                        "steady_upward",
                        "stable",
                        "plateaued",
                        "declining",
                        "inconsistent",
                        "early_career",
                        "insufficient_data"
                    ]
                }
            }
        },
        "progression_analysis": {
            "type": "object",
            "required": ["total_experience_years", "positions_held"],
            "properties": {
                "total_experience_years": {"type": "number"},
                "positions_held": {"type": "integer"},
                "companies_worked": {"type": "integer"},
                "average_tenure_years": {"type": "number"},
                "longest_tenure_years": {"type": "number"},
                "shortest_tenure_years": {"type": "number"},
                "tenure_consistency": {
                    "type": "string",
                    "enum": ["consistent", "variable", "job_hopper", "stable"]
                },
                "level_progression": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "position": {"type": "integer"},
                            "title": {"type": "string"},
                            "level": {"type": "string"},
                            "level_score": {"type": "number"},
                            "is_promotion": {"type": "boolean"},
                            "is_lateral": {"type": "boolean"},
                            "is_step_back": {"type": "boolean"}
                        }
                    }
                },
                "promotions_count": {"type": "integer"},
                "lateral_moves_count": {"type": "integer"},
                "backward_moves_count": {"type": "integer"},
                "average_time_between_promotions_years": {"type": "number"}
            }
        },
        "company_trajectory": {
            "type": "object",
            "properties": {
                "company_progression": {
                    "type": "string",
                    "enum": ["upward", "mixed", "downward", "stable", "varied"]
                },
                "industry_changes": {"type": "integer"},
                "company_tier_progression": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "company": {"type": "string"},
                            "tier": {"type": "string"},
                            "tier_change": {"type": "string"}
                        }
                    }
                },
                "notable_companies": {
                    "type": "array",
                    "items": {"type": "string"}
                }
            }
        },
        "growth_patterns": {
            "type": "object",
            "properties": {
                "primary_growth_pattern": {
                    "type": "string",
                    "enum": [
                        "vertical_climber",
                        "specialist_deepener",
                        "generalist_broadener",
                        "company_loyalist",
                        "explorer",
                        "management_track",
                        "individual_contributor",
                        "mixed"
                    ]
                },
                "specialization_trend": {
                    "type": "string",
                    "enum": ["increasing", "stable", "decreasing", "varied"]
                },
                "responsibility_growth": {
                    "type": "string",
                    "enum": ["strong_growth", "moderate_growth", "stable", "limited_growth"]
                },
                "management_progression": {
                    "type": "object",
                    "properties": {
                        "has_management_experience": {"type": "boolean"},
                        "max_team_size": {"type": "integer"},
                        "management_years": {"type": "number"},
                        "management_trajectory": {
                            "type": "string",
                            "enum": ["growing", "stable", "none", "declining"]
                        }
                    }
                }
            }
        },
        "stability_indicators": {
            "type": "object",
            "properties": {
                "job_hopping_risk": {
                    "type": "string",
                    "enum": ["low", "medium", "high", "very_high"]
                },
                "stability_score": {"type": "number"},
                "red_flags": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "flag_type": {
                                "type": "string",
                                "enum": ["short_tenure", "unexplained_gap", "frequent_moves", "level_regression", "industry_hopping"]
                            },
                            "severity": {"type": "string"},
                            "details": {"type": "string"}
                        }
                    }
                },
                "positive_indicators": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "indicator_type": {
                                "type": "string",
                                "enum": ["long_tenure", "promotion_within_company", "increasing_responsibility", "relevant_progression"]
                            },
                            "details": {"type": "string"}
                        }
                    }
                }
            }
        },
        "fit_for_target": {
            "type": "object",
            "properties": {
                "target_role": {"type": "string"},
                "target_level": {"type": "string"},
                "readiness_score": {"type": "number"},
                "readiness_level": {
                    "type": "string",
                    "enum": ["overqualified", "ready_now", "near_ready", "developing", "not_ready"]
                },
                "gap_analysis": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "gap_type": {"type": "string"},
                            "current_state": {"type": "string"},
                            "required_state": {"type": "string"},
                            "recommendation": {"type": "string"}
                        }
                    }
                },
                "trajectory_alignment": {
                    "type": "string",
                    "enum": ["aligned", "partially_aligned", "divergent", "unknown"]
                }
            }
        },
        "predictions": {
            "type": "object",
            "properties": {
                "next_likely_role": {"type": "string"},
                "time_to_next_level_years": {"type": "number"},
                "retention_risk": {
                    "type": "string",
                    "enum": ["low", "medium", "high"]
                },
                "prediction_confidence": {"type": "number"}
            }
        },
        "audit_trail": {
            "type": "object",
            "properties": {
                "algorithm_version": {"type": "string"},
                "rules_applied": {"type": "array", "items": {"type": "string"}},
                "data_quality_score": {"type": "number"}
            }
        }
    }
}

# Example input
TRAJECTORY_INPUT_EXAMPLE = {
    "candidate_id": "CAND-2024-001",
    "work_history": [
        {
            "company": "StartupXYZ",
            "company_industry": "Fintech",
            "company_size": "startup",
            "title": "Junior Software Engineer",
            "level": "junior",
            "start_date": "2016-06",
            "end_date": "2018-03",
            "is_current": False,
            "employment_type": "full-time"
        },
        {
            "company": "TechCorp Inc.",
            "company_industry": "Technology",
            "company_size": "medium",
            "title": "Software Engineer",
            "level": "mid",
            "start_date": "2018-04",
            "end_date": "2020-02",
            "is_current": False,
            "employment_type": "full-time"
        },
        {
            "company": "TechCorp Inc.",
            "company_industry": "Technology",
            "company_size": "medium",
            "title": "Senior Software Engineer",
            "level": "senior",
            "start_date": "2020-03",
            "end_date": None,
            "is_current": True,
            "employment_type": "full-time",
            "team_size_managed": 3
        }
    ],
    "education_history": [
        {
            "institution": "Stanford University",
            "degree": "Master of Science",
            "field_of_study": "Computer Science",
            "graduation_date": "2016-05"
        }
    ],
    "analysis_config": {
        "target_role": "Staff Engineer",
        "target_level": "lead",
        "industry_focus": "Technology"
    }
}

# Example output
TRAJECTORY_OUTPUT_EXAMPLE = {
    "analysis_id": "TRAJ-ANALYSIS-2024-001-A3F2B1",
    "timestamp": "2024-01-15T10:34:18.234Z",
    "candidate_id": "CAND-2024-001",
    "trajectory_score": {
        "overall_score": 82,
        "momentum_score": 85,
        "consistency_score": 78,
        "trajectory_type": "steady_upward"
    },
    "progression_analysis": {
        "total_experience_years": 7.5,
        "positions_held": 3,
        "companies_worked": 2,
        "average_tenure_years": 2.5,
        "longest_tenure_years": 4.8,
        "shortest_tenure_years": 1.8,
        "tenure_consistency": "variable",
        "level_progression": [
            {
                "position": 1,
                "title": "Junior Software Engineer",
                "level": "junior",
                "level_score": 20,
                "is_promotion": False,
                "is_lateral": False,
                "is_step_back": False
            },
            {
                "position": 2,
                "title": "Software Engineer",
                "level": "mid",
                "level_score": 40,
                "is_promotion": True,
                "is_lateral": False,
                "is_step_back": False
            },
            {
                "position": 3,
                "title": "Senior Software Engineer",
                "level": "senior",
                "level_score": 60,
                "is_promotion": True,
                "is_lateral": False,
                "is_step_back": False
            }
        ],
        "promotions_count": 2,
        "lateral_moves_count": 0,
        "backward_moves_count": 0,
        "average_time_between_promotions_years": 3.75
    },
    "company_trajectory": {
        "company_progression": "upward",
        "industry_changes": 1,
        "company_tier_progression": [
            {"company": "StartupXYZ", "tier": "startup", "tier_change": "entry"},
            {"company": "TechCorp Inc.", "tier": "growth", "tier_change": "upward"}
        ],
        "notable_companies": ["TechCorp Inc."]
    },
    "growth_patterns": {
        "primary_growth_pattern": "vertical_climber",
        "specialization_trend": "stable",
        "responsibility_growth": "strong_growth",
        "management_progression": {
            "has_management_experience": True,
            "max_team_size": 3,
            "management_years": 0.8,
            "management_trajectory": "growing"
        }
    },
    "stability_indicators": {
        "job_hopping_risk": "medium",
        "stability_score": 72,
        "red_flags": [
            {
                "flag_type": "short_tenure",
                "severity": "info",
                "details": "First role had 1.8 year tenure, within acceptable range"
            }
        ],
        "positive_indicators": [
            {
                "indicator_type": "promotion_within_company",
                "details": "Promoted from Software Engineer to Senior Software Engineer at TechCorp"
            },
            {
                "indicator_type": "increasing_responsibility",
                "details": "Progression from individual contributor to managing team of 3"
            }
        ]
    },
    "fit_for_target": {
        "target_role": "Staff Engineer",
        "target_level": "lead",
        "readiness_score": 75,
        "readiness_level": "near_ready",
        "gap_analysis": [
            {
                "gap_type": "experience_level",
                "current_state": "Senior Engineer with 7.5 years",
                "required_state": "Typically 10+ years for Staff Engineer",
                "recommendation": "Consider for high-growth trajectory; may excel with mentorship"
            },
            {
                "gap_type": "management_scope",
                "current_state": "3 direct reports",
                "required_state": "5+ direct reports typical for Staff level",
                "recommendation": "Assess leadership potential through structured interview"
            }
        ],
        "trajectory_alignment": "aligned"
    },
    "predictions": {
        "next_likely_role": "Staff Engineer or Engineering Manager",
        "time_to_next_level_years": 1.5,
        "retention_risk": "medium",
        "prediction_confidence": 0.72
    },
    "audit_trail": {
        "algorithm_version": "1.0.0",
        "rules_applied": [
            "level_progression_scoring",
            "tenure_analysis",
            "company_tier_evaluation",
            "management_progression"
        ],
        "data_quality_score": 0.95
    }
}
