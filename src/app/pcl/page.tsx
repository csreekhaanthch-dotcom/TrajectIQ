'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Users, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronRight,
  Sparkles,
  MessageSquare,
  Play,
  Eye,
  UserCheck,
  Activity,
  Zap,
  Loader2,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

// ============================================================================
// DEMO DATA
// ============================================================================

const DEMO_CANDIDATES = [
  {
    id: 'PCL-A7X92F',
    name: 'Alex Chen',
    role: 'Senior Frontend Engineer',
    trustScore: 87,
    humanScore: 96,
    verifiedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    duration: 1800,
    status: 'verified',
    keyMoments: [
      { type: 'breakthrough', title: 'Elegant Solution', timestamp: '0:02:00' },
      { type: 'creative_leap', title: 'Novel Approach', timestamp: '0:15:00' },
    ],
    scores: [
      { category: 'Logic', verified: 92, claimed: 90 },
      { category: 'Speed', verified: 78, claimed: 95 },
      { category: 'Human Sig', verified: 96, claimed: 100 },
      { category: 'Depth', verified: 85, claimed: 85 },
      { category: 'Edge Cases', verified: 88, claimed: 80 },
    ],
  },
  {
    id: 'PCL-B3Y45K',
    name: 'Sarah Kim',
    role: 'Full Stack Developer',
    trustScore: 92,
    humanScore: 99,
    verifiedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    duration: 2100,
    status: 'verified',
    keyMoments: [
      { type: 'breakthrough', title: 'Quick Start', timestamp: '0:03:00' },
      { type: 'optimization', title: 'Performance Boost', timestamp: '0:10:00' },
    ],
    scores: [
      { category: 'Logic', verified: 95, claimed: 95 },
      { category: 'Speed', verified: 88, claimed: 90 },
      { category: 'Human Sig', verified: 99, claimed: 100 },
      { category: 'Depth', verified: 90, claimed: 85 },
      { category: 'Edge Cases', verified: 92, claimed: 85 },
    ],
  },
  {
    id: 'PCL-C8Z21M',
    name: 'Marcus Johnson',
    role: 'Backend Engineer',
    trustScore: 71,
    humanScore: 78,
    verifiedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    duration: 2400,
    status: 'flagged',
    keyMoments: [
      { type: 'frustration', title: 'Slow Start', timestamp: '0:05:00' },
      { type: 'pivot', title: 'Strategy Change', timestamp: '0:15:00' },
    ],
    scores: [
      { category: 'Logic', verified: 75, claimed: 90 },
      { category: 'Speed', verified: 62, claimed: 85 },
      { category: 'Human Sig', verified: 78, claimed: 100 },
      { category: 'Depth', verified: 70, claimed: 80 },
      { category: 'Edge Cases', verified: 65, claimed: 75 },
    ],
  },
];

// ============================================================================
// TRUST BADGE COMPONENT
// ============================================================================

function TrustBadge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const getTier = () => {
    if (score >= 90) return { label: 'PLATINUM', color: 'bg-gradient-to-r from-cyan-400 to-blue-500', textColor: 'text-cyan-400' };
    if (score >= 75) return { label: 'GOLD', color: 'bg-gradient-to-r from-amber-400 to-yellow-500', textColor: 'text-amber-400' };
    if (score >= 50) return { label: 'SILVER', color: 'bg-gradient-to-r from-gray-300 to-gray-400', textColor: 'text-gray-400' };
    return { label: 'BRONZE', color: 'bg-gradient-to-r from-orange-400 to-orange-600', textColor: 'text-orange-400' };
  };

  const tier = getTier();
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[9px]',
    md: 'px-3 py-1 text-[10px]',
    lg: 'px-4 py-1.5 text-xs',
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full font-mono font-bold uppercase tracking-wider',
      tier.color,
      'text-white',
      sizeClasses[size]
    )}>
      <Shield className="w-3 h-3" />
      {tier.label}
    </span>
  );
}

// ============================================================================
// HUMAN VERIFICATION BADGE
// ============================================================================

function HumanVerificationBadge({ score }: { score: number }) {
  const getStatus = () => {
    if (score >= 90) return { 
      label: 'Human Verified', 
      icon: CheckCircle, 
      color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
      pulse: true 
    };
    if (score >= 70) return { 
      label: 'AI Assisted', 
      icon: AlertTriangle, 
      color: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
      pulse: false 
    };
    return { 
      label: 'Flagged', 
      icon: XCircle, 
      color: 'text-red-400 bg-red-400/10 border-red-400/30',
      pulse: false 
    };
  };

  const status = getStatus();
  const Icon = status.icon;

  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono font-semibold',
      status.color
    )}>
      <div className="relative">
        <Icon className="w-3.5 h-3.5" />
        {status.pulse && (
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
        )}
      </div>
      <span>{score}%</span>
      <span className="opacity-70">{status.label}</span>
    </div>
  );
}

// ============================================================================
// COMPETENCY SPIDER CHART (Simplified SVG)
// ============================================================================

function CompetencyChart({ scores, size = 120 }: { scores: Array<{ category: string; verified: number }>; size?: number }) {
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 20;
  const numPoints = scores.length;
  const angleStep = (2 * Math.PI) / numPoints;

  const getPoint = (index: number, value: number) => {
    const angle = -Math.PI / 2 + index * angleStep;
    const r = (value / 100) * radius;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle),
    };
  };

  const points = scores.map((s, i) => getPoint(i, s.verified));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <svg width={size} height={size} className="overflow-visible">
      {/* Grid circles */}
      {[20, 40, 60, 80, 100].map((level) => (
        <circle
          key={level}
          cx={centerX}
          cy={centerY}
          r={(level / 100) * radius}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.1}
          className="text-gray-400"
        />
      ))}
      
      {/* Axis lines */}
      {scores.map((_, i) => {
        const end = getPoint(i, 100);
        return (
          <line
            key={i}
            x1={centerX}
            y1={centerY}
            x2={end.x}
            y2={end.y}
            stroke="currentColor"
            strokeOpacity={0.1}
            className="text-gray-400"
          />
        );
      })}

      {/* Data polygon */}
      <motion.path
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        d={pathD}
        fill="rgba(59, 130, 246, 0.3)"
        stroke="#3B82F6"
        strokeWidth={2}
      />

      {/* Data points */}
      {points.map((p, i) => (
        <motion.circle
          key={i}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3 + i * 0.05 }}
          cx={p.x}
          cy={p.y}
          r={4}
          fill="#3B82F6"
          stroke="white"
          strokeWidth={2}
        />
      ))}

      {/* Labels */}
      {scores.map((s, i) => {
        const angle = -Math.PI / 2 + i * angleStep;
        const labelRadius = radius + 15;
        const x = centerX + labelRadius * Math.cos(angle);
        const y = centerY + labelRadius * Math.sin(angle);
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-current text-[9px] font-medium text-muted-foreground"
          >
            {s.category}
          </text>
        );
      })}
    </svg>
  );
}

// ============================================================================
// STAT CARD
// ============================================================================

function PCLStatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  color = 'blue' 
}: { 
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: string;
  color?: 'blue' | 'green' | 'amber' | 'cyan' | 'purple';
}) {
  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-400',
    green: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-400',
    cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 text-cyan-400',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-400',
  };

  return (
    <div className={cn(
      'relative p-5 rounded-xl bg-gradient-to-br border backdrop-blur-sm',
      colorClasses[color]
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn('p-2 rounded-lg bg-white/10', colorClasses[color].split(' ')[4])}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className="text-[10px] font-mono opacity-70">{trend}</span>
        )}
      </div>
      <div className="text-2xl font-bold font-mono">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{title}</div>
      {subtitle && (
        <div className="text-[10px] text-muted-foreground mt-0.5 opacity-70">{subtitle}</div>
      )}
    </div>
  );
}

// ============================================================================
// CANDIDATE CARD
// ============================================================================

function CandidateCard({ 
  candidate, 
  onClick,
  isSelected 
}: { 
  candidate: typeof DEMO_CANDIDATES[0];
  onClick: () => void;
  isSelected: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-4 rounded-xl border cursor-pointer transition-all',
        isSelected 
          ? 'bg-primary/10 border-primary/30' 
          : 'bg-card hover:bg-muted/50 border-border hover:border-primary/20'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        {/* Chart */}
        <div className="flex-shrink-0">
          <CompetencyChart scores={candidate.scores} size={100} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground truncate">{candidate.name}</h3>
            <TrustBadge score={candidate.trustScore} size="sm" />
          </div>
          <p className="text-sm text-muted-foreground mb-2">{candidate.role}</p>
          
          <div className="flex items-center gap-3 mb-3">
            <HumanVerificationBadge score={candidate.humanScore} />
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{Math.round(candidate.duration / 60)}m</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" />
              <span>{candidate.keyMoments.length} key moments</span>
            </div>
            <span className="font-mono text-[10px] opacity-50">{candidate.id}</span>
          </div>
        </div>

        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </div>
    </motion.div>
  );
}

// ============================================================================
// CANDIDATE DETAIL PANEL
// ============================================================================

function CandidateDetailPanel({ candidate }: { candidate: typeof DEMO_CANDIDATES[0] }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="h-full flex flex-col bg-card rounded-xl border border-border overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3 mb-3">
          <HumanVerificationBadge score={candidate.humanScore} />
          <TrustBadge score={candidate.trustScore} />
        </div>
        <h2 className="text-xl font-bold text-foreground">{candidate.name}</h2>
        <p className="text-sm text-muted-foreground">{candidate.role}</p>
        <p className="text-xs text-muted-foreground font-mono mt-1">{candidate.id}</p>
      </div>

      {/* Trust Score */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-muted-foreground uppercase">Trust Score</span>
          <span className="text-2xl font-bold font-mono">{candidate.trustScore}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${candidate.trustScore}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
          />
        </div>
      </div>

      {/* Competency Chart */}
      <div className="p-5 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Competency Map
        </h3>
        <div className="flex justify-center">
          <CompetencyChart scores={candidate.scores} size={180} />
        </div>
      </div>

      {/* Key Moments */}
      <div className="p-5 flex-1 overflow-auto">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Play className="w-4 h-4 text-primary" />
          Key Moments
        </h3>
        <div className="space-y-2">
          {candidate.keyMoments.map((moment, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-mono',
                moment.type === 'breakthrough' ? 'bg-emerald-500/20 text-emerald-400' :
                moment.type === 'creative_leap' ? 'bg-blue-500/20 text-blue-400' :
                moment.type === 'frustration' ? 'bg-amber-500/20 text-amber-400' :
                'bg-gray-500/20 text-gray-400'
              )}>
                <Eye className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{moment.title}</p>
                <p className="text-xs text-muted-foreground">{moment.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border bg-muted/30">
        <button className="w-full btn-primary">
          <MessageSquare className="w-4 h-4" />
          Ask the Ledger
        </button>
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN PCL DASHBOARD
// ============================================================================

export default function PCLDashboardPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [selectedCandidate, setSelectedCandidate] = useState<typeof DEMO_CANDIDATES[0] | null>(null);

  // Redirect to login if not authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="page-header animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="page-title flex items-center gap-2">
              PCL Dashboard
              <span className="px-2 py-0.5 text-[10px] font-mono bg-cyan-500/20 text-cyan-400 rounded-full border border-cyan-500/30">
                PROOF-OF-COMPETENCY
              </span>
            </h1>
            <p className="page-description">Verify candidate authenticity with behavioral evidence</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <PCLStatCard
          title="Verified Human Rate"
          value="94%"
          trend="+2.3%"
          subtitle="This month"
          icon={UserCheck}
          color="green"
        />
        <PCLStatCard
          title="Avg Trust Score"
          value="83.4"
          trend="+5.1"
          subtitle="Across all candidates"
          icon={TrendingUp}
          color="blue"
        />
        <PCLStatCard
          title="Pipeline Velocity"
          value="2.4h"
          trend="-18m"
          subtitle="Avg verification time"
          icon={Zap}
          color="cyan"
        />
        <PCLStatCard
          title="EU AI Act Status"
          value="COMPLIANT"
          subtitle="Active monitoring"
          icon={Shield}
          color="purple"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Candidate List */}
        <div className={cn('space-y-4', selectedCandidate ? 'lg:col-span-2' : 'lg:col-span-3')}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              Verified Talent Feed
            </h2>
            <span className="px-2 py-1 text-[10px] font-mono bg-muted rounded text-muted-foreground">
              {DEMO_CANDIDATES.length} candidates
            </span>
          </div>

          <div className="grid gap-4">
            {DEMO_CANDIDATES.map((candidate) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                onClick={() => setSelectedCandidate(
                  selectedCandidate?.id === candidate.id ? null : candidate
                )}
                isSelected={selectedCandidate?.id === candidate.id}
              />
            ))}
          </div>
        </div>

        {/* Detail Panel */}
        <AnimatePresence>
          {selectedCandidate && (
            <div className="lg:col-span-1">
              <CandidateDetailPanel candidate={selectedCandidate} />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Scoring Info */}
      <div className="mt-6 card">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">PCL Scoring Dimensions</h3>
              <p className="text-sm text-muted-foreground">Each candidate is evaluated across 5 verified dimensions</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { name: 'Logic', desc: 'Problem-solving approach' },
              { name: 'Speed', desc: 'Time to completion' },
              { name: 'Human Sig', desc: 'AI detection score' },
              { name: 'Depth', desc: 'Solution complexity' },
              { name: 'Edge Cases', desc: 'Boundary handling' },
            ].map((dim) => (
              <div key={dim.name} className="p-3 rounded-lg bg-muted/50 text-center">
                <div className="text-sm font-semibold text-foreground">{dim.name}</div>
                <div className="text-xs text-muted-foreground">{dim.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
