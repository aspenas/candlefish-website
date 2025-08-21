'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Progress, SteppedProgress } from '../ui/Progress';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { useForm } from '../../hooks/useForm';
import { LoadingState } from '../ui/LoadingSpinner';
import { CheckCircleIcon, ArrowRightIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Assessment, AssessmentQuestion, AssessmentAnswer, AssessmentResult } from '../../types/api';

interface AssessmentFormProps {
  assessmentId?: string;
  onComplete?: (result: AssessmentResult) => void;
  onSubmit?: (answers: AssessmentAnswer[]) => void;
}

// Mock assessment data - in production this would come from the API
const mockAssessment: Assessment = {
  id: 'maturity-assessment',
  title: 'AI Automation Maturity Assessment',
  description: 'Discover your automation readiness and get a custom roadmap for implementation.',
  estimatedTime: 5,
  published: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  categories: [
    {
      id: 'process',
      name: 'Process Maturity',
      description: 'How well-defined and documented are your current processes?',
      weight: 0.25,
      color: '#3FD3C6'
    },
    {
      id: 'technology',
      name: 'Technology Readiness',
      description: 'What tools and systems do you currently use?',
      weight: 0.25,
      color: '#1B263B'
    },
    {
      id: 'data',
      name: 'Data Quality',
      description: 'How accessible and reliable is your operational data?',
      weight: 0.25,
      color: '#415A77'
    },
    {
      id: 'culture',
      name: 'Change Readiness',
      description: 'How prepared is your team for automation adoption?',
      weight: 0.25,
      color: '#E0E1DD'
    }
  ],
  questions: [
    // Process Maturity Questions
    {
      id: 'q1',
      text: 'How would you describe your current process documentation?',
      type: 'single',
      required: true,
      category: 'process',
      weight: 1,
      options: [
        { id: 'o1', text: 'Most processes are undocumented or tribal knowledge', value: 1 },
        { id: 'o2', text: 'Some key processes are documented but inconsistent', value: 2 },
        { id: 'o3', text: 'Most processes are documented with standard procedures', value: 3 },
        { id: 'o4', text: 'All processes are well-documented and regularly updated', value: 4 }
      ]
    },
    {
      id: 'q2',
      text: 'How consistent are your operational processes across teams?',
      type: 'single',
      required: true,
      category: 'process',
      weight: 1,
      options: [
        { id: 'o1', text: 'Each team does things their own way', value: 1 },
        { id: 'o2', text: 'Some standardization but lots of variation', value: 2 },
        { id: 'o3', text: 'Mostly standardized with occasional deviations', value: 3 },
        { id: 'o4', text: 'Highly standardized across all teams', value: 4 }
      ]
    },
    // Technology Readiness Questions
    {
      id: 'q3',
      text: 'What tools do you currently use for operations? (Select all that apply)',
      type: 'multiple',
      required: true,
      category: 'technology',
      weight: 1,
      options: [
        { id: 'o1', text: 'Excel/Google Sheets', value: 1 },
        { id: 'o2', text: 'CRM System (Salesforce, HubSpot, etc.)', value: 2 },
        { id: 'o3', text: 'Project Management Tools (Asana, Monday, etc.)', value: 2 },
        { id: 'o4', text: 'ERP System', value: 3 },
        { id: 'o5', text: 'Custom Software/Database', value: 3 },
        { id: 'o6', text: 'API Integrations Between Systems', value: 4 }
      ]
    },
    {
      id: 'q4',
      text: 'How integrated are your current systems?',
      type: 'single',
      required: true,
      category: 'technology',
      weight: 1,
      options: [
        { id: 'o1', text: 'Mostly disconnected systems and manual data entry', value: 1 },
        { id: 'o2', text: 'Some basic integrations or data imports/exports', value: 2 },
        { id: 'o3', text: 'Several systems are integrated with regular sync', value: 3 },
        { id: 'o4', text: 'Most systems are integrated with real-time data flow', value: 4 }
      ]
    },
    // Data Quality Questions
    {
      id: 'q5',
      text: 'How would you rate the quality of your operational data?',
      type: 'single',
      required: true,
      category: 'data',
      weight: 1,
      options: [
        { id: 'o1', text: 'Often incomplete, inconsistent, or outdated', value: 1 },
        { id: 'o2', text: 'Mostly accurate but requires cleanup effort', value: 2 },
        { id: 'o3', text: 'Generally reliable with minor inconsistencies', value: 3 },
        { id: 'o4', text: 'High quality, consistent, and up-to-date', value: 4 }
      ]
    },
    {
      id: 'q6',
      text: 'How easy is it to access the data you need for decisions?',
      type: 'single',
      required: true,
      category: 'data',
      weight: 1,
      options: [
        { id: 'o1', text: 'Requires significant manual effort to gather data', value: 1 },
        { id: 'o2', text: 'Some reports available but limited flexibility', value: 2 },
        { id: 'o3', text: 'Good reporting tools with most data accessible', value: 3 },
        { id: 'o4', text: 'Real-time dashboards with comprehensive data access', value: 4 }
      ]
    },
    // Change Readiness Questions
    {
      id: 'q7',
      text: 'How does your team typically respond to new technology?',
      type: 'single',
      required: true,
      category: 'culture',
      weight: 1,
      options: [
        { id: 'o1', text: 'Resistant to change, prefers current methods', value: 1 },
        { id: 'o2', text: 'Cautious but willing to try with proper support', value: 2 },
        { id: 'o3', text: 'Generally enthusiastic about improvements', value: 3 },
        { id: 'o4', text: 'Actively seeks new tools and optimizations', value: 4 }
      ]
    },
    {
      id: 'q8',
      text: 'How much time does your team spend on repetitive tasks?',
      type: 'single',
      required: true,
      category: 'culture',
      weight: 1,
      options: [
        { id: 'o1', text: 'More than 50% of time on manual, repetitive work', value: 1 },
        { id: 'o2', text: '25-50% of time on repetitive tasks', value: 2 },
        { id: 'o3', text: '10-25% of time on repetitive tasks', value: 3 },
        { id: 'o4', text: 'Less than 10% on repetitive work', value: 4 }
      ]
    }
  ]
};

export const AssessmentForm: React.FC<AssessmentFormProps> = ({
  assessmentId = 'maturity-assessment',
  onComplete,
  onSubmit
}) => {
  const [assessment] = useState<Assessment>(mockAssessment);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<AssessmentResult | null>(null);

  const totalSteps = assessment.questions.length + 2; // Questions + Contact Info + Results
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Contact form for lead capture
  const contactForm = useForm({
    email: {
      validation: { required: true, email: true },
      initialValue: ''
    },
    firstName: {
      validation: { required: true, minLength: 2 },
      initialValue: ''
    },
    lastName: {
      validation: { required: true, minLength: 2 },
      initialValue: ''
    },
    company: {
      validation: { required: false },
      initialValue: ''
    }
  });

  const currentQuestion = assessment.questions[currentStep];
  const isContactStep = currentStep === assessment.questions.length;
  const isResultsStep = currentStep === assessment.questions.length + 1;

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleNext = () => {
    if (isContactStep) {
      if (contactForm.validateForm()) {
        setCurrentStep(prev => prev + 1);
        handleSubmit();
      }
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const calculateResults = (): AssessmentResult => {
    const categoryScores: Record<string, { total: number; count: number }> = {};

    // Initialize categories
    assessment.categories.forEach(cat => {
      categoryScores[cat.id] = { total: 0, count: 0 };
    });

    // Calculate scores by category
    assessment.questions.forEach(question => {
      const answer = answers[question.id];
      if (answer !== undefined) {
        const category = categoryScores[question.category];
        if (question.type === 'multiple') {
          // For multiple choice, average the selected values
          const selectedValues = Array.isArray(answer) ? answer : [answer];
          const avgValue = selectedValues.reduce((sum, val) => sum + val, 0) / selectedValues.length;
          category.total += avgValue;
        } else {
          category.total += answer;
        }
        category.count += 1;
      }
    });

    // Calculate category averages and overall score
    const categories = assessment.categories.map(cat => {
      const categoryData = categoryScores[cat.id];
      const score = categoryData.count > 0 ? (categoryData.total / categoryData.count) / 4 * 100 : 0;

      let level = 'beginner';
      let recommendations: string[] = [];

      if (score >= 75) {
        level = 'advanced';
        recommendations = [
          'Ready for complex automation workflows',
          'Consider AI-powered optimization',
          'Implement predictive analytics'
        ];
      } else if (score >= 50) {
        level = 'intermediate';
        recommendations = [
          'Focus on process automation',
          'Integrate existing systems',
          'Implement workflow optimization'
        ];
      } else if (score >= 25) {
        level = 'developing';
        recommendations = [
          'Start with simple automation',
          'Improve data collection',
          'Standardize key processes'
        ];
      } else {
        recommendations = [
          'Begin with process documentation',
          'Implement basic digital tools',
          'Focus on data quality'
        ];
      }

      return {
        name: cat.name,
        score: Math.round(score),
        level,
        recommendations
      };
    });

    const overallScore = categories.reduce((sum, cat) => sum + cat.score, 0) / categories.length;

    let overallLevel = 'beginner';
    let description = 'Starting your automation journey';

    if (overallScore >= 75) {
      overallLevel = 'advanced';
      description = 'Ready for sophisticated automation';
    } else if (overallScore >= 50) {
      overallLevel = 'intermediate';
      description = 'Building automation capabilities';
    } else if (overallScore >= 25) {
      overallLevel = 'developing';
      description = 'Developing automation foundation';
    }

    return {
      overall: {
        score: Math.round(overallScore),
        level: overallLevel as any,
        description
      },
      categories,
      nextSteps: [
        'Schedule a free consultation',
        'Get a custom implementation roadmap',
        'Start with a 2-week pilot project'
      ],
      estimatedROI: {
        timeframe: '6 months',
        savings: Math.round(overallScore * 1000),
        efficiency: Math.round(overallScore * 0.3)
      }
    };
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Convert answers to API format
      const formattedAnswers: AssessmentAnswer[] = Object.entries(answers).map(([questionId, value]) => ({
        questionId,
        value
      }));

      // Calculate results
      const calculatedResults = calculateResults();
      setResults(calculatedResults);

      // Call callbacks
      onSubmit?.(formattedAnswers);
      onComplete?.(calculatedResults);

      // Submit to API (mock)
      await new Promise(resolve => setTimeout(resolve, 1000));

      setShowResults(true);
    } catch (error) {
      console.error('Failed to submit assessment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    if (isContactStep) {
      return contactForm.isValid;
    }

    const answer = answers[currentQuestion?.id];
    return answer !== undefined && answer !== '';
  };

  if (showResults && results) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card variant="elevated" className="mb-8">
          <CardHeader>
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircleIcon className="h-10 w-10 text-green-600" />
              </div>
              <CardTitle as="h1" className="text-3xl mb-2">
                Your AI Automation Maturity Results
              </CardTitle>
              <p className="text-mist">
                Based on your responses, here's your automation readiness assessment
              </p>
            </div>
          </CardHeader>

          <CardContent>
            {/* Overall Score */}
            <div className="text-center mb-8">
              <div className="text-6xl font-bold text-sea-glow mb-2">
                {results.overall.score}
              </div>
              <div className="text-xl text-slate mb-2">
                Overall Maturity Score
              </div>
              <Badge
                variant={results.overall.level === 'advanced' ? 'primary' : results.overall.level === 'intermediate' ? 'secondary' : 'default'}
                size="lg"
              >
                {results.overall.level.charAt(0).toUpperCase() + results.overall.level.slice(1)}
              </Badge>
              <p className="text-mist mt-2">
                {results.overall.description}
              </p>
            </div>

            {/* Category Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {results.categories.map((category, index) => (
                <Card key={index} variant="outlined">
                  <CardContent>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold text-slate">{category.name}</h3>
                      <Badge variant="outline">{category.score}%</Badge>
                    </div>
                    <Progress
                      value={category.score}
                      size="sm"
                      className="mb-3"
                      variant={category.score >= 75 ? 'success' : category.score >= 50 ? 'default' : 'warning'}
                    />
                    <ul className="space-y-1">
                      {category.recommendations.slice(0, 2).map((rec, idx) => (
                        <li key={idx} className="text-sm text-mist flex items-start">
                          <span className="w-1 h-1 bg-sea-glow rounded-full mt-2 mr-2 flex-shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Estimated ROI */}
            {results.estimatedROI && (
              <Card variant="elevated" className="mb-8 bg-gradient-to-r from-sea-glow/5 to-sea-glow/10">
                <CardContent>
                  <h3 className="text-xl font-semibold text-slate mb-4 text-center">
                    Estimated ROI Potential
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                    <div>
                      <div className="text-2xl font-bold text-sea-glow">
                        {results.estimatedROI.timeframe}
                      </div>
                      <div className="text-sm text-mist">Payback Period</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-sea-glow">
                        ${results.estimatedROI.savings.toLocaleString()}
                      </div>
                      <div className="text-sm text-mist">Annual Savings</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-sea-glow">
                        {results.estimatedROI.efficiency}%
                      </div>
                      <div className="text-sm text-mist">Efficiency Gain</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Next Steps */}
            <div className="text-center">
              <h3 className="text-xl font-semibold text-slate mb-4">
                Recommended Next Steps
              </h3>
              <div className="space-y-2 mb-6">
                {results.nextSteps.map((step, index) => (
                  <div key={index} className="flex items-center justify-center text-slate">
                    <span className="w-6 h-6 bg-sea-glow text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                      {index + 1}
                    </span>
                    {step}
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  onClick={() => window.location.href = '/consideration'}
                >
                  Schedule Free Consultation
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    // Generate simple HTML report client-side
                    const html = `
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <title>Assessment Report</title>
                        <style>
                          body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; }
                          h1 { color: #0D1B2A; }
                          .score { font-size: 3em; color: #3FD3C6; }
                          .section { margin: 30px 0; padding: 20px; background: #f5f5f5; border-radius: 8px; }
                        </style>
                      </head>
                      <body>
                        <h1>Candlefish Assessment Report</h1>
                        <div class="section">
                          <h2>Overall Score</h2>
                          <div class="score">${results.overall.score}%</div>
                          <p>Level: ${results.overall.level}</p>
                          <p>${results.overall.description}</p>
                        </div>
                        <div class="section">
                          <h2>Category Scores</h2>
                          ${results.categories.map((cat: any) => `
                            <div>
                              <h3>${cat.name}</h3>
                              <p>Score: ${cat.score}%</p>
                              <p>Level: ${cat.level}</p>
                            </div>
                          `).join('')}
                        </div>
                        <div class="section">
                          <h2>Next Steps</h2>
                          <ul>
                            ${results.nextSteps.map((step: string) => `<li>${step}</li>`).join('')}
                          </ul>
                        </div>
                        <p>Generated: ${new Date().toLocaleString()}</p>
                        <p>Contact: hello@candlefish.ai</p>
                      </body>
                      </html>
                    `;
                    
                    const blob = new Blob([html], { type: 'text/html' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `candlefish-assessment-${Date.now()}.html`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                  }}
                >
                  Download Detailed Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate mb-4">
          {assessment.title}
        </h1>
        <p className="text-lg text-mist mb-6">
          {assessment.description}
        </p>
        <div className="flex items-center justify-center space-x-4 text-sm text-mist">
          <span>⏱️ {assessment.estimatedTime} minutes</span>
          <span>📊 {assessment.questions.length} questions</span>
          <span>🎯 Personalized recommendations</span>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <Progress
          value={progress}
          showLabel
          label={`Step ${currentStep + 1} of ${totalSteps}`}
          className="mb-4"
        />
        <SteppedProgress
          currentStep={Math.min(currentStep + 1, 4)}
          totalSteps={4}
          steps={[
            { label: 'Questions', description: 'Answer assessment questions' },
            { label: 'Contact', description: 'Provide your details' },
            { label: 'Analysis', description: 'Calculate your results' },
            { label: 'Results', description: 'View your assessment' }
          ]}
        />
      </div>

      {/* Question Card */}
      <Card variant="elevated">
        <CardContent>
          <LoadingState loading={isSubmitting} error={null}>
            {isContactStep ? (
              // Contact Information Step
              <div>
                <h2 className="text-2xl font-semibold text-slate mb-6 text-center">
                  Get Your Personalized Results
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto">
                  <Input
                    label="First Name"
                    required
                    value={contactForm.values.firstName}
                    onChange={(e) => contactForm.setValue('firstName', e.target.value)}
                    onBlur={() => contactForm.setTouched('firstName')}
                    error={contactForm.touched.firstName ? contactForm.errors.firstName : undefined}
                  />
                  <Input
                    label="Last Name"
                    required
                    value={contactForm.values.lastName}
                    onChange={(e) => contactForm.setValue('lastName', e.target.value)}
                    onBlur={() => contactForm.setTouched('lastName')}
                    error={contactForm.touched.lastName ? contactForm.errors.lastName : undefined}
                  />
                  <Input
                    label="Email"
                    type="email"
                    required
                    className="md:col-span-2"
                    value={contactForm.values.email}
                    onChange={(e) => contactForm.setValue('email', e.target.value)}
                    onBlur={() => contactForm.setTouched('email')}
                    error={contactForm.touched.email ? contactForm.errors.email : undefined}
                  />
                  <Input
                    label="Company (Optional)"
                    className="md:col-span-2"
                    value={contactForm.values.company}
                    onChange={(e) => contactForm.setValue('company', e.target.value)}
                  />
                </div>
              </div>
            ) : (
              // Question Step
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="outline">
                    {assessment.categories.find(cat => cat.id === currentQuestion.category)?.name}
                  </Badge>
                  <span className="text-sm text-mist">
                    Question {currentStep + 1} of {assessment.questions.length}
                  </span>
                </div>

                <h2 className="text-xl font-semibold text-slate mb-6">
                  {currentQuestion.text}
                </h2>

                <div className="space-y-3">
                  {currentQuestion.options?.map((option) => {
                    const isSelected = currentQuestion.type === 'multiple'
                      ? (answers[currentQuestion.id] || []).includes(option.value)
                      : answers[currentQuestion.id] === option.value;

                    return (
                      <label
                        key={option.id}
                        className={`block p-4 border rounded-lg cursor-pointer transition-all hover:border-sea-glow ${
                          isSelected
                            ? 'border-sea-glow bg-sea-glow/5'
                            : 'border-mist/20'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <input
                            type={currentQuestion.type === 'multiple' ? 'checkbox' : 'radio'}
                            name={currentQuestion.id}
                            value={option.value}
                            checked={isSelected}
                            onChange={(e) => {
                              if (currentQuestion.type === 'multiple') {
                                const currentAnswers = answers[currentQuestion.id] || [];
                                const newAnswers = e.target.checked
                                  ? [...currentAnswers, option.value]
                                  : currentAnswers.filter((val: any) => val !== option.value);
                                handleAnswerChange(currentQuestion.id, newAnswers);
                              } else {
                                handleAnswerChange(currentQuestion.id, option.value);
                              }
                            }}
                            className="mt-1 text-sea-glow focus:ring-sea-glow"
                          />
                          <div className="flex-1">
                            <div className="text-slate font-medium">
                              {option.text}
                            </div>
                            {option.description && (
                              <div className="text-sm text-mist mt-1">
                                {option.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </LoadingState>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
        >
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Button
          onClick={handleNext}
          disabled={!canProceed()}
          loading={isSubmitting}
        >
          {isContactStep ? 'Get Results' : 'Next'}
          <ArrowRightIcon className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
