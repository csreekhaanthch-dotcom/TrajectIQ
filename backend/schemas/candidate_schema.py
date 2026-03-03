"""
Candidate Full Profile JSON Schema
==================================
Combined schema for complete candidate evaluation profile.
Aggregates all module outputs into unified candidate record.
"""

CANDIDATE_FULL_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "CandidateFullProfile",
    "description": "Complete candidate profile with all evaluation results",
    "type": "object",
    "required": ["profile_id", "candidate_id", "timestamp", "status", "resume_data", "evaluations", "final_scoring"],
    "properties": {
        "profile_id": {
            "type": "string",
            "description": "Unique identifier for this complete profile"
        },
        "candidate_id": {
            "type": "string",
            "description": "Candidate identifier from source system"
        },
        "timestamp": {
            "type": "string",
            "format": "date-time",
            "description": "When this profile was last updated"
        },
        "status": {
            "type": "string",
            "enum": ["pending", "processing", "complete", "error", "needs_review"]
        },
        "source_info": {
            "type": "object",
            "properties": {
                "source_system": {"type": "string"},
                "source_candidate_id": {"type": "string"},
                "import_timestamp": {"type": "string", "format": "date-time"},
                "resume_file_path": {"type": "string"}
            }
        },
        "resume_data": {
            "type": "object",
            "description": "Parsed resume data from Resume Parser module",
            "$ref": "resume_schema.py#/RESUME_OUTPUT_SCHEMA"
        },
        "evaluations": {
            "type": "object",
            "properties": {
                "skill_evaluation": {
                    "type": "object",
                    "description": "Skill evaluation from Skill Depth module",
                    "$ref": "skill_schema.py#/SKILL_OUTPUT_SCHEMA"
                },
                "impact_evaluation": {
                    "type": "object",
                    "description": "Impact authenticity evaluation",
                    "$ref": "impact_schema.py#/IMPACT_OUTPUT_SCHEMA"
                },
                "trajectory_analysis": {
                    "type": "object",
                    "description": "Career trajectory analysis",
                    "$ref": "trajectory_schema.py#/TRAJECTORY_OUTPUT_SCHEMA"
                },
                "ai_detection": {
                    "type": "object",
                    "description": "AI-assistance detection results",
                    "$ref": "ai_detection_schema.py#/AI_DETECTION_OUTPUT_SCHEMA"
                }
            }
        },
        "final_scoring": {
            "type": "object",
            "description": "Multi-factor scoring engine output",
            "$ref": "scoring_schema.py#/SCORING_OUTPUT_SCHEMA"
        },
        "pipeline_history": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "stage": {"type": "string"},
                    "stage_timestamp": {"type": "string", "format": "date-time"},
                    "status": {"type": "string"},
                    "notes": {"type": "string"},
                    "reviewer": {"type": "string"}
                }
            }
        },
        "audit_log": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "action": {"type": "string"},
                    "timestamp": {"type": "string", "format": "date-time"},
                    "actor": {"type": "string"},
                    "details": {"type": "object"}
                }
            }
        }
    }
}

# Example complete candidate profile
CANDIDATE_FULL_EXAMPLE = {
    "profile_id": "PROFILE-2024-001-A3F2B1",
    "candidate_id": "CAND-2024-001",
    "timestamp": "2024-01-15T10:40:00.000Z",
    "status": "complete",
    "source_info": {
        "source_system": "greenhouse",
        "source_candidate_id": "GH-123456",
        "import_timestamp": "2024-01-15T10:30:00.000Z",
        "resume_file_path": "/data/resumes/candidate_001.pdf"
    },
    "resume_data": {
        "parse_id": "PARSE-2024-001-A3F2B1",
        "timestamp": "2024-01-15T10:31:45.123Z",
        "status": "success",
        "confidence_score": 0.94,
        "candidate_info": {
            "full_name": "Sarah Chen",
            "email": "sarah.chen@email.com",
            "phone": "+1-555-123-4567",
            "location": {
                "city": "San Francisco",
                "state": "CA",
                "country": "USA"
            }
        }
    },
    "evaluations": {
        "skill_evaluation": {
            "evaluation_id": "SKILL-EVAL-2024-001",
            "overall_score": {"normalized_score": 86}
        },
        "impact_evaluation": {
            "evaluation_id": "IMPACT-EVAL-2024-001",
            "overall_impact_score": {"normalized_score": 78}
        },
        "trajectory_analysis": {
            "analysis_id": "TRAJ-ANALYSIS-2024-001",
            "trajectory_score": {"overall_score": 82}
        },
        "ai_detection": {
            "detection_id": "AI-DET-2024-001",
            "overall_assessment": {"ai_likelihood_score": 28}
        }
    },
    "final_scoring": {
        "score_id": "SCORE-2024-001",
        "final_score": {"normalized_score": 82, "grade": "A-", "tier": "tier_2_strong_candidate"},
        "recommendation": {
            "decision": "recommend",
            "confidence": 0.82,
            "summary": "Strong candidate with solid technical skills and good career progression."
        }
    },
    "pipeline_history": [
        {
            "stage": "application_received",
            "stage_timestamp": "2024-01-15T10:30:00.000Z",
            "status": "completed"
        },
        {
            "stage": "resume_screening",
            "stage_timestamp": "2024-01-15T10:40:00.000Z",
            "status": "passed"
        }
    ],
    "audit_log": [
        {
            "action": "profile_created",
            "timestamp": "2024-01-15T10:30:00.000Z",
            "actor": "system",
            "details": {"source": "greenhouse_import"}
        },
        {
            "action": "evaluation_completed",
            "timestamp": "2024-01-15T10:40:00.000Z",
            "actor": "system",
            "details": {"all_modules": "complete"}
        }
    ]
}
