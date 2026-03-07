// ============================================
// TrajectIQ Test Setup
// ============================================

// Mock environment variables for testing
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-bytes!';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
// Note: NODE_ENV is read-only and set by the build system

// Mock Next.js cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(() => ({ value: 'mock-token' })),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

// Global test utilities
export const testUtils = {
  mockUser: {
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'ADMIN',
    organizationId: 'test-org-id',
  },
  mockRequirement: {
    id: 'test-req-id',
    title: 'Senior Software Engineer',
    requiredSkills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
    preferredSkills: ['AWS', 'Docker', 'Kubernetes'],
    experienceRequired: 5,
  },
  mockResume: {
    skills: ['TypeScript', 'JavaScript', 'React', 'Node.js', 'PostgreSQL', 'AWS'],
    technologies: ['Next.js', 'Prisma', 'TailwindCSS', 'Jest', 'Docker'],
    experience: 7,
    companies: ['Tech Corp', 'Startup Inc', 'Big Company'],
    projects: ['E-commerce Platform', 'SaaS Dashboard', 'Mobile App'],
    education: [
      { institution: 'University of Technology', degree: 'B.S.', field: 'Computer Science', year: 2016 },
    ],
    summary: 'Senior Full Stack Developer with 7 years of experience',
    rawText: 'Senior Full Stack Developer with 7 years of experience building scalable web applications.',
  },
};

// Make testUtils available globally
(global as unknown as { testUtils: typeof testUtils }).testUtils = testUtils;

// Console suppression for cleaner test output
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning:') || args[0].includes('Error:'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
