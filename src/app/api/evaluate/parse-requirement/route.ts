// Parse Job Requirement API
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ success: false, error: 'No text provided' }, { status: 400 });
    }

    // Check if text is too short
    if (text.trim().length < 20) {
      return NextResponse.json({
        success: true,
        requirement: {
          id: 'req-' + Date.now(),
          title: 'Job Position',
          description: text.substring(0, 500),
          requiredSkills: extractKeywords(text),
          preferredSkills: [],
          experienceRequired: 0,
          educationLevel: '',
          location: '',
          salaryRange: '',
        }
      });
    }

    let zai;
    try {
      zai = await ZAI.create();
    } catch (aiError) {
      console.error('AI initialization error:', aiError);
      // Fallback to keyword extraction
      return NextResponse.json({
        success: true,
        requirement: {
          id: 'req-' + Date.now(),
          title: extractTitle(text) || 'Job Position',
          description: text.substring(0, 500),
          requiredSkills: extractKeywords(text),
          preferredSkills: [],
          experienceRequired: extractExperience(text),
          educationLevel: '',
          location: extractLocation(text),
          salaryRange: '',
        }
      });
    }

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a job requirement parser. Extract structured information from job descriptions.
Return ONLY a valid JSON object with these fields (no markdown, no explanation):
- title: job title (string)
- description: brief description (string)
- requiredSkills: array of required technical skills (strings)
- preferredSkills: array of preferred skills (strings)
- experienceRequired: years of experience required (number)
- educationLevel: required education level (string)
- location: job location (string)
- salaryRange: salary range if mentioned (string)

Only include information explicitly mentioned. Use empty strings/arrays for missing fields.`
        },
        {
          role: 'user',
          content: `Parse this job requirement:\n\n${text}`
        }
      ],
      temperature: 0.3,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    console.log('[ParseRequirement] AI response:', responseText.substring(0, 200));

    // Extract JSON from response - handle various formats
    let parsed = null;
    
    // Try direct JSON parse first
    try {
      parsed = JSON.parse(responseText);
    } catch {
      // Try to extract JSON from markdown code blocks
      const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        try {
          parsed = JSON.parse(codeBlockMatch[1].trim());
        } catch {
          // Continue to next method
        }
      }
      
      // Try to find raw JSON object
      if (!parsed) {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch {
            // JSON parsing failed, use fallback
          }
        }
      }
    }

    if (parsed) {
      return NextResponse.json({
        success: true,
        requirement: {
          id: 'req-' + Date.now(),
          title: parsed.title || 'Job Position',
          description: parsed.description || text.substring(0, 500),
          requiredSkills: Array.isArray(parsed.requiredSkills) ? parsed.requiredSkills : [],
          preferredSkills: Array.isArray(parsed.preferredSkills) ? parsed.preferredSkills : [],
          experienceRequired: typeof parsed.experienceRequired === 'number' ? parsed.experienceRequired : 0,
          educationLevel: parsed.educationLevel || '',
          location: parsed.location || '',
          salaryRange: parsed.salaryRange || '',
        }
      });
    }

    // Fallback: create basic requirement from keywords
    return NextResponse.json({
      success: true,
      requirement: {
        id: 'req-' + Date.now(),
        title: extractTitle(text) || 'Job Position',
        description: text.substring(0, 500),
        requiredSkills: extractKeywords(text),
        preferredSkills: [],
        experienceRequired: extractExperience(text),
        educationLevel: '',
        location: extractLocation(text),
        salaryRange: '',
      }
    });

  } catch (error) {
    console.error('Parse requirement error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to parse requirement: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}

function extractTitle(text: string): string {
  const lines = text.split('\n').filter(l => l.trim());
  // First line is often the title
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    if (firstLine.length < 100 && !firstLine.toLowerCase().startsWith('we are')) {
      return firstLine.replace(/^(job title|position|role):\s*/i, '');
    }
  }
  return 'Job Position';
}

function extractLocation(text: string): string {
  const locationMatch = text.match(/(?:location|based in|office location|work location)[:\s]*([^\n]+)/i);
  return locationMatch ? locationMatch[1].trim() : '';
}

function extractExperience(text: string): number {
  const expMatch = text.match(/(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)/i);
  return expMatch ? parseInt(expMatch[1]) : 0;
}

function extractKeywords(text: string): string[] {
  const skills = [
    'javascript', 'typescript', 'python', 'java', 'react', 'node.js', 'node', 'angular', 'vue',
    'sql', 'mongodb', 'postgresql', 'mysql', 'aws', 'azure', 'gcp', 'docker', 'kubernetes',
    'machine learning', 'ml', 'data science', 'agile', 'scrum', 'git', 'ci/cd', 'jenkins',
    'html', 'css', 'rest', 'api', 'graphql', 'microservices', 'linux', 'tensorflow', 'pytorch',
    'react native', 'flutter', 'swift', 'kotlin', 'go', 'golang', 'rust', 'c++', 'c#',
    'spring', 'django', 'flask', 'express', 'nextjs', 'next.js', 'tailwind', 'redux',
    'leadership', 'communication', 'teamwork', 'problem-solving', 'analytical',
  ];
  const lowerText = text.toLowerCase();
  return skills.filter(skill => lowerText.includes(skill.toLowerCase()));
}
