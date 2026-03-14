import { ParsedResume, RequirementData } from '@/lib/scoring/engine'

// Sample job requirements
export const mockRequirements: Array<{
  id: string
  emailSubject: string
  emailFrom: string
  emailDate: Date
  role: string
  requiredSkills: string[]
  optionalSkills: string[]
  experienceRequired: number
  status: 'ACTIVE' | 'CLOSED' | 'ARCHIVED'
}> = [
  {
    id: 'req-1',
    emailSubject: 'Job Opening: Senior Full Stack Engineer',
    emailFrom: 'hr@techcorp.com',
    emailDate: new Date('2024-01-15'),
    role: 'Senior Full Stack Engineer',
    requiredSkills: ['react', 'typescript', 'node.js', 'postgresql', 'aws'],
    optionalSkills: ['kubernetes', 'graphql', 'redis'],
    experienceRequired: 5,
    status: 'ACTIVE'
  },
  {
    id: 'req-2',
    emailSubject: 'Hiring: Frontend Developer - React/Vue',
    emailFrom: 'careers@startup.io',
    emailDate: new Date('2024-01-20'),
    role: 'Frontend Developer',
    requiredSkills: ['react', 'typescript', 'css', 'html'],
    optionalSkills: ['vue', 'next.js', 'tailwind'],
    experienceRequired: 3,
    status: 'ACTIVE'
  },
  {
    id: 'req-3',
    emailSubject: 'Backend Engineer - Python/Django',
    emailFrom: 'jobs@enterprise.com',
    emailDate: new Date('2024-01-25'),
    role: 'Backend Engineer',
    requiredSkills: ['python', 'django', 'postgresql', 'redis'],
    optionalSkills: ['docker', 'kubernetes', 'celery'],
    experienceRequired: 4,
    status: 'ACTIVE'
  }
]

// Sample candidate profiles with varied backgrounds
export const mockCandidates: Array<{
  id: string
  name: string
  email: string
  requirementId: string
  resume: ParsedResume
  status: 'NEW' | 'UNDER_REVIEW' | 'INTERVIEWED' | 'HIRED' | 'REJECTED' | 'WITHDRAWN'
}> = [
  {
    id: 'cand-1',
    name: 'Alex Johnson',
    email: 'alex.johnson@email.com',
    requirementId: 'req-1',
    status: 'NEW',
    resume: {
      skills: ['react', 'typescript', 'node.js', 'postgresql', 'aws', 'python', 'docker', 'kubernetes', 'graphql', 'redis'],
      technologies: ['react', 'typescript', 'node.js', 'postgresql', 'aws', 'docker', 'kubernetes', 'graphql', 'redis', 'prisma', 'next.js'],
      experience: 7,
      companies: ['Google', 'Meta', 'StartupX'],
      projects: ['E-commerce Platform', 'Real-time Analytics Dashboard', 'Microservices Architecture Redesign'],
      education: [
        { institution: 'MIT', degree: 'B.S.', field: 'Computer Science', year: 2015 }
      ],
      summary: 'Senior Full Stack Engineer with 7+ years of experience building scalable web applications. Led teams of 5-10 engineers and delivered products serving millions of users.',
      rawText: `
        Alex Johnson
        Senior Full Stack Engineer
        Email: alex.johnson@email.com
        Phone: +1-555-123-4567
        
        SUMMARY
        Senior Full Stack Engineer with 7+ years of experience building scalable web applications. 
        Led teams of 5-10 engineers and delivered products serving millions of users.
        
        EXPERIENCE
        
        Senior Software Engineer | Google | 2021 - Present
        - Led the redesign of the core payment processing system, improving throughput by 40%
        - Architected microservices infrastructure handling 1M+ requests per second
        - Managed a team of 8 engineers across 3 time zones
        - Technologies: React, TypeScript, Node.js, PostgreSQL, AWS, Kubernetes, GraphQL
        
        Software Engineer | Meta | 2018 - 2021
        - Built real-time analytics dashboard processing 10M+ daily events
        - Implemented caching layer reducing API response times by 60%
        - Promoted to Senior Software Engineer in 2020
        
        Full Stack Developer | StartupX | 2016 - 2018
        - Developed e-commerce platform from scratch, scaling to 500K users
        - Implemented CI/CD pipeline reducing deployment time by 80%
        
        SKILLS
        Programming: JavaScript, TypeScript, Python, Go
        Frontend: React, Next.js, Vue, Tailwind
        Backend: Node.js, Express, GraphQL, REST APIs
        Databases: PostgreSQL, MongoDB, Redis
        Cloud: AWS (Lambda, EC2, S3, RDS), Docker, Kubernetes
        Tools: Git, CI/CD, Terraform
        
        EDUCATION
        MIT - B.S. Computer Science (2015)
        
        CERTIFICATIONS
        AWS Solutions Architect Professional
        Kubernetes Administrator (CKA)
      `
    }
  },
  {
    id: 'cand-2',
    name: 'Sarah Chen',
    email: 'sarah.chen@email.com',
    requirementId: 'req-1',
    status: 'NEW',
    resume: {
      skills: ['react', 'typescript', 'node.js', 'mongodb', 'aws', 'docker'],
      technologies: ['react', 'typescript', 'node.js', 'mongodb', 'aws', 'docker', 'express', 'redux'],
      experience: 4,
      companies: ['Amazon', 'Tech Startup'],
      projects: ['Inventory Management System', 'Customer Portal'],
      education: [
        { institution: 'UC Berkeley', degree: 'B.S.', field: 'Computer Science', year: 2018 }
      ],
      summary: 'Full Stack Developer with 4 years of experience in building web applications. Strong focus on React and Node.js development.',
      rawText: `
        Sarah Chen
        Full Stack Developer
        Email: sarah.chen@email.com
        
        SUMMARY
        Full Stack Developer with 4 years of experience in building web applications.
        Strong focus on React and Node.js development with cloud deployment experience.
        
        EXPERIENCE
        
        Software Developer | Amazon | 2021 - Present
        - Developed customer-facing features for the retail platform
        - Built REST APIs handling 100K+ daily requests
        - Implemented automated testing reducing bug reports by 30%
        
        Junior Developer | Tech Startup | 2019 - 2021
        - Created inventory management system for small businesses
        - Learned React and Node.js on the job
        
        SKILLS
        React, TypeScript, Node.js, MongoDB, AWS, Docker, Express, Redux
        
        EDUCATION
        UC Berkeley - B.S. Computer Science (2018)
      `
    }
  },
  {
    id: 'cand-3',
    name: 'Michael Park',
    email: 'michael.park@email.com',
    requirementId: 'req-2',
    status: 'UNDER_REVIEW',
    resume: {
      skills: ['react', 'vue', 'typescript', 'css', 'html', 'next.js', 'tailwind'],
      technologies: ['react', 'vue', 'typescript', 'css', 'html', 'next.js', 'tailwind', 'sass', 'webpack', 'jest'],
      experience: 5,
      companies: ['Netflix', 'Airbnb'],
      projects: ['Design System', 'Streaming Platform UI', 'Booking Interface'],
      education: [
        { institution: 'Stanford University', degree: 'B.S.', field: 'Human-Computer Interaction', year: 2017 }
      ],
      summary: 'Frontend Specialist with expertise in React and Vue. Led the development of design systems used across multiple products.',
      rawText: `
        Michael Park
        Frontend Engineer
        Email: michael.park@email.com
        
        SUMMARY
        Frontend Specialist with 5 years of expertise in React and Vue.
        Led the development of design systems used across multiple products.
        Passionate about user experience and accessibility.
        
        EXPERIENCE
        
        Senior Frontend Engineer | Netflix | 2021 - Present
        - Led development of the unified design system used by 50+ teams
        - Improved Core Web Vitals scores by 35% across the platform
        - Mentored 5 junior developers
        - Technologies: React, TypeScript, Next.js, Tailwind, Jest
        
        Frontend Developer | Airbnb | 2018 - 2021
        - Built booking interface used by 10M+ monthly visitors
        - Implemented A/B testing framework for UI experiments
        - Contributed to open-source design system
        
        SKILLS
        Frontend: React, Vue, Next.js, TypeScript, Tailwind, CSS, Sass
        Testing: Jest, React Testing Library, Cypress
        Tools: Webpack, Vite, Git, Figma
        
        EDUCATION
        Stanford University - B.S. Human-Computer Interaction (2017)
      `
    }
  },
  {
    id: 'cand-4',
    name: 'Emily Rodriguez',
    email: 'emily.rodriguez@email.com',
    requirementId: 'req-3',
    status: 'NEW',
    resume: {
      skills: ['python', 'django', 'postgresql', 'redis', 'docker', 'kubernetes'],
      technologies: ['python', 'django', 'postgresql', 'redis', 'docker', 'kubernetes', 'celery', 'flask', 'fastapi'],
      experience: 6,
      companies: ['Spotify', 'Uber'],
      projects: ['Music Recommendation Engine', 'Real-time Pricing System', 'Data Pipeline'],
      education: [
        { institution: 'Carnegie Mellon', degree: 'M.S.', field: 'Computer Science', year: 2016 }
      ],
      summary: 'Backend Engineer specializing in Python and distributed systems. Built high-throughput services handling millions of requests.',
      rawText: `
        Emily Rodriguez
        Backend Engineer
        Email: emily.rodriguez@email.com
        
        SUMMARY
        Backend Engineer specializing in Python and distributed systems.
        Built high-throughput services handling millions of requests.
        Expert in Django, PostgreSQL, and cloud infrastructure.
        
        EXPERIENCE
        
        Senior Backend Engineer | Spotify | 2020 - Present
        - Led development of music recommendation engine serving 400M+ users
        - Built real-time data pipeline processing 1B+ events daily
        - Reduced infrastructure costs by 25% through optimization
        - Technologies: Python, Django, PostgreSQL, Redis, Kubernetes, Docker
        
        Backend Developer | Uber | 2017 - 2020
        - Developed real-time pricing system for dynamic pricing
        - Implemented caching layer handling 500K requests/second
        - Built microservices for driver-passenger matching
        
        SKILLS
        Languages: Python, Go, SQL
        Frameworks: Django, Flask, FastAPI
        Databases: PostgreSQL, Redis, MongoDB, Elasticsearch
        Infrastructure: Docker, Kubernetes, AWS, Terraform
        Tools: Celery, Kafka, Git, CI/CD
        
        EDUCATION
        Carnegie Mellon - M.S. Computer Science (2016)
        UC San Diego - B.S. Computer Science (2014)
      `
    }
  },
  {
    id: 'cand-5',
    name: 'James Wilson',
    email: 'james.wilson@email.com',
    requirementId: 'req-1',
    status: 'REJECTED',
    resume: {
      skills: ['html', 'css', 'javascript'],
      technologies: ['html', 'css', 'javascript', 'jquery'],
      experience: 2,
      companies: ['Local Agency'],
      projects: ['Company Website', 'Portfolio Site'],
      education: [
        { institution: 'Community College', degree: 'A.A.', field: 'Web Development', year: 2020 }
      ],
      summary: 'Junior web developer with experience in building static websites. Looking to grow into a full stack role.',
      rawText: `
        James Wilson
        Web Developer
        Email: james.wilson@email.com
        
        SUMMARY
        Junior web developer with experience in building static websites.
        Looking to grow into a full stack role.
        
        EXPERIENCE
        
        Web Developer | Local Agency | 2022 - Present
        - Built websites for small business clients
        - Maintained existing WordPress sites
        - Created responsive email templates
        
        SKILLS
        HTML, CSS, JavaScript, jQuery, WordPress, Bootstrap
        
        EDUCATION
        Community College - A.A. Web Development (2020)
      `
    }
  }
]

// Get requirement data for scoring
export function getRequirementData(requirementId: string): RequirementData | null {
  const req = mockRequirements.find(r => r.id === requirementId)
  if (!req) return null
  
  return {
    requiredSkills: req.requiredSkills,
    optionalSkills: req.optionalSkills,
    experienceRequired: req.experienceRequired,
    role: req.role
  }
}

// Get all requirements
export function getAllRequirements() {
  return mockRequirements
}

// Get candidates for a requirement
export function getCandidatesForRequirement(requirementId: string) {
  return mockCandidates.filter(c => c.requirementId === requirementId)
}

// Get all candidates
export function getAllCandidates() {
  return mockCandidates
}

// Get candidate by ID
export function getCandidateById(id: string) {
  return mockCandidates.find(c => c.id === id)
}
