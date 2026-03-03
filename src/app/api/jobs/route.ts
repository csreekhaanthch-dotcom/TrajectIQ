import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Build where clause
    const where: any = {};
    if (status) where.status = status.toUpperCase();

    // Fetch jobs with candidate counts
    const jobs = await db.job.findMany({
      where,
      include: {
        _count: {
          select: { candidates: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Transform data for frontend
    const transformedJobs = jobs.map(job => ({
      id: job.jobId,
      title: job.title,
      department: job.department || 'Engineering',
      location: job.location || 'Remote',
      type: 'Full-time' as const,
      status: job.status.toLowerCase(),
      candidatesCount: job._count.candidates,
      createdAt: job.createdAt.toISOString(),
      requirements: job.requirements ? JSON.parse(job.requirements) : []
    }));

    return NextResponse.json({
      success: true,
      data: transformedJobs
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    
    // Return mock data if database is not available
    return NextResponse.json({
      success: true,
      data: getMockJobs()
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, department, location, description, requirements } = body;

    // Generate unique job ID
    const jobId = `JOB-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const job = await db.job.create({
      data: {
        jobId,
        title,
        department,
        location,
        description,
        requirements: requirements ? JSON.stringify(requirements) : null,
        status: 'OPEN'
      }
    });

    return NextResponse.json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('Error creating job:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create job' },
      { status: 500 }
    );
  }
}

function getMockJobs() {
  return [
    {
      id: 'JOB-001',
      title: 'Senior Software Engineer',
      department: 'Engineering',
      location: 'San Francisco, CA',
      type: 'Full-time',
      status: 'open',
      candidatesCount: 12,
      createdAt: '2024-01-10T00:00:00.000Z',
      requirements: [
        { name: 'Python', classification: 'mission_critical', minimum_years: 5 },
        { name: 'System Design', classification: 'core', minimum_years: 3 },
        { name: 'AWS', classification: 'core', minimum_years: 3 },
        { name: 'Kubernetes', classification: 'supporting', minimum_years: 2 }
      ]
    },
    {
      id: 'JOB-002',
      title: 'Full Stack Developer',
      department: 'Engineering',
      location: 'Remote',
      type: 'Full-time',
      status: 'open',
      candidatesCount: 8,
      createdAt: '2024-01-12T00:00:00.000Z',
      requirements: [
        { name: 'JavaScript', classification: 'mission_critical', minimum_years: 4 },
        { name: 'React', classification: 'core', minimum_years: 3 },
        { name: 'Node.js', classification: 'core', minimum_years: 3 },
        { name: 'PostgreSQL', classification: 'supporting', minimum_years: 2 }
      ]
    },
    {
      id: 'JOB-003',
      title: 'DevOps Engineer',
      department: 'Infrastructure',
      location: 'New York, NY',
      type: 'Full-time',
      status: 'open',
      candidatesCount: 5,
      createdAt: '2024-01-14T00:00:00.000Z',
      requirements: [
        { name: 'Kubernetes', classification: 'mission_critical', minimum_years: 3 },
        { name: 'Terraform', classification: 'core', minimum_years: 2 },
        { name: 'AWS', classification: 'core', minimum_years: 4 },
        { name: 'CI/CD', classification: 'supporting', minimum_years: 3 }
      ]
    },
    {
      id: 'JOB-004',
      title: 'Backend Engineer',
      department: 'Engineering',
      location: 'Austin, TX',
      type: 'Full-time',
      status: 'open',
      candidatesCount: 6,
      createdAt: '2024-01-15T00:00:00.000Z',
      requirements: [
        { name: 'Go', classification: 'mission_critical', minimum_years: 3 },
        { name: 'PostgreSQL', classification: 'core', minimum_years: 3 },
        { name: 'gRPC', classification: 'core', minimum_years: 2 },
        { name: 'Docker', classification: 'supporting', minimum_years: 2 }
      ]
    },
    {
      id: 'JOB-005',
      title: 'ML Engineer',
      department: 'AI/ML',
      location: 'Remote',
      type: 'Full-time',
      status: 'open',
      candidatesCount: 4,
      createdAt: '2024-01-16T00:00:00.000Z',
      requirements: [
        { name: 'Python', classification: 'mission_critical', minimum_years: 4 },
        { name: 'TensorFlow', classification: 'core', minimum_years: 3 },
        { name: 'PyTorch', classification: 'core', minimum_years: 2 },
        { name: 'MLOps', classification: 'supporting', minimum_years: 2 }
      ]
    }
  ];
}
