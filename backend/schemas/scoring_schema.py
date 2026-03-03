"""
Multi-factor Deterministic Scoring Engine JSON Schema
=====================================================
Comprehensive scoring schema combining all evaluation factors.
Fully explainable and auditable scoring system.
"""

SCORING_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "CandidateScoringInput",
    "description": "Input schema for multi-factor scoring engine",
    "type": "object",
    "required": ["candidate_id", "job_id", "evaluation_results"],
    "properties": {
        "candidate_id": {"type": "string"},
        "job_id": {"type": "string"},
        "evaluation_results": {
            "type": "object",
            "required": ["skill_evaluation", "impact_evaluation", "trajectory_analysis"],
            "properties": {
                "resume_parse": {
                    "type": "object",
                    "description": "Results from resume parsing module"
                },
                "skill_evaluation": {
                    "type": "object",
                    "description": "Results from skill depth evaluation module"
                },
                "impact_evaluation": {
                    "type": "object",
                    "description": "Results from impact authenticity module"
                },
                "trajectory_analysis": {
                    "type": "object",
                    "description": "Results from career trajectory module"
                },
                "ai_detection": {
                    "type": "object",
                    "description": "Results from AI detection module (if available)"
                }
            }
        },
        "scoring_config": {
            "type": "object",
            "properties": {
                "weight_overrides": {
                    "type": "object",
                    "description": "Custom weights for each factor",
                    "properties": {
                        "skills_weight": {"type": "number", "minimum": 0, "maximum": 1},
                        "impact_weight": {"type": "number", "minimum": 0, "maximum": 1},
                        "trajectory_weight": {"type": "number", "minimum": 0, "maximum": 1},
                        "experience_weight": {"type": "number", "minimum": 0, "maximum": 1}
                    }
                },
                "critical_requirements": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "requirement_type": {"type": "string"},
                            "threshold": {"type": "number"},
                            "is_must_have": {"type": "boolean"}
                        }
                    }
                },
                "scoring_model_version": {"type": "string"}
            }
        }
    }
}

SCORING_OUTPUT_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "CandidateScoringOutput",
    "description": "Comprehensive deterministic scoring output with full audit trail",
    "type": "object",
    "required": ["score_id", "timestamp", "final_score", "factor_scores", "recommendation"],
    "properties": {
        "score_id": {"type": "string"},
        "timestamp": {"type": "string", "format": "date-time"},
        "candidate_id": {"type": "string"},
        "job_id": {"type": "string"},
        "final_score": {
            "type": "object",
            "required": ["raw_score", "normalized_score", "percentile"],
            "properties": {
                "raw_score": {"type": "number"},
                "normalized_score": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 100,
                    "description": "Final normalized score 0-100"
                },
                "percentile": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 100,
                    "description": "Percentile among all candidates for this role"
                },
                "grade": {
                    "type": "string",
                    "enum": ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F"],
                    "description": "Letter grade based on score"
                },
                "tier": {
                    "type": "string",
                    "enum": ["tier_1_top_candidate", "tier_2_strong_candidate", "tier_3_qualified", "tier_4_consider", "tier_5_not_recommended"],
                    "description": "Candidate tier classification"
                }
            }
        },
        "factor_scores": {
            "type": "object",
            "required": ["skills", "impact", "trajectory"],
            "properties": {
                "skills": {
                    "type": "object",
                    "properties": {
                        "score": {"type": "number"},
                        "weight": {"type": "number"},
                        "weighted_contribution": {"type": "number"},
                        "critical_skills_met": {"type": "boolean"},
                        "details": {
                            "type": "object",
                            "properties": {
                                "technical_match_score": {"type": "number"},
                                "depth_score": {"type": "number"},
                                "breadth_score": {"type": "number"}
                            }
                        }
                    }
                },
                "impact": {
                    "type": "object",
                    "properties": {
                        "score": {"type": "number"},
                        "weight": {"type": "number"},
                        "weighted_contribution": {"type": "number"},
                        "authenticity_confidence": {"type": "number"},
                        "details": {
                            "type": "object",
                            "properties": {
                                "achievement_quality": {"type": "number"},
                                "quantification_score": {"type": "number"}
                            }
                        }
                    }
                },
                "trajectory": {
                    "type": "object",
                    "properties": {
                        "score": {"type": "number"},
                        "weight": {"type": "number"},
                        "weighted_contribution": {"type": "number"},
                        "trajectory_type": {"type": "string"},
                        "details": {
                            "type": "object",
                            "properties": {
                                "progression_score": {"type": "number"},
                                "stability_score": {"type": "number"},
                                "growth_momentum": {"type": "number"}
                            }
                        }
                    }
                },
                "experience": {
                    "type": "object",
                    "properties": {
                        "score": {"type": "number"},
                        "weight": {"type": "number"},
                        "weighted_contribution": {"type": "number"},
                        "total_years": {"type": "number"},
                        "relevant_years": {"type": "number"}
                    }
                },
                "ai_signal": {
                    "type": "object",
                    "properties": {
                        "score": {"type": "number"},
                        "signal_type": {"type": "string"},
                        "impact_on_overall": {
                            "type": "string",
                            "description": "How AI signal affects evaluation"
                        },
                        "verification_recommended": {"type": "boolean"}
                    }
                }
            }
        },
        "recommendation": {
            "type": "object",
            "required": ["decision", "confidence", "summary"],
            "properties": {
                "decision": {
                    "type": "string",
                    "enum": ["strongly_recommend", "recommend", "consider", "weak_consider", "not_recommended"],
                    "description": "Hiring recommendation"
                },
                "confidence": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 1,
                    "description": "Confidence in recommendation"
                },
                "summary": {
                    "type": "string",
                    "description": "Human-readable recommendation summary"
                },
                "key_strengths": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "key_concerns": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "interview_focus_areas": {
                    "type": "array",
                    "items": {"type": "string"}
                }
            }
        },
        "disqualification_check": {
            "type": "object",
            "properties": {
                "is_disqualified": {"type": "boolean"},
                "disqualification_reasons": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "reason": {"type": "string"},
                            "factor": {"type": "string"},
                            "threshold": {"type": "number"},
                            "actual": {"type": "number"}
                        }
                    }
                },
                "warning_flags": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "flag": {"type": "string"},
                            "severity": {"type": "string"},
                            "recommendation": {"type": "string"}
                        }
                    }
                }
            }
        },
        "score_breakdown": {
            "type": "object",
            "properties": {
                "base_score": {"type": "number"},
                "bonuses_applied": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "bonus_type": {"type": "string"},
                            "points": {"type": "number"},
                            "reason": {"type": "string"}
                        }
                    }
                },
                "penalties_applied": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "penalty_type": {"type": "string"},
                            "points": {"type": "number"},
                            "reason": {"type": "string"}
                        }
                    }
                },
                "final_adjusted_score": {"type": "number"}
            }
        },
        "comparative_context": {
            "type": "object",
            "properties": {
                "candidates_evaluated_for_role": {"type": "integer"},
                "rank": {"type": "integer"},
                "average_score": {"type": "number"},
                "top_score": {"type": "number"}
            }
        },
        "audit_trail": {
            "type": "object",
            "required": ["algorithm_version", "rules_applied", "timestamp"],
            "properties": {
                "algorithm_version": {"type": "string"},
                "scoring_model": {"type": "string"},
                "rules_applied": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "weight_configuration": {
                    "type": "object",
                    "properties": {
                        "skills": {"type": "number"},
                        "impact": {"type": "number"},
                        "trajectory": {"type": "number"},
                        "experience": {"type": "number"}
                    }
                },
                "data_quality_flags": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "explanation_available": {"type": "boolean"},
                "human_override_possible": {"type": "boolean"}
            }
        }
    }
}

# Example input
SCORING_INPUT_EXAMPLE = {
    "candidate_id": "CAND-2024-001",
    "job_id": "JOB-ENG-2024-042",
    "evaluation_results": {
        "skill_evaluation": {
            "overall_score": {"normalized_score": 86},
            "critical_skills_status": {"all_critical_met": True},
            "skill_depth_analysis": {"skill_depth_score": 82, "skill_breadth_score": 75}
        },
        "impact_evaluation": {
            "overall_impact_score": {"normalized_score": 78, "confidence": 0.72}
        },
        "trajectory_analysis": {
            "trajectory_score": {"overall_score": 82, "momentum_score": 85},
            "progression_analysis": {"total_experience_years": 7.5},
            "stability_indicators": {"job_hopping_risk": "medium"}
        },
        "ai_detection": {
            "overall_assessment": {"ai_likelihood_score": 28, "risk_level": "low"}
        }
    },
    "scoring_config": {
        "weight_overrides": {
            "skills_weight": 0.35,
            "impact_weight": 0.25,
            "trajectory_weight": 0.25,
            "experience_weight": 0.15
        },
        "scoring_model_version": "1.0.0"
    }
}

# Example output
SCORING_OUTPUT_EXAMPLE = {
    "score_id": "SCORE-2024-001-A3F2B1",
    "timestamp": "2024-01-15T10:36:45.890Z",
    "candidate_id": "CAND-2024-001",
    "job_id": "JOB-ENG-2024-042",
    "final_score": {
        "raw_score": 82.3,
        "normalized_score": 82,
        "percentile": 78,
        "grade": "A-",
        "tier": "tier_2_strong_candidate"
    },
    "factor_scores": {
        "skills": {
            "score": 86,
            "weight": 0.35,
            "weighted_contribution": 30.1,
            "critical_skills_met": True,
            "details": {
                "technical_match_score": 88,
                "depth_score": 82,
                "breadth_score": 75
            }
        },
        "impact": {
            "score": 78,
            "weight": 0.25,
            "weighted_contribution": 19.5,
            "authenticity_confidence": 0.72,
            "details": {
                "achievement_quality": 80,
                "quantification_score": 75
            }
        },
        "trajectory": {
            "score": 82,
            "weight": 0.25,
            "weighted_contribution": 20.5,
            "trajectory_type": "steady_upward",
            "details": {
                "progression_score": 85,
                "stability_score": 78,
                "growth_momentum": 85
            }
        },
        "experience": {
            "score": 85,
            "weight": 0.15,
            "weighted_contribution": 12.75,
            "total_years": 7.5,
            "relevant_years": 7.5
        },
        "ai_signal": {
            "score": 72,
            "signal_type": "low_ai_likelihood",
            "impact_on_overall": "neutral_to_positive",
            "verification_recommended": False
        }
    },
    "recommendation": {
        "decision": "recommend",
        "confidence": 0.82,
        "summary": "Strong candidate with solid technical skills, good career progression, and quantifiable achievements. All critical skill requirements met. Recommend advancing to technical interview stage.",
        "key_strengths": [
            "Expert-level Python experience exceeding requirements",
            "Clear upward career trajectory with internal promotion",
            "Strong quantifiable achievements with specific metrics",
            "Low AI-content signal suggesting authentic resume"
        ],
        "key_concerns": [
            "Some missing skills (Docker) - assess during interview",
            "Medium job-hopping risk due to variable tenure",
            "Limited management experience for potential leadership track"
        ],
        "interview_focus_areas": [
            "Verify depth of microservices architecture experience",
            "Assess Docker/containerization knowledge",
            "Explore leadership potential and management aspirations",
            "Validate specific achievement claims with technical details"
        ]
    },
    "disqualification_check": {
        "is_disqualified": False,
        "disqualification_reasons": [],
        "warning_flags": [
            {
                "flag": "variable_tenure",
                "severity": "info",
                "recommendation": "Discuss career motivations and tenure expectations during interview"
            }
        ]
    },
    "score_breakdown": {
        "base_score": 75.0,
        "bonuses_applied": [
            {
                "bonus_type": "critical_skills_met",
                "points": 5.0,
                "reason": "All critical skill requirements satisfied"
            },
            {
                "bonus_type": "strong_trajectory",
                "points": 2.3,
                "reason": "Steady upward career trajectory"
            }
        ],
        "penalties_applied": [],
        "final_adjusted_score": 82.3
    },
    "comparative_context": {
        "candidates_evaluated_for_role": 45,
        "rank": 8,
        "average_score": 68,
        "top_score": 91
    },
    "audit_trail": {
        "algorithm_version": "1.0.0",
        "scoring_model": "trajectiq_v1_deterministic",
        "rules_applied": [
            "weighted_factor_scoring",
            "critical_skill_requirement_check",
            "trajectory_bonus",
            "ai_signal_neutral_assessment"
        ],
        "weight_configuration": {
            "skills": 0.35,
            "impact": 0.25,
            "trajectory": 0.25,
            "experience": 0.15
        },
        "data_quality_flags": [],
        "explanation_available": True,
        "human_override_possible": True
    }
}
