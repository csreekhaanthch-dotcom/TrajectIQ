// Upload Resumes API
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed file types
const ALLOWED_TYPES = ['.pdf', '.doc', '.docx', '.txt', '.md', '.rtf'];

export async function POST(request: NextRequest) {
  const requestId = `upload-${Date.now()}`;
  
  try {
    console.log(`[${requestId}] Upload resumes request started`);
    
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      console.log(`[${requestId}] No authenticated user`);
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    if (!user.organizationId) {
      console.log(`[${requestId}] User has no organization`);
      return NextResponse.json({ success: false, error: 'User has no organization' }, { status: 400 });
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (formError) {
      console.error(`[${requestId}] Failed to parse form data:`, formError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to parse upload data. Please try again.' 
      }, { status: 400 });
    }
    
    const files = formData.getAll('files') as File[];
    console.log(`[${requestId}] Received ${files.length} files`);

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: 'No files provided' }, { status: 400 });
    }

    // Limit number of files
    const maxFiles = 10;
    if (files.length > maxFiles) {
      return NextResponse.json(
        { success: false, error: `Maximum ${maxFiles} files allowed. Received: ${files.length}` },
        { status: 400 }
      );
    }

    const resumes = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        console.log(`[${requestId}] Processing file: ${file.name}, size: ${file.size}`);
        
        // Validate file
        const validation = validateFile(file);
        if (!validation.valid) {
          errors.push(`${file.name}: ${validation.error}`);
          continue;
        }

        // Extract text from file
        const buffer = Buffer.from(await file.arrayBuffer());
        let text = '';
        
        // Try to extract text based on file type
        try {
          text = await extractText(buffer, file.name, file.type);
        } catch (extractError) {
          console.error(`[${requestId}] Text extraction failed for ${file.name}:`, extractError);
          errors.push(`${file.name}: ${extractError instanceof Error ? extractError.message : 'Failed to extract text'}`);
          continue;
        }
        
        if (!text || text.trim().length < 50) {
          errors.push(`${file.name}: Could not extract enough text content (min 50 chars, got ${text?.trim().length || 0})`);
          continue;
        }

        // Parse resume content
        const parsedData = parseResumeContent(text, file.name);

        // Save to database if available
        let savedId = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
        
        if (db) {
          try {
            // Create candidate
            const candidate = await db.candidate.create({
              data: {
                organizationId: user.organizationId,
                createdById: user.id,
                firstName: parsedData.name.split(' ')[0] || 'Unknown',
                lastName: parsedData.name.split(' ').slice(1).join(' ') || '',
                email: parsedData.email || null,
                phone: parsedData.phone || null,
                currentTitle: parsedData.experience[0]?.title || null,
                rawResumeText: text.substring(0, 50000),
                status: 'NEW',
                source: 'MANUAL_UPLOAD',
              },
            });

            // Create resume record
            await db.resume.create({
              data: {
                candidateId: candidate.id,
                skills: JSON.stringify(parsedData.skills),
                experience: JSON.stringify(parsedData.experience),
                education: JSON.stringify(parsedData.education),
                summary: text.substring(0, 2000),
                originalFilename: file.name,
                parsedAt: new Date(),
              },
            });

            savedId = candidate.id;
            console.log(`[${requestId}] Saved candidate to database: ${savedId}`);
          } catch (dbError) {
            console.error(`[${requestId}] Database save error:`, dbError);
            // Continue with temporary ID
          }
        }

        resumes.push({
          id: savedId,
          filename: file.name,
          source: 'upload',
          content: text.substring(0, 5000),
          parsedData,
          confidence: 50,
        });
        
        console.log(`[${requestId}] Successfully processed: ${file.name}`);

      } catch (fileError) {
        console.error(`[${requestId}] Error processing ${file.name}:`, fileError);
        errors.push(`${file.name}: ${fileError instanceof Error ? fileError.message : 'Processing failed'}`);
      }
    }

    console.log(`[${requestId}] Upload complete. ${resumes.length} resumes, ${errors.length} errors`);

    return NextResponse.json({
      success: resumes.length > 0,
      resumes,
      count: resumes.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('Upload resumes error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload resumes', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Validate uploaded file
function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` };
  }

  // Check file type
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_TYPES.includes(ext)) {
    return { valid: false, error: `Unsupported file type: ${ext}. Allowed: ${ALLOWED_TYPES.join(', ')}` };
  }

  // Check for empty file
  if (file.size === 0) {
    return { valid: false, error: 'File is empty' };
  }

  return { valid: true };
}

// Extract text from various file formats
async function extractText(buffer: Buffer, fileName: string, fileType: string): Promise<string> {
  const lowerFileName = fileName.toLowerCase();
  
  // PDF files
  if (lowerFileName.endsWith('.pdf')) {
    try {
      const pdfParse = require('pdf-parse');
      const pdfData = await pdfParse(buffer);
      return pdfData.text || '';
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error('Failed to parse PDF. Ensure it is not password-protected.');
    }
  }
  
  // DOCX files
  if (lowerFileName.endsWith('.docx')) {
    try {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    } catch (error) {
      console.error('DOCX extraction error:', error);
      throw new Error('Failed to parse DOCX file.');
    }
  }
  
  // DOC files (legacy)
  if (lowerFileName.endsWith('.doc')) {
    throw new Error('Legacy .doc files are not supported. Please convert to .docx or .pdf.');
  }
  
  // RTF files
  if (lowerFileName.endsWith('.rtf')) {
    const rtfContent = buffer.toString('utf-8');
    return rtfContent
      .replace(/\\[a-z]+\d* ?/gi, '')
      .replace(/[{}]/g, '')
      .replace(/\\\\/g, '\\')
      .trim();
  }
  
  // Plain text files (txt, md)
  if (lowerFileName.endsWith('.txt') || lowerFileName.endsWith('.md')) {
    return buffer.toString('utf-8');
  }
  
  // Try as plain text
  try {
    return buffer.toString('utf-8');
  } catch {
    throw new Error(`Unsupported file format: ${fileName}`);
  }
}

// Parse resume content (regex-based with skill detection)
function parseResumeContent(content: string, filename: string) {
  // Extract email
  const emailMatch = content.match(/[\w.-]+@[\w.-]+\.\w+/);
  const email = emailMatch?.[0] || '';

  // Extract phone
  const phoneMatch = content.match(/[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/);
  const phone = phoneMatch?.[0] || '';

  // Extract name - usually first non-empty line or from patterns
  const lines = content.split('\n').filter(l => l.trim());
  let name = 'Unknown Candidate';
  
  // Look for common name patterns
  const namePatterns = [
    /^([A-Z][a-z]+ [A-Z][a-z]+)$/,
    /^(Name|Candidate|Applicant)[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)/i,
  ];
  
  for (const line of lines.slice(0, 5)) {
    for (const pattern of namePatterns) {
      const match = line.match(pattern);
      if (match) {
        name = match[2] || match[1];
        break;
      }
    }
    // Check if first line looks like a name (2-4 words, capitalized)
    const words = line.trim().split(/\s+/);
    if (words.length >= 2 && words.length <= 4 && words.every(w => /^[A-Z][a-z]+$/.test(w))) {
      name = line.trim();
      break;
    }
  }

  // Extract skills
  const skills = extractSkills(content);

  // Extract experience
  const experience = extractExperience(content);

  // Extract education
  const education = extractEducation(content);

  return {
    name,
    email,
    phone,
    skills,
    experience,
    education,
  };
}

function extractSkills(content: string): string[] {
  const skills: string[] = [];
  const lowerContent = content.toLowerCase();
  
  const technicalSkills = [
    'javascript', 'typescript', 'python', 'java', 'react', 'node.js', 'node', 'angular', 'vue',
    'sql', 'mongodb', 'postgresql', 'mysql', 'aws', 'azure', 'docker', 'kubernetes',
    'machine learning', 'data science', 'tensorflow', 'pytorch', 'django', 'flask',
    'html', 'css', 'sass', 'less', 'tailwind', 'bootstrap', 'jquery',
    'git', 'github', 'gitlab', 'bitbucket', 'ci/cd', 'jenkins',
    'rest', 'api', 'graphql', 'microservices', 'linux', 'unix',
    'c++', 'c#', '.net', 'go', 'golang', 'rust', 'swift', 'kotlin',
    'agile', 'scrum', 'kanban', 'jira', 'confluence',
    'excel', 'powerpoint', 'word', 'photoshop', 'figma',
  ];
  
  for (const skill of technicalSkills) {
    if (lowerContent.includes(skill)) {
      skills.push(skill);
    }
  }
  
  return [...new Set(skills)].slice(0, 20);
}

function extractExperience(content: string): Array<{ title: string; company: string; duration: string; description: string }> {
  const experiences: Array<{ title: string; company: string; duration: string; description: string }> = [];
  
  // Look for experience section
  const expSection = content.match(/(?:experience|work history|employment)[\s\S]*?(?=(?:education|skills|projects|$))/i);
  const text = expSection?.[0] || content;
  
  // Common job titles
  const titlePatterns = [
    /(senior|junior|lead|principal|staff)?\s*(software|frontend|backend|full[\s-]?stack|web|mobile|data|ml|machine learning|devops|cloud|systems|network|security)\s*(engineer|developer|architect|specialist|analyst)/gi,
    /(project|product|engineering|technical|team)\s*(manager|lead|director)/gi,
    /(consultant|analyst|designer|administrator)/gi,
  ];
  
  const titles = new Set<string>();
  for (const pattern of titlePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of Array.from(matches).slice(0, 5)) {
      titles.add(match[0].trim());
    }
  }
  
  for (const title of Array.from(titles).slice(0, 5)) {
    experiences.push({
      title,
      company: '',
      duration: '',
      description: '',
    });
  }
  
  return experiences;
}

function extractEducation(content: string): Array<{ degree: string; institution: string; year: string }> {
  const education: Array<{ degree: string; institution: string; year: string }> = [];
  
  const degreePatterns = [
    /(bachelor|master|doctor|ph\.?d|mba|b\.?s\.?|b\.?a\.?|m\.?s\.?|m\.?a\.?)\s*(of\s*)?(science|arts|engineering|business|computer)/gi,
    /(b\.?tech|b\.?e\.?|m\.?tech|m\.?e\.?)/gi,
  ];
  
  for (const pattern of degreePatterns) {
    const matches = content.matchAll(pattern);
    for (const match of Array.from(matches).slice(0, 3)) {
      education.push({
        degree: match[0],
        institution: '',
        year: '',
      });
    }
  }
  
  return education;
}
