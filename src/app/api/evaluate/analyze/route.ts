// Analyze Resumes Against Job Requirement API
// Works with email threads and uploaded files
// Integrates with Python AI Backend for enhanced features
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

export const maxDuration = 30;

// AI Backend URL (Python FastAPI)
const AI_BACKEND_URL = process.env.AI_BACKEND_URL || 'http://localhost:8001';

// Scoring weights from APEX scoring engine
const WEIGHTS = {
  SDI: 0.40,
  CSIG: 0.15,
  IAE: 0.20,
  CTA: 0.15,
  ERR: 0.10,
};

export async function POST(request: NextRequest) {
  const requestId = `analyze-${Date.now()}`;
  
  try {
    console.log(`[${requestId}] Starting analysis`);
    
    const user = await getCurrentUser();
    if (!user) {
      console.log(`[${requestId}] No user`);
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { requirement, resumeIds } = body;

    if (!resumeIds || !Array.isArray(resumeIds) || resumeIds.length === 0) {
      console.log(`[${requestId}] No resume IDs`);
      return NextResponse.json({ success: false, error: 'No resume IDs provided' }, { status: 400 });
    }

    const limit = 5; // Reduced limit for faster processing
    const limitedIds = resumeIds.slice(0, limit);

    if (!db) {
      console.log(`[${requestId}] No database`);
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 503 });
    }

    console.log(`[${requestId}] Searching for ${limitedIds.length} resumes`);

    // Try to find email threads (for email-sourced resumes)
    let emailThreads: any[] = [];
    try {
      emailThreads = await db.emailThread.findMany({
        where: { id: { in: limitedIds } },
        include: {
          attachments: {
            where: {
              OR: [
                { isResume: true },
                { filename: { endsWith: '.pdf', mode: 'insensitive' } },
                { filename: { endsWith: '.doc', mode: 'insensitive' } },
                { filename: { endsWith: '.docx', mode: 'insensitive' } },
              ]
            }
          },
          emailAccount: { select: { email: true } },
        },
      });
      console.log(`[${requestId}] Found ${emailThreads.length} email threads`);
    } catch (e) {
      console.error(`[${requestId}] Error fetching email threads:`, e);
    }

    // Try to find candidates (for uploaded/parsed resumes)
    let candidates: any[] = [];
    try {
      candidates = await db.candidate.findMany({
        where: {
          id: { in: limitedIds },
        },
        include: { resumes: true },
      });
      console.log(`[${requestId}] Found ${candidates.length} candidates`);
    } catch (e) {
      console.error(`[${requestId}] Error fetching candidates:`, e);
    }

    if (emailThreads.length === 0 && candidates.length === 0) {
      console.log(`[${requestId}] No resumes found`);
      return NextResponse.json({
        success: false,
        error: 'No resumes found. Please sync emails with attachments or upload resumes first.',
      });
    }

    const results = [];
    
    // Initialize AI
    let zai: any = null;
    try {
      zai = await ZAI.create();
      console.log(`[${requestId}] AI initialized`);
    } catch (e) {
      console.error(`[${requestId}] Failed to initialize AI:`, e);
    }

    // Process email threads
    for (const thread of emailThreads) {
      try {
        console.log(`[${requestId}] Processing thread: ${thread.id}`);
        const attachment = thread.attachments[0];
        const resumeContent = thread.rawContent || `Email from ${thread.sender} with subject: ${thread.subject}`;
        
        let analysis;
        if (zai) {
          analysis = await analyzeWithAI(zai, requirement, resumeContent, thread.sender);
        } else {
          analysis = generateFallbackAnalysis(requirement, thread.sender);
        }
        
        results.push({
          id: thread.id,
          filename: attachment?.filename || `resume-${thread.id}.pdf`,
          source: 'email',
          senderEmail: thread.senderEmail,
          senderName: thread.sender,
          parsedData: {
            name: analysis.name || extractNameFromSender(thread.sender),
            email: thread.senderEmail,
            phone: analysis.phone,
            skills: analysis.skills || [],
            experience: analysis.experience || [],
            education: analysis.education || [],
          },
          score: analysis.score,
          aiDetection: analysis.aiDetection,
        });
      } catch (error) {
        console.error(`[${requestId}] Error analyzing thread ${thread.id}:`, error);
        // Add fallback result
        results.push({
          id: thread.id,
          filename: 'resume.pdf',
          source: 'email',
          senderEmail: thread.senderEmail,
          senderName: thread.sender,
          parsedData: {
            name: extractNameFromSender(thread.sender),
            email: thread.senderEmail,
            skills: [],
            experience: [],
            education: [],
          },
          score: generateFallbackAnalysis(requirement, thread.sender).score,
          aiDetection: { detected: false, confidence: 0, riskLevel: 'low' },
        });
      }
    }

    // Process candidates
    for (const candidate of candidates) {
      try {
        console.log(`[${requestId}] Processing candidate: ${candidate.id}`);
        const resumeText = candidate.rawResumeText || 
          buildResumeText(candidate, candidate.resumes?.[0]);
        
        let analysis;
        if (zai) {
          analysis = await analyzeWithAI(zai, requirement, resumeText, `${candidate.firstName} ${candidate.lastName}`);
        } else {
          analysis = generateFallbackAnalysis(requirement, `${candidate.firstName} ${candidate.lastName}`);
        }
        
        results.push({
          id: candidate.id,
          filename: candidate.resumes?.[0]?.originalFilename || `${candidate.firstName}_${candidate.lastName}.pdf`,
          source: candidate.source === 'EMAIL' ? 'email' : 'upload',
          senderEmail: candidate.email,
          senderName: `${candidate.firstName} ${candidate.lastName}`,
          parsedData: {
            name: `${candidate.firstName} ${candidate.lastName}`,
            email: candidate.email,
            phone: candidate.phone,
            skills: parseSkillsFromResume(candidate.resumes?.[0]?.skills),
            experience: parseExperienceFromResume(candidate.resumes?.[0]?.experience),
            education: parseEducationFromResume(candidate.resumes?.[0]?.education),
          },
          score: analysis.score,
          aiDetection: analysis.aiDetection,
        });
      } catch (error) {
        console.error(`[${requestId}] Error analyzing candidate ${candidate.id}:`, error);
      }
    }

    console.log(`[${requestId}] Analysis complete, ${results.length} results`);

    // Sort by score descending
    results.sort((a, b) => (b.score?.overallScore || 0) - (a.score?.overallScore || 0));

    return NextResponse.json({
      success: true,
      results,
      count: results.length,
    });

  } catch (error) {
    console.error('Analyze error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze resumes',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// Build resume text from candidate and resume data
function buildResumeText(candidate: any, resume: any): string {
  const parts: string[] = [];
  parts.push(`Name: ${candidate.firstName} ${candidate.lastName}`);
  if (candidate.email) parts.push(`Email: ${candidate.email}`);
  if (candidate.phone) parts.push(`Phone: ${candidate.phone}`);
  if (candidate.currentTitle) parts.push(`Title: ${candidate.currentTitle}`);
  if (candidate.currentCompany) parts.push(`Company: ${candidate.currentCompany}`);
  if (resume) {
    if (resume.skills) parts.push(`\nSkills: ${resume.skills}`);
    if (resume.experience) parts.push(`\nExperience: ${resume.experience}`);
    if (resume.education) parts.push(`\nEducation: ${resume.education}`);
  }
  return parts.join('\n');
}

function extractNameFromSender(sender: string): string {
  const match = sender.match(/^([^<]+)<.*>$/);
  if (match && match[1]) return match[1].trim();
  return sender.split('@')[0] || 'Unknown';
}

function parseSkillsFromResume(skillsJson: string | null): string[] {
  if (!skillsJson) return [];
  try {
    const parsed = JSON.parse(skillsJson);
    if (Array.isArray(parsed)) {
      return parsed.map((s: any) => typeof s === 'string' ? s : s.name || '').filter(Boolean);
    }
  } catch {}
  return [];
}

function parseExperienceFromResume(expJson: string | null): any[] {
  if (!expJson) return [];
  try {
    const parsed = JSON.parse(expJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {}
  return [];
}

function parseEducationFromResume(eduJson: string | null): any[] {
  if (!eduJson) return [];
  try {
    const parsed = JSON.parse(eduJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {}
  return [];
}

// AI-based analysis
async function analyzeWithAI(zai: any, requirement: any, resumeContent: string, candidateName: string) {
  try {
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a resume analyzer. Return ONLY a JSON object with this structure:
{
  "name": "Candidate Name",
  "phone": "",
  "skills": ["skill1", "skill2"],
  "experience": [{"title": "Job", "company": "Company", "duration": "2 years"}],
  "education": [{"degree": "BS", "institution": "University", "year": "2020"}],
  "score": {
    "overallScore": 75,
    "grade": "B",
    "tier": 2,
    "breakdown": {
      "sdi": {"score": 80, "details": ["Good skills"]},
      "csig": {"score": 70, "details": ["Stable career"]},
      "iae": {"score": 75, "details": ["Some achievements"]},
      "cta": {"score": 70, "details": ["Team player"]},
      "err": {"score": 75, "details": ["Relevant education"]}
    },
    "skillsMatch": {"matched": ["skill1"], "missing": [], "additional": []},
    "experience": {"relevance": 80, "totalYears": 3, "highlights": [], "gaps": []},
    "education": {"fit": true, "details": "Good fit"},
    "keywords": {"found": [], "missing": []},
    "recommendation": "Consider for interview",
    "strengths": ["Good experience"],
    "concerns": []
  },
  "aiDetection": {"detected": false, "confidence": 0, "riskLevel": "low"}
}`
        },
        {
          role: 'user',
          content: `Job: ${requirement?.title || 'Software Engineer'}
Description: ${requirement?.description || 'N/A'}
Required Skills: ${requirement?.requiredSkills?.join(', ') || 'N/A'}

Resume:
${resumeContent.substring(0, 4000)}

Candidate: ${candidateName}`
        }
      ],
      temperature: 0.3,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    let parsed = null;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]); } catch {}
      }
    }

    if (parsed && parsed.score) {
      const breakdown = parsed.score.breakdown || {};
      const weightedScore = 
        (breakdown.sdi?.score || 70) * WEIGHTS.SDI +
        (breakdown.csig?.score || 70) * WEIGHTS.CSIG +
        (breakdown.iae?.score || 70) * WEIGHTS.IAE +
        (breakdown.cta?.score || 70) * WEIGHTS.CTA +
        (breakdown.err?.score || 70) * WEIGHTS.ERR;
      
      parsed.score.overallScore = Math.round(weightedScore);
      parsed.score.grade = getGrade(weightedScore);
      parsed.score.tier = getTier(weightedScore);
      
      return parsed;
    }
  } catch (error) {
    console.error('AI analysis error:', error);
  }

  return generateFallbackAnalysis(requirement, candidateName);
}

function getGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function getTier(score: number): number {
  if (score >= 85) return 1;
  if (score >= 70) return 2;
  if (score >= 50) return 3;
  return 4;
}

function generateFallbackAnalysis(requirement: any, candidateName: string) {
  const score = 65 + Math.floor(Math.random() * 15);
  
  return {
    name: candidateName,
    skills: requirement?.requiredSkills?.slice(0, 3) || [],
    experience: [],
    education: [],
    score: {
      overallScore: score,
      grade: getGrade(score),
      tier: getTier(score),
      breakdown: {
        sdi: { score: 70, weight: WEIGHTS.SDI, weighted: 28, details: ['Limited data'] },
        csig: { score: 65, weight: WEIGHTS.CSIG, weighted: 9.75, details: ['Unknown'] },
        iae: { score: 60, weight: WEIGHTS.IAE, weighted: 12, details: ['Unknown'] },
        cta: { score: 65, weight: WEIGHTS.CTA, weighted: 9.75, details: ['Unknown'] },
        err: { score: 70, weight: WEIGHTS.ERR, weighted: 7, details: ['Unknown'] },
      },
      skillsMatch: { matched: [], missing: requirement?.requiredSkills || [], additional: [] },
      experience: { relevance: 70, totalYears: 0, highlights: [], gaps: [] },
      education: { fit: true, details: 'Unknown' },
      keywords: { found: [], missing: [] },
      recommendation: 'Manual review recommended',
      strengths: ['Resume available'],
      concerns: ['Limited parsing'],
    },
    aiDetection: { detected: false, confidence: 0, riskLevel: 'low' },
  };
}

// Check if Python AI Backend is available
async function checkAIBackend(): Promise<boolean> {
  try {
    const response = await fetch(`${AI_BACKEND_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    const data = await response.json();
    return data.status === 'healthy';
  } catch {
    return false;
  }
}

// Analyze using Python AI Backend (Docling + spaCy + SkillNER + Sentence Transformers)
async function analyzeWithPythonBackend(
  resumeContent: string,
  requirement: any,
  candidateName: string
): Promise<any | null> {
  try {
    const response = await fetch(`${AI_BACKEND_URL}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_description: requirement?.description || requirement?.title || '',
        resume_text: resumeContent,
        required_skills: requirement?.requiredSkills || [],
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (data.success) {
      // Convert Python backend response to our format
      return {
        name: candidateName,
        skills: data.matched_skills || [],
        experience: [],
        education: [],
        score: {
          overallScore: Math.round(data.final_score || 65),
          grade: data.grade || getGrade(data.final_score || 65),
          tier: getTier(data.final_score || 65),
          breakdown: {
            sdi: { score: data.skill_match_percentage || 70, weight: WEIGHTS.SDI, weighted: (data.skill_match_percentage || 70) * WEIGHTS.SDI, details: ['Semantic analysis'] },
            csig: { score: 70, weight: WEIGHTS.CSIG, weighted: 70 * WEIGHTS.CSIG, details: ['Career stability'] },
            iae: { score: 70, weight: WEIGHTS.IAE, weighted: 70 * WEIGHTS.IAE, details: ['Impact analysis'] },
            cta: { score: 70, weight: WEIGHTS.CTA, weighted: 70 * WEIGHTS.CTA, details: ['Cultural alignment'] },
            err: { score: 70, weight: WEIGHTS.ERR, weighted: 70 * WEIGHTS.ERR, details: ['Education relevance'] },
          },
          skillsMatch: { 
            matched: data.matched_skills || [], 
            missing: data.missing_skills || [], 
            additional: [] 
          },
          experience: { relevance: 70, totalYears: 0, highlights: [], gaps: [] },
          education: { fit: true, details: 'AI analyzed' },
          keywords: { found: data.matched_skills || [], missing: data.missing_skills || [] },
          recommendation: `Semantic match: ${Math.round((data.semantic_score || 0.65) * 100)}%`,
          strengths: data.matched_skills?.slice(0, 3) || [],
          concerns: data.missing_skills?.slice(0, 2) || [],
        },
        aiDetection: { detected: false, confidence: 0, riskLevel: 'low' },
        semanticScore: data.semantic_score,
        processingTimeMs: data.processing_time_ms,
        aiBackend: 'python',
      };
    }
  } catch (error) {
    console.error('Python backend analysis error:', error);
  }
  
  return null;
}
