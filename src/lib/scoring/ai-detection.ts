// AI Resume Detection Module
// Analyzes resume text to detect AI-generated content patterns
// Version 2.0: Calibrated thresholds to reduce false positives

export interface AIDetectionResult {
  isAIGenerated: boolean
  confidence: number // 0-100
  riskLevel: 'low' | 'medium' | 'high'
  indicators: AIDetectionIndicator[]
  explanation: string
  suggestions: string[]
}

export interface AIDetectionIndicator {
  category: string
  detected: boolean
  severity: 'low' | 'medium' | 'high'
  description: string
  examples: string[]
}

// ============================================
// Calibrated AI Phrase Patterns
// ============================================
// Weighted by how DISTINCTIVE they are to AI vs human writing
// Lower weight = common in human writing (reduce false positives)
// Higher weight = strongly indicative of AI

const AI_PHRASE_PATTERNS = [
  // HIGHLY distinctive AI patterns (high weight)
  { pattern: /leveraging my diverse skillset to drive synergistic outcomes/gi, weight: 5 },
  { pattern: /at the intersection of innovation and excellence/gi, weight: 5 },
  { pattern: /passionate about leveraging cutting-edge technologies/gi, weight: 4 },
  { pattern: /dynamic and innovative professional with a proven track record/gi, weight: 4 },
  
  // MODERATELY distinctive (medium weight)
  { pattern: /seeking a challenging position to leverage my/gi, weight: 3 },
  { pattern: /comprehensive understanding of the entire software development lifecycle/gi, weight: 3 },
  { pattern: /spearheaded cross-functional initiatives that drove/gi, weight: 3 },
  { pattern: /instrumental in orchestrating the successful delivery/gi, weight: 3 },
  { pattern: /proven expertise in leveraging best-in-class solutions/gi, weight: 3 },
  
  // LESS distinctive but still notable (low weight)
  // These are common professional phrases - use with caution
  { pattern: /proven track record of success/gi, weight: 1.5 }, // Reduced from 3
  { pattern: /highly motivated (and|,) results-oriented professional/gi, weight: 1.5 }, // Reduced from 3
  { pattern: /passionate about (delivering|creating|building|developing)/gi, weight: 1 }, // Reduced from 2
  { pattern: /strong (analytical|problem-solving|communication) skills/gi, weight: 0.5 }, // Reduced from 1
  { pattern: /detail-oriented (professional|individual)/gi, weight: 1 }, // Reduced from 2
  { pattern: /results-driven (professional|approach|mindset)/gi, weight: 1 }, // Reduced from 2
  { pattern: /cross-functional teams (to|across)/gi, weight: 0.5 }, // Very common phrase
  { pattern: /hands-on experience (with|in)/gi, weight: 0.5 }, // Common phrase
  { pattern: /extensive experience (in|with|across)/gi, weight: 0.5 }, // Common phrase
  
  // Context-specific patterns (require multiple occurrences)
  { pattern: /excellent (interpersonal|communication|organizational) skills/gi, weight: 0.8 },
  { pattern: /adept at (managing|handling|overseeing)/gi, weight: 1.5 },
  { pattern: /proven ability to (work|collaborate|lead)/gi, weight: 1 },
]

// AI vocabulary overuse - requires HIGH density to flag
const AI_VOCABULARY = {
  highDistinctive: [
    'synergy', 'paradigm', 'holistic', 'seamless', 'game-changing',
    'synergize', 'unleash', 'revolutionize', 'best-in-class',
  ],
  moderateDistinctive: [
    'leverage', 'spearhead', 'orchestrate', 'empower', 'facilitate',
    'optimize', 'streamline', 'augment', 'cutting-edge',
  ],
  lowDistinctive: [
    'robust', 'maximize', 'champion', 'transform', 'enable', 'drive',
  ],
}

// Generic achievements - require specific pattern combinations
const GENERIC_ACHIEVEMENTS = [
  // Only flag if multiple present
  { pattern: /improved (efficiency|productivity|performance) by exactly \d+%/gi, weight: 3 },
  { pattern: /increased (revenue|sales|growth) by exactly \d+%/gi, weight: 3 },
  { pattern: /reduced (costs|expenses|overhead) by exactly \d+%/gi, weight: 3 },
]

// Vague patterns - require high density
const VAGUE_PATTERNS = [
  { pattern: /various diverse projects/gi, weight: 2 },
  { pattern: /multiple key initiatives/gi, weight: 1.5 },
  { pattern: /numerous successful implementations/gi, weight: 1.5 },
  { pattern: /wide variety of diverse/gi, weight: 2 }, // Redundant phrasing = AI
]

// ============================================
// Analysis Functions
// ============================================

function analyzeAIPhrases(text: string): AIDetectionIndicator {
  const matches: string[] = []
  let totalWeight = 0
  
  for (const { pattern, weight } of AI_PHRASE_PATTERNS) {
    const found = text.match(pattern)
    if (found) {
      matches.push(...found)
      totalWeight += weight * found.length
    }
  }
  
  // Threshold: need total weight >= 5 OR >= 5 distinct matches
  const detected = totalWeight >= 5 || matches.length >= 5
  
  return {
    category: 'AI-Common Phrases',
    detected,
    severity: totalWeight >= 10 ? 'high' : totalWeight >= 5 ? 'medium' : 'low',
    description: detected
      ? `Found ${matches.length} AI-typical phrases (weighted score: ${totalWeight.toFixed(1)})`
      : 'No significant AI-typical phrases detected',
    examples: matches.slice(0, 5),
  }
}

function analyzeVagueLanguage(text: string): AIDetectionIndicator {
  const matches: string[] = []
  
  for (const { pattern } of VAGUE_PATTERNS) {
    const found = text.match(pattern)
    if (found) {
      matches.push(...found)
    }
  }
  
  return {
    category: 'Vague Language',
    detected: matches.length >= 2,
    severity: matches.length >= 4 ? 'high' : matches.length >= 2 ? 'medium' : 'low',
    description: matches.length >= 2
      ? `Found ${matches.length} instances of vague or redundant language`
      : 'Content has specific details',
    examples: matches.slice(0, 5),
  }
}

function analyzeGenericAchievements(text: string): AIDetectionIndicator {
  const matches: string[] = []
  
  for (const { pattern } of GENERIC_ACHIEVEMENTS) {
    const found = text.match(pattern)
    if (found) {
      matches.push(...found)
    }
  }
  
  return {
    category: 'Generic Achievements',
    detected: matches.length >= 2,
    severity: matches.length >= 3 ? 'high' : matches.length >= 2 ? 'medium' : 'low',
    description: matches.length >= 2
      ? `Found ${matches.length} generic achievement statements with exact percentages`
      : 'Achievements appear specific and unique',
    examples: matches.slice(0, 5),
  }
}

function analyzeAIVocabulary(text: string): AIDetectionIndicator {
  const lowerText = text.toLowerCase()
  const wordCount = text.split(/\s+/).length
  
  const found: { word: string; category: string }[] = []
  
  // Count each category
  for (const word of AI_VOCABULARY.highDistinctive) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi')
    const count = (lowerText.match(regex) || []).length
    if (count > 0) {
      found.push({ word: `${word} (${count}x)`, category: 'high' })
    }
  }
  
  for (const word of AI_VOCABULARY.moderateDistinctive) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi')
    const count = (lowerText.match(regex) || []).length
    if (count > 0) {
      found.push({ word: `${word} (${count}x)`, category: 'moderate' })
    }
  }
  
  for (const word of AI_VOCABULARY.lowDistinctive) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi')
    const count = (lowerText.match(regex) || []).length
    if (count > 1) { // Require 2+ occurrences for low distinctive
      found.push({ word: `${word} (${count}x)`, category: 'low' })
    }
  }
  
  // Calculate density (per 1000 words)
  const highCount = found.filter(f => f.category === 'high').length
  const moderateCount = found.filter(f => f.category === 'moderate').length
  const density = (highCount * 3 + moderateCount * 1.5) / (wordCount / 1000)
  
  // Threshold: need high density OR multiple high-distinctive words
  const detected = highCount >= 3 || density >= 5
  
  return {
    category: 'AI Vocabulary',
    detected,
    severity: highCount >= 5 ? 'high' : highCount >= 3 || density >= 8 ? 'medium' : 'low',
    description: detected
      ? `Found high density of AI-typical vocabulary (${found.length} distinct words, density: ${density.toFixed(1)}/1k)`
      : 'Vocabulary usage appears natural',
    examples: found.slice(0, 8).map(f => f.word),
  }
}

function analyzeSentenceStructure(text: string): AIDetectionIndicator {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10)
  
  if (sentences.length < 5) {
    return {
      category: 'Sentence Structure',
      detected: false,
      severity: 'low',
      description: 'Insufficient text for sentence structure analysis',
      examples: [],
    }
  }
  
  // Check for repetitive sentence starts
  const starts = sentences.map(s => {
    const words = s.trim().split(/\s+/)
    return words[0]?.toLowerCase()
  })
  
  const startCounts: Record<string, number> = {}
  starts.forEach(start => {
    if (start && start.length > 2) {
      startCounts[start] = (startCounts[start] || 0) + 1
    }
  })
  
  const repeatedStarts = Object.entries(startCounts)
    .filter(([_, count]) => count > 3) // Increased threshold from 2 to 3
    .map(([word, count]) => `${word} (${count}x)`)
  
  // Check for uniform sentence length (AI tends to have similar lengths)
  const lengths = sentences.map(s => s.trim().split(/\s+/).length)
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length
  const uniformLength = variance < 20 // Lowered threshold for uniformity detection
  
  const detected = repeatedStarts.length >= 3 || uniformLength
  
  return {
    category: 'Sentence Structure',
    detected,
    severity: repeatedStarts.length >= 4 ? 'high' : 'medium',
    description: repeatedStarts.length >= 3
      ? `Found ${repeatedStarts.length} repeated sentence starts (threshold: 3+)`
      : uniformLength
        ? 'Sentences have unusually uniform length (AI pattern)'
        : 'Sentence structure appears natural',
    examples: repeatedStarts.slice(0, 5),
  }
}

function analyzeSpecificity(text: string): AIDetectionIndicator {
  // Check for specific details that real resumes have
  const specificIndicators = [
    { pattern: /\b\d{4}\b/g, name: 'years' },
    { pattern: /\$[\d,]+/g, name: 'dollar amounts' },
    { pattern: /\b[A-Z]{2,}\d*[A-Z]*\b/g, name: 'acronyms' },
    { pattern: /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}/gi, name: 'dates' },
    { pattern: /\b(?:University|College|Institute)\s+(?:of\s+)?[A-Z][a-zA-Z\s]+/g, name: 'schools' },
    { pattern: /\b[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*\s+(?:Inc|LLC|Corp|Ltd|Co)\.?\b/g, name: 'companies' },
    { pattern: /https?:\/\/[^\s]+/g, name: 'URLs' },
    { pattern: /\b(?:GitHub|LinkedIn|Twitter|Portfolio)\b/gi, name: 'profiles' },
  ]
  
  let specificCount = 0
  const examples: string[] = []
  
  for (const { pattern, name } of specificIndicators) {
    const matches = text.match(pattern)
    if (matches) {
      specificCount += matches.length
      examples.push(`${name}: ${matches.slice(0, 2).join(', ')}`)
    }
  }
  
  // Lowered threshold - more forgiving
  return {
    category: 'Specificity Check',
    detected: specificCount < 4, // Lowered from 5
    severity: specificCount < 2 ? 'high' : specificCount < 4 ? 'medium' : 'low',
    description: specificCount >= 4
      ? `Found ${specificCount} specific details (names, dates, numbers) - indicates authenticity`
      : `Only ${specificCount} specific details found - AI content often lacks specifics`,
    examples: examples.slice(0, 5),
  }
}

function analyzePersonalTouch(text: string): AIDetectionIndicator {
  // Check for personal elements that AI rarely includes
  const personalElements = [
    /\b(?:I|me|my|mine)\b/gi,
    /\b(?:personally|myself|I've|I'm|I'd)\b/gi,
    /(?:born|raised|grew up|started my career|my journey|my path)/gi,
    /(?:passion|fascinated|always been interested|since I was)/gi,
    /(?:why I|what drives me|my motivation)/gi,
  ]
  
  let personalCount = 0
  const examples: string[] = []
  
  for (const pattern of personalElements) {
    const matches = text.match(pattern)
    if (matches) {
      personalCount += matches.length
      examples.push(...matches.slice(0, 2))
    }
  }
  
  return {
    category: 'Personal Touch',
    detected: personalCount < 2, // Lowered threshold
    severity: personalCount < 1 ? 'high' : personalCount < 2 ? 'medium' : 'low',
    description: personalCount >= 2
      ? `Found ${personalCount} personal elements - indicates authentic writing`
      : `Minimal personal touch (${personalCount} elements) - common in AI content`,
    examples: examples.slice(0, 5),
  }
}

// ============================================
// Main Detection Function
// ============================================

export function detectAIContent(text: string): AIDetectionResult {
  const indicators: AIDetectionIndicator[] = []
  let totalScore = 0
  let maxPossibleScore = 0
  
  // Run all analyses
  indicators.push(analyzeAIPhrases(text))
  indicators.push(analyzeVagueLanguage(text))
  indicators.push(analyzeGenericAchievements(text))
  indicators.push(analyzeAIVocabulary(text))
  indicators.push(analyzeSentenceStructure(text))
  indicators.push(analyzeSpecificity(text))
  indicators.push(analyzePersonalTouch(text))
  
  // Calculate overall score with calibrated weights
  const severityScores = {
    high: 3,
    medium: 2,
    low: 1,
  }
  
  // Weight each indicator by importance
  const indicatorWeights = {
    'AI-Common Phrases': 2.0,
    'AI Vocabulary': 1.5,
    'Sentence Structure': 1.0,
    'Specificity Check': 1.5,
    'Personal Touch': 1.0,
    'Vague Language': 0.8,
    'Generic Achievements': 0.8,
  }
  
  for (const indicator of indicators) {
    if (indicator.detected) {
      const weight = indicatorWeights[indicator.category as keyof typeof indicatorWeights] || 1
      totalScore += severityScores[indicator.severity] * weight
    }
    maxPossibleScore += severityScores.high * (indicatorWeights[indicator.category as keyof typeof indicatorWeights] || 1)
  }
  
  // Calculate confidence percentage
  const confidence = Math.round((totalScore / maxPossibleScore) * 100)
  
  // Determine if AI-generated
  // RAISED thresholds to reduce false positives
  const highSeverityCount = indicators.filter(i => i.detected && i.severity === 'high').length
  const mediumSeverityCount = indicators.filter(i => i.detected && i.severity === 'medium').length
  
  // Need higher confidence AND multiple indicators
  const isAIGenerated = (
    (confidence >= 50 && highSeverityCount >= 2) || // High confidence with multiple high severity
    (confidence >= 65 && highSeverityCount >= 1) || // Very high confidence
    (confidence >= 75 && mediumSeverityCount >= 3) // Extremely high confidence with multiple medium
  )
  
  // Determine risk level (calibrated)
  let riskLevel: 'low' | 'medium' | 'high'
  if (confidence >= 65 && highSeverityCount >= 2) {
    riskLevel = 'high'
  } else if (confidence >= 45 && (highSeverityCount >= 1 || mediumSeverityCount >= 2)) {
    riskLevel = 'medium'
  } else {
    riskLevel = 'low'
  }
  
  // Generate explanation
  const detectedIndicators = indicators.filter(i => i.detected)
  let explanation = ''
  
  if (isAIGenerated) {
    explanation = `This resume shows ${confidence}% likelihood of AI involvement. `
    if (highSeverityCount > 0) {
      explanation += `Strong indicators: ${detectedIndicators.filter(i => i.severity === 'high').map(i => i.category).join(', ')}. `
    }
    explanation += 'Consider verifying the candidate\'s actual experience through detailed interviews.'
  } else if (riskLevel === 'medium') {
    explanation = `This resume shows some patterns common in AI-generated content (${confidence}% confidence). `
    explanation += 'This is NOT conclusive. Review highlighted sections and ask specific questions during interviews.'
  } else {
    explanation = `This resume appears to be authentically written (${confidence}% AI similarity). `
    explanation += 'The content shows natural language patterns and specific details.'
  }
  
  // Generate suggestions
  const suggestions: string[] = []
  
  if (isAIGenerated || riskLevel === 'medium') {
    suggestions.push('Ask the candidate to explain specific projects in detail during the interview')
    suggestions.push('Request concrete examples for each achievement mentioned')
    suggestions.push('Verify dates and company names through background checks')
    suggestions.push('Ask follow-up questions about technical decisions and challenges faced')
    
    if (indicators.find(i => i.category === 'Generic Achievements')?.detected) {
      suggestions.push('Probe for specific metrics and outcomes behind claimed improvements')
    }
    if (indicators.find(i => i.category === 'Vague Language')?.detected) {
      suggestions.push('Ask for names of specific tools, technologies, and methodologies used')
    }
  }
  
  return {
    isAIGenerated,
    confidence,
    riskLevel,
    indicators,
    explanation,
    suggestions,
  }
}

// Quick check function for inline use
export function getQuickAIDetection(text: string): { isAI: boolean; confidence: number; riskLevel: string } {
  const result = detectAIContent(text)
  return {
    isAI: result.isAIGenerated,
    confidence: result.confidence,
    riskLevel: result.riskLevel,
  }
}
