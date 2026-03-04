# TrajectIQ Bias Detection Algorithm

## Overview

TrajectIQ's bias detection system is designed to identify and flag potential discriminatory patterns in resume evaluation. This document provides a detailed technical explanation of the algorithms used.

## Design Philosophy

### Core Principles

1. **Transparency**: All bias detection rules are explainable and auditable
2. **Privacy-First**: No protected characteristics are inferred or stored
3. **Configurable**: Organizations can adjust sensitivity thresholds
4. **Actionable**: Reports include specific recommendations for remediation

## Protected Categories

Our bias detection focuses on identifying language patterns that may correlate with protected categories under employment law:

| Category | Detection Method | Example Patterns |
|----------|-----------------|------------------|
| Gender | Name/gendered terms | "He/She", "Man/Woman" in job descriptions |
| Age | Age-related language | "Digital native", "Recent graduate", "Young" |
| Nationality | Nationality markers | "Native speaker", Citizenship requirements |
| Disability | Disability language | Ableist terms, unnecessary physical requirements |
| Race/Ethnicity | Ethnicity markers | Names, cultural associations (limited) |

## Algorithm Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    BIAS DETECTION PIPELINE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  Input   │───▶│  Text    │───▶│  Rule    │───▶│  Score   │  │
│  │ Resume/  │    │ Parsing  │    │ Engine   │    │ Aggreg.  │  │
│  │ Job Desc │    │          │    │          │    │          │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                                        │                        │
│                                        ▼                        │
│                                 ┌──────────┐                   │
│                                 │  Report  │                   │
│                                 │ Generator│                   │
│                                 └──────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

## Detection Methods

### 1. Linguistic Pattern Analysis

#### Gender Bias Detection

```python
class GenderBiasDetector:
    """
    Detects gendered language in job descriptions and resumes.

    Algorithm:
    1. Tokenize text into sentences
    2. Search for gendered pronouns and terms
    3. Calculate gender bias ratio
    4. Flag if ratio exceeds threshold
    """

    GENDERED_TERMS = {
        'masculine': ['he', 'him', 'his', 'man', 'male', 'gentleman',
                      'handsome', 'strong', 'aggressive', 'dominant'],
        'feminine': ['she', 'her', 'hers', 'woman', 'female', 'lady',
                     'beautiful', 'nurturing', 'supportive', 'emotional']
    }

    def calculate_bias_score(self, text: str) -> float:
        """
        Returns a bias score from 0.0 (neutral) to 1.0 (highly biased).

        Formula:
        bias_score = |masculine_count - feminine_count| / total_gendered_terms
        """
        masculine_count = sum(text.lower().count(term)
                             for term in self.GENDERED_TERMS['masculine'])
        feminine_count = sum(text.lower().count(term)
                            for term in self.GENDERED_TERMS['feminine'])
        total = masculine_count + feminine_count

        if total == 0:
            return 0.0

        return abs(masculine_count - feminine_count) / total
```

#### Age Bias Detection

```python
class AgeBiasDetector:
    """
    Detects age-related language that may discriminate against
    older or younger candidates.
    """

    AGE_BIASED_TERMS = {
        'young': ['digital native', 'recent graduate', 'young',
                  'fresh', 'junior', 'energetic', 'startup mindset'],
        'older': ['seasoned', 'veteran', 'overqualified', 'senior',
                  'experienced', 'mature', 'traditional']
    }

    AGE_REQUIREMENT_PATTERNS = [
        r'\d+\s*[-–]\s*\d+\s*years?\s*(?:of\s*)?experience',  # "3-5 years experience"
        r'(?:under|over|less than|more than)\s*\d+\s*years?',  # "under 30 years"
        r'age\s*\d+\s*[-–]\s*\d+',  # "age 25-35"
    ]

    def detect_age_bias(self, text: str) -> dict:
        """
        Returns age bias indicators.

        Output:
        {
            'bias_detected': bool,
            'young_bias_terms': list,
            'older_bias_terms': list,
            'age_requirements': list,
            'recommendation': str
        }
        """
```

### 2. Statistical Parity Analysis

For batch processing, we employ statistical tests to identify disparate impact:

```python
class StatisticalParityAnalyzer:
    """
    Analyzes hiring outcomes for statistical disparities.

    Uses the 4/5 Rule (EEOC guideline):
    Selection rate for any group should be at least 4/5 (80%)
    of the selection rate for the group with the highest rate.
    """

    def calculate_disparate_impact(
        self,
        selection_rates: Dict[str, float]
    ) -> dict:
        """
        Calculate disparate impact ratios.

        Args:
            selection_rates: Dict mapping group names to selection rates

        Returns:
            {
                'adverse_impact_detected': bool,
                'impact_ratios': dict,
                'highest_rate_group': str,
                'groups_below_threshold': list
            }
        """
        max_rate = max(selection_rates.values())
        threshold = 0.8 * max_rate

        impact_ratios = {
            group: rate / max_rate
            for group, rate in selection_rates.items()
        }

        groups_below = [
            group for group, ratio in impact_ratios.items()
            if ratio < 0.8
        ]

        return {
            'adverse_impact_detected': len(groups_below) > 0,
            'impact_ratios': impact_ratios,
            'highest_rate_group': max(selection_rates, key=selection_rates.get),
            'groups_below_threshold': groups_below
        }
```

### 3. Name-Based Analysis (Limited)

We **minimally** use name-based analysis due to ethical concerns:

```python
class NameAnalyzer:
    """
    LIMITED USE - Only for statistical reporting, never individual decisions.

    Purpose:
    - Generate aggregate diversity reports
    - Identify potential systemic bias patterns
    - NOT used for individual candidate decisions
    """

    def __init__(self):
        # Use only for aggregate statistics
        self.enabled = False  # Disabled by default

    def generate_diversity_report(
        self,
        candidate_names: List[str],
        outcomes: List[dict]
    ) -> dict:
        """
        Generate anonymized diversity statistics.

        Output contains only aggregated percentages,
        never individual identifications.
        """
        pass  # Implementation intentionally limited
```

## Scoring System

### Bias Score Calculation

```python
def calculate_overall_bias_score(detection_results: dict) -> float:
    """
    Calculate overall bias risk score.

    Weights:
    - Gender bias: 25%
    - Age bias: 25%
    - Nationality bias: 20%
    - Disability bias: 15%
    - Language complexity: 15%

    Returns:
        float: 0.0 (no bias detected) to 1.0 (severe bias detected)
    """
    weights = {
        'gender': 0.25,
        'age': 0.25,
        'nationality': 0.20,
        'disability': 0.15,
        'complexity': 0.15
    }

    score = sum(
        detection_results[category] * weight
        for category, weight in weights.items()
    )

    return round(score, 3)
```

### Risk Levels

| Score Range | Risk Level | Action Required |
|-------------|------------|-----------------|
| 0.00 - 0.15 | Low | Monitor |
| 0.16 - 0.35 | Medium | Review |
| 0.36 - 0.55 | High | Remediation |
| 0.56 - 1.00 | Critical | Immediate Action |

## Mitigation Strategies

### Automatic Recommendations

Based on detected bias patterns, the system generates specific recommendations:

```python
class MitigationRecommender:
    """
    Generates actionable recommendations for bias mitigation.
    """

    RECOMMENDATIONS = {
        'gender': {
            'high': [
                "Replace gendered pronouns with 'they' or role-specific nouns",
                "Remove gendered adjectives from job requirements",
                "Review job title for gendered implications"
            ],
            'medium': [
                "Consider gender-neutral language alternatives",
                "Review screening criteria for gender bias"
            ]
        },
        'age': {
            'high': [
                "Remove age-related requirements unless BFOQ",
                "Replace 'recent graduate' with skills-based requirements",
                "Focus on capabilities, not years of experience"
            ],
            'medium': [
                "Consider skills-based rather than time-based requirements",
                "Review language for age-coded terms"
            ]
        },
        'nationality': {
            'high': [
                "Remove citizenship requirements unless legally required",
                "Replace 'native speaker' with proficiency requirements",
                "Ensure work authorization requirements are justified"
            ],
            'medium': [
                "Review location requirements for necessity",
                "Consider remote work options"
            ]
        }
    }
```

## Compliance Integration

### EEOC Guidelines

The bias detection system aligns with EEOC guidelines:

1. **Uniform Guidelines on Employee Selection Procedures** (1978)
2. **Disparate Impact Theory** (Griggs v. Duke Power Co.)
3. **4/5 Rule** for adverse impact analysis

### GDPR Considerations

For EU deployments:

1. No automated decision-making without human review
2. Right to explanation for any adverse decisions
3. Data minimization - only necessary characteristics
4. Purpose limitation - bias data used only for fairness

## Audit Trail

All bias detection events are logged for compliance:

```python
@dataclass
class BiasAuditEntry:
    """Audit log entry for bias detection"""
    timestamp: datetime
    document_type: str  # 'resume' or 'job_description'
    document_id: str
    bias_types_detected: List[str]
    bias_scores: Dict[str, float]
    overall_score: float
    action_taken: str
    reviewer: Optional[str]
    resolution: Optional[str]
```

## Limitations

### What We Cannot Detect

1. **Interview bias**: Non-verbal cues and interviewer behavior
2. **Systemic bias**: Organizational culture patterns
3. **Intersectional bias**: Combined effects of multiple protected categories
4. **Intentional discrimination**: Hidden discriminatory intent

### Known Issues

1. Name-based analysis has accuracy limitations
2. Cultural context affects bias interpretation
3. Emerging bias patterns require algorithm updates

## Continuous Improvement

### Model Updates

The bias detection model is updated quarterly with:

1. New bias patterns from research
2. Regulatory changes
3. User feedback
4. False positive/negative analysis

### Feedback Loop

```python
def submit_bias_feedback(
    detection_id: str,
    false_positive: bool,
    correction: Optional[str] = None
):
    """
    Submit feedback on bias detection accuracy.

    Used to improve detection algorithms through:
    - Pattern refinement
    - Threshold adjustment
    - New pattern discovery
    """
```

---

**Document Version**: 3.0.2
**Last Updated**: March 2025
**Authors**: TrajectIQ Research Team
