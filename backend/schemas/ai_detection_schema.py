"""
AI-Assistance Detection JSON Schema
===================================
Schema for heuristic detection of AI-generated or AI-assisted resume content.
IMPORTANT: This is a SIGNAL ONLY, never used for auto-rejection.
"""

AI_DETECTION_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "AIDetectionInput",
    "description": "Input schema for AI-assistance detection (heuristic analysis)",
    "type": "object",
    "required": ["candidate_id", "text_content"],
    "properties": {
        "candidate_id": {"type": "string"},
        "text_content": {
            "type": "object",
            "required": ["full_text"],
            "properties": {
                "full_text": {
                    "type": "string",
                    "description": "Complete resume text for analysis"
                },
                "sections": {
                    "type": "object",
                    "properties": {
                        "summary": {"type": "string"},
                        "experience": {"type": "string"},
                        "skills": {"type": "string"},
                        "achievements": {
                            "type": "array",
                            "items": {"type": "string"}
                        }
                    }
                }
            }
        },
        "detection_config": {
            "type": "object",
            "properties": {
                "sensitivity_level": {
                    "type": "string",
                    "enum": ["low", "medium", "high"],
                    "default": "medium"
                },
                "check_sections": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "enum": ["summary", "experience", "skills", "achievements", "cover_letter"]
                    },
                    "default": ["summary", "experience", "achievements"]
                },
                "include_positive_indicators": {
                    "type": "boolean",
                    "default": True,
                    "description": "Also check for indicators of authentic human writing"
                }
            }
        }
    }
}

AI_DETECTION_OUTPUT_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "AIDetectionOutput",
    "description": "Deterministic AI-assistance detection results - SIGNAL ONLY, not grounds for rejection",
    "type": "object",
    "required": ["detection_id", "timestamp", "overall_assessment", "heuristic_analysis"],
    "properties": {
        "detection_id": {"type": "string"},
        "timestamp": {"type": "string", "format": "date-time"},
        "candidate_id": {"type": "string"},
        "overall_assessment": {
            "type": "object",
            "required": ["ai_likelihood_score", "risk_level", "recommendation"],
            "properties": {
                "ai_likelihood_score": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 100,
                    "description": "Likelihood score for AI assistance (NOT a definitive determination)"
                },
                "risk_level": {
                    "type": "string",
                    "enum": ["minimal", "low", "moderate", "high"],
                    "description": "Risk level for AI assistance in resume content"
                },
                "recommendation": {
                    "type": "string",
                    "description": "Human-readable recommendation for reviewers"
                },
                "disclaimer": {
                    "type": "string",
                    "description": "Important: This is a heuristic signal, not proof of AI use"
                }
            }
        },
        "heuristic_analysis": {
            "type": "object",
            "required": ["pattern_matches", "statistical_indicators"],
            "properties": {
                "pattern_matches": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "pattern_type": {
                                "type": "string",
                                "enum": [
                                    "repetitive_structure",
                                    "generic_phrasing",
                                    "perfect_grammar",
                                    "uniform_sentence_length",
                                    "absence_of_typographical_errors",
                                    "over_polished_language",
                                    "template_like_formatting",
                                    "lacks_personal_voice",
                                    "excessive_action_verbs",
                                    "buzzword_density"
                                ]
                            },
                            "description": {"type": "string"},
                            "occurrence_count": {"type": "integer"},
                            "confidence": {"type": "number"},
                            "examples_found": {
                                "type": "array",
                                "items": {"type": "string"}
                            },
                            "impact_on_score": {"type": "number"}
                        }
                    }
                },
                "statistical_indicators": {
                    "type": "object",
                    "properties": {
                        "average_sentence_length": {"type": "number"},
                        "sentence_length_variance": {"type": "number"},
                        "vocabulary_diversity_score": {"type": "number"},
                        "rare_word_usage": {"type": "number"},
                        "passive_voice_ratio": {"type": "number"},
                        "first_person_pronoun_count": {"type": "integer"},
                        "quantified_statement_ratio": {"type": "number"}
                    }
                },
                "section_analysis": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "section_name": {"type": "string"},
                            "ai_likelihood": {"type": "number"},
                            "key_indicators": {
                                "type": "array",
                                "items": {"type": "string"}
                            }
                        }
                    }
                }
            }
        },
        "authenticity_indicators": {
            "type": "object",
            "properties": {
                "human_authenticity_score": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 100,
                    "description": "Indicators suggesting human-written content"
                },
                "positive_signals": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "signal_type": {
                                "type": "string",
                                "enum": [
                                    "specific_details",
                                    "unique_phrasing",
                                    "personal_anecdotes",
                                    "industry_jargon",
                                    "inconsistent_styling",
                                    "natural_imperfections",
                                    "specific_metrics_with_context",
                                    "unique_achievements"
                                ]
                            },
                            "description": {"type": "string"},
                            "examples": {
                                "type": "array",
                                "items": {"type": "string"}
                            },
                            "authenticity_boost": {"type": "number"}
                        }
                    }
                }
            }
        },
        "comparative_analysis": {
            "type": "object",
            "properties": {
                "similarity_to_known_ai_patterns": {"type": "number"},
                "similarity_to_known_human_patterns": {"type": "number"},
                "comparison_notes": {"type": "string"}
            }
        },
        "human_review_guidance": {
            "type": "object",
            "properties": {
                "sections_to_verify": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "suggested_interview_questions": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "verification_methods": {
                    "type": "array",
                    "items": {"type": "string"}
                }
            }
        },
        "audit_trail": {
            "type": "object",
            "properties": {
                "algorithm_version": {"type": "string"},
                "heuristics_applied": {"type": "array", "items": {"type": "string"}},
                "false_positive_disclaimer": {
                    "type": "string",
                    "description": "Reminder about false positive potential"
                }
            }
        }
    }
}

# Example input
AI_DETECTION_INPUT_EXAMPLE = {
    "candidate_id": "CAND-2024-001",
    "text_content": {
        "full_text": "Senior Software Engineer with 8+ years of experience building scalable distributed systems. Proven track record of leading high-impact projects that drive business value. Expertise in Python, Kubernetes, and cloud-native architectures. Passionate about mentoring junior engineers and fostering collaborative team environments.",
        "sections": {
            "summary": "Senior Software Engineer with 8+ years of experience building scalable distributed systems.",
            "experience": "Lead engineer for microservices architecture serving 10M+ users. Reduced API latency by 40%.",
            "achievements": [
                "Led migration of monolith to microservices architecture, improving deployment frequency by 10x",
                "Reduced API latency by 40% through optimization of database queries"
            ]
        }
    },
    "detection_config": {
        "sensitivity_level": "medium",
        "check_sections": ["summary", "experience", "achievements"],
        "include_positive_indicators": True
    }
}

# Example output
AI_DETECTION_OUTPUT_EXAMPLE = {
    "detection_id": "AI-DET-2024-001-A3F2B1",
    "timestamp": "2024-01-15T10:35:12.567Z",
    "candidate_id": "CAND-2024-001",
    "overall_assessment": {
        "ai_likelihood_score": 28,
        "risk_level": "low",
        "recommendation": "Low likelihood of AI-generated content. Resume shows natural language patterns with specific, quantifiable achievements. Standard review process recommended.",
        "disclaimer": "This is a heuristic analysis only. High-quality AI tools can produce undetectable content, and skilled writers may trigger false positives. Use as one signal among many in holistic candidate evaluation."
    },
    "heuristic_analysis": {
        "pattern_matches": [
            {
                "pattern_type": "generic_phrasing",
                "description": "Some generic phrases detected in summary",
                "occurrence_count": 2,
                "confidence": 0.4,
                "examples_found": [
                    "Proven track record",
                    "Passionate about"
                ],
                "impact_on_score": 5
            }
        ],
        "statistical_indicators": {
            "average_sentence_length": 14.2,
            "sentence_length_variance": 8.5,
            "vocabulary_diversity_score": 0.72,
            "rare_word_usage": 0.15,
            "passive_voice_ratio": 0.12,
            "first_person_pronoun_count": 0,
            "quantified_statement_ratio": 0.67
        },
        "section_analysis": [
            {
                "section_name": "summary",
                "ai_likelihood": 35,
                "key_indicators": ["generic_phrasing", "template_like_structure"]
            },
            {
                "section_name": "experience",
                "ai_likelihood": 20,
                "key_indicators": ["specific_metrics", "natural_language"]
            },
            {
                "section_name": "achievements",
                "ai_likelihood": 15,
                "key_indicators": ["quantified_outcomes", "specific_context"]
            }
        ]
    },
    "authenticity_indicators": {
        "human_authenticity_score": 72,
        "positive_signals": [
            {
                "signal_type": "specific_metrics_with_context",
                "description": "Achievements include specific, context-rich metrics",
                "examples": [
                    "Reduced API latency by 40% through optimization of database queries"
                ],
                "authenticity_boost": 15
            },
            {
                "signal_type": "unique_achievements",
                "description": "Contains unique, role-specific achievements unlikely to be AI-generated",
                "examples": [
                    "Led migration of monolith to microservices architecture"
                ],
                "authenticity_boost": 10
            }
        ]
    },
    "comparative_analysis": {
        "similarity_to_known_ai_patterns": 0.28,
        "similarity_to_known_human_patterns": 0.72,
        "comparison_notes": "Content patterns more closely align with human-written resumes in our analysis corpus."
    },
    "human_review_guidance": {
        "sections_to_verify": ["summary"],
        "suggested_interview_questions": [
            "Can you elaborate on the specific challenges you faced during the microservices migration?",
            "What was the baseline API latency before optimization, and how did you measure the improvement?"
        ],
        "verification_methods": [
            "Reference check to verify specific achievements",
            "Technical interview to assess depth of claimed expertise"
        ]
    },
    "audit_trail": {
        "algorithm_version": "1.0.0",
        "heuristics_applied": [
            "generic_phrase_detection",
            "sentence_pattern_analysis",
            "metric_authenticity_check",
            "vocabulary_diversity_analysis"
        ],
        "false_positive_disclaimer": "False positives may occur with candidates who are skilled writers or have used professional resume services. False negatives are possible with sophisticated AI tools. Always verify through interview process."
    }
}
