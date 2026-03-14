// Search Emails for Matching Resumes API
import { NextRequest, NextResponse } from 'next/server';
import { db, isDatabaseAvailable } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { requirement, keywords } = await request.json();

    if (!requirement) {
      return NextResponse.json({ success: false, error: 'No requirement provided' }, { status: 400 });
    }

    if (!isDatabaseAvailable()) {
      return NextResponse.json({ success: false, error: 'Database not available' }, { status: 503 });
    }

    // Get user's organization
    const user = await prisma!.user.findUnique({
      where: { id: session.userId },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ success: false, error: 'User has no organization' }, { status: 400 });
    }

    // Get email accounts for this organization
    const emailAccounts = await db!.emailAccount.findMany({
      where: { organizationId: user.organizationId, isConnected: true },
      select: { id: true, email: true },
    });

    const accountIds = emailAccounts.map(a => a.id);

    if (accountIds.length === 0) {
      return NextResponse.json({
        success: true,
        resumes: [],
        message: 'No connected email accounts found. Please connect an email account first.'
      });
    }

    // Search for emails with resume attachments
    // Look for attachments marked as resumes OR with resume-like filenames
    const threads = await db!.emailThread.findMany({
      where: {
        emailAccountId: { in: accountIds },
        attachments: {
          some: {
            OR: [
              { isResume: true },
              { filename: { endsWith: '.pdf', mode: 'insensitive' } },
              { filename: { endsWith: '.doc', mode: 'insensitive' } },
              { filename: { endsWith: '.docx', mode: 'insensitive' } },
            ]
          }
        }
      },
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
        emailAccount: {
          select: { email: true, provider: true }
        }
      },
      orderBy: { receivedAt: 'desc' },
      take: 100,
    });

    // Transform threads into resume objects
    const resumes = threads.map(thread => {
      const attachment = thread.attachments[0]; // Primary attachment
      return {
        id: thread.id,
        filename: attachment?.filename || 'Unknown',
        source: 'email',
        senderEmail: thread.senderEmail,
        senderName: thread.sender,
        receivedAt: thread.receivedAt.toISOString(),
        content: thread.rawContent || '',
        parsedData: {
          name: extractName(thread.sender, thread.rawContent),
          email: thread.senderEmail,
          phone: extractPhone(thread.rawContent),
          skills: extractSkills(thread.rawContent || '', keywords || []),
          experience: extractExperience(thread.rawContent),
          education: [],
        },
      };
    });

    return NextResponse.json({
      success: true,
      resumes,
      count: resumes.length,
      accountsSearched: emailAccounts.length,
    });

  } catch (error) {
    console.error('Search emails error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search emails', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ============================================
// Helper Functions
// ============================================

function extractName(sender: string, content: string | null): string {
  // Try to extract name from sender field
  // Format often: "John Doe <john@example.com>" or "john@example.com"
  
  // Try to get name before email
  const match = sender.match(/^([^<]+)<.*>$/);
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // If sender is just email, try to extract name from content
  if (content) {
    // Look for common name patterns in email body
    const namePatterns = [
      /(?:name|candidate|applicant)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+))/m,
    ];
    
    for (const pattern of namePatterns) {
      const found = content.match(pattern);
      if (found && found[1]) {
        return found[1].trim();
      }
    }
  }
  
  // Fallback to sender name or email
  const senderParts = sender.split('@')[0].split('.');
  if (senderParts.length > 1) {
    return senderParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  }
  
  return sender.split('@')[0] || 'Unknown Candidate';
}

function extractPhone(content: string | null): string | undefined {
  if (!content) return undefined;
  
  // Look for phone numbers in various formats
  const phonePatterns = [
    /\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
    /\+?[0-9]{1,3}[-.\s]?[0-9]{8,15}/g,
  ];
  
  for (const pattern of phonePatterns) {
    const found = content.match(pattern);
    if (found && found[0]) {
      return found[0].trim();
    }
  }
  
  return undefined;
}

function extractSkills(content: string, keywords: string[]): string[] {
  const skills: string[] = [];
  const lowerContent = content.toLowerCase();
  
  // Common technical skills to look for
  const commonSkills = [
    // Programming languages
    'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'ruby', 'php',
    'swift', 'kotlin', 'scala', 'r', 'matlab', 'perl', 'bash', 'sql',
    // Web technologies
    'html', 'css', 'react', 'vue', 'angular', 'node.js', 'nodejs', 'express', 'next.js',
    'django', 'flask', 'fastapi', 'spring', 'springboot', 'rails', 'laravel',
    // Cloud & DevOps
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git', 'ci/cd', 'terraform',
    // Databases
    'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'graphql',
    // Data & ML
    'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'pandas', 'numpy',
    // Other common
    'agile', 'scrum', 'rest api', 'microservices', 'linux', 'unix',
  ];
  
  // Add keywords from requirement to search
  const allSkillsToSearch = [...new Set([...commonSkills, ...keywords.map(k => k.toLowerCase())])];
  
  for (const skill of allSkillsToSearch) {
    if (lowerContent.includes(skill)) {
      // Capitalize properly
      const capitalized = skill.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      skills.push(capitalized);
    }
  }
  
  return [...new Set(skills)].slice(0, 15);
}

function extractExperience(content: string | null): Array<{
  title: string;
  company: string;
  duration: string;
  description: string;
}> {
  if (!content) return [];
  
  const experiences: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
  }> = [];
  
  // Look for common job title patterns
  const titlePatterns = [
    /(?:senior|junior|lead|principal|staff)?\s*(?:software|frontend|backend|full[\s-]?stack|data|devops|security)\s*(?:engineer|developer|architect|scientist)/gi,
    /(?:product|project|engineering)\s*(?:manager|lead)/gi,
    /(?:technical|tech)\s*(?:lead|director)/gi,
  ];
  
  const foundTitles: string[] = [];
  for (const pattern of titlePatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      if (match[0] && !foundTitles.includes(match[0])) {
        foundTitles.push(match[0]);
      }
    }
  }
  
  // Create experience entries for found titles
  for (const title of foundTitles.slice(0, 5)) {
    experiences.push({
      title: title,
      company: 'From Email Resume',
      duration: '',
      description: '',
    });
  }
  
  return experiences;
}
