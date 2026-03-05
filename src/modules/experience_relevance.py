"""
TrajectIQ Enterprise - Experience Relevance Calculator
======================================================
Calculates Experience Relevance Ratio (ERR) - how relevant
candidate's experience is to the target role.
"""

import re
import json
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime


@dataclass
class ExperienceRelevanceResult:
    """Result of experience relevance calculation"""
    relevance_ratio: float  # 0.0 to 1.0
    relevant_years: float
    total_years: float
    relevant_positions: List[Dict[str, Any]]
    irrelevant_positions: List[Dict[str, Any]]
    skill_overlap_ratio: float
    industry_match: bool
    role_progression_match: bool
    explanation: str


class ExperienceRelevanceCalculator:
    """
    Calculates Experience Relevance Ratio (ERR).
    
    ERR = (Years of Relevant Experience / Total Years) × Skill Overlap Factor × Industry Factor
    
    This metric helps identify candidates whose experience directly translates
    to the target role, avoiding false positives from unrelated experience.
    """
    
    # Role families for similarity matching
    ROLE_FAMILIES = {
        "software_engineer": [
            "software engineer", "developer", "programmer", "software developer",
            "backend engineer", "frontend engineer", "full stack engineer",
            "fullstack engineer", "application developer"
        ],
        "data_scientist": [
            "data scientist", "machine learning engineer", "ml engineer",
            "data analyst", "analytics engineer", "research scientist",
            "ai engineer", "deep learning engineer"
        ],
        "devops": [
            "devops engineer", "sre", "site reliability engineer",
            "platform engineer", "infrastructure engineer", "cloud engineer",
            "systems engineer", "release engineer"
        ],
        "engineering_manager": [
            "engineering manager", "tech lead", "technical lead",
            "lead engineer", "staff engineer", "principal engineer",
            "director of engineering", "vp engineering"
        ],
        "product_manager": [
            "product manager", "product owner", "pm",
            "technical product manager", "senior product manager"
        ]
    }
    
    # Industry clusters for matching
    INDUSTRY_CLUSTERS = {
        "technology": [
            "technology", "software", "saas", "cloud", "startup",
            "fintech", "edtech", "healthtech", "tech"
        ],
        "finance": [
            "finance", "banking", "investment", "hedge fund",
            "trading", "fintech", "insurance", "financial"
        ],
        "healthcare": [
            "healthcare", "health", "medical", "biotech",
            "pharma", "healthtech", "hospital"
        ],
        "retail": [
            "retail", "ecommerce", "e-commerce", "consumer",
            "marketplace", "shopping"
        ]
    }
    
    # Skill domain mapping
    SKILL_DOMAINS = {
        "software_development": [
            "python", "java", "javascript", "typescript", "go", "rust",
            "react", "angular", "vue", "node.js", "django", "spring"
        ],
        "data_ml": [
            "machine learning", "deep learning", "tensorflow", "pytorch",
            "pandas", "numpy", "spark", "hadoop", "nlp", "computer vision"
        ],
        "devops_infra": [
            "kubernetes", "docker", "aws", "azure", "gcp", "terraform",
            "jenkins", "ci/cd", "linux", "prometheus", "grafana"
        ],
        "data_storage": [
            "sql", "postgresql", "mysql", "mongodb", "redis",
            "elasticsearch", "dynamodb", "cassandra", "kafka"
        ]
    }
    
    def calculate(
        self,
        work_history: List[Dict[str, Any]],
        target_role: str,
        target_industry: Optional[str] = None,
        required_skills: Optional[List[str]] = None,
        candidate_skills: Optional[List[Dict]] = None
    ) -> ExperienceRelevanceResult:
        """
        Calculate Experience Relevance Ratio.
        
        Args:
            work_history: List of work experience entries
            target_role: Target job title
            target_industry: Target industry (optional)
            required_skills: Required skills for role
            candidate_skills: Candidate's extracted skills
        
        Returns:
            ExperienceRelevanceResult with detailed breakdown
        """
        
        # Initialize tracking
        total_years = 0.0
        relevant_years = 0.0
        relevant_positions = []
        irrelevant_positions = []
        
        # Normalize target role
        target_role_lower = target_role.lower()
        target_family = self._get_role_family(target_role_lower)
        
        # Process each position
        for position in work_history:
            title = position.get("title", "").lower()
            years = self._estimate_years(position)
            total_years += years
            
            # Calculate relevance for this position
            relevance = self._calculate_position_relevance(
                title=title,
                company=position.get("company", ""),
                description=position.get("description", ""),
                achievements=position.get("achievements", []),
                target_family=target_family,
                target_role=target_role_lower,
                target_industry=target_industry,
                required_skills=required_skills,
                candidate_skills=candidate_skills
            )
            
            position_result = {
                "title": position.get("title", ""),
                "company": position.get("company", ""),
                "years": years,
                "relevance_score": relevance,
                "is_relevant": relevance >= 0.5
            }
            
            if relevance >= 0.5:
                relevant_years += years * relevance
                relevant_positions.append(position_result)
            else:
                irrelevant_positions.append(position_result)
        
        # Calculate skill overlap
        skill_overlap_ratio = self._calculate_skill_overlap(
            required_skills or [],
            candidate_skills or []
        )
        
        # Check industry match
        industry_match = False
        if target_industry:
            industry_match = self._check_industry_match(
                work_history,
                target_industry
            )
        
        # Check role progression
        role_progression_match = self._check_role_progression(
            work_history,
            target_role_lower
        )
        
        # Calculate final ERR
        if total_years > 0:
            base_ratio = relevant_years / total_years
        else:
            base_ratio = 0.0
        
        # Apply modifiers
        skill_modifier = 0.7 + (skill_overlap_ratio * 0.3)
        industry_modifier = 1.0 if industry_match or not target_industry else 0.85
        progression_modifier = 1.0 if role_progression_match else 0.9
        
        relevance_ratio = min(1.0, base_ratio * skill_modifier * industry_modifier * progression_modifier)
        
        # Generate explanation
        explanation = self._generate_explanation(
            relevance_ratio=relevance_ratio,
            relevant_years=relevant_years,
            total_years=total_years,
            skill_overlap_ratio=skill_overlap_ratio,
            industry_match=industry_match,
            role_progression_match=role_progression_match,
            relevant_count=len(relevant_positions),
            irrelevant_count=len(irrelevant_positions)
        )
        
        return ExperienceRelevanceResult(
            relevance_ratio=round(relevance_ratio, 3),
            relevant_years=round(relevant_years, 1),
            total_years=round(total_years, 1),
            relevant_positions=relevant_positions,
            irrelevant_positions=irrelevant_positions,
            skill_overlap_ratio=round(skill_overlap_ratio, 3),
            industry_match=industry_match,
            role_progression_match=role_progression_match,
            explanation=explanation
        )
    
    def _get_role_family(self, role: str) -> str:
        """Get the family for a role"""
        role_lower = role.lower()
        
        for family, roles in self.ROLE_FAMILIES.items():
            if role_lower in roles:
                return family
            for r in roles:
                if r in role_lower:
                    return family
        
        return "unknown"
    
    def _estimate_years(self, position: Dict) -> float:
        """Estimate years in position"""
        start = position.get("start_date")
        end = position.get("end_date")
        
        if start:
            try:
                start_year = int(re.search(r'\d{4}', str(start)).group())
                end_year = datetime.utcnow().year
                
                if end and not position.get("is_current"):
                    end_match = re.search(r'\d{4}', str(end))
                    if end_match:
                        end_year = int(end_match.group())
                
                return max(0.5, end_year - start_year)
            except:
                pass
        
        return 2.0  # Default assumption
    
    def _calculate_position_relevance(
        self,
        title: str,
        company: str,
        description: str,
        achievements: List,
        target_family: str,
        target_role: str,
        target_industry: Optional[str],
        required_skills: Optional[List[str]],
        candidate_skills: Optional[List[Dict]]
    ) -> float:
        """Calculate relevance score for a single position"""
        
        score = 0.0
        max_score = 0.0
        
        # Title match (weight: 40%)
        max_score += 40
        position_family = self._get_role_family(title)
        
        if position_family == target_family:
            score += 40
        elif any(word in title for word in ["senior", "lead", "principal", "staff"]):
            # Seniority keywords add partial credit
            score += 10
        elif position_family != "unknown":
            # Related family
            score += 15
        
        # Description/achievement skill match (weight: 30%)
        max_score += 30
        if required_skills:
            description_text = f"{description} {' '.join(str(a) for a in achievements)}".lower()
            matched_skills = sum(1 for s in required_skills if s.lower() in description_text)
            if matched_skills > 0:
                score += 30 * (matched_skills / len(required_skills))
        
        # Industry consideration (weight: 20%)
        max_score += 20
        if target_industry:
            if self._position_industry_match(company, description, target_industry):
                score += 20
        else:
            score += 20  # No industry requirement
        
        # Career progression (weight: 10%)
        max_score += 10
        if self._is_progression_toward_target(title, target_role):
            score += 10
        elif self._is_lateral_move(title, target_role):
            score += 5
        
        return score / max_score if max_score > 0 else 0.5
    
    def _position_industry_match(
        self,
        company: str,
        description: str,
        target_industry: str
    ) -> bool:
        """Check if position is in target industry"""
        target_lower = target_industry.lower()
        
        # Find target industry cluster
        target_cluster = None
        for cluster, industries in self.INDUSTRY_CLUSTERS.items():
            if target_lower in industries:
                target_cluster = cluster
                break
        
        if not target_cluster:
            return False
        
        # Check company/description for industry indicators
        combined = f"{company} {description}".lower()
        
        for industry in self.INDUSTRY_CLUSTERS.get(target_cluster, []):
            if industry in combined:
                return True
        
        return False
    
    def _is_progression_toward_target(self, current_title: str, target_title: str) -> bool:
        """Check if position represents progression toward target"""
        progression_keywords = ["junior", "mid", "senior", "lead", "staff", "principal"]
        
        current_level = 0
        target_level = 0
        
        for i, keyword in enumerate(progression_keywords):
            if keyword in current_title.lower():
                current_level = i
            if keyword in target_title.lower():
                target_level = i
        
        return current_level <= target_level
    
    def _is_lateral_move(self, current_title: str, target_title: str) -> bool:
        """Check if position is a lateral move"""
        current_family = self._get_role_family(current_title)
        target_family = self._get_role_family(target_title)
        
        return current_family == target_family
    
    def _calculate_skill_overlap(
        self,
        required_skills: List[str],
        candidate_skills: List[Dict]
    ) -> float:
        """Calculate overlap between required and candidate skills"""
        if not required_skills:
            return 1.0
        
        if not candidate_skills:
            return 0.0
        
        # Extract candidate skill names
        candidate_names = set()
        for skill in candidate_skills:
            if isinstance(skill, dict):
                candidate_names.add(skill.get("name", "").lower())
            else:
                candidate_names.add(str(skill).lower())
        
        # Calculate overlap
        required_lower = [s.lower() for s in required_skills]
        matched = sum(1 for s in required_lower if s in candidate_names)
        
        return matched / len(required_skills) if required_skills else 1.0
    
    def _check_industry_match(
        self,
        work_history: List[Dict],
        target_industry: str
    ) -> bool:
        """Check if candidate has experience in target industry"""
        target_lower = target_industry.lower()
        
        for position in work_history:
            company = position.get("company", "").lower()
            description = position.get("description", "").lower()
            
            combined = f"{company} {description}"
            
            # Check against industry clusters
            for cluster, industries in self.INDUSTRY_CLUSTERS.items():
                if target_lower in industries:
                    for industry in industries:
                        if industry in combined:
                            return True
        
        return False
    
    def _check_role_progression(
        self,
        work_history: List[Dict],
        target_role: str
    ) -> bool:
        """Check if work history shows progression toward target role"""
        if len(work_history) < 2:
            return True
        
        target_family = self._get_role_family(target_role)
        
        # Check if any recent role is in same family
        recent_roles = work_history[-2:]
        for role in recent_roles:
            title = role.get("title", "").lower()
            if self._get_role_family(title) == target_family:
                return True
        
        return False
    
    def _generate_explanation(
        self,
        relevance_ratio: float,
        relevant_years: float,
        total_years: float,
        skill_overlap_ratio: float,
        industry_match: bool,
        role_progression_match: bool,
        relevant_count: int,
        irrelevant_count: int
    ) -> str:
        """Generate human-readable explanation"""
        
        parts = []
        
        # Overall assessment
        if relevance_ratio >= 0.8:
            parts.append(f"Excellent relevance ({relevance_ratio:.0%}) - experience directly applies to target role.")
        elif relevance_ratio >= 0.6:
            parts.append(f"Good relevance ({relevance_ratio:.0%}) - most experience is applicable.")
        elif relevance_ratio >= 0.4:
            parts.append(f"Moderate relevance ({relevance_ratio:.0%}) - some transferable experience.")
        else:
            parts.append(f"Low relevance ({relevance_ratio:.0%}) - experience may not directly translate.")
        
        # Years breakdown
        parts.append(f"Relevant experience: {relevant_years:.1f} of {total_years:.1f} total years.")
        
        # Position breakdown
        parts.append(f"Relevant positions: {relevant_count}, Other positions: {irrelevant_count}.")
        
        # Skill overlap
        if skill_overlap_ratio >= 0.7:
            parts.append("Strong skill alignment with requirements.")
        elif skill_overlap_ratio >= 0.4:
            parts.append("Partial skill overlap - some gaps to address.")
        else:
            parts.append("Limited skill overlap - significant gaps exist.")
        
        # Industry/progression notes
        if industry_match:
            parts.append("Industry experience matches target sector.")
        
        if role_progression_match:
            parts.append("Career trajectory aligns with target role.")
        
        return " ".join(parts)


def calculate_experience_relevance_ratio(
    work_history: List[Dict],
    target_role: str,
    target_industry: Optional[str] = None,
    required_skills: Optional[List[str]] = None,
    candidate_skills: Optional[List[Dict]] = None
) -> ExperienceRelevanceResult:
    """
    Convenience function to calculate Experience Relevance Ratio.
    
    Args:
        work_history: List of work experience entries
        target_role: Target job title
        target_industry: Target industry (optional)
        required_skills: Required skills for role
        candidate_skills: Candidate's extracted skills
    
    Returns:
        ExperienceRelevanceResult with detailed breakdown
    """
    calculator = ExperienceRelevanceCalculator()
    return calculator.calculate(
        work_history=work_history,
        target_role=target_role,
        target_industry=target_industry,
        required_skills=required_skills,
        candidate_skills=candidate_skills
    )
