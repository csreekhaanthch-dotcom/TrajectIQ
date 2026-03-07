// ============================================
// Scoring Engine Tests
// ============================================
// Tests for TrajectIQ deterministic hiring score calculation
// Formula: SDI×0.40 + CSIG×0.15 + IAE×0.20 + CTA×0.15 + ERR×0.10

import { calculateSDI } from '@/lib/scoring/sdi';
import { calculateCSIG } from '@/lib/scoring/csig';
import { calculateIAE } from '@/lib/scoring/iae';
import { calculateCTA } from '@/lib/scoring/cta';
import { calculateERR } from '@/lib/scoring/err';
import { calculateHiringScore, rankCandidates } from '@/lib/scoring/index';

// Test data
const mockSkills = [
  { name: 'TypeScript', level: 'expert' as const, yearsOfExperience: 5, lastUsed: '2024-01-01' },
  { name: 'React', level: 'expert' as const, yearsOfExperience: 6, lastUsed: '2024-01-01' },
  { name: 'Node.js', level: 'advanced' as const, yearsOfExperience: 5, lastUsed: '2024-01-01' },
  { name: 'PostgreSQL', level: 'advanced' as const, yearsOfExperience: 4, lastUsed: '2024-01-01' },
  { name: 'AWS', level: 'intermediate' as const, yearsOfExperience: 3, lastUsed: '2024-01-01' },
];

const mockRequiredSkills = [
  { name: 'TypeScript', required: true, weight: 10, category: 'technical' as const },
  { name: 'React', required: true, weight: 10, category: 'technical' as const },
  { name: 'Node.js', required: true, weight: 8, category: 'technical' as const },
  { name: 'PostgreSQL', required: true, weight: 7, category: 'technical' as const },
];

const mockExperience = [
  {
    title: 'Senior Software Engineer',
    company: 'Tech Corp',
    location: 'San Francisco, CA',
    startDate: '2020-01',
    endDate: null,
    current: true,
    description: 'Led development of microservices architecture serving 10M+ users',
    achievements: ['Increased system performance by 40%', 'Led team of 5 engineers'],
    technologies: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'AWS'],
  },
  {
    title: 'Software Engineer',
    company: 'Startup Inc',
    location: 'New York, NY',
    startDate: '2017-06',
    endDate: '2019-12',
    current: false,
    description: 'Built full-stack web applications',
    achievements: ['Launched 3 major products', 'Reduced bug rate by 50%'],
    technologies: ['JavaScript', 'React', 'Express', 'MongoDB'],
  },
];

const mockEducation = [
  {
    degree: 'B.S.',
    field: 'Computer Science',
    institution: 'University of Technology',
    location: 'Boston, MA',
    startDate: '2013-09',
    endDate: '2017-05',
    gpa: '3.8',
    honors: ['Magna Cum Laude', 'Deans List'],
  },
];

const mockProjects = [
  {
    name: 'E-commerce Platform',
    description: 'Full-stack e-commerce solution with payment processing',
    role: 'Lead Developer',
    technologies: ['Next.js', 'Stripe', 'PostgreSQL'],
    url: 'https://github.com/example/ecommerce',
    startDate: '2021-03',
    endDate: '2021-12',
  },
];

const mockScoringInput = {
  candidateId: 'test-candidate-1',
  requirementId: 'test-requirement-1',
  skills: mockSkills,
  experience: mockExperience,
  education: mockEducation,
  projects: mockProjects,
  summary: 'Senior Full Stack Developer with 7 years of experience',
  requiredSkills: mockRequiredSkills,
  preferredSkills: [{ name: 'Docker', required: false, weight: 5, category: 'tool' as const }],
  experienceRequired: 5,
  experiencePreferred: 7,
};

describe('Scoring Engine', () => {
  describe('SDI (Skill Depth Index)', () => {
    it('should calculate SDI score correctly', () => {
      const result = calculateSDI(
        mockSkills,
        mockRequiredSkills,
        mockExperience,
        mockProjects
      );

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.strengths).toBeDefined();
      expect(result.breakdown.weaknesses).toBeDefined();
    });

    it('should reward diverse skill sets', () => {
      const diverseSkills = [
        ...mockSkills,
        { name: 'Python', level: 'intermediate' as const, yearsOfExperience: 2, lastUsed: '2024-01-01' },
        { name: 'Go', level: 'beginner' as const, yearsOfExperience: 1, lastUsed: '2024-01-01' },
      ];

      const diverseResult = calculateSDI(diverseSkills, mockRequiredSkills, mockExperience, mockProjects);
      const baseResult = calculateSDI(mockSkills, mockRequiredSkills, mockExperience, mockProjects);

      expect(diverseResult.score).toBeGreaterThan(baseResult.score);
    });

    it('should penalize skill gaps', () => {
      const minimalSkills = [
        { name: 'JavaScript', level: 'beginner' as const, yearsOfExperience: 1, lastUsed: '2024-01-01' },
      ];

      const result = calculateSDI(minimalSkills, mockRequiredSkills, mockExperience, []);

      expect(result.score).toBeLessThan(50);
      expect(result.breakdown.weaknesses.length).toBeGreaterThan(0);
    });
  });

  describe('CSIG (Critical Skill Integrity Gate)', () => {
    it('should calculate CSIG score correctly', () => {
      const result = calculateCSIG(mockSkills, mockRequiredSkills);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.breakdown).toBeDefined();
    });

    it('should return 100 when all required skills match', () => {
      const perfectSkills = mockRequiredSkills.map(s => ({
        name: s.name,
        level: 'expert' as const,
        yearsOfExperience: 5,
        lastUsed: '2024-01-01',
      }));

      const result = calculateCSIG(perfectSkills, mockRequiredSkills);

      expect(result.score).toBe(100);
    });

    it('should return lower score for missing critical skills', () => {
      const incompleteSkills = [
        { name: 'TypeScript', level: 'expert' as const, yearsOfExperience: 5, lastUsed: '2024-01-01' },
      ];

      const result = calculateCSIG(incompleteSkills, mockRequiredSkills);

      expect(result.score).toBeLessThan(50);
    });

    it('should identify skill gaps correctly', () => {
      const partialSkills = [
        { name: 'TypeScript', level: 'expert' as const, yearsOfExperience: 5, lastUsed: '2024-01-01' },
        { name: 'React', level: 'expert' as const, yearsOfExperience: 5, lastUsed: '2024-01-01' },
      ];

      const result = calculateCSIG(partialSkills, mockRequiredSkills);

      expect(result.breakdown.weaknesses).toContainEqual(
        expect.stringContaining('Node.js')
      );
    });
  });

  describe('IAE (Impact Authenticity Engine)', () => {
    it('should calculate IAE score correctly', () => {
      const result = calculateIAE(mockExperience, mockProjects, mockScoringInput.summary);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.breakdown).toBeDefined();
    });

    it('should reward quantified achievements', () => {
      const highImpactExperience = [
        {
          ...mockExperience[0],
          achievements: [
            'Increased revenue by 150%',
            'Reduced costs by $2M annually',
            'Led team of 20 engineers',
            'System serves 100M daily requests',
          ],
        },
      ];

      const result = calculateIAE(highImpactExperience, mockProjects, mockScoringInput.summary);

      expect(result.score).toBeGreaterThan(70);
    });

    it('should detect leadership signals', () => {
      const leadershipExperience = [
        {
          ...mockExperience[0],
          title: 'Engineering Manager',
          achievements: ['Promoted from Senior Engineer to Manager', 'Led cross-functional team of 12'],
        },
      ];

      const result = calculateIAE(leadershipExperience, mockProjects, mockScoringInput.summary);

      expect(result.breakdown.strengths).toContainEqual(
        expect.stringContaining('leadership')
      );
    });
  });

  describe('CTA (Career Trajectory Analyzer)', () => {
    it('should calculate CTA score correctly', () => {
      const result = calculateCTA(mockExperience, mockEducation);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.breakdown).toBeDefined();
    });

    it('should reward career progression', () => {
      const progressiveExperience = [
        {
          title: 'Junior Developer',
          company: 'Company A',
          startDate: '2015-01',
          endDate: '2017-01',
          achievements: [],
          current: false,
        },
        {
          title: 'Senior Developer',
          company: 'Company A',
          startDate: '2017-01',
          endDate: '2020-01',
          achievements: ['Promoted'],
          current: false,
        },
        {
          title: 'Engineering Manager',
          company: 'Company B',
          startDate: '2020-01',
          endDate: null,
          achievements: [],
          current: true,
        },
      ];

      const result = calculateCTA(progressiveExperience, mockEducation);

      expect(result.breakdown.strengths).toContainEqual(
        expect.stringContaining('progression')
      );
    });

    it('should detect job hopping negatively', () => {
      const hoppingExperience = Array(8).fill(null).map((_, i) => ({
        title: 'Software Engineer',
        company: `Company ${i}`,
        startDate: `2017-0${i + 1}`,
        endDate: i < 7 ? `2017-0${i + 2}` : null,
        achievements: [],
        current: i === 7,
      }));

      const result = calculateCTA(hoppingExperience, mockEducation);

      expect(result.breakdown.weaknesses.length).toBeGreaterThan(0);
    });
  });

  describe('ERR (Experience Relevance Ratio)', () => {
    it('should calculate ERR score correctly', () => {
      const result = calculateERR(mockExperience, mockProjects, mockRequiredSkills);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.breakdown).toBeDefined();
    });

    it('should return high score for relevant experience', () => {
      const result = calculateERR(mockExperience, mockProjects, mockRequiredSkills);

      // Experience includes TypeScript, React, Node.js, PostgreSQL
      expect(result.score).toBeGreaterThan(0.7);
    });

    it('should return low score for irrelevant experience', () => {
      const irrelevantExperience = [
        {
          title: 'Marketing Specialist',
          company: 'Ad Agency',
          startDate: '2015-01',
          endDate: null,
          achievements: [],
          current: true,
        },
      ];

      const result = calculateERR(irrelevantExperience, [], mockRequiredSkills);

      expect(result.score).toBeLessThan(0.5);
    });
  });

  describe('Full Hiring Score Calculation', () => {
    it('should calculate complete hiring score', async () => {
      const result = await calculateHiringScore(mockScoringInput);

      expect(result.finalScore).toBeGreaterThanOrEqual(0);
      expect(result.finalScore).toBeLessThanOrEqual(100);
      expect(result.grade).toBeDefined();
      expect(result.tier).toBeGreaterThanOrEqual(1);
      expect(result.tier).toBeLessThanOrEqual(5);
      expect(result.recommendation).toBeDefined();
      
      // Verify all components are calculated
      expect(result.sdi.score).toBeDefined();
      expect(result.csig.score).toBeDefined();
      expect(result.iae.score).toBeDefined();
      expect(result.cta.score).toBeDefined();
      expect(result.err.score).toBeDefined();
    });

    it('should assign correct grades based on score', async () => {
      // Test with perfect candidate
      const perfectInput = {
        ...mockScoringInput,
        skills: mockRequiredSkills.map(s => ({
          name: s.name,
          level: 'expert' as const,
          yearsOfExperience: 10,
          lastUsed: '2024-01-01',
        })),
      };

      const result = await calculateHiringScore(perfectInput);

      expect(['A+', 'A', 'B+']).toContain(result.grade);
    });

    it('should calculate weighted score correctly', async () => {
      const result = await calculateHiringScore(mockScoringInput);

      // Verify formula: SDI×0.40 + CSIG×0.15 + IAE×0.20 + CTA×0.15 + ERR×0.10
      const expectedScore = Math.round(
        result.sdi.score * 0.40 +
        result.csig.score * 0.15 +
        result.iae.score * 0.20 +
        result.cta.score * 0.15 +
        result.err.score * 0.10
      );

      expect(result.finalScore).toBe(expectedScore);
    });

    it('should handle candidates with minimal data', async () => {
      const minimalInput = {
        candidateId: 'test-candidate-2',
        requirementId: 'test-requirement-1',
        skills: [],
        experience: [],
        education: [],
        projects: [],
        summary: '',
        rawText: '',
        requiredSkills: mockRequiredSkills,
      };

      const result = await calculateHiringScore(minimalInput);

      expect(result.finalScore).toBeGreaterThanOrEqual(0);
      expect(result.grade).toBe('F');
      expect(result.tier).toBe(5);
    });
  });

  describe('Candidate Ranking', () => {
    it('should rank candidates correctly', async () => {
      const candidates = [
        { ...mockScoringInput, candidateId: 'candidate-1' },
        { ...mockScoringInput, candidateId: 'candidate-2' },
        { ...mockScoringInput, candidateId: 'candidate-3' },
      ];

      // Modify skills to create different scores
      candidates[0].skills = [
        ...mockSkills,
        { name: 'Kubernetes', level: 'expert' as const, yearsOfExperience: 3, lastUsed: '2024-01-01' },
      ];
      candidates[1].skills = mockSkills.slice(0, 2); // Less skills
      candidates[2].skills = mockSkills;

      const scores = await Promise.all(
        candidates.map(c => calculateHiringScore(c))
      );

      const ranked = rankCandidates(scores);

      expect(ranked).toHaveLength(3);
      expect(ranked[0].rank).toBe(1);
      expect(ranked[0].score.finalScore).toBeGreaterThanOrEqual(
        ranked[ranked.length - 1].score.finalScore
      );
    });
  });

  describe('Score Explainability', () => {
    it('should provide detailed breakdown', async () => {
      const result = await calculateHiringScore(mockScoringInput);

      // Check that each component has breakdown data
      expect(result.sdi.breakdown.strengths).toBeDefined();
      expect(result.sdi.breakdown.weaknesses).toBeDefined();
      expect(result.csig.breakdown.strengths).toBeDefined();
      expect(result.csig.breakdown.weaknesses).toBeDefined();
      expect(result.iae.breakdown.strengths).toBeDefined();
      expect(result.iae.breakdown.weaknesses).toBeDefined();
      expect(result.cta.breakdown.strengths).toBeDefined();
      expect(result.cta.breakdown.weaknesses).toBeDefined();
      expect(result.err.breakdown.strengths).toBeDefined();
      expect(result.err.breakdown.weaknesses).toBeDefined();
    });

    it('should include matched and missing skills', async () => {
      const result = await calculateHiringScore(mockScoringInput);

      // CSIG breakdown should show skill matching
      const csigBreakdown = result.csig.breakdown;
      expect(csigBreakdown).toHaveProperty('matchedSkills');
      expect(csigBreakdown).toHaveProperty('missingSkills');
    });
  });
});

describe('Scoring Weights', () => {
  it('should use correct default weights', async () => {
    const result = await calculateHiringScore(mockScoringInput);

    expect(result.sdi.weight).toBe(0.40);
    expect(result.csig.weight).toBe(0.15);
    expect(result.iae.weight).toBe(0.20);
    expect(result.cta.weight).toBe(0.15);
    expect(result.err.weight).toBe(0.10);
  });

  it('should allow custom weights', async () => {
    const customWeights = {
      sdi: 0.30,
      csig: 0.20,
      iae: 0.20,
      cta: 0.20,
      err: 0.10,
    };

    const result = await calculateHiringScore({
      ...mockScoringInput,
      weights: customWeights,
    });

    expect(result.sdi.weight).toBe(0.30);
    expect(result.csig.weight).toBe(0.20);
    expect(result.cta.weight).toBe(0.20);
  });
});
