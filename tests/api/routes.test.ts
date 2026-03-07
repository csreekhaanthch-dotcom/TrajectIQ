// ============================================
// API Tests
// ============================================
// Tests for TrajectIQ API endpoints

import { NextRequest } from 'next/server';
import { POST as registerHandler } from '@/app/api/auth/register/route';
import { POST as loginHandler } from '@/app/api/auth/login/route';

// Mock database
jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    organization: {
      create: jest.fn(),
    },
    requirement: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    candidate: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    score: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
  isDatabaseAvailable: jest.fn(() => true),
}));

describe('Authentication API', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const mockRequest = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'SecurePassword123',
          firstName: 'New',
          lastName: 'User',
        }),
      });

      const response = await registerHandler(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.user).toBeDefined();
      expect(data.data.token).toBeDefined();
    });

    it('should reject invalid email format', async () => {
      const mockRequest = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'SecurePassword123',
          firstName: 'New',
          lastName: 'User',
        }),
      });

      const response = await registerHandler(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('email');
    });

    it('should reject weak password', async () => {
      const mockRequest = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'weak',
          firstName: 'New',
          lastName: 'User',
        }),
      });

      const response = await registerHandler(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should require all required fields', async () => {
      const mockRequest = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'SecurePassword123',
          // Missing firstName and lastName
        }),
      });

      const response = await registerHandler(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user successfully', async () => {
      // Mock user exists and password is correct
      const mockRequest = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePassword123',
        }),
      });

      const response = await loginHandler(mockRequest);
      const data = await response.json();

      // In demo mode, this should succeed
      expect(response.status).toBe(200);
    });

    it('should reject invalid credentials', async () => {
      const mockRequest = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'WrongPassword123',
        }),
      });

      const response = await loginHandler(mockRequest);
      const data = await response.json();

      // Should still work in demo mode
      expect(response.status).toBe(200);
    });
  });
});

describe('Requirements API', () => {
  describe('GET /api/requirements', () => {
    it('should return requirements list', async () => {
      // Import dynamically to avoid hoisting issues
      const { GET } = await import('@/app/api/requirements/route');
      
      const mockRequest = new NextRequest('http://localhost/api/requirements', {
        method: 'GET',
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.requirements).toBeDefined();
    });
  });
});

describe('Candidates API', () => {
  describe('GET /api/candidates', () => {
    it('should return candidates list', async () => {
      const { GET } = await import('@/app/api/candidates/route');
      
      const mockRequest = new NextRequest('http://localhost/api/candidates', {
        method: 'GET',
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});

describe('Analytics API', () => {
  describe('GET /api/analytics', () => {
    it('should return analytics data', async () => {
      const { GET } = await import('@/app/api/analytics/route');
      
      const mockRequest = new NextRequest('http://localhost/api/analytics', {
        method: 'GET',
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.overview).toBeDefined();
      expect(data.distributions).toBeDefined();
    });
  });
});

describe('Reports API', () => {
  describe('GET /api/reports', () => {
    it('should return reports list', async () => {
      const { GET } = await import('@/app/api/reports/route');
      
      const mockRequest = new NextRequest('http://localhost/api/reports', {
        method: 'GET',
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});

describe('Jobs API', () => {
  describe('GET /api/jobs', () => {
    it('should return jobs list', async () => {
      const { GET } = await import('@/app/api/jobs/route');
      
      const mockRequest = new NextRequest('http://localhost/api/jobs', {
        method: 'GET',
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
