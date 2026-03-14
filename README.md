# TrajectIQ - Hiring Intelligence Platform

<p align="center">
  <strong>AI-Powered Email-Driven Hiring Intelligence SaaS Platform</strong>
</p>

<p align="center">
  Deterministic candidate evaluation with explainable hiring scores
</p>

---

## 🎯 Overview

TrajectIQ is an enterprise-grade SaaS platform that transforms email-driven hiring workflows into a systematic, explainable, and deterministic evaluation process. Built for modern recruiting teams who need consistency, fairness, and actionable insights in their hiring decisions.

### The TrajectIQ Hiring Formula

```
Hiring Score = SDI × 0.40 + CSIG × 0.15 + IAE × 0.20 + CTA × 0.15 + ERR × 0.10
```

| Component | Name | Weight | Description |
|-----------|------|--------|-------------|
| **SDI** | Skill Depth Index | 40% | Measures breadth and depth of technical skills |
| **CSIG** | Critical Skill Integrity Gate | 15% | Validates required vs. optional skills match |
| **IAE** | Impact Authenticity Engine | 20% | Evaluates quantified achievements and impact |
| **CTA** | Career Trajectory Analyzer | 15% | Analyzes career progression and promotions |
| **ERR** | Experience Relevance Ratio | 10% | Measures relevance of experience to role |

---

## 🏗️ Architecture

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, React 19, TailwindCSS |
| **Backend** | Next.js API Routes (Serverless) |
| **Database** | PostgreSQL (Neon) |
| **ORM** | Prisma |
| **Authentication** | JWT, bcrypt |
| **Deployment** | Vercel |

### Project Structure

```
trajectiq/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Database seeding
├── src/
│   ├── app/
│   │   ├── api/               # API Routes
│   │   │   ├── auth/          # Authentication endpoints
│   │   │   ├── candidates/    # Candidate management
│   │   │   ├── requirements/  # Job requirements
│   │   │   ├── reports/       # Report generation
│   │   │   ├── analytics/     # Analytics & stats
│   │   │   └── email/         # Email connectivity
│   │   ├── layout.tsx
│   │   └── page.tsx           # Dashboard UI
│   ├── lib/
│   │   ├── auth/              # Authentication logic
│   │   ├── connectors/
│   │   │   ├── ats/           # ATS integrations (Greenhouse, Lever)
│   │   │   └── email/         # Email connectors (IMAP)
│   │   ├── db/                # Database client
│   │   ├── parsing/           # Resume & requirement parsing
│   │   ├── scoring/           # Hiring score engine
│   │   │   ├── sdi.ts         # Skill Depth Index
│   │   │   ├── csig.ts        # Critical Skill Integrity Gate
│   │   │   ├── iae.ts         # Impact Authenticity Engine
│   │   │   ├── cta.ts         # Career Trajectory Analyzer
│   │   │   ├── err.ts         # Experience Relevance Ratio
│   │   │   └── engine.ts      # Main scoring engine
│   │   └── utils/             # Utilities & encryption
│   └── types/                 # TypeScript types
├── tests/
│   ├── api/                   # API endpoint tests
│   ├── lib/                   # Library tests
│   └── setup.ts               # Test configuration
├── .env.example
├── jest.config.json
├── package.json
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ or Bun
- PostgreSQL database (recommended: [Neon](https://neon.tech))
- Vercel account (for deployment)

### Local Development

```bash
# Clone the repository
git clone https://github.com/csreekhaanthch-dotcom/TrajectIQ.git
cd TrajectIQ

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL

# Generate Prisma client
bun run db:generate

# Push database schema
bun run db:push

# Start development server
bun run dev
```

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/trajectiq?sslmode=require"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Encryption (32 bytes for AES-256)
ENCRYPTION_KEY="your-encryption-key-32-bytes-!"

# Application
NEXT_PUBLIC_APP_NAME="TrajectIQ"
NEXT_PUBLIC_APP_URL="https://your-domain.vercel.app"
```

---

## 📊 Features

### Core Modules

#### 1. Email Connector System
- **IMAP Connector**: Connect to any IMAP email server
- **Job Detection**: Automatic detection of job requirement emails
- **Reply Tracking**: Track candidate replies and resume attachments
- **Thread Management**: Full email thread analysis

#### 2. ATS Integrations
- **Greenhouse**: Full API integration
- **Lever**: Candidate and job sync
- **Generic Connector**: Custom ATS support

#### 3. Resume Parsing Engine
- AI-powered resume extraction
- Skill detection and categorization
- Experience timeline parsing
- Education and certification extraction

#### 4. Scoring Engine
- **Deterministic**: Same input = same output
- **Explainable**: Every score has justification
- **Configurable**: Adjustable weights per requirement

#### 5. Candidate Ranking
- Real-time ranking updates
- Tier-based categorization (1-5)
- Recommendation engine (HIRE, REVIEW, PASS)

#### 6. Report Generation
- Individual scorecards
- Candidate comparison reports
- Requirement summary reports

### Security Features

- ✅ bcrypt password hashing (12 rounds)
- ✅ JWT authentication with configurable expiry
- ✅ AES-256-GCM encryption for sensitive data
- ✅ Role-based access control (RBAC)
- ✅ Audit logging for all actions
- ✅ Secure credential storage

---

## 🧪 Testing

```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage

# Run specific test file
bun test tests/lib/scoring.test.ts
```

---

## 🚢 Deployment

### Vercel (Recommended)

1. Fork this repository
2. Connect to Vercel
3. Set environment variables
4. Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/csreekhaanthch-dotcom/TrajectIQ)

### Database Setup

1. Create a free PostgreSQL database on [Neon](https://neon.tech)
2. Copy the connection string
3. Add as `DATABASE_URL` in Vercel environment variables

---

## 📈 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | User logout |

### Requirements
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/requirements` | List all requirements |
| POST | `/api/requirements` | Create requirement |
| GET | `/api/requirements/:id` | Get requirement |
| PUT | `/api/requirements/:id` | Update requirement |
| DELETE | `/api/requirements/:id` | Delete requirement |

### Candidates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/candidates` | List candidates |
| POST | `/api/candidates` | Create candidate |
| GET | `/api/candidates/:id` | Get candidate |
| PUT | `/api/candidates/:id` | Update candidate |
| DELETE | `/api/candidates/:id` | Delete candidate |
| POST | `/api/candidates/:id/score` | Calculate score |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics` | Dashboard analytics |
| GET | `/api/stats` | Quick statistics |
| GET | `/api/jobs` | Job listings |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports` | List reports |
| POST | `/api/reports` | Generate report |

---

## 🔧 Configuration

### Scoring Weights

Default weights can be overridden per requirement:

```typescript
{
  sdiWeight: 0.40,  // Skill Depth Index
  csigWeight: 0.15, // Critical Skill Integrity Gate
  iaeWeight: 0.20,  // Impact Authenticity Engine
  ctaWeight: 0.15,  // Career Trajectory Analyzer
  errWeight: 0.10   // Experience Relevance Ratio
}
```

### Grade Scale

| Score Range | Grade | Tier | Recommendation |
|-------------|-------|------|----------------|
| 90-100 | A+ | 1 | HIRE |
| 85-89 | A | 1 | HIRE |
| 80-84 | B+ | 2 | STRONG_REVIEW |
| 75-79 | B | 2 | STRONG_REVIEW |
| 70-74 | C+ | 3 | REVIEW |
| 65-69 | C | 3 | REVIEW |
| 60-64 | D | 4 | REVIEW |
| 0-59 | F | 5 | PASS |

---

## 📝 License

MIT License - See LICENSE file for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## 📞 Support

For support, please open an issue on GitHub.

---

<p align="center">
  Built with ❤️ by the TrajectIQ Team
</p>
