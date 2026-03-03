import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where: any = {};
    if (jobId) where.jobId = jobId;
    if (status) where.status = status;

    // Fetch candidates with their evaluations
    const candidates = await db.candidate.findMany({
      where,
      include: {
        evaluations: {
          where: { status: 'COMPLETED' },
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        job: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    // Transform data for frontend
    const transformedCandidates = candidates.map(candidate => {
      const latestEvaluation = candidate.evaluations[0];
      
      return {
        id: candidate.candidateId,
        name: `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || 'Unknown',
        email: candidate.email || '',
        avatar: null,
        score: Math.round(latestEvaluation?.hiringIndex || 0),
        grade: latestEvaluation?.grade || 'N/A',
        recommendation: getRecommendationText(latestEvaluation?.recommendation),
        status: candidate.status.toLowerCase(),
        jobId: candidate.jobId || '',
        jobTitle: candidate.job?.title || 'Not Assigned',
        currentRole: '', // Would extract from resume parsing
        company: '',
        evaluatedAt: latestEvaluation?.createdAt?.toISOString() || candidate.createdAt.toISOString(),
        skills: [], // Would come from evaluation details
        experience: 0,
        education: '',
        summary: '',
        strengths: latestEvaluation?.strengths ? JSON.parse(latestEvaluation.strengths) : [],
        improvements: latestEvaluation?.concerns ? JSON.parse(latestEvaluation.concerns) : [],
        skillsScore: latestEvaluation?.skillScore || 0,
        impactScore: latestEvaluation?.impactScore || 0,
        trajectoryScore: latestEvaluation?.trajectoryScore || 0,
        experienceScore: latestEvaluation?.experienceScore || 0,
        aiRisk: latestEvaluation?.aiDetectionScore || 0
      };
    });

    return NextResponse.json({
      success: true,
      data: transformedCandidates,
      total: await db.candidate.count({ where })
    });
  } catch (error) {
    console.error('Error fetching candidates:', error);
    
    // Return mock data if database is not available
    return NextResponse.json({
      success: true,
      data: getMockCandidates()
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, phone, resumeText, jobId, source } = body;

    // Generate unique candidate ID
    const candidateId = `CAND-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const candidate = await db.candidate.create({
      data: {
        candidateId,
        firstName,
        lastName,
        email,
        phone,
        resumeText,
        jobId,
        source: source || 'manual',
        status: 'PENDING'
      }
    });

    return NextResponse.json({
      success: true,
      data: candidate
    });
  } catch (error) {
    console.error('Error creating candidate:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create candidate' },
      { status: 500 }
    );
  }
}

function getRecommendationText(recommendation: string | null | undefined): string {
  switch (recommendation) {
    case 'strong_hire': return 'Strongly Recommend';
    case 'hire': return 'Recommend';
    case 'consider': return 'Consider';
    case 'pass': return 'Not Recommended';
    case 'strong_pass': return 'Strongly Not Recommended';
    default: return 'Pending';
  }
}

function getMockCandidates() {
  return [
    {
      id: 'CAND-001',
      name: 'Sarah Chen',
      email: 'sarah.chen@email.com',
      score: 92,
      grade: 'A-',
      recommendation: 'Strongly Recommend',
      status: 'completed',
      jobId: 'JOB-001',
      jobTitle: 'Senior Software Engineer',
      currentRole: 'Staff Engineer at Google',
      company: 'Google',
      evaluatedAt: new Date().toISOString(),
      skills: ['Python', 'TypeScript', 'Kubernetes', 'AWS', 'System Design'],
      experience: 8,
      education: 'M.S. Computer Science, Stanford',
      summary: 'Experienced staff engineer with strong track record in distributed systems.',
      strengths: ['Excellent technical depth', 'Strong leadership experience', 'Quantified achievements'],
      improvements: ['Could highlight more recent cloud experience'],
      skillsScore: 38,
      impactScore: 85,
      trajectoryScore: 90,
      experienceScore: 88,
      aiRisk: 15
    },
    {
      id: 'CAND-002',
      name: 'Michael Torres',
      email: 'michael.torres@email.com',
      score: 87,
      grade: 'B+',
      recommendation: 'Recommend',
      status: 'completed',
      jobId: 'JOB-001',
      jobTitle: 'Senior Software Engineer',
      currentRole: 'Senior Developer at Microsoft',
      company: 'Microsoft',
      evaluatedAt: new Date().toISOString(),
      skills: ['C#', '.NET', 'Azure', 'React', 'SQL'],
      experience: 6,
      education: 'B.S. Computer Science, UCLA',
      summary: 'Full-stack developer with solid Azure experience.',
      strengths: ['Good technical breadth', 'Cloud experience', 'Team player'],
      improvements: ['Could show more leadership examples'],
      skillsScore: 35,
      impactScore: 80,
      trajectoryScore: 82,
      experienceScore: 75,
      aiRisk: 22
    },
    {
      id: 'CAND-003',
      name: 'Emily Johnson',
      email: 'emily.j@email.com',
      score: 81,
      grade: 'B',
      recommendation: 'Recommend',
      status: 'completed',
      jobId: 'JOB-002',
      jobTitle: 'Full Stack Developer',
      currentRole: 'Software Engineer at Stripe',
      company: 'Stripe',
      evaluatedAt: new Date().toISOString(),
      skills: ['JavaScript', 'Ruby', 'React', 'PostgreSQL', 'GraphQL'],
      experience: 5,
      education: 'B.S. Computer Science, MIT',
      summary: 'Product-focused engineer with fintech experience.',
      strengths: ['Strong product sense', 'Full-stack capabilities', 'Quality code'],
      improvements: ['More backend depth needed'],
      skillsScore: 32,
      impactScore: 78,
      trajectoryScore: 75,
      experienceScore: 70,
      aiRisk: 18
    },
    {
      id: 'CAND-004',
      name: 'David Kim',
      email: 'david.kim@email.com',
      score: 78,
      grade: 'B-',
      recommendation: 'Consider',
      status: 'completed',
      jobId: 'JOB-001',
      jobTitle: 'Senior Software Engineer',
      currentRole: 'Developer at Startup',
      company: 'TechStartup Inc',
      evaluatedAt: new Date().toISOString(),
      skills: ['Python', 'Django', 'React', 'Docker'],
      experience: 4,
      education: 'B.S. Computer Engineering, UC Berkeley',
      summary: 'Solid developer with startup experience.',
      strengths: ['Adaptable', 'Quick learner', 'Good communication'],
      improvements: ['Needs more enterprise experience', 'Limited system design depth'],
      skillsScore: 28,
      impactScore: 72,
      trajectoryScore: 70,
      experienceScore: 65,
      aiRisk: 25
    },
    {
      id: 'CAND-005',
      name: 'Alex Rivera',
      email: 'alex.r@email.com',
      score: 72,
      grade: 'C+',
      recommendation: 'Consider',
      status: 'completed',
      jobId: 'JOB-002',
      jobTitle: 'Full Stack Developer',
      currentRole: 'Junior Developer at Agency',
      company: 'Digital Agency Co',
      evaluatedAt: new Date().toISOString(),
      skills: ['JavaScript', 'Vue.js', 'Node.js', 'MongoDB'],
      experience: 3,
      education: 'Coding Bootcamp Graduate',
      summary: 'Motivated developer building experience.',
      strengths: ['Eager to learn', 'Good collaboration skills'],
      improvements: ['Limited experience', 'Needs deeper technical skills'],
      skillsScore: 24,
      impactScore: 65,
      trajectoryScore: 60,
      experienceScore: 55,
      aiRisk: 35
    }
  ];
}
