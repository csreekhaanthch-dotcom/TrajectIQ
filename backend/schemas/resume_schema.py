"""
Resume Parser JSON Schema
=========================
Defines input and output schemas for resume parsing module.
Strict validation ensures deterministic parsing results.
"""

RESUME_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "ResumeInput",
    "description": "Input schema for resume parsing - accepts file path or raw content",
    "type": "object",
    "required": ["source_type", "content"],
    "properties": {
        "source_type": {
            "type": "string",
            "enum": ["file_path", "raw_text", "base64"],
            "description": "Type of input source"
        },
        "content": {
            "type": "string",
            "description": "File path, raw text, or base64 encoded content"
        },
        "file_extension": {
            "type": "string",
            "enum": ["pdf", "docx", "doc", "txt", "rtf"],
            "description": "File extension for proper parsing"
        },
        "metadata": {
            "type": "object",
            "properties": {
                "candidate_id": {"type": "string"},
                "source_system": {"type": "string"},
                "received_date": {"type": "string", "format": "date-time"},
                "job_id": {"type": "string"}
            }
        },
        "parsing_options": {
            "type": "object",
            "properties": {
                "extract_contact_info": {"type": "boolean", "default": True},
                "extract_education": {"type": "boolean", "default": True},
                "extract_experience": {"type": "boolean", "default": True},
                "extract_skills": {"type": "boolean", "default": True},
                "extract_certifications": {"type": "boolean", "default": True},
                "ocr_enabled": {"type": "boolean", "default": False}
            }
        }
    }
}

RESUME_OUTPUT_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "ResumeOutput",
    "description": "Parsed resume output with structured candidate information",
    "type": "object",
    "required": ["parse_id", "timestamp", "status", "candidate_info", "raw_sections"],
    "properties": {
        "parse_id": {
            "type": "string",
            "description": "Unique identifier for this parse operation"
        },
        "timestamp": {
            "type": "string",
            "format": "date-time",
            "description": "ISO 8601 timestamp of parsing"
        },
        "status": {
            "type": "string",
            "enum": ["success", "partial", "failed"]
        },
        "confidence_score": {
            "type": "number",
            "minimum": 0,
            "maximum": 1,
            "description": "Overall parsing confidence"
        },
        "candidate_info": {
            "type": "object",
            "required": ["full_name"],
            "properties": {
                "full_name": {
                    "type": "string",
                    "description": "Candidate's full name"
                },
                "email": {
                    "type": "string",
                    "format": "email",
                    "description": "Primary email address"
                },
                "phone": {
                    "type": "string",
                    "description": "Phone number"
                },
                "location": {
                    "type": "object",
                    "properties": {
                        "city": {"type": "string"},
                        "state": {"type": "string"},
                        "country": {"type": "string"},
                        "remote_work_eligible": {"type": "boolean"}
                    }
                },
                "linkedin_url": {"type": "string", "format": "uri"},
                "github_url": {"type": "string", "format": "uri"},
                "portfolio_url": {"type": "string", "format": "uri"},
                "summary": {
                    "type": "string",
                    "description": "Professional summary or objective"
                }
            }
        },
        "education": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["institution", "degree"],
                "properties": {
                    "institution": {"type": "string"},
                    "degree": {"type": "string"},
                    "field_of_study": {"type": "string"},
                    "start_date": {"type": "string"},
                    "end_date": {"type": "string"},
                    "gpa": {"type": "number"},
                    "honors": {"type": "array", "items": {"type": "string"}},
                    "is_complete": {"type": "boolean"}
                }
            }
        },
        "experience": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["company", "title", "start_date"],
                "properties": {
                    "company": {"type": "string"},
                    "title": {"type": "string"},
                    "location": {"type": "string"},
                    "start_date": {"type": "string"},
                    "end_date": {"type": "string"},
                    "is_current": {"type": "boolean"},
                    "employment_type": {
                        "type": "string",
                        "enum": ["full-time", "part-time", "contract", "freelance", "internship", "volunteer"]
                    },
                    "description": {"type": "string"},
                    "achievements": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "metrics": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "value": {"type": "string"},
                                            "unit": {"type": "string"},
                                            "context": {"type": "string"}
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "technologies_used": {
                        "type": "array",
                        "items": {"type": "string"}
                    }
                }
            }
        },
        "skills": {
            "type": "object",
            "properties": {
                "technical": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "category": {"type": "string"},
                            "years_experience": {"type": "number"},
                            "proficiency": {
                                "type": "string",
                                "enum": ["beginner", "intermediate", "advanced", "expert"]
                            },
                            "context": {"type": "string"}
                        }
                    }
                },
                "soft_skills": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "languages": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "language": {"type": "string"},
                            "proficiency": {"type": "string"}
                        }
                    }
                }
            }
        },
        "certifications": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "issuer": {"type": "string"},
                    "issue_date": {"type": "string"},
                    "expiry_date": {"type": "string"},
                    "credential_id": {"type": "string"},
                    "credential_url": {"type": "string"}
                }
            }
        },
        "projects": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "description": {"type": "string"},
                    "technologies": {"type": "array", "items": {"type": "string"}},
                    "url": {"type": "string"},
                    "start_date": {"type": "string"},
                    "end_date": {"type": "string"}
                }
            }
        },
        "raw_sections": {
            "type": "object",
            "description": "Raw text sections extracted from resume",
            "properties": {
                "header": {"type": "string"},
                "summary": {"type": "string"},
                "experience": {"type": "string"},
                "education": {"type": "string"},
                "skills": {"type": "string"},
                "other": {"type": "string"}
            }
        },
        "parsing_metadata": {
            "type": "object",
            "properties": {
                "parser_version": {"type": "string"},
                "processing_time_ms": {"type": "number"},
                "pages_processed": {"type": "integer"},
                "sections_found": {"type": "array", "items": {"type": "string"}},
                "warnings": {"type": "array", "items": {"type": "string"}}
            }
        }
    }
}

# Example input for testing
RESUME_INPUT_EXAMPLE = {
    "source_type": "file_path",
    "content": "/data/resumes/candidate_001.pdf",
    "file_extension": "pdf",
    "metadata": {
        "candidate_id": "CAND-2024-001",
        "source_system": "greenhouse",
        "received_date": "2024-01-15T10:30:00Z",
        "job_id": "JOB-ENG-2024-042"
    },
    "parsing_options": {
        "extract_contact_info": True,
        "extract_education": True,
        "extract_experience": True,
        "extract_skills": True,
        "extract_certifications": True,
        "ocr_enabled": False
    }
}

# Example output for testing
RESUME_OUTPUT_EXAMPLE = {
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
            "country": "USA",
            "remote_work_eligible": True
        },
        "linkedin_url": "https://linkedin.com/in/sarahchen",
        "github_url": "https://github.com/sarahchen",
        "summary": "Senior Software Engineer with 8+ years of experience building scalable distributed systems."
    },
    "education": [
        {
            "institution": "Stanford University",
            "degree": "Master of Science",
            "field_of_study": "Computer Science",
            "start_date": "2012-09",
            "end_date": "2014-06",
            "gpa": 3.9,
            "honors": ["Dean's List"],
            "is_complete": True
        }
    ],
    "experience": [
        {
            "company": "TechCorp Inc.",
            "title": "Senior Software Engineer",
            "location": "San Francisco, CA",
            "start_date": "2020-03",
            "end_date": None,
            "is_current": True,
            "employment_type": "full-time",
            "description": "Lead engineer for microservices architecture serving 10M+ users",
            "achievements": [
                {
                    "text": "Reduced API latency by 40% through optimization",
                    "metrics": [
                        {"value": "40%", "unit": "reduction", "context": "API latency"}
                    ]
                }
            ],
            "technologies_used": ["Python", "Kubernetes", "PostgreSQL", "Redis"]
        }
    ],
    "skills": {
        "technical": [
            {"name": "Python", "category": "Programming", "years_experience": 8, "proficiency": "expert"},
            {"name": "Kubernetes", "category": "Infrastructure", "years_experience": 4, "proficiency": "advanced"}
        ],
        "soft_skills": ["Leadership", "Communication", "Problem Solving"],
        "languages": [
            {"language": "English", "proficiency": "Native"},
            {"language": "Mandarin", "proficiency": "Fluent"}
        ]
    },
    "parsing_metadata": {
        "parser_version": "1.0.0",
        "processing_time_ms": 1234,
        "pages_processed": 2,
        "sections_found": ["header", "summary", "experience", "education", "skills"],
        "warnings": []
    }
}
