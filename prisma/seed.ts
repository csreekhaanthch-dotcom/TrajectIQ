// TrajectIQ Database Seed
// Run with: bun run prisma/seed.ts

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create organization
  const organization = await prisma.organization.create({
    data: {
      name: 'Demo Company',
      slug: 'demo-company',
      plan: 'PROFESSIONAL',
      maxUsers: 10,
      maxCandidates: 5000,
    },
  });
  console.log('Created organization:', organization.name);

  // Create admin user
  const passwordHash = await bcrypt.hash('Demo123!', 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@trajectiq.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      organizationId: organization.id,
    },
  });
  console.log('Created admin user:', admin.email);

  // Create sample requirement
  const requirement = await prisma.requirement.create({
    data: {
      organizationId: organization.id,
      createdById: admin.id,
      title: 'Senior Software Engineer',
      department: 'Engineering',
      location: 'Remote',
      employmentType: 'FULL_TIME',
      salaryRange: '$120,000 - $180,000',
      requiredSkills: JSON.stringify([
        { name: 'Python', required: true, weight: 1.0, category: 'technical' },
        { name: 'JavaScript', required: true, weight: 1.0, category: 'technical' },
        { name: 'AWS', required: true, weight: 0.8, category: 'technical' },
        { name: 'PostgreSQL', required: true, weight: 0.8, category: 'technical' },
        { name: 'Docker', required: false, weight: 0.5, category: 'technical' },
      ]),
      preferredSkills: JSON.stringify([
        { name: 'Kubernetes', required: false, weight: 0.5, category: 'technical' },
        { name: 'React', required: false, weight: 0.5, category: 'technical' },
      ]),
      experienceRequired: 5,
      educationLevel: "Bachelor's degree in Computer Science or equivalent",
      status: 'ACTIVE',
    },
  });
  console.log('Created requirement:', requirement.title);

  // Create sample candidates
  const candidates = [
    {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@example.com',
      currentTitle: 'Senior Software Engineer',
      currentCompany: 'Tech Corp',
      yearsExperience: 7,
    },
    {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@example.com',
      currentTitle: 'Full Stack Developer',
      currentCompany: 'Startup Inc',
      yearsExperience: 5,
    },
    {
      firstName: 'Mike',
      lastName: 'Johnson',
      email: 'mike.j@example.com',
      currentTitle: 'Python Developer',
      currentCompany: 'Data Co',
      yearsExperience: 6,
    },
    {
      firstName: 'Sarah',
      lastName: 'Williams',
      email: 'sarah.w@example.com',
      currentTitle: 'Tech Lead',
      currentCompany: 'Enterprise Ltd',
      yearsExperience: 8,
    },
    {
      firstName: 'Alex',
      lastName: 'Brown',
      email: 'alex.b@example.com',
      currentTitle: 'Backend Developer',
      currentCompany: 'Cloud Systems',
      yearsExperience: 4,
    },
  ];

  for (const candidateData of candidates) {
    const candidate = await prisma.candidate.create({
      data: {
        organizationId: organization.id,
        requirementId: requirement.id,
        createdById: admin.id,
        ...candidateData,
        status: 'NEW',
        source: 'MANUAL_UPLOAD',
      },
    });

    // Create resume for each candidate
    await prisma.resume.create({
      data: {
        candidateId: candidate.id,
        skills: JSON.stringify([
          { name: 'Python', level: 'advanced', yearsOfExperience: 5, lastUsed: '2024-01-01' },
          { name: 'JavaScript', level: 'intermediate', yearsOfExperience: 3, lastUsed: '2024-01-01' },
          { name: 'AWS', level: 'advanced', yearsOfExperience: 4, lastUsed: '2024-01-01' },
          { name: 'PostgreSQL', level: 'intermediate', yearsOfExperience: 3, lastUsed: '2024-01-01' },
          { name: 'Docker', level: 'beginner', yearsOfExperience: 1, lastUsed: '2024-01-01' },
        ]),
        experience: JSON.stringify([
          {
            title: candidateData.currentTitle,
            company: candidateData.currentCompany,
            location: 'Remote',
            startDate: '2020-01',
            endDate: null,
            current: true,
            description: 'Building scalable web applications',
            achievements: ['Reduced latency by 40%', 'Led team of 5 engineers'],
            technologies: ['Python', 'AWS', 'PostgreSQL'],
          },
        ]),
        education: JSON.stringify([
          {
            degree: "Bachelor of Science",
            field: "Computer Science",
            institution: "University of Technology",
            location: "Boston, MA",
            startDate: "2012-09",
            endDate: "2016-05",
            gpa: "3.7",
            honors: [],
          },
        ]),
        projects: JSON.stringify([]),
        parsedAt: new Date(),
        parseVersion: '1.0',
      },
    });

    console.log('Created candidate:', candidate.firstName, candidate.lastName);
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
