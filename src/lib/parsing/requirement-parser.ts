// ============================================
// Job Requirement Parser
// ============================================
// Extracts job requirements from emails

import ZAI from 'z-ai-web-dev-sdk';
import type { Skill, EmploymentType } from '@/types';

// ============================================
// Types
// ============================================

export interface ParsedRequirement {
  title: string;
  department: string | null;
  location: string | null;
  employmentType: EmploymentType;
  salaryRange: string | null;
  requiredSkills: Skill[];
  preferredSkills: Skill[];
  experienceRequired: number;
  experiencePreferred: number | null;
  educationLevel: string | null;
  certifications: string[];
  description: string | null;
}

export interface RequirementParseResult {
  success: boolean;
  data: ParsedRequirement | null;
  error: string | null;
  confidence: number;
}

// ============================================
// Requirement Parser Class
// ============================================

export class RequirementParser {
  private zai: Awaited<ReturnType<typeof ZAI.create>> | null = null;

  async initialize() {
    if (!this.zai) {
      this.zai = await ZAI.create();
    }
  }

  async parseFromEmail(
    subject: string,
    body: string,
    sender?: string
  ): Promise<RequirementParseResult> {
    try {
      await this.initialize();

      const combinedContent = `Subject: ${subject}\n\n${body}`;

      // Use AI to extract job requirements
      const extractedData = await this.extractWithAI(combinedContent);

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

  async parseFromText(text: string): Promise<RequirementParseResult> {
    try {
      await this.initialize();

      const extractedData = await this.extractWithAI(text);
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

  private async extractWithAI(content: string): Promise<ParsedRequirement> {
    if (!this.zai) {
      throw new Error('Parser not initialized');
    }

    const prompt = `Parse the following job posting/requirement and extract structured data. Return a JSON object with the following structure:

{
  "title": "string (job title)",
  "department": "string or null",
  "location": "string or null",
  "employmentType": "FULL_TIME|PART_TIME|CONTRACT|CONTRACT_TO_HIRE|INTERNSHIP",
  "salaryRange": "string or null",
  "requiredSkills": [{"name": "string", "required": true, "weight": 1.0, "category": "technical|soft|domain|tool"}],
  "preferredSkills": [{"name": "string", "required": false, "weight": 0.5, "category": "technical|soft|domain|tool"}],
  "experienceRequired": number (years),
  "experiencePreferred": number or null,
  "educationLevel": "string or null (e.g., Bachelor's, Master's)",
  "certifications": ["string"],
  "description": "string or null (brief summary of the role)"
}

Content:
${content}

Return only valid JSON, no markdown or explanation:`;

    try {
      const completion = await this.zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a job requirement parser that extracts structured data from job postings. Always return valid JSON.'
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

      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      return JSON.parse(jsonMatch[0]) as ParsedRequirement;
    } catch (error) {
      console.error('AI extraction error:', error);
      return this.extractWithRegex(content);
    }
  }

  private extractWithRegex(content: string): ParsedRequirement {
    // Basic regex extraction fallback
    const contentLower = content.toLowerCase();
    
    // Try to extract title
    const titlePatterns = [
      /position[:\s]+([^\n]+)/i,
      /role[:\s]+([^\n]+)/i,
      /job title[:\s]+([^\n]+)/i,
      /hiring[:\s]+([^\n]+)/i,
    ];
    
    let title = 'Unknown Position';
    for (const pattern of titlePatterns) {
      const match = content.match(pattern);
      if (match) {
        title = match[1].trim();
        break;
      }
    }
    
    // Try to extract experience
    const expMatch = content.match(/(\d+)\+?\s*years?\s*(of\s*)?(experience|exp)/i);
    const experienceRequired = expMatch ? parseInt(expMatch[1]) : 0;
    
    // Try to extract skills
    const skills = this.extractSkillsBasic(content);
    
    return {
      title,
      department: null,
      location: null,
      employmentType: 'FULL_TIME',
      salaryRange: null,
      requiredSkills: skills.slice(0, 5),
      preferredSkills: [],
      experienceRequired,
      experiencePreferred: null,
      educationLevel: null,
      certifications: [],
      description: null,
    };
  }

  private extractSkillsBasic(content: string): Skill[] {
    const commonSkills = [
      'python', 'javascript', 'typescript', 'java', 'c++', 'go', 'rust',
      'react', 'angular', 'vue', 'node.js', 'django', 'spring',
      'aws', 'azure', 'gcp', 'docker', 'kubernetes',
      'sql', 'postgresql', 'mysql', 'mongodb',
      'git', 'linux', 'machine learning', 'ai',
    ];

    const skills: Skill[] = [];
    const contentLower = content.toLowerCase();

    commonSkills.forEach(skill => {
      if (contentLower.includes(skill)) {
        skills.push({
          name: skill,
          required: true,
          weight: 1.0,
          category: 'technical',
        });
      }
    });

    return skills;
  }

  private validateAndProcess(data: ParsedRequirement): ParsedRequirement {
    // Ensure title exists
    if (!data.title || data.title.trim() === '') {
      data.title = 'Unknown Position';
    }

    // Normalize employment type
    const validTypes: EmploymentType[] = [
      'FULL_TIME', 'PART_TIME', 'CONTRACT', 'CONTRACT_TO_HIRE', 'INTERNSHIP'
    ];
    if (!validTypes.includes(data.employmentType)) {
      data.employmentType = 'FULL_TIME';
    }

    // Ensure arrays
    data.requiredSkills = data.requiredSkills || [];
    data.preferredSkills = data.preferredSkills || [];
    data.certifications = data.certifications || [];

    // Validate experience
    if (data.experienceRequired < 0) {
      data.experienceRequired = 0;
    }

    // Ensure skill categories are valid
    const validCategories = ['technical', 'soft', 'domain', 'tool'];
    data.requiredSkills = data.requiredSkills.map(skill => ({
      ...skill,
      required: true,
      category: validCategories.includes(skill.category) ? skill.category : 'technical',
    }));

    data.preferredSkills = data.preferredSkills.map(skill => ({
      ...skill,
      required: false,
      category: validCategories.includes(skill.category) ? skill.category : 'technical',
    }));

    return data;
  }

  private calculateConfidence(data: ParsedRequirement): number {
    let score = 0;
    const weights = {
      title: 30,
      skills: 30,
      experience: 15,
      location: 10,
      type: 10,
      education: 5,
    };

    if (data.title && data.title !== 'Unknown Position') score += weights.title;
    if (data.requiredSkills.length > 0) score += weights.skills;
    if (data.experienceRequired > 0) score += weights.experience;
    if (data.location) score += weights.location;
    if (data.employmentType) score += weights.type;
    if (data.educationLevel) score += weights.education;

    return Math.min(100, score);
  }
}

// ============================================
// Singleton Instance
// ============================================

let parserInstance: RequirementParser | null = null;

export function getRequirementParser(): RequirementParser {
  if (!parserInstance) {
    parserInstance = new RequirementParser();
  }
  return parserInstance;
}

// ============================================
// Convenience Functions
// ============================================

export async function parseRequirementFromEmail(
  subject: string,
  body: string
): Promise<RequirementParseResult> {
  const parser = getRequirementParser();
  return parser.parseFromEmail(subject, body);
}

export async function parseRequirementFromText(
  text: string
): Promise<RequirementParseResult> {
  const parser = getRequirementParser();
  return parser.parseFromText(text);
}
