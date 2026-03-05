"""
TrajectIQ Deterministic Evaluation Modules
==========================================
Layer 1 - Deterministic Core (Authoritative)

All scoring is deterministic, reproducible, and explainable.
No randomness allowed. All outputs structured JSON.
"""

import json
import re
import hashlib
from datetime import datetime, date
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
from abc import ABC, abstractmethod


class SkillClassification(Enum):
    MISSION_CRITICAL = "mission_critical"
    CORE = "core"
    SUPPORTING = "supporting"
    OPTIONAL = "optional"


class Grade(Enum):
    A_PLUS = "A+"
    A = "A"
    A_MINUS = "A-"
    B_PLUS = "B+"
    B = "B"
    B_MINUS = "B-"
    C_PLUS = "C+"
    C = "C"
    C_MINUS = "C-"
    D = "D"
    F = "F"


class Recommendation(Enum):
    STRONG_HIRE = "strong_hire"
    HIRE = "hire"
    CONSIDER = "consider"
    PASS = "pass"
    STRONG_PASS = "strong_pass"


@dataclass
class SkillScore:
    """Skill evaluation score"""
    name: str
    classification: SkillClassification
    depth_index: float  # 0-5
    years_experience: float
    proficiency_level: str
    match_score: float  # 0-1
    is_critical_met: bool
    explanation: str


@dataclass
class ImpactScore:
    """Impact authenticity score"""
    achievement_text: str
    impact_score: float  # 0-10
    authenticity_score: float  # 0-10
    has_quantifiable_metrics: bool
    verification_flags: List[str]
    explanation: str


@dataclass
class TrajectoryScore:
    """Career trajectory score"""
    overall_score: float  # 0-100
    momentum_score: float
    consistency_score: float
    trajectory_type: str
    promotions_count: int
    average_tenure_years: float
    job_hopping_risk: str
    management_experience: bool


@dataclass
class AIContentSignal:
    """AI content detection signal (advisory only)"""
    likelihood_score: float  # 0-100
    indicators: List[str]
    confidence: float
    recommendation: str  # Never used for auto-rejection


@dataclass
class HiringIndex:
    """Final deterministic hiring index"""
    overall_score: float  # 0-100
    grade: Grade
    tier: int  # 1-5
    recommendation: Recommendation
    skill_score: float
    impact_score: float
    trajectory_score: float
    experience_score: float
    ai_signal: float  # Advisory only
    key_strengths: List[str]
    key_concerns: List[str]
    explanation: str


class BaseEvaluator(ABC):
    """Base class for all evaluators"""
    
    @staticmethod
    def hash_content(content: str) -> str:
        """Generate deterministic hash"""
        return hashlib.sha256(content.encode()).hexdigest()
    
    @staticmethod
    def ensure_json_serializable(obj: Any) -> Any:
        """Ensure object is JSON serializable"""
        from dataclasses import asdict, is_dataclass
        
        if isinstance(obj, (date, datetime)):
            return obj.isoformat()
        elif isinstance(obj, Enum):
            return obj.value
        elif is_dataclass(obj) and not isinstance(obj, type):
            # Convert dataclass to dict
            return {k: BaseEvaluator.ensure_json_serializable(v) for k, v in asdict(obj).items()}
        elif isinstance(obj, dict):
            return {k: BaseEvaluator.ensure_json_serializable(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [BaseEvaluator.ensure_json_serializable(i) for i in obj]
        return obj
    
    @abstractmethod
    def evaluate(self, *args, **kwargs) -> Dict[str, Any]:
        """Perform evaluation - must be deterministic"""
        pass


class ResumeParser(BaseEvaluator):
    """
    Deterministic resume parsing.
    Extracts structured data without randomness.
    """
    
    # Section patterns (deterministic matching)
    SECTION_PATTERNS = {
        "experience": r"(?i)^.*(experience|employment|work history|professional).*$",
        "education": r"(?i)^.*(education|academic|qualifications|degree).*$",
        "skills": r"(?i)^.*(skills|technologies|competencies|expertise).*$",
        "projects": r"(?i)^.*(projects|portfolio|key projects).*$",
        "certifications": r"(?i)^.*(certifications|certificates|credentials).*$",
        "summary": r"(?i)^.*(summary|profile|objective|about).*$"
    }
    
    # Skill depth indicators
    PROFICIENCY_INDICATORS = {
        "expert": ["expert", "guru", "master", "architect", "principal", "10+", "10+ years"],
        "advanced": ["advanced", "senior", "experienced", "5+", "5+ years", "7+", "7+ years"],
        "intermediate": ["intermediate", "mid", "experienced", "3+", "3+ years"],
        "beginner": ["beginner", "junior", "entry", "learning", "familiar"]
    }
    
    def evaluate(self, resume_text: str) -> Dict[str, Any]:
        """Parse resume deterministically"""
        
        result = {
            "parse_id": f"PARSE-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "input_hash": self.hash_content(resume_text),
            "sections": {},
            "contact_info": {},
            "skills": {"technical": [], "soft": [], "languages": []},
            "experience": [],
            "education": [],
            "certifications": [],
            "confidence_score": 0.0
        }
        
        # Extract sections
        result["sections"] = self._extract_sections(resume_text)
        
        # Extract contact info
        result["contact_info"] = self._extract_contact_info(resume_text)
        
        # Extract skills
        result["skills"] = self._extract_skills(
            result["sections"].get("skills", ""),
            resume_text
        )
        
        # Extract experience
        result["experience"] = self._extract_experience(
            result["sections"].get("experience", "")
        )
        
        # Extract education
        result["education"] = self._extract_education(
            result["sections"].get("education", "")
        )
        
        # Calculate confidence
        result["confidence_score"] = self._calculate_confidence(result)
        
        # Output hash for audit
        result["output_hash"] = self.hash_content(json.dumps(result, default=str))
        
        return result
    
    def _extract_sections(self, text: str) -> Dict[str, str]:
        """Extract sections from resume text"""
        sections = {}
        lines = text.split('\n')
        
        current_section = "header"
        current_content = []
        
        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue
            
            # Check if this line is a section header
            found_section = None
            for section_name, pattern in self.SECTION_PATTERNS.items():
                if re.match(pattern, stripped):
                    # Save previous section
                    if current_content:
                        sections[current_section] = '\n'.join(current_content)
                    found_section = section_name
                    current_section = section_name
                    current_content = []
                    break
            
            if not found_section:
                current_content.append(stripped)
        
        # Save last section
        if current_content:
            sections[current_section] = '\n'.join(current_content)
        
        return sections
    
    def _extract_contact_info(self, text: str) -> Dict[str, str]:
        """Extract contact information"""
        contact = {
            "name": "",
            "email": "",
            "phone": "",
            "location": "",
            "linkedin": "",
            "github": ""
        }
        
        # Email pattern
        email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
        if email_match:
            contact["email"] = email_match.group()
        
        # Phone pattern
        phone_match = re.search(r'(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}', text)
        if phone_match:
            contact["phone"] = phone_match.group()
        
        # LinkedIn
        linkedin_match = re.search(r'linkedin\.com/in/[\w-]+', text, re.IGNORECASE)
        if linkedin_match:
            contact["linkedin"] = linkedin_match.group()
        
        # GitHub
        github_match = re.search(r'github\.com/[\w-]+', text, re.IGNORECASE)
        if github_match:
            contact["github"] = github_match.group()
        
        # Name (first non-empty line or before email)
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        for line in lines[:3]:
            if not re.search(r'[@\d]', line):  # No email or numbers
                contact["name"] = line.title()
                break
        
        return contact
    
    def _extract_skills(self, skills_section: str, full_text: str) -> Dict[str, List]:
        """Extract and categorize skills"""
        
        # Common technical skills (deterministic list)
        tech_skills = {
            "Programming": ["python", "java", "javascript", "typescript", "c++", "c#", "go", "rust", "ruby", "php", "swift", "kotlin", "scala", "r", "matlab"],
            "Frontend": ["react", "angular", "vue", "html", "css", "javascript", "typescript", "svelte", "next.js", "tailwind"],
            "Backend": ["node.js", "django", "flask", "fastapi", "spring", "express", "rails", "graphql", "rest"],
            "Database": ["sql", "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "dynamodb", "cassandra"],
            "Cloud": ["aws", "azure", "gcp", "heroku", "digitalocean", "cloudflare"],
            "DevOps": ["docker", "kubernetes", "jenkins", "git", "ci/cd", "terraform", "ansible", "prometheus", "grafana"],
            "Data Science": ["machine learning", "deep learning", "tensorflow", "pytorch", "pandas", "numpy", "scikit-learn", "spark", "hadoop"],
            "Infrastructure": ["linux", "nginx", "apache", "kafka", "rabbitmq", "microservices"]
        }
        
        soft_skills_list = [
            "leadership", "communication", "teamwork", "problem-solving", 
            "analytical", "creative", "adaptability", "time management",
            "project management", "collaboration", "mentoring"
        ]
        
        text_lower = (skills_section + " " + full_text).lower()
        
        technical = []
        for category, skills in tech_skills.items():
            for skill in skills:
                if skill in text_lower:
                    # Determine proficiency
                    proficiency = self._determine_proficiency(skill, text_lower)
                    years = self._extract_years(skill, text_lower)
                    
                    technical.append({
                        "name": skill.title(),
                        "category": category,
                        "proficiency": proficiency,
                        "years_experience": years
                    })
        
        soft = [s.title() for s in soft_skills_list if s in text_lower]
        
        return {"technical": technical, "soft": soft, "languages": []}
    
    def _determine_proficiency(self, skill: str, text: str) -> str:
        """Determine skill proficiency from text"""
        for level, indicators in self.PROFICIENCY_INDICATORS.items():
            for indicator in indicators:
                pattern = rf'{skill}[\s\-]*{re.escape(indicator)}'
                if re.search(pattern, text, re.IGNORECASE):
                    return level
        
        # Check years-based proficiency
        years = self._extract_years(skill, text)
        if years >= 7:
            return "expert"
        elif years >= 4:
            return "advanced"
        elif years >= 2:
            return "intermediate"
        
        return "intermediate"  # Default
    
    def _extract_years(self, skill: str, text: str) -> float:
        """Extract years of experience for skill"""
        pattern = rf'(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience\s+(?:with|in|using)\s+)?{re.escape(skill)}'
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return float(match.group(1))
        
        # Alternative pattern
        pattern = rf'{re.escape(skill)}[\s\-:]+(\d+)\+?\s*(?:years?|yrs?)'
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return float(match.group(1))
        
        return 0.0
    
    def _extract_experience(self, experience_section: str) -> List[Dict]:
        """Extract work experience"""
        if not experience_section:
            return []
        
        experiences = []
        
        # Split by company patterns
        entries = re.split(r'\n\s*\n|\n(?=[A-Z][^a-z]{0,10})', experience_section)
        
        for entry in entries:
            if len(entry.strip()) < 20:
                continue
            
            exp = {
                "company": "",
                "title": "",
                "start_date": "",
                "end_date": "",
                "is_current": False,
                "achievements": [],
                "technologies": []
            }
            
            lines = entry.strip().split('\n')
            
            if lines:
                first_line = lines[0]
                
                # Parse company | title pattern
                if "|" in first_line:
                    parts = first_line.split("|")
                    exp["company"] = parts[0].strip()
                    if len(parts) > 1:
                        exp["title"] = parts[1].strip()
                elif " - " in first_line or " – " in first_line:
                    parts = re.split(r'\s*[-–]\s*', first_line)
                    exp["company"] = parts[0].strip()
                    if len(parts) > 1:
                        exp["title"] = parts[1].strip()
                else:
                    exp["title"] = first_line.strip()
            
            # Check for current position
            if "present" in entry.lower() or "current" in entry.lower():
                exp["is_current"] = True
            
            # Extract achievements (bullet points)
            for line in lines[1:]:
                if line.strip().startswith(("•", "-", "*", "►")):
                    exp["achievements"].append(line.strip().lstrip("•-*► ").strip())
            
            if exp["company"] or exp["title"]:
                experiences.append(exp)
        
        return experiences
    
    def _extract_education(self, education_section: str) -> List[Dict]:
        """Extract education history"""
        if not education_section:
            return []
        
        education = []
        
        # Degree patterns
        degree_pattern = r"(Bachelor'?s?|Master'?s?|PhD|Ph\.?D\.?|MBA|BS|BA|MS|MA|MSc|BSc)[\s\w]*(?:in\s+)?([\w\s]+)?"
        
        for match in re.finditer(degree_pattern, education_section, re.IGNORECASE):
            degree = match.group(1)
            field = match.group(2) if match.group(2) else ""
            
            education.append({
                "degree": degree.strip(),
                "field": field.strip(),
                "institution": "",
                "year": ""
            })
        
        return education
    
    def _calculate_confidence(self, result: Dict) -> float:
        """Calculate parsing confidence score"""
        score = 0.0
        
        if result["contact_info"].get("name"):
            score += 0.2
        if result["contact_info"].get("email"):
            score += 0.15
        if result["experience"]:
            score += 0.25
        if result["education"]:
            score += 0.15
        if result["skills"]["technical"]:
            score += 0.15
        if result["sections"].get("skills"):
            score += 0.1
        
        return min(1.0, score)


class SkillEvaluator(BaseEvaluator):
    """
    Deterministic skill evaluation.
    Produces reproducible Skill Depth Index (0-5).
    """
    
    # Skill classification weights
    CLASSIFICATION_WEIGHTS = {
        SkillClassification.MISSION_CRITICAL: 1.0,
        SkillClassification.CORE: 0.75,
        SkillClassification.SUPPORTING: 0.5,
        SkillClassification.OPTIONAL: 0.25
    }
    
    # Proficiency to depth mapping
    PROFICIENCY_DEPTH = {
        "expert": 5.0,
        "advanced": 4.0,
        "intermediate": 3.0,
        "beginner": 1.5,
        "unknown": 2.0
    }
    
    def evaluate(
        self,
        candidate_skills: List[Dict],
        job_requirements: List[Dict],
        weights: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        Evaluate candidate skills against job requirements.
        
        Args:
            candidate_skills: List of candidate's skills
            job_requirements: List of required skills with classification
            weights: Optional custom weights
        
        Returns:
            Deterministic skill evaluation results
        """
        
        weights = weights or {"skills": 0.35}
        
        result = {
            "evaluation_id": f"SKILL-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "skill_scores": [],
            "overall_score": 0.0,
            "normalized_score": 0,
            "critical_skills_met": True,
            "critical_skills_unmet": [],
            "skill_depth_index": 0.0,
            "explanation": ""
        }
        
        # Track critical skills
        critical_met_count = 0
        critical_total = 0
        
        # Evaluate each required skill
        for req in job_requirements:
            req_name = req.get("name", "").lower()
            req_classification = SkillClassification(req.get("classification", "core"))
            req_min_years = req.get("minimum_years") or 0  # Handle None explicitly
            req_min_proficiency = req.get("minimum_proficiency") or "intermediate"
            is_critical = req.get("is_critical", False) or req_classification == SkillClassification.MISSION_CRITICAL
            
            # Find matching candidate skill
            matched_skill = self._find_skill_match(req_name, candidate_skills)
            
            if matched_skill:
                # Calculate depth index
                years = matched_skill.get("years_experience", 0) or 0
                proficiency = matched_skill.get("proficiency", "intermediate")
                
                depth_index = self._calculate_depth_index(years, proficiency)
                
                # Calculate match score
                years_met = years >= req_min_years
                prof_met = self.PROFICIENCY_DEPTH.get(proficiency, 2.0) >= self.PROFICIENCY_DEPTH.get(req_min_proficiency, 2.0)
                
                match_score = 0.0
                if years_met and prof_met:
                    match_score = min(1.0, depth_index / 5.0)
                elif years_met or prof_met:
                    match_score = 0.5 * min(1.0, depth_index / 5.0)
                
                skill_score = SkillScore(
                    name=req.get("name", ""),
                    classification=req_classification,
                    depth_index=depth_index,
                    years_experience=years,
                    proficiency_level=proficiency,
                    match_score=match_score,
                    is_critical_met=(is_critical and match_score >= 0.7),
                    explanation=self._generate_explanation(req, matched_skill, match_score)
                )
            else:
                skill_score = SkillScore(
                    name=req.get("name", ""),
                    classification=req_classification,
                    depth_index=0.0,
                    years_experience=0,
                    proficiency_level="none",
                    match_score=0.0,
                    is_critical_met=False,
                    explanation=f"No matching skill found for {req.get('name', '')}"
                )
            
            result["skill_scores"].append(self.ensure_json_serializable(skill_score))
            
            # Track critical skills
            if is_critical:
                critical_total += 1
                if skill_score.match_score >= 0.7:
                    critical_met_count += 1
                else:
                    result["critical_skills_unmet"].append(req.get("name", ""))
                    result["critical_skills_met"] = False
        
        # Calculate overall score
        if result["skill_scores"]:
            weighted_sum = 0.0
            weight_total = 0.0
            
            for score in result["skill_scores"]:
                weight = self.CLASSIFICATION_WEIGHTS.get(
                    SkillClassification(score["classification"]), 0.5
                )
                weighted_sum += score["match_score"] * weight
                weight_total += weight
            
            result["overall_score"] = weighted_sum / weight_total if weight_total > 0 else 0
            result["normalized_score"] = round(result["overall_score"] * 100)
        
        # Calculate average depth index
        if result["skill_scores"]:
            result["skill_depth_index"] = sum(
                s["depth_index"] for s in result["skill_scores"]
            ) / len(result["skill_scores"])
        
        # Generate explanation
        result["explanation"] = self._generate_overall_explanation(result, critical_met_count, critical_total)
        
        return result
    
    def _find_skill_match(self, required_skill: str, candidate_skills: List[Dict]) -> Optional[Dict]:
        """Find matching skill in candidate's skills"""
        required_lower = required_skill.lower()
        
        for skill in candidate_skills:
            skill_name = skill.get("name", "").lower()
            
            # Exact match
            if skill_name == required_lower:
                return skill
            
            # Partial match (contains)
            if required_lower in skill_name or skill_name in required_lower:
                return skill
        
        return None
    
    def _calculate_depth_index(self, years: float, proficiency: str) -> float:
        """
        Calculate Skill Depth Index (0-5).
        Based on years and proficiency level.
        """
        prof_depth = self.PROFICIENCY_DEPTH.get(proficiency, 2.0)
        
        # Years contribution (capped at 10 years for max score)
        years_contribution = min(1.0, years / 10.0) * 2.0
        
        # Combined depth index
        depth = (prof_depth * 0.7) + (years_contribution * 0.3)
        
        return min(5.0, max(0.0, depth))
    
    def _generate_explanation(self, req: Dict, matched: Dict, match_score: float) -> str:
        """Generate explanation for skill match"""
        req_name = req.get("name", "")
        matched_name = matched.get("name", req_name)
        years = matched.get("years_experience", 0) or 0
        proficiency = matched.get("proficiency", "intermediate")
        
        if match_score >= 0.9:
            return f"Excellent match: {matched_name} with {years} years at {proficiency} level"
        elif match_score >= 0.7:
            return f"Good match: {matched_name} with {years} years at {proficiency} level"
        elif match_score >= 0.5:
            return f"Partial match: {matched_name} with {years} years at {proficiency} level"
        else:
            return f"Below requirements for {req_name}"
    
    def _generate_overall_explanation(self, result: Dict, critical_met: int, critical_total: int) -> str:
        """Generate overall skill evaluation explanation"""
        score = result["normalized_score"]
        critical_met_flag = result["critical_skills_met"]
        
        parts = [f"Overall skill score: {score}/100"]
        
        if critical_total > 0:
            parts.append(f"Critical skills: {critical_met}/{critical_total} met")
        
        if critical_met_flag:
            parts.append("All critical skill requirements satisfied")
        else:
            parts.append(f"Missing critical skills: {', '.join(result['critical_skills_unmet'])}")
        
        return ". ".join(parts)


class ImpactScorer(BaseEvaluator):
    """
    Deterministic impact authenticity scoring.
    Produces Impact Score (0-10) with verification signals.
    """
    
    # Quantification patterns
    METRIC_PATTERNS = [
        r'\d+(?:\.\d+)?%',  # Percentage
        r'\$\d+(?:\.\d+)?[kmbKMB]?',  # Money
        r'\d+(?:,\d{3})*(?:\.\d+)?\s*(?:users?|customers?|clients?)',  # Users
        r'\d+(?:\.\d+)?x',  # Multipliers
    ]
    
    # Vague phrases to flag
    VAGUE_PHRASES = [
        "significant improvement", "substantial growth", "considerable impact",
        "major contribution", "helped with", "assisted in", "worked on"
    ]
    
    def evaluate(self, achievements: List[Dict]) -> Dict[str, Any]:
        """
        Evaluate impact of achievements.
        
        Args:
            achievements: List of achievement dicts with 'text' key
        
        Returns:
            Impact evaluation results
        """
        
        result = {
            "evaluation_id": f"IMPACT-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "achievement_scores": [],
            "overall_impact_score": 0.0,
            "overall_authenticity_score": 0.0,
            "quantified_count": 0,
            "vague_count": 0,
            "explanation": ""
        }
        
        total_impact = 0.0
        total_authenticity = 0.0
        
        for achievement in achievements:
            text = achievement.get("text", "")
            
            impact, authenticity, flags = self._evaluate_single_achievement(text)
            
            achievement_score = {
                "text": text[:100] + "..." if len(text) > 100 else text,
                "impact_score": impact,
                "authenticity_score": authenticity,
                "has_metrics": any(re.search(p, text) for p in self.METRIC_PATTERNS),
                "flags": flags
            }
            
            result["achievement_scores"].append(achievement_score)
            total_impact += impact
            total_authenticity += authenticity
            
            if achievement_score["has_metrics"]:
                result["quantified_count"] += 1
            
            if any(phrase in text.lower() for phrase in self.VAGUE_PHRASES):
                result["vague_count"] += 1
        
        count = len(achievements) if achievements else 1
        result["overall_impact_score"] = round(total_impact / count, 1)
        result["overall_authenticity_score"] = round(total_authenticity / count, 1)
        
        result["explanation"] = self._generate_explanation(result)
        
        return result
    
    def _evaluate_single_achievement(self, text: str) -> Tuple[float, float, List[str]]:
        """Evaluate single achievement for impact and authenticity"""
        
        impact = 5.0  # Base score
        authenticity = 5.0
        flags = []
        
        # Check for quantifiable metrics
        has_metrics = False
        for pattern in self.METRIC_PATTERNS:
            if re.search(pattern, text):
                has_metrics = True
                impact += 1.5
                authenticity += 0.5
                flags.append("quantifiable_metric")
                break
        
        if not has_metrics:
            flags.append("no_metrics")
        
        # Check for vague phrases
        for phrase in self.VAGUE_PHRASES:
            if phrase in text.lower():
                impact -= 0.5
                authenticity -= 0.3
                flags.append(f"vague_phrase:{phrase}")
        
        # Check for specific action verbs
        action_verbs = ["led", "developed", "implemented", "designed", "built", "created", "optimized", "reduced", "increased"]
        for verb in action_verbs:
            if f" {verb}" in text.lower() or f"{verb} " in text.lower():
                impact += 0.3
                flags.append(f"action_verb:{verb}")
        
        # Check for attribution clarity
        if any(word in text.lower() for word in ["i led", "i implemented", "my", "i developed"]):
            authenticity += 0.5
            flags.append("clear_attribution")
        elif any(word in text.lower() for word in ["we", "team", "assisted", "helped"]):
            authenticity -= 0.2
            flags.append("team_attribution")
        
        return max(0, min(10, impact)), max(0, min(10, authenticity)), flags
    
    def _generate_explanation(self, result: Dict) -> str:
        """Generate impact explanation"""
        parts = [
            f"Impact score: {result['overall_impact_score']}/10",
            f"Authenticity score: {result['overall_authenticity_score']}/10",
            f"{result['quantified_count']} quantified achievements"
        ]
        
        if result["vague_count"] > 0:
            parts.append(f"{result['vague_count']} achievements with vague phrasing")
        
        return ". ".join(parts)


class TrajectoryAnalyzer(BaseEvaluator):
    """
    Deterministic career trajectory analysis.
    Analyzes progression patterns and stability.
    """
    
    # Company tier classification
    COMPANY_TIERS = {
        "faang": ["google", "amazon", "apple", "meta", "facebook", "netflix", "microsoft"],
        "tier1": ["airbnb", "uber", "lyft", "stripe", "square", "spotify", "linkedin", "salesforce"],
        "tier2": ["adobe", "oracle", "ibm", "cisco", "intel", "vmware", "atlassian", "shopify"]
    }
    
    def evaluate(self, work_history: List[Dict]) -> Dict[str, Any]:
        """
        Analyze career trajectory.
        
        Args:
            work_history: List of work experience entries
        
        Returns:
            Trajectory analysis results
        """
        
        result = {
            "analysis_id": f"TRAJ-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "total_experience_years": 0.0,
            "companies_worked": 0,
            "average_tenure_years": 0.0,
            "promotions_count": 0,
            "momentum_score": 0.0,
            "consistency_score": 0.0,
            "overall_score": 0.0,
            "trajectory_type": "unknown",
            "job_hopping_risk": "low",
            "management_experience": False,
            "explanation": ""
        }
        
        if not work_history:
            return result
        
        # Calculate basic metrics
        result["companies_worked"] = len(set(
            exp.get("company", "").lower() for exp in work_history
        ))
        
        # Estimate experience years
        total_years = 0.0
        tenures = []
        
        for exp in work_history:
            tenure = self._estimate_tenure(exp)
            tenures.append(tenure)
            total_years += tenure
        
        result["total_experience_years"] = round(total_years, 1)
        result["average_tenure_years"] = round(
            total_years / len(work_history), 1
        ) if work_history else 0
        
        # Calculate momentum score
        result["momentum_score"] = self._calculate_momentum(work_history)
        
        # Calculate consistency score
        result["consistency_score"] = self._calculate_consistency(tenures)
        
        # Overall score
        result["overall_score"] = round(
            result["momentum_score"] * 0.6 + result["consistency_score"] * 0.4
        )
        
        # Determine trajectory type
        result["trajectory_type"] = self._determine_trajectory_type(result)
        
        # Job hopping risk
        if result["average_tenure_years"] < 1.0:
            result["job_hopping_risk"] = "very_high"
        elif result["average_tenure_years"] < 1.5:
            result["job_hopping_risk"] = "high"
        elif result["average_tenure_years"] < 2.0:
            result["job_hopping_risk"] = "medium"
        else:
            result["job_hopping_risk"] = "low"
        
        # Management experience
        management_keywords = ["manager", "director", "lead", "head", "vp", "chief", "supervisor"]
        result["management_experience"] = any(
            any(kw in exp.get("title", "").lower() for kw in management_keywords)
            for exp in work_history
        )
        
        result["explanation"] = self._generate_explanation(result)
        
        return result
    
    def _estimate_tenure(self, exp: Dict) -> float:
        """Estimate tenure from experience entry"""
        # Try to parse dates
        start = exp.get("start_date")
        end = exp.get("end_date")
        
        if exp.get("is_current"):
            end = datetime.utcnow().strftime("%Y")
        
        if start:
            try:
                start_year = int(re.search(r'\d{4}', str(start)).group())
                end_year = int(re.search(r'\d{4}', str(end)).group()) if end else datetime.utcnow().year
                return max(0.5, end_year - start_year)
            except (AttributeError, ValueError):
                pass
        
        # Default estimate
        return 2.0
    
    def _calculate_momentum(self, work_history: List[Dict]) -> float:
        """Calculate career momentum score"""
        if len(work_history) < 2:
            return 50.0
        
        score = 50.0
        
        # Check for progression in titles
        titles = [exp.get("title", "").lower() for exp in work_history]
        
        progression_indicators = ["senior", "lead", "principal", "staff", "manager", "director", "vp"]
        
        for i, title in enumerate(titles):
            for indicator in progression_indicators:
                if indicator in title:
                    # Bonus for progression indicators in later positions
                    score += (i + 1) * 3
                    break
        
        return min(100, max(0, score))
    
    def _calculate_consistency(self, tenures: List[float]) -> float:
        """Calculate consistency score based on tenure patterns"""
        if not tenures:
            return 50.0
        
        avg = sum(tenures) / len(tenures)
        
        # Penalize very short tenures
        if avg < 1.0:
            return 30.0
        elif avg < 1.5:
            return 45.0
        elif avg < 2.0:
            return 60.0
        elif avg < 3.0:
            return 75.0
        else:
            return 85.0
    
    def _determine_trajectory_type(self, result: Dict) -> str:
        """Determine trajectory type"""
        score = result["overall_score"]
        
        if score >= 80:
            return "strong_upward"
        elif score >= 65:
            return "steady_upward"
        elif score >= 50:
            return "stable"
        elif score >= 35:
            return "plateaued"
        else:
            return "inconsistent"
    
    def _generate_explanation(self, result: Dict) -> str:
        """Generate trajectory explanation"""
        parts = [
            f"{result['total_experience_years']} years experience across {result['companies_worked']} companies",
            f"Average tenure: {result['average_tenure_years']} years",
            f"Trajectory: {result['trajectory_type'].replace('_', ' ').title()}",
            f"Job hopping risk: {result['job_hopping_risk'].replace('_', ' ').title()}"
        ]
        
        if result["management_experience"]:
            parts.append("Has management experience")
        
        return ". ".join(parts)


class AIDetector(BaseEvaluator):
    """
    AI content detection (ADVISORY ONLY).
    Provides signals but NEVER used for automatic rejection.
    """
    
    # AI content indicators
    AI_INDICATORS = [
        "leveraging", "utilizing", "implementing", "facilitating",
        "synergy", "paradigm", "holistic", "comprehensive",
        "robust", "innovative", "cutting-edge", "state-of-the-art"
    ]
    
    def evaluate(self, text: str) -> Dict[str, Any]:
        """
        Detect potential AI-generated content.
        Advisory signal only - never for auto-rejection.
        """
        
        result = {
            "detection_id": f"AI-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "ai_likelihood_score": 0.0,  # 0-100
            "indicators": [],
            "confidence": 0.0,
            "recommendation": "ADVISORY ONLY - Review manually if score > 70",
            "disclaimer": "This is a heuristic signal only. Never use for automatic rejection."
        }
        
        if not text:
            return result
        
        text_lower = text.lower()
        
        # Count AI indicators
        indicator_count = 0
        for indicator in self.AI_INDICATORS:
            count = text_lower.count(indicator)
            if count > 0:
                indicator_count += count
                result["indicators"].append(f"{indicator}: {count} occurrences")
        
        # Calculate likelihood score
        text_length = len(text.split())
        indicator_density = indicator_count / max(text_length / 100, 1)
        
        result["ai_likelihood_score"] = min(100, indicator_density * 20)
        
        # Calculate confidence
        if indicator_count > 5:
            result["confidence"] = 0.7
        elif indicator_count > 2:
            result["confidence"] = 0.5
        else:
            result["confidence"] = 0.3
        
        return result


class ScoringEngine(BaseEvaluator):
    """
    Deterministic multi-factor scoring engine.
    Produces final Hiring Index with full explainability.
    """
    
    # Default weights
    DEFAULT_WEIGHTS = {
        "skills": 0.35,
        "impact": 0.25,
        "trajectory": 0.25,
        "experience": 0.15
    }
    
    # Grade thresholds
    GRADE_THRESHOLDS = [
        (95, Grade.A_PLUS),
        (90, Grade.A),
        (85, Grade.A_MINUS),
        (80, Grade.B_PLUS),
        (75, Grade.B),
        (70, Grade.B_MINUS),
        (65, Grade.C_PLUS),
        (60, Grade.C),
        (55, Grade.C_MINUS),
        (50, Grade.D),
    ]
    
    def evaluate(
        self,
        skill_result: Dict,
        impact_result: Dict,
        trajectory_result: Dict,
        ai_result: Dict,
        weights: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        Calculate final deterministic hiring index.
        
        Args:
            skill_result: Skill evaluation results
            impact_result: Impact evaluation results
            trajectory_result: Trajectory analysis results
            ai_result: AI detection results
            weights: Optional custom weights
        
        Returns:
            Final hiring index with full explanation
        """
        
        weights = weights or self.DEFAULT_WEIGHTS
        
        result = {
            "evaluation_id": f"SCORE-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "hiring_index": None,
            "grade": None,
            "tier": None,
            "recommendation": None,
            "component_scores": {},
            "key_strengths": [],
            "key_concerns": [],
            "explanation": ""
        }
        
        # Extract scores
        skill_score = skill_result.get("normalized_score", 0) / 100.0
        impact_score = impact_result.get("overall_impact_score", 0) / 10.0
        trajectory_score = trajectory_result.get("overall_score", 0) / 100.0
        ai_signal = ai_result.get("ai_likelihood_score", 0) / 100.0
        
        # Calculate experience score from trajectory
        experience_score = min(1.0, trajectory_result.get("total_experience_years", 0) / 10.0)
        
        # Store component scores
        result["component_scores"] = {
            "skill": round(skill_score * 100),
            "impact": round(impact_score * 100),
            "trajectory": round(trajectory_score * 100),
            "experience": round(experience_score * 100),
            "ai_signal": round(ai_signal * 100)
        }
        
        # Calculate weighted overall score
        weighted_score = (
            skill_score * weights.get("skills", 0.35) +
            impact_score * weights.get("impact", 0.25) +
            trajectory_score * weights.get("trajectory", 0.25) +
            experience_score * weights.get("experience", 0.15)
        )
        
        overall_score = round(weighted_score * 100)
        
        # Determine grade
        grade = Grade.F
        for threshold, g in self.GRADE_THRESHOLDS:
            if overall_score >= threshold:
                grade = g
                break
        
        # Determine tier
        if overall_score >= 85:
            tier = 1
        elif overall_score >= 75:
            tier = 2
        elif overall_score >= 60:
            tier = 3
        elif overall_score >= 45:
            tier = 4
        else:
            tier = 5
        
        # Determine recommendation
        if skill_result.get("critical_skills_met", True):
            if overall_score >= 85:
                recommendation = Recommendation.STRONG_HIRE
            elif overall_score >= 70:
                recommendation = Recommendation.HIRE
            elif overall_score >= 55:
                recommendation = Recommendation.CONSIDER
            else:
                recommendation = Recommendation.PASS
        else:
            if overall_score >= 60:
                recommendation = Recommendation.CONSIDER
            else:
                recommendation = Recommendation.STRONG_PASS
        
        # Extract strengths and concerns
        result["key_strengths"] = self._extract_strengths(
            skill_result, impact_result, trajectory_result
        )
        result["key_concerns"] = self._extract_concerns(
            skill_result, impact_result, trajectory_result, ai_result
        )
        
        # Build hiring index
        result["hiring_index"] = HiringIndex(
            overall_score=overall_score,
            grade=grade,
            tier=tier,
            recommendation=recommendation,
            skill_score=round(skill_score * 100),
            impact_score=round(impact_score * 100),
            trajectory_score=round(trajectory_score * 100),
            experience_score=round(experience_score * 100),
            ai_signal=round(ai_signal * 100),
            key_strengths=result["key_strengths"],
            key_concerns=result["key_concerns"],
            explanation=self._generate_explanation(
                result, overall_score, grade, recommendation, result["component_scores"]
            )
        )
        
        # Convert to serializable format
        result["hiring_index"] = self.ensure_json_serializable(result["hiring_index"])
        result["grade"] = grade.value
        result["tier"] = tier
        result["recommendation"] = recommendation.value
        
        return result
    
    def _extract_strengths(self, skill, impact, trajectory) -> List[str]:
        """Extract key strengths"""
        strengths = []
        
        if skill.get("normalized_score", 0) >= 80:
            strengths.append("Strong technical skill match")
        
        if impact.get("overall_impact_score", 0) >= 7:
            strengths.append("High-impact achievements demonstrated")
        
        if trajectory.get("trajectory_type") == "strong_upward":
            strengths.append("Excellent career progression")
        
        if trajectory.get("management_experience"):
            strengths.append("Management experience")
        
        if impact.get("quantified_count", 0) >= 3:
            strengths.append("Well-quantified achievements")
        
        return strengths[:5]  # Max 5
    
    def _extract_concerns(self, skill, impact, trajectory, ai) -> List[str]:
        """Extract key concerns"""
        concerns = []
        
        if not skill.get("critical_skills_met", True):
            concerns.append(f"Missing critical skills: {', '.join(skill.get('critical_skills_unmet', []))}")
        
        if trajectory.get("job_hopping_risk") in ["high", "very_high"]:
            concerns.append("Short tenure history detected")
        
        if impact.get("vague_count", 0) > 2:
            concerns.append("Several achievements lack specificity")
        
        if ai.get("ai_likelihood_score", 0) > 70:
            concerns.append("High AI-content signal (verify manually)")
        
        if trajectory.get("trajectory_type") == "declining":
            concerns.append("Career trajectory showing decline")
        
        return concerns[:5]  # Max 5
    
    def _generate_explanation(self, result: Dict, overall_score: int = None, grade: Grade = None, 
                               recommendation: Recommendation = None, component_scores: Dict = None) -> str:
        """Generate final explanation"""
        # Use passed parameters or fall back to result dict (for backward compatibility)
        if result.get("hiring_index") is not None:
            hi = result["hiring_index"]
            parts = [
                f"Hiring Index: {hi['overall_score']}/100 (Grade: {hi['grade']})",
                f"Tier: {result['tier']} | Recommendation: {result['recommendation'].replace('_', ' ').title()}",
                f"Skills: {hi['skill_score']}/100, Impact: {hi['impact_score']}/100",
                f"Trajectory: {hi['trajectory_score']}/100, Experience: {hi['experience_score']}/100"
            ]
        else:
            # Called before hiring_index is set - use direct values
            parts = [
                f"Hiring Index: {overall_score}/100 (Grade: {grade.value if grade else 'N/A'})",
                f"Tier: {result.get('tier', 'N/A')} | Recommendation: {recommendation.value.replace('_', ' ').title() if recommendation else 'N/A'}",
                f"Skills: {component_scores.get('skill', 0)}/100, Impact: {component_scores.get('impact', 0)}/100",
                f"Trajectory: {component_scores.get('trajectory', 0)}/100, Experience: {component_scores.get('experience', 0)}/100"
            ]
        
        if result.get("key_strengths"):
            parts.append(f"Key Strengths: {', '.join(result['key_strengths'][:3])}")
        
        if result.get("key_concerns"):
            parts.append(f"Concerns: {', '.join(result['key_concerns'][:2])}")
        
        return ". ".join(parts)


# Convenience function for full pipeline
def run_full_evaluation(
    resume_text: str,
    job_requirements: List[Dict],
    weights: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    """
    Run complete deterministic evaluation pipeline.
    
    Args:
        resume_text: Full resume text
        job_requirements: List of required skills
        weights: Optional custom weights
    
    Returns:
        Complete evaluation results
    """
    
    # Parse resume
    parser = ResumeParser()
    parsed = parser.evaluate(resume_text)
    
    # Evaluate skills
    skill_evaluator = SkillEvaluator()
    skill_result = skill_evaluator.evaluate(
        parsed["skills"]["technical"],
        job_requirements,
        weights
    )
    
    # Evaluate impact
    impact_scorer = ImpactScorer()
    achievements = [{"text": a} for exp in parsed["experience"] for a in exp.get("achievements", [])]
    impact_result = impact_scorer.evaluate(achievements)
    
    # Analyze trajectory
    trajectory_analyzer = TrajectoryAnalyzer()
    trajectory_result = trajectory_analyzer.evaluate(parsed["experience"])
    
    # Detect AI content
    ai_detector = AIDetector()
    ai_result = ai_detector.evaluate(resume_text)
    
    # Calculate final score
    scoring_engine = ScoringEngine()
    final_result = scoring_engine.evaluate(
        skill_result,
        impact_result,
        trajectory_result,
        ai_result,
        weights
    )
    
    # Combine results
    return {
        "evaluation_id": final_result["evaluation_id"],
        "timestamp": final_result["timestamp"],
        "resume_parse": parsed,
        "skill_evaluation": skill_result,
        "impact_evaluation": impact_result,
        "trajectory_analysis": trajectory_result,
        "ai_detection": ai_result,
        "final_scoring": final_result
    }
