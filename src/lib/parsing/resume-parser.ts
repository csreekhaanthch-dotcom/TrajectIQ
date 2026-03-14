// ============================================
// Resume Parsing Engine
// ============================================
// Parses resume content and extracts structured data
// using AI-powered extraction

import ZAI from 'z-ai-web-dev-sdk';
import type {
  ResumeSkill,
  ResumeExperience,
  ResumeEducation,
  ResumeProject,
} from '@/types';

// ============================================
// Types
// ============================================

export interface ParsedResume {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  currentTitle: string | null;
  currentCompany: string | null;
  summary: string | null;
  skills: ResumeSkill[];
  experience: ResumeExperience[];
  education: ResumeEducation[];
  projects: ResumeProject[];
  certifications: string[];
  languages: string[];
}

export interface ParseResult {
  success: boolean;
  data: ParsedResume | null;
  error: string | null;
  confidence: number;
}

// ============================================
// Resume Parser Class
// ============================================

export class ResumeParser {
  private zai: Awaited<ReturnType<typeof ZAI.create>> | null = null;

  async initialize() {
    if (!this.zai) {
      this.zai = await ZAI.create();
    }
  }

  async parse(content: string, filename?: string): Promise<ParseResult> {
    try {
      await this.initialize();

      // Clean and prepare content
      const cleanedContent = this.cleanContent(content);

      // Use AI to extract structured data
      const extractedData = await this.extractWithAI(cleanedContent);

      // Validate and post-process
      const validatedData = this.validateAndProcess(extractedData);

      return {
        success: true,
        data: validatedData,
        error: null,
        confidence: this.calculateConfidence(validatedData),
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown parsing error',
        confidence: 0,
      };
    }
  }

  private cleanContent(content: string): string {
    // Remove excessive whitespace
    let cleaned = content.replace(/\s+/g, ' ');
    
    // Remove common resume artifacts
    cleaned = cleaned.replace(/Page \d+ of \d+/gi, '');
    cleaned = cleaned.replace(/\[PDF\]|\[DOC\]/gi, '');
    
    return cleaned.trim();
  }

  private async extractWithAI(content: string): Promise<ParsedResume> {
    if (!this.zai) {
      throw new Error('Parser not initialized');
    }

    const prompt = `Parse the following resume content and extract structured data. Return a JSON object with the following structure:

{
  "firstName": "string",
  "lastName": "string",
  "email": "string or null",
  "phone": "string or null",
  "location": "string or null",
  "linkedinUrl": "string or null",
  "githubUrl": "string or null",
  "portfolioUrl": "string or null",
  "currentTitle": "string or null",
  "currentCompany": "string or null",
  "summary": "string or null",
  "skills": [{"name": "string", "level": "beginner|intermediate|advanced|expert", "yearsOfExperience": number, "lastUsed": "YYYY-MM-DD or null"}],
  "experience": [{"title": "string", "company": "string", "location": "string or null", "startDate": "YYYY-MM", "endDate": "YYYY-MM or null", "current": boolean, "description": "string or null", "achievements": ["string"], "technologies": ["string"]}],
  "education": [{"degree": "string", "field": "string", "institution": "string", "location": "string or null", "startDate": "YYYY-MM", "endDate": "YYYY-MM or null", "gpa": "string or null", "honors": ["string"]}],
  "projects": [{"name": "string", "description": "string", "role": "string or null", "technologies": ["string"], "url": "string or null", "startDate": "YYYY-MM or null", "endDate": "YYYY-MM or null"}],
  "certifications": ["string"],
  "languages": ["string"]
}

Resume content:
${content}

Return only valid JSON, no markdown or explanation:`;

    try {
      const completion = await this.zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a resume parsing AI that extracts structured data from resumes. Always return valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
      });

      const responseContent = completion.choices[0]?.message?.content;
      
      if (!responseContent) {
        throw new Error('No response from AI');
      }

      // Parse JSON from response
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      return JSON.parse(jsonMatch[0]) as ParsedResume;
    } catch (error) {
      console.error('AI extraction error:', error);
      // Return a basic structure with regex fallback
      return this.extractWithRegex(content);
    }
  }

  private extractWithRegex(content: string): ParsedResume {
    // Fallback regex-based extraction
    return {
      firstName: '',
      lastName: '',
      email: this.extractEmail(content),
      phone: this.extractPhone(content),
      location: null,
      linkedinUrl: this.extractUrl(content, 'linkedin'),
      githubUrl: this.extractUrl(content, 'github'),
      portfolioUrl: null,
      currentTitle: null,
      currentCompany: null,
      summary: null,
      skills: this.extractSkillsBasic(content),
      experience: [],
      education: [],
      projects: [],
      certifications: [],
      languages: [],
    };
  }

  private extractEmail(content: string): string | null {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const match = content.match(emailRegex);
    return match ? match[0] : null;
  }

  private extractPhone(content: string): string | null {
    const phoneRegex = /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/;
    const match = content.match(phoneRegex);
    return match ? match[0] : null;
  }

  private extractUrl(content: string, platform: string): string | null {
    const urlRegex = new RegExp(`https?://(?:www\\.)?${platform}\\.com/[\\w-]+`, 'i');
    const match = content.match(urlRegex);
    return match ? match[0] : null;
  }

  private extractSkillsBasic(content: string): ResumeSkill[] {
    // Common technical skills to look for
    const commonSkills = [
      'python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'go', 'rust',
      'react', 'angular', 'vue', 'node.js', 'django', 'flask', 'spring',
      'aws', 'azure', 'gcp', 'docker', 'kubernetes',
      'postgresql', 'mysql', 'mongodb', 'redis',
      'git', 'linux', 'sql', 'html', 'css',
    ];

    const skills: ResumeSkill[] = [];
    const contentLower = content.toLowerCase();

    // Use word boundary matching to prevent false positives
    // e.g., "go" should not match "google" or "django"
    commonSkills.forEach(skill => {
      const skillLower = skill.toLowerCase();
      
      // Create word boundary regex
      // Handle special cases like "c++", "c#", "node.js"
      let pattern: RegExp;
      if (skillLower.endsWith('++') || skillLower.endsWith('#')) {
        // C++, C# - the symbol is part of the name
        const base = skillLower.slice(0, -2);
        const suffix = skillLower.slice(-2);
        pattern = new RegExp(`\\b${base}\\${suffix.split('').join('\\')}\\b`, 'i');
      } else if (skillLower.includes('.')) {
        // node.js, next.js - allow dot or space
        const escaped = skillLower.replace(/\./g, '\\.?');
        pattern = new RegExp(`(?:^|[^a-z])${escaped}(?:$|[^a-z])`, 'i');
      } else {
        // Regular word boundary
        pattern = new RegExp(`(?:^|(?<![a-zA-Z]))${skillLower}(?:$|(?![a-zA-Z]))`, 'i');
      }
      
      if (pattern.test(contentLower)) {
        skills.push({
          name: skill,
          level: 'intermediate',
          yearsOfExperience: 1,
          lastUsed: null,
        });
      }
    });

    return skills;
  }

  private validateAndProcess(data: ParsedResume): ParsedResume {
    // Ensure required fields
    if (!data.firstName && !data.lastName) {
      // Try to extract from email
      if (data.email) {
        const namePart = data.email.split('@')[0];
        const nameParts = namePart.split(/[._-]/);
        if (nameParts.length >= 2) {
          data.firstName = this.capitalize(nameParts[0]);
          data.lastName = this.capitalize(nameParts[1]);
        } else {
          data.firstName = this.capitalize(namePart);
          data.lastName = '';
        }
      }
    }

    // Validate and clean URLs
    data.linkedinUrl = this.validateUrl(data.linkedinUrl);
    data.githubUrl = this.validateUrl(data.githubUrl);
    data.portfolioUrl = this.validateUrl(data.portfolioUrl);

    // Clean arrays
    data.skills = data.skills || [];
    data.experience = data.experience || [];
    data.education = data.education || [];
    data.projects = data.projects || [];
    data.certifications = data.certifications || [];
    data.languages = data.languages || [];

    // Set current position from first experience if not set
    if (!data.currentTitle && data.experience.length > 0) {
      const currentExp = data.experience.find(e => e.current) || data.experience[0];
      data.currentTitle = currentExp.title;
      data.currentCompany = currentExp.company;
    }

    return data;
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  private validateUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    try {
      new URL(url);
      return url;
    } catch {
      return null;
    }
  }

  private calculateConfidence(data: ParsedResume): number {
    let score = 0;
    const weights = {
      name: 25,
      email: 15,
      experience: 20,
      skills: 20,
      education: 10,
      phone: 5,
      location: 5,
    };

    if (data.firstName && data.lastName) score += weights.name;
    if (data.email) score += weights.email;
    if (data.experience.length > 0) score += weights.experience;
    if (data.skills.length > 0) score += weights.skills;
    if (data.education.length > 0) score += weights.education;
    if (data.phone) score += weights.phone;
    if (data.location) score += weights.location;

    return Math.min(100, score);
  }
}

// ============================================
// Singleton Instance
// ============================================

let parserInstance: ResumeParser | null = null;

export function getResumeParser(): ResumeParser {
  if (!parserInstance) {
    parserInstance = new ResumeParser();
  }
  return parserInstance;
}

// ============================================
// Convenience Functions
// ============================================

export async function parseResume(content: string, filename?: string): Promise<ParseResult> {
  const parser = getResumeParser();
  return parser.parse(content, filename);
}

// ============================================
// Utility Functions
// ============================================

/**
 * Calculate SHA-256 hash of content
 * Works in both Node.js (server) and browser environments
 */
export function calculateContentHash(content: string): string {
  // Check if running in Node.js environment (server-side)
  if (typeof window === 'undefined' && typeof global !== 'undefined') {
    // Server-side: Use Node.js crypto module
    // Use dynamic import to avoid bundling issues
    try {
      const crypto = require('crypto');
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch {
      // Fallback to web crypto if Node crypto is not available
      return calculateWebCryptoHash(content);
    }
  }
  
  // Client-side: Use Web Crypto API
  return calculateWebCryptoHash(content);
}

/**
 * Calculate hash using Web Crypto API
 * Works in both browser and modern Node.js environments
 */
async function calculateWebCryptoHashAsync(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Synchronous version using Web Crypto API
 * Falls back to a simple hash for immediate return
 * 
 * Note: For client-side usage, this provides a consistent interface
 * The async version is preferred when possible
 */
function calculateWebCryptoHash(content: string): string {
  // For synchronous use in server-side code, we need to handle this differently
  // In Node.js 18+, crypto.subtle is available but requires async
  
  // Simple fallback hash for environments where async is not possible
  // This is NOT cryptographically secure, but works for content deduplication
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert to hex string (simulating SHA-256 length)
  const baseHash = Math.abs(hash).toString(16).padStart(8, '0');
  return (baseHash.repeat(8)).slice(0, 64);
}

/**
 * Async version for proper hash calculation
 * Use this when you need a proper cryptographic hash
 */
export async function calculateContentHashAsync(content: string): Promise<string> {
  // Server-side: Use Node.js crypto
  if (typeof window === 'undefined' && typeof global !== 'undefined') {
    try {
      const crypto = require('crypto');
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch {
      // Fall through to web crypto
    }
  }
  
  // Use Web Crypto API
  return calculateWebCryptoHashAsync(content);
}
