// ============================================
// AI Backend Client
// Client for communicating with FastAPI backend
// ============================================

const AI_BACKEND_URL = process.env.NEXT_PUBLIC_AI_BACKEND_URL || 'http://localhost:8001';

// Types for AI Pipeline
export interface ParsedResumeResult {
  success: boolean;
  result?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    summary?: string;
    skills: string[];
    experience: Array<{
      company?: string;
      title?: string;
      duration?: string;
      description?: string;
    }>;
    education: Array<{
      degree?: string;
      institution?: string;
      year?: string;
    }>;
    certifications: Array<{
      name?: string;
      issuer?: string;
      date?: string;
    }>;
    entities: Array<{
      type: string;
      text: string;
      confidence: number;
    }>;
    extracted_skills: string[];
    semantic_score?: number;
    skill_match_percentage?: number;
    matched_skills: string[];
    missing_skills: string[];
    additional_skills: string[];
    processing_time_ms: number;
    confidence: number;
    errors: string[];
  };
  error?: string;
  processing_time_ms: number;
}

export interface SkillExtractionResult {
  success: boolean;
  skills?: Array<{
    name: string;
    category?: string;
    skill_type?: string;
    confidence: number;
  }>;
  total_skills?: number;
  hard_skills?: string[];
  soft_skills?: string[];
  programming_languages?: string[];
  frameworks?: string[];
  categories?: Record<string, string[]>;
  processing_time_ms?: number;
  error?: string;
}

export interface SemanticMatchResult {
  success: boolean;
  similarity_score?: number;
  matched_keywords?: string[];
  title_similarity?: number;
  skills_similarity?: number;
  processing_time_ms?: number;
  error?: string;
}

export interface NLPAnalysisResult {
  success: boolean;
  entities?: Array<{
    type: string;
    text: string;
    start_char: number;
    end_char: number;
    confidence: number;
  }>;
  job_titles?: string[];
  organizations?: string[];
  locations?: string[];
  processing_time_ms?: number;
  error?: string;
}

export interface ScoreResult {
  success: boolean;
  final_score?: number;
  grade?: string;
  skill_match_percentage?: number;
  matched_skills?: string[];
  missing_skills?: string[];
  semantic_score?: number;
  processing_time_ms?: number;
  error?: string;
}

/**
 * AI Backend Client
 * Provides methods to interact with the FastAPI backend
 */
export class AIClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || AI_BACKEND_URL;
  }

  /**
   * Parse a resume file through the complete AI pipeline
   */
  async parseResume(
    file: File,
    options?: {
      jobDescription?: string;
      requiredSkills?: string[];
    }
  ): Promise<ParsedResumeResult> {
    const formData = new FormData();
    formData.append('file', file);

    if (options?.jobDescription) {
      formData.append('job_description', options.jobDescription);
    }

    if (options?.requiredSkills && options.requiredSkills.length > 0) {
      formData.append('required_skills', JSON.stringify(options.requiredSkills));
    }

    try {
      const response = await fetch(`${this.baseUrl}/parse`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Parse resume error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse resume',
        processing_time_ms: 0,
      };
    }
  }

  /**
   * Parse resume from raw bytes (for server-side use)
   */
  async parseResumeBytes(
    fileBytes: ArrayBuffer,
    fileName: string,
    options?: {
      jobDescription?: string;
      requiredSkills?: string[];
    }
  ): Promise<ParsedResumeResult> {
    const formData = new FormData();
    const blob = new Blob([fileBytes]);
    formData.append('file', blob, fileName);

    if (options?.jobDescription) {
      formData.append('job_description', options.jobDescription);
    }

    if (options?.requiredSkills && options.requiredSkills.length > 0) {
      formData.append('required_skills', JSON.stringify(options.requiredSkills));
    }

    try {
      const response = await fetch(`${this.baseUrl}/parse`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Parse resume bytes error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse resume',
        processing_time_ms: 0,
      };
    }
  }

  /**
   * Extract skills from text
   */
  async extractSkills(text: string): Promise<SkillExtractionResult> {
    try {
      const response = await fetch(`${this.baseUrl}/skills/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Skill extraction error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to extract skills',
      };
    }
  }

  /**
   * Compute semantic match between job description and resume
   */
  async semanticMatch(
    jobDescription: string,
    resumeText: string,
    requiredSkills?: string[]
  ): Promise<SemanticMatchResult> {
    try {
      const response = await fetch(`${this.baseUrl}/semantic/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_description: jobDescription,
          resume_text: resumeText,
          required_skills: requiredSkills,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Semantic match error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to compute semantic match',
      };
    }
  }

  /**
   * Analyze text with NLP
   */
  async nlpAnalyze(text: string): Promise<NLPAnalysisResult> {
    try {
      const response = await fetch(`${this.baseUrl}/nlp/analyze?text=${encodeURIComponent(text)}`, {
        method: 'POST',
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('NLP analysis error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze text',
      };
    }
  }

  /**
   * Calculate comprehensive resume score
   */
  async scoreResume(
    jobDescription: string,
    resumeText: string,
    requiredSkills: string[],
    options?: {
      experienceYearsRequired?: number;
      educationLevel?: string;
    }
  ): Promise<ScoreResult> {
    try {
      const response = await fetch(`${this.baseUrl}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_description: jobDescription,
          resume_text: resumeText,
          required_skills: requiredSkills,
          experience_years_required: options?.experienceYearsRequired,
          education_level: options?.educationLevel,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Score resume error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to score resume',
      };
    }
  }

  /**
   * Check if AI backend is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
      });
      const data = await response.json();
      return data.status === 'healthy';
    } catch (error) {
      console.error('Health check error:', error);
      return false;
    }
  }
}

// Singleton instance
let aiClientInstance: AIClient | null = null;

export function getAIClient(baseUrl?: string): AIClient {
  if (!aiClientInstance) {
    aiClientInstance = new AIClient(baseUrl);
  }
  return aiClientInstance;
}

// Export default instance
export const aiClient = getAIClient();
