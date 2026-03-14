'use client';

import { useState } from 'react';
import { X, Briefcase, MapPin, DollarSign, Clock, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Skill {
  name: string;
  required: boolean;
  category: 'technical' | 'soft' | 'domain' | 'tool';
}

export function CreateJobModal({ isOpen, onClose, onSuccess }: CreateJobModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    location: '',
    employmentType: 'FULL_TIME',
    salaryRange: '',
    experienceRequired: 0,
    description: '',
  });
  const [skills, setSkills] = useState<Skill[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [weights, setWeights] = useState({
    sdi: 0.40,
    csig: 0.15,
    iae: 0.20,
    cta: 0.15,
    err: 0.10,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          requiredSkills: skills.filter(s => s.required),
          preferredSkills: skills.filter(s => !s.required),
          experienceRequired: Number(formData.experienceRequired),
          sdiWeight: weights.sdi,
          csigWeight: weights.csig,
          iaeWeight: weights.iae,
          ctaWeight: weights.cta,
          errWeight: weights.err,
        }),
      });

      if (response.ok) {
        onSuccess?.();
        onClose();
        // Reset form
        setFormData({
          title: '',
          department: '',
          location: '',
          employmentType: 'FULL_TIME',
          salaryRange: '',
          experienceRequired: 0,
          description: '',
        });
        setSkills([]);
      }
    } catch (error) {
      console.error('Failed to create job:', error);
    } finally {
      setLoading(false);
    }
  };

  const addSkill = () => {
    if (newSkill.trim()) {
      setSkills([...skills, { 
        name: newSkill.trim(), 
        required: true, 
        category: 'technical' 
      }]);
      setNewSkill('');
    }
  };

  const removeSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const toggleSkillRequired = (index: number) => {
    setSkills(skills.map((skill, i) => 
      i === index ? { ...skill, required: !skill.required } : skill
    ));
  };

  const totalWeight = weights.sdi + weights.csig + weights.iae + weights.cta + weights.err;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="overlay" onClick={onClose} />
      
      <div className="modal w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Briefcase className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Create Job Requirement</h2>
              <p className="text-sm text-muted-foreground">Define a new position</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Job Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input-base"
                  placeholder="e.g., Senior Software Engineer"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1.5">Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="input-base"
                  placeholder="e.g., Engineering"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="input-base"
                  placeholder="e.g., Remote, San Francisco, CA"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1.5">Employment Type</label>
                <select
                  value={formData.employmentType}
                  onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                  className="input-base"
                >
                  <option value="FULL_TIME">Full Time</option>
                  <option value="PART_TIME">Part Time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="CONTRACT_TO_HIRE">Contract to Hire</option>
                  <option value="INTERNSHIP">Internship</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Salary Range
                </label>
                <input
                  type="text"
                  value={formData.salaryRange}
                  onChange={(e) => setFormData({ ...formData, salaryRange: e.target.value })}
                  className="input-base"
                  placeholder="e.g., $120,000 - $160,000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Experience Required (years)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.experienceRequired}
                  onChange={(e) => setFormData({ ...formData, experienceRequired: parseInt(e.target.value) || 0 })}
                  className="input-base"
                />
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Skills Required</h3>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                className="input-base flex-1"
                placeholder="Add a skill..."
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              />
              <button
                type="button"
                onClick={addSkill}
                className="btn-primary px-4"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
                      skill.required 
                        ? "bg-primary/10 text-primary border border-primary/20" 
                        : "bg-secondary text-secondary-foreground"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSkillRequired(index)}
                      className="hover:opacity-80"
                      title={skill.required ? 'Click to make optional' : 'Click to make required'}
                    >
                      {skill.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSkill(index)}
                      className="hover:text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Scoring Weights */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Scoring Weights</h3>
              <span className={cn(
                "text-sm",
                Math.abs(totalWeight - 1) < 0.01 ? "text-emerald-500" : "text-amber-500"
              )}>
                Total: {(totalWeight * 100).toFixed(0)}%
              </span>
            </div>
            
            <div className="space-y-3">
              {[
                { key: 'sdi', label: 'Skill Depth Index (SDI)', defaultWeight: 0.40 },
                { key: 'csig', label: 'Critical Skills Gap (CSIG)', defaultWeight: 0.15 },
                { key: 'iae', label: 'Impact & Achievement (IAE)', defaultWeight: 0.20 },
                { key: 'cta', label: 'Career Trajectory (CTA)', defaultWeight: 0.15 },
                { key: 'err', label: 'Experience Relevance (ERR)', defaultWeight: 0.10 },
              ].map((item) => (
                <div key={item.key} className="flex items-center gap-4">
                  <span className="text-sm w-48">{item.label}</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={weights[item.key as keyof typeof weights]}
                    onChange={(e) => setWeights({
                      ...weights,
                      [item.key]: parseFloat(e.target.value)
                    })}
                    className="flex-1 accent-primary"
                  />
                  <span className="text-sm w-12 text-right">
                    {(weights[item.key as keyof typeof weights] * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline px-4 py-2.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.title}
              className="btn-primary px-6 py-2.5"
            >
              {loading ? 'Creating...' : 'Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
