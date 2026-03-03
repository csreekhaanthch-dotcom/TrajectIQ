"""
Skill Depth & Critical Skill Evaluation JSON Schema
===================================================
Schema for evaluating skill depth, breadth, and critical skill matching.
Deterministic scoring based on explicit criteria.
"""

SKILL_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "SkillEvaluationInput",
    "description": "Input schema for skill depth evaluation",
    "type": "object",
    "required": ["candidate_skills", "job_requirements"],
    "properties": {
        "candidate_id": {"type": "string"},
        "candidate_skills": {
            "type": "object",
            "required": ["technical"],
            "properties": {
                "technical": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["name"],
                        "properties": {
                            "name": {"type": "string"},
                            "category": {"type": "string"},
                            "years_experience": {"type": "number", "minimum": 0},
                            "proficiency": {
                                "type": "string",
                                "enum": ["beginner", "intermediate", "advanced", "expert"]
                            },
                            "last_used_date": {"type": "string", "format": "date"},
                            "context": {"type": "string"},
                            "certifications": {
                                "type": "array",
                                "items": {"type": "string"}
                            }
                        }
                    }
                },
                "soft_skills": {
                    "type": "array",
                    "items": {"type": "string"}
                }
            }
        },
        "job_requirements": {
            "type": "object",
            "required": ["required_skills"],
            "properties": {
                "job_id": {"type": "string"},
                "job_title": {"type": "string"},
                "required_skills": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["name", "minimum_years", "minimum_proficiency"],
                        "properties": {
                            "name": {"type": "string"},
                            "category": {"type": "string"},
                            "minimum_years": {"type": "number", "minimum": 0},
                            "minimum_proficiency": {
                                "type": "string",
                                "enum": ["beginner", "intermediate", "advanced", "expert"]
                            },
                            "weight": {
                                "type": "number",
                                "minimum": 0,
                                "maximum": 1,
                                "default": 1.0,
                                "description": "Importance weight for scoring"
                            },
                            "is_critical": {
                                "type": "boolean",
                                "default": False,
                                "description": "Critical skill - must be met"
                            }
                        }
                    }
                },
                "preferred_skills": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "category": {"type": "string"},
                            "minimum_years": {"type": "number"},
                            "weight": {"type": "number"}
                        }
                    }
                },
                "skill_synonyms": {
                    "type": "object",
                    "description": "Mapping of skill names to their known synonyms",
                    "additionalProperties": {
                        "type": "array",
                        "items": {"type": "string"}
                    }
                }
            }
        },
        "evaluation_options": {
            "type": "object",
            "properties": {
                "include_soft_skills": {"type": "boolean", "default": True},
                "decay_factor": {
                    "type": "number",
                    "default": 0.1,
                    "description": "Skill decay per year of non-use"
                },
                "proficiency_weights": {
                    "type": "object",
                    "properties": {
                        "beginner": {"type": "number", "default": 0.25},
                        "intermediate": {"type": "number", "default": 0.5},
                        "advanced": {"type": "number", "default": 0.75},
                        "expert": {"type": "number", "default": 1.0}
                    }
                }
            }
        }
    }
}

SKILL_OUTPUT_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "SkillEvaluationOutput",
    "description": "Deterministic skill evaluation results with full explainability",
    "type": "object",
    "required": ["evaluation_id", "timestamp", "overall_score", "skill_matches", "critical_skills_status"],
    "properties": {
        "evaluation_id": {"type": "string"},
        "timestamp": {"type": "string", "format": "date-time"},
        "candidate_id": {"type": "string"},
        "job_id": {"type": "string"},
        "overall_score": {
            "type": "object",
            "required": ["raw_score", "weighted_score", "normalized_score"],
            "properties": {
                "raw_score": {
                    "type": "number",
                    "minimum": 0,
                    "description": "Sum of individual skill scores"
                },
                "weighted_score": {
                    "type": "number",
                    "minimum": 0,
                    "description": "Score after applying skill importance weights"
                },
                "normalized_score": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 100,
                    "description": "Final score normalized to 0-100 scale"
                },
                "percentile": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 100,
                    "description": "Percentile rank among evaluated candidates"
                }
            }
        },
        "skill_matches": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["required_skill", "match_status", "match_score"],
                "properties": {
                    "required_skill": {"type": "string"},
                    "skill_category": {"type": "string"},
                    "is_critical": {"type": "boolean"},
                    "weight": {"type": "number"},
                    "match_status": {
                        "type": "string",
                        "enum": ["exact_match", "synonym_match", "partial_match", "no_match"]
                    },
                    "matched_candidate_skill": {"type": "string"},
                    "match_score": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1,
                        "description": "0-1 score for this skill match"
                    },
                    "score_breakdown": {
                        "type": "object",
                        "properties": {
                            "years_score": {"type": "number"},
                            "proficiency_score": {"type": "number"},
                            "recency_score": {"type": "number"},
                            "context_score": {"type": "number"}
                        }
                    },
                    "requirements_met": {
                        "type": "object",
                        "properties": {
                            "years_requirement_met": {"type": "boolean"},
                            "proficiency_requirement_met": {"type": "boolean"},
                            "is_overqualified": {"type": "boolean"}
                        }
                    },
                    "explanation": {"type": "string"}
                }
            }
        },
        "critical_skills_status": {
            "type": "object",
            "required": ["all_critical_met", "critical_skills_count", "critical_skills_met_count"],
            "properties": {
                "all_critical_met": {
                    "type": "boolean",
                    "description": "Whether all critical skills requirements are satisfied"
                },
                "critical_skills_count": {"type": "integer"},
                "critical_skills_met_count": {"type": "integer"},
                "unmet_critical_skills": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "critical_skills_details": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "skill": {"type": "string"},
                            "met": {"type": "boolean"},
                            "match_score": {"type": "number"}
                        }
                    }
                }
            }
        },
        "skill_depth_analysis": {
            "type": "object",
            "properties": {
                "total_technical_skills": {"type": "integer"},
                "expert_level_skills": {"type": "integer"},
                "advanced_level_skills": {"type": "integer"},
                "average_years_per_skill": {"type": "number"},
                "skill_breadth_score": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 100,
                    "description": "Score based on variety of skill categories"
                },
                "skill_depth_score": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 100,
                    "description": "Score based on expertise depth"
                }
            }
        },
        "preferred_skills_bonus": {
            "type": "object",
            "properties": {
                "matched_count": {"type": "integer"},
                "total_count": {"type": "integer"},
                "bonus_points": {"type": "number"},
                "details": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "skill": {"type": "string"},
                            "matched": {"type": "boolean"}
                        }
                    }
                }
            }
        },
        "skill_gaps": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "skill": {"type": "string"},
                    "gap_type": {
                        "type": "string",
                        "enum": ["missing", "insufficient_years", "insufficient_proficiency"]
                    },
                    "current_level": {"type": "string"},
                    "required_level": {"type": "string"},
                    "years_gap": {"type": "number"},
                    "recommendation": {"type": "string"}
                }
            }
        },
        "audit_trail": {
            "type": "object",
            "properties": {
                "algorithm_version": {"type": "string"},
                "evaluation_criteria_hash": {"type": "string"},
                "scoring_breakdown_visible": {"type": "boolean"}
            }
        }
    }
}

# Example input
SKILL_INPUT_EXAMPLE = {
    "candidate_id": "CAND-2024-001",
    "candidate_skills": {
        "technical": [
            {"name": "Python", "category": "Programming", "years_experience": 8, "proficiency": "expert"},
            {"name": "Kubernetes", "category": "Infrastructure", "years_experience": 4, "proficiency": "advanced"},
            {"name": "PostgreSQL", "category": "Database", "years_experience": 6, "proficiency": "advanced"},
            {"name": "AWS", "category": "Cloud", "years_experience": 5, "proficiency": "advanced"}
        ],
        "soft_skills": ["Leadership", "Communication", "Problem Solving"]
    },
    "job_requirements": {
        "job_id": "JOB-ENG-2024-042",
        "job_title": "Senior Software Engineer",
        "required_skills": [
            {"name": "Python", "category": "Programming", "minimum_years": 5, "minimum_proficiency": "advanced", "weight": 1.0, "is_critical": True},
            {"name": "Kubernetes", "category": "Infrastructure", "minimum_years": 2, "minimum_proficiency": "intermediate", "weight": 0.8, "is_critical": True},
            {"name": "PostgreSQL", "category": "Database", "minimum_years": 3, "minimum_proficiency": "intermediate", "weight": 0.6, "is_critical": False},
            {"name": "Docker", "category": "Infrastructure", "minimum_years": 2, "minimum_proficiency": "intermediate", "weight": 0.5, "is_critical": False}
        ],
        "preferred_skills": [
            {"name": "AWS", "category": "Cloud", "minimum_years": 3, "weight": 0.3}
        ],
        "skill_synonyms": {
            "Python": ["python3", "py"],
            "Kubernetes": ["k8s", "kubernetes"],
            "AWS": ["Amazon Web Services", "amazon-web-services"]
        }
    }
}

# Example output
SKILL_OUTPUT_EXAMPLE = {
    "evaluation_id": "SKILL-EVAL-2024-001-A3F2B1",
    "timestamp": "2024-01-15T10:32:15.456Z",
    "candidate_id": "CAND-2024-001",
    "job_id": "JOB-ENG-2024-042",
    "overall_score": {
        "raw_score": 3.85,
        "weighted_score": 3.45,
        "normalized_score": 86,
        "percentile": 78
    },
    "skill_matches": [
        {
            "required_skill": "Python",
            "skill_category": "Programming",
            "is_critical": True,
            "weight": 1.0,
            "match_status": "exact_match",
            "matched_candidate_skill": "Python",
            "match_score": 1.0,
            "score_breakdown": {
                "years_score": 1.0,
                "proficiency_score": 1.0,
                "recency_score": 1.0,
                "context_score": 0.9
            },
            "requirements_met": {
                "years_requirement_met": True,
                "proficiency_requirement_met": True,
                "is_overqualified": True
            },
            "explanation": "Candidate has 8 years of Python experience (expert level), exceeding the 5-year advanced requirement."
        },
        {
            "required_skill": "Docker",
            "skill_category": "Infrastructure",
            "is_critical": False,
            "weight": 0.5,
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
            "explanation": "No Docker experience found in candidate profile."
        }
    ],
    "critical_skills_status": {
        "all_critical_met": True,
        "critical_skills_count": 2,
        "critical_skills_met_count": 2,
        "unmet_critical_skills": [],
        "critical_skills_details": [
            {"skill": "Python", "met": True, "match_score": 1.0},
            {"skill": "Kubernetes", "met": True, "match_score": 0.85}
        ]
    },
    "skill_depth_analysis": {
        "total_technical_skills": 4,
        "expert_level_skills": 1,
        "advanced_level_skills": 3,
        "average_years_per_skill": 5.75,
        "skill_breadth_score": 75,
        "skill_depth_score": 82
    },
    "preferred_skills_bonus": {
        "matched_count": 1,
        "total_count": 1,
        "bonus_points": 3.0,
        "details": [{"skill": "AWS", "matched": True}]
    },
    "skill_gaps": [
        {
            "skill": "Docker",
            "gap_type": "missing",
            "current_level": "none",
            "required_level": "intermediate",
            "years_gap": 2,
            "recommendation": "Consider Docker certification or hands-on containerization project"
        }
    ],
    "audit_trail": {
        "algorithm_version": "1.0.0",
        "evaluation_criteria_hash": "sha256:a1b2c3d4e5f6...",
        "scoring_breakdown_visible": True
    }
}
