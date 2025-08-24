'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Section = 'entry' | 'capabilities' | 'transformations' | 'examples' | 'access';

interface WorkshopRequestFormProps {
  onNavigate: (section: Section) => void;
  queuePosition: number;
}

interface FormData {
  // Operational Context
  currentProcesses: string;
  manualHours: string;
  teamSize: string;
  urgencyLevel: string;

  // Technical Readiness
  systemsInUse: string[];
  technicalTeam: string;
  implementationTimeline: string;
  budgetRange: string;

  // Workshop Preferences
  workshopFormat: 'onsite' | 'remote' | 'hybrid';
  preferredDuration: string;
  teamAttendees: string;

  // Contact Information
  name: string;
  role: string;
  email: string;
  company: string;
  phone: string;
}

const initialFormData: FormData = {
  currentProcesses: '',
  manualHours: '',
  teamSize: '',
  urgencyLevel: '',
  systemsInUse: [],
  technicalTeam: '',
  implementationTimeline: '',
  budgetRange: '',
  workshopFormat: 'onsite',
  preferredDuration: '',
  teamAttendees: '',
  name: '',
  role: '',
  email: '',
  company: '',
  phone: ''
};

export function WorkshopRequestForm({ onNavigate, queuePosition }: WorkshopRequestFormProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readinessScore, setReadinessScore] = useState(0);

  useEffect(() => {
    // Calculate readiness score based on form completion
    const completedFields = Object.values(formData).filter(value =>
      Array.isArray(value) ? value.length > 0 : value !== ''
    ).length;
    const totalFields = Object.keys(formData).length;
    setReadinessScore(Math.round((completedFields / totalFields) * 100));
  }, [formData]);

  const handleInputChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const handleSystemsChange = (system: string) => {
    setFormData(prev => ({
      ...prev,
      systemsInUse: prev.systemsInUse.includes(system)
        ? prev.systemsInUse.filter(s => s !== system)
        : [...prev.systemsInUse, system]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/workshop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          readinessScore,
          submissionTime: new Date().toISOString()
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit workshop request');
      }

      setIsSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formSteps = [
    {
      title: 'Operational Context',
      description: 'Current manual processes and pain points'
    },
    {
      title: 'Technical Readiness',
      description: 'Systems and implementation capacity'
    },
    {
      title: 'Workshop Preferences',
      description: 'Format and logistics preferences'
    },
    {
      title: 'Contact Information',
      description: 'How to reach you and your team'
    }
  ];

  const systemOptions = [
    'CRM (Salesforce, HubSpot, etc.)',
    'ERP (SAP, Oracle, NetSuite, etc.)',
    'Database (SQL Server, MySQL, PostgreSQL)',
    'Cloud Platforms (AWS, Azure, GCP)',
    'Spreadsheets (Excel, Google Sheets)',
    'Email Systems (Outlook, Gmail)',
    'Project Management (Asana, Monday, Notion)',
    'E-commerce (Shopify, WooCommerce)',
    'Custom Applications',
    'Legacy Systems'
  ];

  if (isSubmitted) {
    return (
      <motion.section
        key="submitted"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="min-h-screen pt-24 pb-32 px-6 flex items-center justify-center"
      >
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="w-20 h-20 bg-living-cyan/20 rounded-full flex items-center justify-center mx-auto mb-8"
          >
            <svg className="w-10 h-10 text-living-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>

          <h2 className="text-3xl font-light text-pearl mb-6">
            Workshop Request Submitted
          </h2>

          <div className="bg-graphite/20 backdrop-blur-md border border-copper/20 p-8 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-2xl font-mono text-living-cyan">#{queuePosition + 1}</div>
                <div className="text-sm text-pearl/50 font-mono">Queue Position</div>
              </div>
              <div>
                <div className="text-2xl font-mono text-copper">{readinessScore}%</div>
                <div className="text-sm text-pearl/50 font-mono">Readiness Score</div>
              </div>
              <div>
                <div className="text-2xl font-mono text-pearl/70">2-3 weeks</div>
                <div className="text-sm text-pearl/50 font-mono">Response Time</div>
              </div>
            </div>
          </div>

          <p className="text-pearl/70 font-light mb-8">
            Your workshop request has been received and is being evaluated.
            We'll respond within 2-3 weeks with next steps and potential workshop dates.
          </p>

          <button
            onClick={() => onNavigate('capabilities')}
            className="px-8 py-4 bg-graphite/80 border border-copper/30
                     text-copper font-mono hover:border-copper hover:bg-copper/5
                     transition-all duration-500"
          >
            Return to Laboratory
          </button>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      key="access"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen pt-24 pb-32 px-6"
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-6xl font-light text-pearl mb-6">
            Request Workshop Access
          </h1>
          <p className="text-xl text-pearl/70 font-light max-w-2xl mx-auto">
            One-day operational transformation intensive.
            We evaluate each request for mutual fit.
          </p>
        </motion.div>

        {/* Progress Indicator */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-graphite/20 backdrop-blur-md border border-copper/20 p-6 mb-12"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-living-cyan rounded-full animate-pulse" />
              <span className="font-mono text-sm text-pearl">WORKSHOP_REQUEST_ACTIVE</span>
            </div>
            <div className="font-mono text-sm text-pearl/70">
              Readiness: {readinessScore}%
            </div>
          </div>

          <div className="flex space-x-4">
            {formSteps.map((step, index) => (
              <div
                key={index}
                className={`flex-1 h-2 rounded-none ${
                  index <= currentStep ? 'bg-living-cyan' : 'bg-graphite/40'
                }`}
              />
            ))}
          </div>

          <div className="flex justify-between mt-2 text-xs font-mono text-pearl/50">
            {formSteps.map((step, index) => (
              <span key={index} className={index === currentStep ? 'text-living-cyan' : ''}>
                {step.title}
              </span>
            ))}
          </div>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <AnimatePresence mode="wait">
            {/* Step 1: Operational Context */}
            {currentStep === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                <div className="bg-graphite/20 backdrop-blur-md border border-copper/20 p-8">
                  <h3 className="text-xl font-medium text-pearl mb-6">Operational Context</h3>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-pearl/70 mb-2 font-light">
                        Describe your most time-consuming manual processes
                      </label>
                      <textarea
                        value={formData.currentProcesses}
                        onChange={handleInputChange('currentProcesses')}
                        rows={4}
                        className="w-full bg-black/40 border border-copper/30 px-4 py-3
                                 text-pearl focus:border-living-cyan transition-colors
                                 font-light backdrop-blur-sm"
                        placeholder="e.g., Weekly inventory reconciliation across 5 locations, manual client onboarding..."
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-pearl/70 mb-2 font-light">
                          Manual Hours per Week
                        </label>
                        <input
                          type="number"
                          value={formData.manualHours}
                          onChange={handleInputChange('manualHours')}
                          min="5"
                          className="w-full bg-black/40 border border-copper/30 px-4 py-3
                                   text-pearl focus:border-living-cyan transition-colors
                                   font-light"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-pearl/70 mb-2 font-light">
                          Team Size
                        </label>
                        <select
                          value={formData.teamSize}
                          onChange={handleInputChange('teamSize')}
                          className="w-full bg-black/40 border border-copper/30 px-4 py-3
                                   text-pearl focus:border-living-cyan transition-colors
                                   font-light"
                          required
                        >
                          <option value="">Select size</option>
                          <option value="1-5">1-5 people</option>
                          <option value="6-15">6-15 people</option>
                          <option value="16-50">16-50 people</option>
                          <option value="50+">50+ people</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-pearl/70 mb-2 font-light">
                          Urgency Level
                        </label>
                        <select
                          value={formData.urgencyLevel}
                          onChange={handleInputChange('urgencyLevel')}
                          className="w-full bg-black/40 border border-copper/30 px-4 py-3
                                   text-pearl focus:border-living-cyan transition-colors
                                   font-light"
                          required
                        >
                          <option value="">Select urgency</option>
                          <option value="high">High - Need solution in 30 days</option>
                          <option value="medium">Medium - 2-3 months timeline</option>
                          <option value="low">Low - Exploratory, 6+ months</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Technical Readiness */}
            {currentStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                <div className="bg-graphite/20 backdrop-blur-md border border-copper/20 p-8">
                  <h3 className="text-xl font-medium text-pearl mb-6">Technical Readiness</h3>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-pearl/70 mb-4 font-light">
                        Systems currently in use (select all that apply)
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {systemOptions.map(system => (
                          <label key={system} className="flex items-center space-x-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.systemsInUse.includes(system)}
                              onChange={() => handleSystemsChange(system)}
                              className="w-4 h-4 text-living-cyan bg-black/40 border-copper/30
                                       focus:ring-living-cyan focus:ring-2"
                            />
                            <span className="text-pearl/70 text-sm">{system}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-pearl/70 mb-2 font-light">
                          Technical Team Availability
                        </label>
                        <select
                          value={formData.technicalTeam}
                          onChange={handleInputChange('technicalTeam')}
                          className="w-full bg-black/40 border border-copper/30 px-4 py-3
                                   text-pearl focus:border-living-cyan transition-colors
                                   font-light"
                          required
                        >
                          <option value="">Select availability</option>
                          <option value="full-time">Full-time developer(s) available</option>
                          <option value="part-time">Part-time technical support</option>
                          <option value="contractor">Can hire contractor/consultant</option>
                          <option value="none">No technical team currently</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-pearl/70 mb-2 font-light">
                          Implementation Timeline
                        </label>
                        <select
                          value={formData.implementationTimeline}
                          onChange={handleInputChange('implementationTimeline')}
                          className="w-full bg-black/40 border border-copper/30 px-4 py-3
                                   text-pearl focus:border-living-cyan transition-colors
                                   font-light"
                          required
                        >
                          <option value="">Select timeline</option>
                          <option value="immediate">Start immediately after workshop</option>
                          <option value="1-month">Within 1 month</option>
                          <option value="3-months">Within 3 months</option>
                          <option value="6-months">Within 6 months</option>
                          <option value="planning">Still planning/budgeting</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-pearl/70 mb-2 font-light">
                        Investment Budget Range
                      </label>
                      <select
                        value={formData.budgetRange}
                        onChange={handleInputChange('budgetRange')}
                        className="w-full bg-black/40 border border-copper/30 px-4 py-3
                                 text-pearl focus:border-living-cyan transition-colors
                                 font-light"
                        required
                      >
                        <option value="">Select range</option>
                        <option value="50-100k">$50,000 - $100,000</option>
                        <option value="100-200k">$100,000 - $200,000</option>
                        <option value="200-400k">$200,000 - $400,000</option>
                        <option value="400k+">$400,000+</option>
                        <option value="need-estimate">Need cost estimate first</option>
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Workshop Preferences */}
            {currentStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                <div className="bg-graphite/20 backdrop-blur-md border border-copper/20 p-8">
                  <h3 className="text-xl font-medium text-pearl mb-6">Workshop Preferences</h3>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-pearl/70 mb-4 font-light">
                        Preferred Workshop Format
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                          { key: 'onsite', label: 'On-site at your location', desc: 'Full immersion in your environment' },
                          { key: 'remote', label: 'Remote via video', desc: 'Cost-effective, screen sharing' },
                          { key: 'hybrid', label: 'Hybrid approach', desc: 'Remote + on-site components' }
                        ].map(format => (
                          <label key={format.key} className="cursor-pointer">
                            <input
                              type="radio"
                              name="workshopFormat"
                              value={format.key}
                              checked={formData.workshopFormat === format.key}
                              onChange={handleInputChange('workshopFormat')}
                              className="sr-only"
                            />
                            <div className={`p-4 border transition-all duration-300 ${
                              formData.workshopFormat === format.key
                                ? 'border-living-cyan bg-living-cyan/10'
                                : 'border-copper/30 bg-black/20 hover:border-copper/50'
                            }`}>
                              <div className="text-pearl font-medium mb-1">{format.label}</div>
                              <div className="text-pearl/50 text-sm">{format.desc}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-pearl/70 mb-2 font-light">
                          Preferred Duration
                        </label>
                        <select
                          value={formData.preferredDuration}
                          onChange={handleInputChange('preferredDuration')}
                          className="w-full bg-black/40 border border-copper/30 px-4 py-3
                                   text-pearl focus:border-living-cyan transition-colors
                                   font-light"
                          required
                        >
                          <option value="">Select duration</option>
                          <option value="full-day">Full day (8 hours)</option>
                          <option value="half-day">Half day (4 hours)</option>
                          <option value="two-days">Two days (intensive)</option>
                          <option value="flexible">Flexible based on needs</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-pearl/70 mb-2 font-light">
                          Number of Team Attendees
                        </label>
                        <input
                          type="number"
                          value={formData.teamAttendees}
                          onChange={handleInputChange('teamAttendees')}
                          min="1"
                          max="15"
                          className="w-full bg-black/40 border border-copper/30 px-4 py-3
                                   text-pearl focus:border-living-cyan transition-colors
                                   font-light"
                          placeholder="1-15 people recommended"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Contact Information */}
            {currentStep === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                <div className="bg-graphite/20 backdrop-blur-md border border-copper/20 p-8">
                  <h3 className="text-xl font-medium text-pearl mb-6">Contact Information</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-pearl/70 mb-2 font-light">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={handleInputChange('name')}
                        className="w-full bg-black/40 border border-copper/30 px-4 py-3
                                 text-pearl focus:border-living-cyan transition-colors
                                 font-light"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-pearl/70 mb-2 font-light">
                        Role/Title
                      </label>
                      <input
                        type="text"
                        value={formData.role}
                        onChange={handleInputChange('role')}
                        className="w-full bg-black/40 border border-copper/30 px-4 py-3
                                 text-pearl focus:border-living-cyan transition-colors
                                 font-light"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-pearl/70 mb-2 font-light">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange('email')}
                        className="w-full bg-black/40 border border-copper/30 px-4 py-3
                                 text-pearl focus:border-living-cyan transition-colors
                                 font-light"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-pearl/70 mb-2 font-light">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange('phone')}
                        className="w-full bg-black/40 border border-copper/30 px-4 py-3
                                 text-pearl focus:border-living-cyan transition-colors
                                 font-light"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-pearl/70 mb-2 font-light">
                        Company/Organization
                      </label>
                      <input
                        type="text"
                        value={formData.company}
                        onChange={handleInputChange('company')}
                        className="w-full bg-black/40 border border-copper/30 px-4 py-3
                                 text-pearl focus:border-living-cyan transition-colors
                                 font-light"
                        required
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-900/20 border border-red-600/30 px-4 py-3 rounded-none"
            >
              <p className="text-red-400 text-sm font-light">{error}</p>
            </motion.div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center pt-8">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-8 py-4 bg-graphite/80 border border-copper/30
                         text-copper font-mono hover:border-copper hover:bg-copper/5
                         transition-all duration-500"
              >
                ← Previous
              </button>
            )}

            {currentStep < 3 && (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="ml-auto px-8 py-4 bg-graphite/80 border border-living-cyan/30
                         text-living-cyan font-mono hover:border-living-cyan hover:bg-living-cyan/5
                         transition-all duration-500"
              >
                Next →
              </button>
            )}

            {currentStep === 3 && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="ml-auto px-8 py-4 bg-graphite/80 border border-living-cyan/30
                         text-living-cyan font-mono hover:border-living-cyan hover:bg-living-cyan/5
                         transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed
                         relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center gap-3">
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting Request...
                    </>
                  ) : (
                    'Submit Workshop Request'
                  )}
                </span>

                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-living-cyan/10 to-transparent
                              translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              </button>
            )}
          </div>
        </form>
      </div>
    </motion.section>
  );
}
