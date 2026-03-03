import type { Candidate, Job, DashboardStats, SkillScore } from '@/types/dashboard';

// Helper to generate random skills
function generateSkills(): SkillScore[] {
  const allSkills = [
    { name: 'JavaScript', category: 'Technical' },
    { name: 'TypeScript', category: 'Technical' },
    { name: 'React', category: 'Technical' },
    { name: 'Node.js', category: 'Technical' },
    { name: 'Python', category: 'Technical' },
    { name: 'SQL', category: 'Technical' },
    { name: 'AWS', category: 'Technical' },
    { name: 'Docker', category: 'Technical' },
    { name: 'Git', category: 'Technical' },
    { name: 'Communication', category: 'Soft Skills' },
    { name: 'Leadership', category: 'Soft Skills' },
    { name: 'Problem Solving', category: 'Soft Skills' },
    { name: 'Teamwork', category: 'Soft Skills' },
    { name: 'Project Management', category: 'Soft Skills' },
  ];

  return allSkills.slice(0, Math.floor(Math.random() * 6) + 6).map(skill => ({
    ...skill,
    score: Math.floor(Math.random() * 40) + 60, // 60-100 range
  }));
}

// Generate mock candidates
export const mockCandidates: Candidate[] = [
  {
    id: 'cand-001',
    name: 'Alexandra Chen',
    email: 'alexandra.chen@email.com',
    score: 96,
    grade: 'A+',
    recommendation: 'Strongly Recommend',
    status: 'completed',
    jobId: 'job-001',
    jobTitle: 'Senior Software Engineer',
    evaluatedAt: '2024-01-15T10:30:00Z',
    skills: generateSkills(),
    experience: 8,
    education: 'M.S. Computer Science, Stanford University',
    summary: 'Highly skilled software engineer with 8 years of experience in full-stack development. Strong expertise in React, Node.js, and cloud architecture. Demonstrated leadership in mentoring junior developers and driving technical initiatives.',
    strengths: ['Exceptional technical depth', 'Strong leadership qualities', 'Excellent problem-solving skills', 'Great communication'],
    improvements: ['Could expand into ML/AI technologies', 'Consider more public speaking opportunities'],
  },
  {
    id: 'cand-002',
    name: 'Marcus Johnson',
    email: 'marcus.j@email.com',
    score: 92,
    grade: 'A',
    recommendation: 'Strongly Recommend',
    status: 'completed',
    jobId: 'job-001',
    jobTitle: 'Senior Software Engineer',
    evaluatedAt: '2024-01-14T14:20:00Z',
    skills: generateSkills(),
    experience: 6,
    education: 'B.S. Computer Engineering, MIT',
    summary: 'Results-driven engineer with strong background in scalable systems design. Experienced in microservices architecture and DevOps practices. Active open-source contributor.',
    strengths: ['Deep system design knowledge', 'Strong DevOps skills', 'Open-source contributions'],
    improvements: ['Could improve documentation practices'],
  },
  {
    id: 'cand-003',
    name: 'Sarah Williams',
    email: 'sarah.williams@email.com',
    score: 88,
    grade: 'A-',
    recommendation: 'Recommend',
    status: 'completed',
    jobId: 'job-002',
    jobTitle: 'Product Manager',
    evaluatedAt: '2024-01-13T09:15:00Z',
    skills: generateSkills(),
    experience: 5,
    education: 'MBA, Harvard Business School',
    summary: 'Strategic product manager with a track record of launching successful products. Strong analytical skills combined with excellent stakeholder management abilities.',
    strengths: ['Strategic thinking', 'Stakeholder management', 'Data-driven decisions'],
    improvements: ['Technical depth could be improved'],
  },
  {
    id: 'cand-004',
    name: 'David Kim',
    email: 'david.kim@email.com',
    score: 85,
    grade: 'B+',
    recommendation: 'Recommend',
    status: 'completed',
    jobId: 'job-001',
    jobTitle: 'Senior Software Engineer',
    evaluatedAt: '2024-01-12T16:45:00Z',
    skills: generateSkills(),
    experience: 5,
    education: 'B.S. Computer Science, UC Berkeley',
    summary: 'Solid software engineer with expertise in backend development. Strong in Python and database optimization. Looking to grow into full-stack development.',
    strengths: ['Backend expertise', 'Database optimization', 'Clean code practices'],
    improvements: ['Frontend skills need development', 'Could take more initiative in leadership'],
  },
  {
    id: 'cand-005',
    name: 'Emily Rodriguez',
    email: 'emily.r@email.com',
    score: 82,
    grade: 'B+',
    recommendation: 'Recommend',
    status: 'completed',
    jobId: 'job-003',
    jobTitle: 'UX Designer',
    evaluatedAt: '2024-01-11T11:00:00Z',
    skills: generateSkills(),
    experience: 4,
    education: 'B.A. Design, Parsons School of Design',
    summary: 'Creative UX designer with a passion for user-centered design. Experienced in conducting user research and creating intuitive interfaces.',
    strengths: ['User research expertise', 'Visual design skills', 'Prototyping proficiency'],
    improvements: ['Could learn more about technical constraints', 'Expand design system knowledge'],
  },
  {
    id: 'cand-006',
    name: 'James Thompson',
    email: 'j.thompson@email.com',
    score: 78,
    grade: 'B',
    recommendation: 'Consider',
    status: 'completed',
    jobId: 'job-002',
    jobTitle: 'Product Manager',
    evaluatedAt: '2024-01-10T13:30:00Z',
    skills: generateSkills(),
    experience: 3,
    education: 'B.S. Business Administration, Wharton',
    summary: 'Enthusiastic product manager with good foundational skills. Shows promise in market analysis and competitive research.',
    strengths: ['Market analysis', 'Competitive research', 'Presentation skills'],
    improvements: ['Needs more experience in product lifecycle', 'Technical understanding limited'],
  },
  {
    id: 'cand-007',
    name: 'Lisa Park',
    email: 'lisa.park@email.com',
    score: 75,
    grade: 'B',
    recommendation: 'Consider',
    status: 'completed',
    jobId: 'job-001',
    jobTitle: 'Senior Software Engineer',
    evaluatedAt: '2024-01-09T15:20:00Z',
    skills: generateSkills(),
    experience: 4,
    education: 'M.S. Software Engineering, Carnegie Mellon',
    summary: 'Dedicated software engineer with solid technical foundation. Good team player with growing expertise in cloud technologies.',
    strengths: ['Team collaboration', 'Learning agility', 'Cloud basics'],
    improvements: ['Needs more project leadership', 'Communication could be clearer'],
  },
  {
    id: 'cand-008',
    name: 'Michael Brown',
    email: 'm.brown@email.com',
    score: 71,
    grade: 'B-',
    recommendation: 'Consider',
    status: 'completed',
    jobId: 'job-004',
    jobTitle: 'Data Analyst',
    evaluatedAt: '2024-01-08T10:00:00Z',
    skills: generateSkills(),
    experience: 2,
    education: 'B.S. Statistics, UCLA',
    summary: 'Detail-oriented data analyst with proficiency in SQL and Python. Shows potential in data visualization and reporting.',
    strengths: ['Attention to detail', 'SQL proficiency', 'Data visualization'],
    improvements: ['Needs business acumen development', 'Statistical modeling could improve'],
  },
  {
    id: 'cand-009',
    name: 'Jennifer Lee',
    email: 'j.lee@email.com',
    score: 68,
    grade: 'C+',
    recommendation: 'Consider',
    status: 'pending',
    jobId: 'job-003',
    jobTitle: 'UX Designer',
    evaluatedAt: '2024-01-07T09:45:00Z',
    skills: generateSkills(),
    experience: 2,
    education: 'B.F.A. Graphic Design, RISD',
    summary: 'Junior UX designer with strong visual design background. Still developing user research skills.',
    strengths: ['Visual design', 'Creativity', 'Design tools proficiency'],
    improvements: ['User research experience needed', 'UX methodology understanding'],
  },
  {
    id: 'cand-010',
    name: 'Robert Davis',
    email: 'r.davis@email.com',
    score: 65,
    grade: 'C',
    recommendation: 'Not Recommended',
    status: 'pending',
    jobId: 'job-001',
    jobTitle: 'Senior Software Engineer',
    evaluatedAt: '2024-01-06T14:15:00Z',
    skills: generateSkills(),
    experience: 3,
    education: 'B.S. Computer Science, State University',
    summary: 'Software developer with basic skills. Requires significant development to meet senior-level expectations.',
    strengths: ['Willingness to learn', 'Basic coding skills'],
    improvements: ['Technical depth insufficient', 'No leadership experience', 'Communication needs work'],
  },
  {
    id: 'cand-011',
    name: 'Amanda Foster',
    email: 'a.foster@email.com',
    score: 89,
    grade: 'A-',
    recommendation: 'Strongly Recommend',
    status: 'in_progress',
    jobId: 'job-002',
    jobTitle: 'Product Manager',
    evaluatedAt: '2024-01-05T11:30:00Z',
    skills: generateSkills(),
    experience: 7,
    education: 'MBA, Northwestern Kellogg',
    summary: 'Experienced product manager with excellent track record in B2B SaaS. Strong in roadmap planning and cross-functional leadership.',
    strengths: ['Product roadmap expertise', 'Cross-functional leadership', 'B2B experience'],
    improvements: ['Could improve technical collaboration'],
  },
  {
    id: 'cand-012',
    name: 'Christopher Martinez',
    email: 'c.martinez@email.com',
    score: 94,
    grade: 'A',
    recommendation: 'Strongly Recommend',
    status: 'completed',
    jobId: 'job-004',
    jobTitle: 'Data Analyst',
    evaluatedAt: '2024-01-04T16:00:00Z',
    skills: generateSkills(),
    experience: 6,
    education: 'Ph.D. Data Science, Georgia Tech',
    summary: 'Highly analytical data scientist with expertise in machine learning and statistical modeling. Published researcher with industry experience.',
    strengths: ['ML expertise', 'Statistical rigor', 'Research publications', 'Business acumen'],
    improvements: ['Could improve presentation skills for non-technical audiences'],
  },
  {
    id: 'cand-013',
    name: 'Rachel Green',
    email: 'rachel.g@email.com',
    score: 79,
    grade: 'B+',
    recommendation: 'Recommend',
    status: 'in_progress',
    jobId: 'job-003',
    jobTitle: 'UX Designer',
    evaluatedAt: '2024-01-03T13:45:00Z',
    skills: generateSkills(),
    experience: 5,
    education: 'M.Des. Interaction Design, RCA London',
    summary: 'Experienced UX designer with international background. Strong in accessibility and inclusive design practices.',
    strengths: ['Accessibility expertise', 'International experience', 'Inclusive design'],
    improvements: ['Could develop more technical skills'],
  },
  {
    id: 'cand-014',
    name: 'Daniel Wilson',
    email: 'd.wilson@email.com',
    score: 83,
    grade: 'B+',
    recommendation: 'Recommend',
    status: 'completed',
    jobId: 'job-001',
    jobTitle: 'Senior Software Engineer',
    evaluatedAt: '2024-01-02T10:15:00Z',
    skills: generateSkills(),
    experience: 6,
    education: 'B.S. Computer Science, University of Washington',
    summary: 'Full-stack developer with strong frontend expertise. Experienced in building responsive web applications and design systems.',
    strengths: ['Frontend excellence', 'Design systems', 'Performance optimization'],
    improvements: ['Backend skills could be stronger', 'DevOps experience limited'],
  },
  {
    id: 'cand-015',
    name: 'Nicole Taylor',
    email: 'n.taylor@email.com',
    score: 91,
    grade: 'A',
    recommendation: 'Strongly Recommend',
    status: 'completed',
    jobId: 'job-005',
    jobTitle: 'Engineering Manager',
    evaluatedAt: '2024-01-01T09:00:00Z',
    skills: generateSkills(),
    experience: 10,
    education: 'M.S. Computer Science, Columbia University',
    summary: 'Seasoned engineering manager with proven track record of building high-performing teams. Expert in agile methodologies and technical strategy.',
    strengths: ['Team building', 'Technical strategy', 'Mentorship', 'Agile expertise'],
    improvements: ['Could expand cloud architecture knowledge'],
  },
];

// Generate mock jobs
export const mockJobs: Job[] = [
  {
    id: 'job-001',
    title: 'Senior Software Engineer',
    department: 'Engineering',
    location: 'San Francisco, CA',
    type: 'Full-time',
    status: 'open',
    candidatesCount: 8,
    createdAt: '2024-01-01T00:00:00Z',
    requirements: [
      '5+ years of software development experience',
      'Proficiency in JavaScript/TypeScript',
      'Experience with React and Node.js',
      'Strong problem-solving skills',
      'Excellent communication abilities',
    ],
  },
  {
    id: 'job-002',
    title: 'Product Manager',
    department: 'Product',
    location: 'New York, NY',
    type: 'Full-time',
    status: 'open',
    candidatesCount: 4,
    createdAt: '2024-01-05T00:00:00Z',
    requirements: [
      '3+ years of product management experience',
      'Experience with agile methodologies',
      'Strong analytical skills',
      'Excellent stakeholder management',
      'Technical background preferred',
    ],
  },
  {
    id: 'job-003',
    title: 'UX Designer',
    department: 'Design',
    location: 'Remote',
    type: 'Remote',
    status: 'open',
    candidatesCount: 3,
    createdAt: '2024-01-10T00:00:00Z',
    requirements: [
      '3+ years of UX design experience',
      'Proficiency in Figma and design tools',
      'Experience with user research',
      'Strong portfolio',
      'Excellent visual design skills',
    ],
  },
  {
    id: 'job-004',
    title: 'Data Analyst',
    department: 'Analytics',
    location: 'Austin, TX',
    type: 'Full-time',
    status: 'open',
    candidatesCount: 2,
    createdAt: '2024-01-12T00:00:00Z',
    requirements: [
      '2+ years of data analysis experience',
      'Proficiency in SQL and Python',
      'Experience with data visualization tools',
      'Strong analytical mindset',
      'Excellent attention to detail',
    ],
  },
  {
    id: 'job-005',
    title: 'Engineering Manager',
    department: 'Engineering',
    location: 'San Francisco, CA',
    type: 'Full-time',
    status: 'open',
    candidatesCount: 1,
    createdAt: '2024-01-08T00:00:00Z',
    requirements: [
      '7+ years of software development experience',
      '3+ years of management experience',
      'Strong technical background',
      'Excellent leadership skills',
      'Experience building and scaling teams',
    ],
  },
];

// Calculate dashboard stats from candidates
export function getDashboardStats(): DashboardStats {
  const completedCandidates = mockCandidates.filter(c => c.status === 'completed');
  
  const scoreDistribution = {
    excellent: completedCandidates.filter(c => c.score >= 90).length,
    good: completedCandidates.filter(c => c.score >= 80 && c.score < 90).length,
    average: completedCandidates.filter(c => c.score >= 70 && c.score < 80).length,
    belowAverage: completedCandidates.filter(c => c.score >= 60 && c.score < 70).length,
    poor: completedCandidates.filter(c => c.score < 60).length,
  };

  const recentEvaluations = mockCandidates
    .filter(c => c.status === 'completed')
    .sort((a, b) => new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime())
    .slice(0, 5)
    .map(c => ({
      id: c.id,
      candidateName: c.name,
      score: c.score,
      grade: c.grade,
      jobTitle: c.jobTitle,
      evaluatedAt: c.evaluatedAt,
    }));

  // Generate trend data for the last 7 days
  const trendData = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    trendData.push({
      date: date.toISOString().split('T')[0],
      evaluations: Math.floor(Math.random() * 5) + 1,
      avgScore: Math.floor(Math.random() * 20) + 75,
    });
  }

  return {
    totalCandidates: mockCandidates.length,
    averageScore: Math.round(
      completedCandidates.reduce((sum, c) => sum + c.score, 0) / completedCandidates.length
    ),
    topTierCandidates: completedCandidates.filter(c => c.score >= 85).length,
    pendingReviews: mockCandidates.filter(c => c.status === 'pending' || c.status === 'in_progress').length,
    scoreDistribution,
    recentEvaluations,
    trendData,
  };
}

// Get candidate by ID
export function getCandidateById(id: string): Candidate | undefined {
  return mockCandidates.find(c => c.id === id);
}

// Get job by ID
export function getJobById(id: string): Job | undefined {
  return mockJobs.find(j => j.id === id);
}

// Get candidates by job ID
export function getCandidatesByJobId(jobId: string): Candidate[] {
  return mockCandidates.filter(c => c.jobId === jobId);
}

// Get all candidates sorted by score
export function getCandidatesLeaderboard(): Candidate[] {
  return [...mockCandidates]
    .filter(c => c.status === 'completed')
    .sort((a, b) => b.score - a.score);
}
