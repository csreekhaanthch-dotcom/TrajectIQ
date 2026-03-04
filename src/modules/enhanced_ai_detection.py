"""
TrajectIQ Enhanced AI Detection Module
======================================
Advanced detection of AI-generated resume content.

Features:
- Extended indicator patterns
- Statistical analysis
- Linguistic pattern detection
- Structure analysis
"""

import re
import statistics
from typing import List, Dict, Any, Tuple
from dataclasses import dataclass
from collections import Counter


@dataclass
class AIDetectionResult:
    """Result of AI content detection"""
    ai_probability: float
    ai_detected: bool
    confidence: str  # low, medium, high
    indicators_found: List[str]
    statistical_anomalies: List[str]
    recommendations: List[str]
    sections_flagged: List[str]


class EnhancedAIDetector:
    """
    Enhanced AI content detection with multiple analysis methods.
    """

    # Extended AI indicator patterns
    AI_INDICATORS = {
        # Grammar patterns common in AI output
        "grammar_patterns": [
            "leveraging", "utilizing", "implementing", "facilitating",
            "synergy", "paradigm", "holistic", "comprehensive",
            "robust", "innovative", "cutting-edge", "state-of-the-art",
            "seamless", "transformative", "groundbreaking", "next-generation",
            "best-in-class", "industry-leading", "world-class"
        ],

        # Vague corporate speak
        "corporate_speak": [
            "proven track record", "seasoned professional", "results-driven",
            "dynamic environment", "fast-paced", "detail-oriented",
            "team player", "self-starter", "go-getter", "think outside the box",
            "hit the ground running", "move the needle", "value-add",
            "strategic partner", "thought leader", "change agent"
        ],

        # Passive voice overuse indicators
        "passive_voice": [
            "was responsible for", "was instrumental in", "was tasked with",
            "was involved in", "was accountable for", "have been responsible",
            "has been involved", "were responsible for"
        ],

        # Redundancy patterns
        "redundancy_patterns": [
            "past history", "future plans", "advance planning",
            "basic fundamentals", "consensus of opinion",
            "exact same", "free gift", "unexpected surprise"
        ],

        # AI-style list formatting
        "list_patterns": [
            "successfully led", "successfully managed", "successfully implemented",
            "successfully delivered", "successfully completed",
            "key achievements include", "notable accomplishments include"
        ],

        # Overused AI phrases
        "ai_phrases": [
            "foster a culture of", "drive innovation", "leverage synergies",
            "optimize processes", "streamline operations", "enhance productivity",
            "maximize efficiency", "empower teams", "champion initiatives",
            "spearhead efforts", "orchestrate delivery", "catalyze growth"
        ]
    }

    # Human writing patterns (positive indicators)
    HUMAN_INDICATORS = [
        "i believe", "in my opinion", "i think", "honestly",
        "actually", "basically", "pretty much", "sort of",
        "kind of", "you know", "i guess", "it seems to me"
    ]

    # Statistical thresholds
    SENTENCE_LENGTH_VARIANCE_THRESHOLD = 25  # AI tends to have more uniform lengths
    WORD_REPETITION_THRESHOLD = 0.15  # AI tends to repeat words more
    PASSIVE_VOICE_THRESHOLD = 0.10  # Max acceptable passive voice ratio

    def __init__(self, sensitivity: str = "medium"):
        """
        Initialize detector with sensitivity level.

        Args:
            sensitivity: 'low', 'medium', or 'high'
        """
        self.sensitivity = sensitivity
        self.thresholds = {
            "low": 0.7,
            "medium": 0.5,
            "high": 0.3
        }

    def detect(self, text: str) -> AIDetectionResult:
        """
        Detect AI-generated content in text.

        Args:
            text: Text to analyze

        Returns:
            AIDetectionResult with detection details
        """
        if not text or len(text.strip()) < 50:
            return AIDetectionResult(
                ai_probability=0.0,
                ai_detected=False,
                confidence="low",
                indicators_found=[],
                statistical_anomalies=[],
                recommendations=["Text too short for reliable analysis"],
                sections_flagged=[]
            )

        # Run all detection methods
        indicator_score, indicators_found = self._check_indicators(text)
        statistical_score, anomalies = self._statistical_analysis(text)
        structure_score, sections = self._structure_analysis(text)
        linguistic_score, ling_anomalies = self._linguistic_analysis(text)

        # Combine scores with weights
        weights = {
            "indicators": 0.30,
            "statistical": 0.25,
            "structure": 0.25,
            "linguistic": 0.20
        }

        total_score = (
            indicator_score * weights["indicators"] +
            statistical_score * weights["statistical"] +
            structure_score * weights["structure"] +
            linguistic_score * weights["linguistic"]
        )

        # Determine detection
        threshold = self.thresholds[self.sensitivity]
        ai_detected = total_score > threshold

        # Determine confidence
        if total_score > 0.7:
            confidence = "high"
        elif total_score > 0.5:
            confidence = "medium"
        else:
            confidence = "low"

        # Generate recommendations
        recommendations = self._generate_recommendations(
            ai_detected, indicators_found, anomalies
        )

        return AIDetectionResult(
            ai_probability=round(total_score, 3),
            ai_detected=ai_detected,
            confidence=confidence,
            indicators_found=indicators_found,
            statistical_anomalies=anomalies + ling_anomalies,
            recommendations=recommendations,
            sections_flagged=sections
        )

    def _check_indicators(self, text: str) -> Tuple[float, List[str]]:
        """Check for AI indicator patterns"""
        text_lower = text.lower()
        found_indicators = []
        total_matches = 0

        for category, indicators in self.AI_INDICATORS.items():
            for indicator in indicators:
                count = text_lower.count(indicator)
                if count > 0:
                    found_indicators.append(f"{indicator} ({count}x)")
                    total_matches += count

        # Calculate score based on density
        word_count = len(text.split())
        density = total_matches / word_count if word_count > 0 else 0

        # Score: high density = high AI probability
        score = min(1.0, density * 20)  # Scale factor

        return score, found_indicators[:10]  # Limit to top 10

    def _statistical_analysis(self, text: str) -> Tuple[float, List[str]]:
        """Perform statistical analysis on text"""
        anomalies = []

        # Split into sentences
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 10]

        if len(sentences) < 3:
            return 0.0, ["Insufficient sentences for analysis"]

        # Sentence length analysis
        lengths = [len(s.split()) for s in sentences]
        variance = statistics.variance(lengths) if len(lengths) > 1 else 0

        # AI tends to have uniform sentence lengths
        if variance < self.SENTENCE_LENGTH_VARIANCE_THRESHOLD:
            anomalies.append(f"Low sentence length variance ({variance:.1f})")

        # Word frequency analysis
        words = re.findall(r'\b\w+\b', text.lower())
        word_counts = Counter(words)

        # Check for unusual word repetition
        total_words = len(words)
        unique_words = len(word_counts)

        repetition_ratio = 1 - (unique_words / total_words) if total_words > 0 else 0

        if repetition_ratio > self.WORD_REPETITION_THRESHOLD:
            anomalies.append(f"High word repetition ({repetition_ratio:.2%})")

        # Passive voice ratio
        passive_count = 0
        for pattern in self.AI_INDICATORS["passive_voice"]:
            passive_count += text.lower().count(pattern)

        passive_ratio = passive_count / len(sentences) if sentences else 0

        if passive_ratio > self.PASSIVE_VOICE_THRESHOLD:
            anomalies.append(f"High passive voice usage ({passive_ratio:.2%})")

        # Calculate score based on anomalies
        score = len(anomalies) * 0.25

        return min(1.0, score), anomalies

    def _structure_analysis(self, text: str) -> Tuple[float, List[str]]:
        """Analyze document structure for AI patterns"""
        sections = []

        # Check for AI-style bullet point patterns
        bullet_pattern = r'•|\*|→|►|✓|✔|➤'
        bullets = re.findall(bullet_pattern, text)

        # Check for numbered lists
        numbered_lists = re.findall(r'^\d+\.\s+\w+', text, re.MULTILINE)

        # Check for perfect formatting (AI tends to be very well-formatted)
        has_consistent_spacing = bool(re.search(r'\n\n', text))
        has_sections = len(re.findall(r'\n\n+', text)) > 2

        structure_score = 0.0

        # Many bullet points without personal touches
        if len(bullets) > 5:
            sections.append("Heavy bullet point usage")
            structure_score += 0.2

        # Perfect formatting is suspicious
        if has_consistent_spacing and has_sections:
            sections.append("Suspiciously perfect formatting")
            structure_score += 0.15

        # Check for action verb overuse at sentence starts
        action_verbs = ["Led", "Managed", "Developed", "Implemented",
                        "Created", "Designed", "Built", "Established"]
        action_starts = 0
        for sentence in text.split('.'):
            for verb in action_verbs:
                if sentence.strip().startswith(verb):
                    action_starts += 1

        if action_starts > 3:
            sections.append("Action verb overuse pattern")
            structure_score += 0.25

        return min(1.0, structure_score), sections

    def _linguistic_analysis(self, text: str) -> Tuple[float, List[str]]:
        """Analyze linguistic patterns"""
        anomalies = []
        text_lower = text.lower()

        # Check for human indicators (reduce AI probability)
        human_count = sum(1 for indicator in self.HUMAN_INDICATORS
                          if indicator in text_lower)

        # Check for AI patterns
        ai_phrase_count = sum(text_lower.count(phrase)
                              for phrase in self.AI_INDICATORS["ai_phrases"])

        # Check for unusual formality
        contractions = ["don't", "can't", "won't", "isn't", "aren't",
                        "haven't", "hasn't", "didn't", "wasn't", "weren't"]
        contraction_count = sum(1 for c in contractions if c in text_lower)

        # AI typically avoids contractions
        if contraction_count == 0 and len(text.split()) > 200:
            anomalies.append("No contractions in long text")

        # Check for human indicators absence
        if human_count == 0 and len(text.split()) > 300:
            anomalies.append("No personal voice indicators")

        # AI phrase density
        word_count = len(text.split())
        ai_density = ai_phrase_count / word_count if word_count > 0 else 0

        if ai_density > 0.01:
            anomalies.append(f"High AI phrase density ({ai_density:.3f})")

        # Calculate score
        score = min(1.0, len(anomalies) * 0.3)

        # Reduce score if human indicators present
        if human_count > 0:
            score = max(0, score - 0.2 * human_count)

        return score, anomalies

    def _generate_recommendations(
        self,
        ai_detected: bool,
        indicators: List[str],
        anomalies: List[str]
    ) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []

        if ai_detected:
            recommendations.append(
                "Consider requesting a more personalized version of this document"
            )

            if indicators:
                recommendations.append(
                    f"Review use of AI-typical phrases: {', '.join(indicators[:3])}"
                )

            if any("passive" in a.lower() for a in anomalies):
                recommendations.append(
                    "Convert passive voice to active voice for authenticity"
                )

            if any("contraction" in a.lower() for a in anomalies):
                recommendations.append(
                    "Use natural contractions (don't, can't) for conversational tone"
                )

        return recommendations[:5]  # Limit recommendations

    def scan_resume(self, resume: Dict[str, Any]) -> AIDetectionResult:
        """
        Scan a resume for AI-generated content.

        Args:
            resume: Resume dictionary with sections

        Returns:
            AIDetectionResult for the entire resume
        """
        # Combine all text sections
        text_parts = []

        if "summary" in resume:
            text_parts.append(resume["summary"])

        if "experience" in resume:
            for exp in resume["experience"]:
                if isinstance(exp, dict) and "description" in exp:
                    text_parts.append(exp["description"])

        if "skills" in resume:
            text_parts.append(" ".join(resume["skills"]) if isinstance(resume["skills"], list) else resume["skills"])

        combined_text = " ".join(text_parts)
        return self.detect(combined_text)


# Convenience function
def detect_ai_content(text: str, sensitivity: str = "medium") -> AIDetectionResult:
    """
    Detect AI-generated content in text.

    Args:
        text: Text to analyze
        sensitivity: Detection sensitivity ('low', 'medium', 'high')

    Returns:
        AIDetectionResult with detection details
    """
    detector = EnhancedAIDetector(sensitivity=sensitivity)
    return detector.detect(text)
