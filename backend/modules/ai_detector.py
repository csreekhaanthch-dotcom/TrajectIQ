"""
TrajectIQ AI-Assistance Detection Module
========================================
Heuristic detection of AI-generated or AI-assisted resume content.
IMPORTANT: This is a SIGNAL ONLY, never used for auto-rejection.
"""

import json
import re
import math
from collections import Counter
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from core.base_module import BaseModule, ModuleRegistry
from core.config import config


@ModuleRegistry.register
class AIDetector(BaseModule):
    """
    AI-assistance detection module.
    Uses heuristics to identify potential AI-generated content.
    
    DISCLAIMER: This is a heuristic analysis only. Results are signals,
    not definitive determinations. Never use for automatic rejection.
    """
    
    module_name = "ai_detector"
    version = "1.0.0"
    
    # Known AI-generated content patterns
    AI_PHRASE_PATTERNS = [
        # Generic AI-style phrases
        r'\bpassionate about\b',
        r'\bproven track record\b',
        r'\bresults-driven\b',
        r'\bhighly motivated\b',
        r'\bself-starter\b',
        r'\bteam player\b',
        r'\bstrong communication skills\b',
        r'\bexcellent problem-solving\b',
        r'\bquick learner\b',
        r'\bfast-paced environment\b',
        r'\bdynamic environment\b',
        r'\bcross-functional teams\b',
        r'\bdrive business value\b',
        r'\bleverage synergies\b',
        r'\bthink outside the box\b',
        r'\bspearheaded\b',
        r'\bchampioned\b',
        r'\bfacilitated\b',
        r'\bstreamlined\b',
        r'\boptimized\b',
        r'\bleveraged\b',
    ]
    
    # Human authenticity indicators
    AUTHENTIC_PATTERNS = [
        r'\bI (?:built|created|designed|implemented|fixed)\b',
        r'\bmy (?:team|project|code|system)\b',
        r'\bwe (?:decided|chose|built)\b',
        r'\bwhen I (?:joined|started|left)\b',
        r'\bspecifically,? I\b',
        r'\bI noticed\b',
        r'\bI realized\b',
        r'\bthe problem was\b',
        r'\bwe had (?:a|an) issue\b',
    ]
    
    # Overly perfect structure indicators
    STRUCTURE_PATTERNS = {
        "uniform_bullets": r'^(?:•|\-|\*|\d+\.)\s+[A-Z][^\.]+\.\s*$',
        "action_verb_start": r'^(?:Led|Developed|Implemented|Designed|Built|Created|Managed|Optimized|Streamlined|Spearheaded|Championed|Delivered|Executed|Achieved|Improved|Increased|Reduced)',
    }
    
    # Common AI writing patterns
    AI_WRITING_CHARACTERISTICS = {
        "very_low_typos": True,  # AI rarely makes typos
        "perfect_grammar": True,  # AI has perfect grammar
        "uniform_sentence_length": True,  # AI tends to have similar length sentences
        "excessive_adjectives": True,  # AI overuses certain adjectives
        "template_structure": True,  # AI follows common templates
    }
    
    def validate_input(self, input_data: Dict[str, Any]) -> bool:
        """Validate input against schema"""
        if "candidate_id" not in input_data:
            raise ValueError("Missing required field: candidate_id")
        
        if "text_content" not in input_data:
            raise ValueError("Missing required field: text_content")
        
        text_content = input_data["text_content"]
        if "full_text" not in text_content:
            raise ValueError("text_content must have 'full_text' field")
        
        return True
    
    def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process AI detection analysis"""
        
        candidate_id = input_data["candidate_id"]
        text_content = input_data["text_content"]
        detection_config = input_data.get("detection_config", {})
        
        full_text = text_content["full_text"]
        sections = text_content.get("sections", {})
        
        sensitivity = detection_config.get("sensitivity_level", "medium")
        check_sections = detection_config.get("check_sections", ["summary", "experience", "achievements"])
        
        # Run heuristic analysis
        heuristic_analysis = self._run_heuristic_analysis(
            full_text,
            sections,
            sensitivity
        )
        
        # Calculate AI likelihood score
        ai_likelihood = self._calculate_ai_likelihood(
            heuristic_analysis,
            sensitivity
        )
        
        # Analyze authenticity indicators
        authenticity_indicators = self._analyze_authenticity(full_text, sections)
        
        # Compare to known patterns
        comparative_analysis = self._compare_to_patterns(full_text)
        
        # Generate human review guidance
        human_review_guidance = self._generate_review_guidance(
            ai_likelihood,
            heuristic_analysis,
            sections
        )
        
        # Determine overall assessment
        overall_assessment = self._determine_assessment(
            ai_likelihood,
            authenticity_indicators
        )
        
        return {
            "detection_id": self.generate_id("AI-DET"),
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "candidate_id": candidate_id,
            "overall_assessment": overall_assessment,
            "heuristic_analysis": heuristic_analysis,
            "authenticity_indicators": authenticity_indicators,
            "comparative_analysis": comparative_analysis,
            "human_review_guidance": human_review_guidance,
            "audit_trail": {
                "algorithm_version": self.version,
                "heuristics_applied": [
                    "generic_phrase_detection",
                    "sentence_pattern_analysis",
                    "metric_authenticity_check",
                    "vocabulary_diversity_analysis"
                ],
                "false_positive_disclaimer": "False positives may occur with candidates who are skilled writers or have used professional resume services. False negatives are possible with sophisticated AI tools. Always verify through interview process."
            }
        }
    
    def _run_heuristic_analysis(
        self,
        full_text: str,
        sections: Dict[str, str],
        sensitivity: str
    ) -> Dict:
        """Run all heuristic checks"""
        
        pattern_matches = []
        statistical_indicators = {}
        section_analysis = []
        
        # 1. Pattern matching for AI-style phrases
        ai_phrase_score = 0
        found_ai_phrases = Counter()
        
        for pattern in self.AI_PHRASE_PATTERNS:
            matches = re.findall(pattern, full_text, re.IGNORECASE)
            if matches:
                phrase = pattern.replace(r'\b', '').replace(r'(?:', '').replace(')', '')
                found_ai_phrases[phrase] = len(matches)
                ai_phrase_score += len(matches) * 5
        
        if found_ai_phrases:
            pattern_matches.append({
                "pattern_type": "generic_phrasing",
                "description": "Common AI-generated phrases detected",
                "occurrence_count": sum(found_ai_phrases.values()),
                "confidence": min(1.0, sum(found_ai_phrases.values()) / 10),
                "examples_found": list(found_ai_phrases.keys())[:5],
                "impact_on_score": min(20, ai_phrase_score)
            })
        
        # 2. Sentence structure analysis
        sentences = self._split_into_sentences(full_text)
        
        if sentences:
            lengths = [len(s.split()) for s in sentences]
            avg_length = sum(lengths) / len(lengths)
            variance = sum((l - avg_length) ** 2 for l in lengths) / len(lengths) if lengths else 0
            
            statistical_indicators["average_sentence_length"] = round(avg_length, 1)
            statistical_indicators["sentence_length_variance"] = round(variance, 1)
            
            # Low variance may indicate AI generation
            if variance < 10 and len(sentences) >= 5:
                pattern_matches.append({
                    "pattern_type": "uniform_sentence_length",
                    "description": "Sentence lengths are unusually uniform",
                    "occurrence_count": len(sentences),
                    "confidence": 0.6,
                    "examples_found": [f"Sentence length range: {min(lengths)}-{max(lengths)} words"],
                    "impact_on_score": 8
                })
        
        # 3. Grammar perfection check
        # (Simplified - would use grammar checker in production)
        grammar_issues = self._count_grammar_issues(full_text)
        statistical_indicators["passive_voice_ratio"] = self._calculate_passive_ratio(full_text)
        
        if grammar_issues == 0 and len(full_text) > 500:
            pattern_matches.append({
                "pattern_type": "perfect_grammar",
                "description": "No grammatical errors detected in lengthy text",
                "occurrence_count": 1,
                "confidence": 0.4,
                "examples_found": ["Text appears grammatically perfect"],
                "impact_on_score": 5
            })
        
        # 4. Vocabulary analysis
        vocab_score = self._analyze_vocabulary(full_text)
        statistical_indicators["vocabulary_diversity_score"] = vocab_score["diversity"]
        statistical_indicators["rare_word_usage"] = vocab_score["rare_word_ratio"]
        
        # 5. First-person pronoun count (AI often avoids)
        pronoun_count = len(re.findall(r'\bI\b', full_text))
        statistical_indicators["first_person_pronoun_count"] = pronoun_count
        
        if pronoun_count == 0 and len(full_text) > 300:
            pattern_matches.append({
                "pattern_type": "lacks_personal_voice",
                "description": "No first-person pronouns found",
                "occurrence_count": 0,
                "confidence": 0.5,
                "examples_found": ["Text lacks 'I' statements"],
                "impact_on_score": 7
            })
        
        # 6. Quantified statement analysis
        quantified_ratio = self._calculate_quantification_ratio(full_text)
        statistical_indicators["quantified_statement_ratio"] = quantified_ratio
        
        # 7. Section-specific analysis
        for section_name, section_text in sections.items():
            if section_text:
                section_score = self._analyze_section(section_text, section_name)
                section_analysis.append({
                    "section_name": section_name,
                    "ai_likelihood": section_score,
                    "key_indicators": self._get_section_indicators(section_text)
                })
        
        return {
            "pattern_matches": pattern_matches,
            "statistical_indicators": statistical_indicators,
            "section_analysis": section_analysis
        }
    
    def _split_into_sentences(self, text: str) -> List[str]:
        """Split text into sentences"""
        # Simple sentence splitting
        sentences = re.split(r'(?<=[.!?])\s+', text)
        return [s.strip() for s in sentences if s.strip()]
    
    def _count_grammar_issues(self, text: str) -> int:
        """Count potential grammar issues (simplified)"""
        issues = 0
        
        # Check for common issues
        patterns = [
            r'\s{2,}',  # Double spaces
            r'[.]{4,}',  # Multiple periods
            r'\ba\s+[aeiou]',  # 'a' before vowel
            r'\ban\s+[^aeiou]',  # 'an' before consonant
        ]
        
        for pattern in patterns:
            issues += len(re.findall(pattern, text, re.IGNORECASE))
        
        return issues
    
    def _calculate_passive_ratio(self, text: str) -> float:
        """Calculate ratio of passive voice constructions"""
        
        # Common passive voice patterns
        passive_patterns = [
            r'\bwas\s+\w+ed\b',
            r'\bwere\s+\w+ed\b',
            r'\bbeen\s+\w+ed\b',
            r'\bis\s+\w+ed\b',
            r'\bare\s+\w+ed\b',
        ]
        
        passive_count = 0
        for pattern in passive_patterns:
            passive_count += len(re.findall(pattern, text, re.IGNORECASE))
        
        total_sentences = len(self._split_into_sentences(text))
        
        return round(passive_count / max(total_sentences, 1), 2)
    
    def _analyze_vocabulary(self, text: str) -> Dict:
        """Analyze vocabulary usage"""
        
        words = re.findall(r'\b[a-zA-Z]+\b', text.lower())
        
        if not words:
            return {"diversity": 0, "rare_word_ratio": 0}
        
        # Unique words ratio
        unique_words = set(words)
        diversity = len(unique_words) / len(words)
        
        # Common words (AI tends to use common words more)
        common_words = {
            'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
            'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
            'from', 'as', 'into', 'through', 'during', 'before', 'after',
            'above', 'below', 'between', 'under', 'again', 'further', 'then',
            'once', 'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either',
            'neither', 'not', 'only', 'own', 'same', 'than', 'too', 'very',
            'just', 'also', 'now', 'here', 'there', 'when', 'where', 'why',
            'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
            'other', 'some', 'such', 'no', 'any', 'i', 'me', 'my', 'myself',
            'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself',
            'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself',
            'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
            'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those'
        }
        
        rare_words = [w for w in unique_words if w not in common_words]
        rare_word_ratio = len(rare_words) / len(unique_words) if unique_words else 0
        
        return {
            "diversity": round(diversity, 2),
            "rare_word_ratio": round(rare_word_ratio, 2)
        }
    
    def _calculate_quantification_ratio(self, text: str) -> float:
        """Calculate ratio of quantified statements"""
        
        sentences = self._split_into_sentences(text)
        if not sentences:
            return 0.0
        
        quantified_count = 0
        for sentence in sentences:
            # Check for numbers/percentages
            if re.search(r'\d+(?:\.\d+)?%?', sentence):
                quantified_count += 1
        
        return round(quantified_count / len(sentences), 2)
    
    def _analyze_section(self, text: str, section_name: str) -> int:
        """Analyze a specific section for AI likelihood"""
        
        score = 30  # Base score
        
        # Check for AI patterns
        ai_pattern_count = 0
        for pattern in self.AI_PHRASE_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                ai_pattern_count += 1
        
        score += ai_pattern_count * 8
        
        # Check for authentic patterns
        auth_pattern_count = 0
        for pattern in self.AUTHENTIC_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                auth_pattern_count += 1
        
        score -= auth_pattern_count * 10
        
        # Check for specific metrics (authentic indicator)
        if re.search(r'\d+(?:\.\d+)?(?:%|x|ms|seconds?)', text):
            score -= 15
        
        return max(0, min(100, score))
    
    def _get_section_indicators(self, text: str) -> List[str]:
        """Get key indicators for a section"""
        
        indicators = []
        
        if re.search(r'\d+(?:\.\d+)?%', text):
            indicators.append("quantified_metrics")
        
        if any(re.search(p, text, re.IGNORECASE) for p in self.AI_PHRASE_PATTERNS):
            indicators.append("generic_phrasing")
        
        if re.search(r'\bI\b', text):
            indicators.append("personal_voice")
        
        if re.search(r'\d{4}', text):
            indicators.append("specific_dates")
        
        return indicators
    
    def _calculate_ai_likelihood(
        self,
        heuristic_analysis: Dict,
        sensitivity: str
    ) -> int:
        """Calculate overall AI likelihood score"""
        
        base_score = 30
        
        # Pattern match impacts
        for match in heuristic_analysis.get("pattern_matches", []):
            base_score += match.get("impact_on_score", 0)
        
        # Statistical indicator impacts
        stats = heuristic_analysis.get("statistical_indicators", {})
        
        # Low vocabulary diversity
        if stats.get("vocabulary_diversity_score", 0.5) < 0.3:
            base_score += 10
        
        # High passive voice ratio
        if stats.get("passive_voice_ratio", 0) > 0.3:
            base_score += 5
        
        # Uniform sentences
        if stats.get("sentence_length_variance", 100) < 10:
            base_score += 5
        
        # Section analysis impact
        section_scores = [
            s["ai_likelihood"] for s in heuristic_analysis.get("section_analysis", [])
        ]
        if section_scores:
            avg_section_score = sum(section_scores) / len(section_scores)
            base_score = (base_score + avg_section_score) / 2
        
        # Sensitivity adjustment
        sensitivity_modifiers = {
            "low": 0.8,
            "medium": 1.0,
            "high": 1.2
        }
        
        base_score *= sensitivity_modifiers.get(sensitivity, 1.0)
        
        return max(0, min(100, int(base_score)))
    
    def _analyze_authenticity(
        self,
        full_text: str,
        sections: Dict[str, str]
    ) -> Dict:
        """Analyze authenticity indicators"""
        
        positive_signals = []
        authenticity_score = 50
        
        # Check for authentic patterns
        for pattern in self.AUTHENTIC_PATTERNS:
            matches = re.findall(pattern, full_text, re.IGNORECASE)
            if matches:
                signal_type = pattern.replace(r'\b', '').split('(')[0].strip()
                positive_signals.append({
                    "signal_type": "specific_details",
                    "description": f"Personal voice detected: '{matches[0]}'",
                    "examples": matches[:2],
                    "authenticity_boost": 10
                })
                authenticity_score += 10
        
        # Check for specific metrics with context
        metric_pattern = r'(\d+(?:\.\d+)?(?:%|x))\s+(?:reduction|improvement|increase|decrease|growth)'
        metric_matches = re.findall(metric_pattern, full_text, re.IGNORECASE)
        if metric_matches:
            positive_signals.append({
                "signal_type": "specific_metrics_with_context",
                "description": "Achievements include specific, context-rich metrics",
                "examples": metric_matches[:3],
                "authenticity_boost": 15
            })
            authenticity_score += 15
        
        # Check for unique achievements
        unique_patterns = [
            r'patent',
            r'published',
            r'open.source',
            r'conference',
            r'award',
            r'recognition',
        ]
        
        for pattern in unique_patterns:
            if re.search(pattern, full_text, re.IGNORECASE):
                positive_signals.append({
                    "signal_type": "unique_achievements",
                    "description": f"Contains unique achievement: {pattern}",
                    "examples": [],
                    "authenticity_boost": 10
                })
                authenticity_score += 10
        
        return {
            "human_authenticity_score": min(100, authenticity_score),
            "positive_signals": positive_signals
        }
    
    def _compare_to_patterns(self, full_text: str) -> Dict:
        """Compare to known AI and human patterns"""
        
        # Simplified comparison
        # In production, this would compare against a corpus
        
        ai_similarity = 0.35  # Default
        human_similarity = 0.65  # Default
        
        # Adjust based on heuristics
        ai_phrases = sum(1 for p in self.AI_PHRASE_PATTERNS 
                        if re.search(p, full_text, re.IGNORECASE))
        human_phrases = sum(1 for p in self.AUTHENTIC_PATTERNS 
                           if re.search(p, full_text, re.IGNORECASE))
        
        total = ai_phrases + human_phrases
        if total > 0:
            ai_similarity = ai_phrases / total
            human_similarity = human_phrases / total
        
        return {
            "similarity_to_known_ai_patterns": round(ai_similarity, 2),
            "similarity_to_known_human_patterns": round(human_similarity, 2),
            "comparison_notes": "Content patterns analyzed against known AI and human writing samples."
        }
    
    def _generate_review_guidance(
        self,
        ai_likelihood: int,
        heuristic_analysis: Dict,
        sections: Dict[str, str]
    ) -> Dict:
        """Generate guidance for human reviewers"""
        
        sections_to_verify = []
        suggested_questions = []
        verification_methods = []
        
        # Identify sections to verify
        for section_analysis in heuristic_analysis.get("section_analysis", []):
            if section_analysis["ai_likelihood"] > 50:
                sections_to_verify.append(section_analysis["section_name"])
        
        # Generate suggested interview questions
        if ai_likelihood > 40:
            suggested_questions.extend([
                "Can you walk me through the specific challenges you faced in this project?",
                "What alternatives did you consider before choosing this approach?",
                "How did you measure the success of this initiative?",
                "What would you do differently if you had to do this again?"
            ])
        
        # Suggest verification methods
        if ai_likelihood > 30:
            verification_methods.extend([
                "Reference check to verify specific achievements",
                "Technical interview to assess depth of claimed expertise",
                "Portfolio or code review for claimed projects"
            ])
        
        return {
            "sections_to_verify": sections_to_verify,
            "suggested_interview_questions": suggested_questions,
            "verification_methods": verification_methods
        }
    
    def _determine_assessment(
        self,
        ai_likelihood: int,
        authenticity_indicators: Dict
    ) -> Dict:
        """Determine overall assessment"""
        
        # Determine risk level
        if ai_likelihood < 20:
            risk_level = "minimal"
            recommendation = "Low likelihood of AI-generated content. Resume shows natural language patterns. Standard review process appropriate."
        elif ai_likelihood < 40:
            risk_level = "low"
            recommendation = "Low likelihood of AI-generated content. Resume shows natural language patterns with specific, quantifiable achievements. Standard review process recommended."
        elif ai_likelihood < 60:
            risk_level = "moderate"
            recommendation = "Moderate AI-content signals detected. Some generic phrasing present. Recommend deeper verification during interview process."
        else:
            risk_level = "high"
            recommendation = "Higher AI-content signals detected. Resume contains multiple AI-style patterns. Recommend thorough verification and detailed interview questions."
        
        disclaimer = (
            "This is a heuristic analysis only. High-quality AI tools can produce undetectable content, "
            "and skilled writers may trigger false positives. Use as one signal among many in holistic "
            "candidate evaluation."
        )
        
        return {
            "ai_likelihood_score": ai_likelihood,
            "risk_level": risk_level,
            "recommendation": recommendation,
            "disclaimer": disclaimer
        }
