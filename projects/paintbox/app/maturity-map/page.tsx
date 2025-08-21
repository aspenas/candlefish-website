'use client';

import { useState } from 'react';
import { ChevronRight, CheckCircle, AlertCircle, FileText, BarChart3 } from 'lucide-react';

interface AssessmentQuestion {
  id: string;
  category: string;
  question: string;
  description: string;
  options: {
    value: number;
    label: string;
    description: string;
  }[];
}

const assessmentQuestions: AssessmentQuestion[] = [
  {
    id: 'estimation-process',
    category: 'Estimation Process',
    question: 'How do you currently create painting estimates?',
    description: 'Understanding your current estimation workflow',
    options: [
      { value: 1, label: 'Manual calculations', description: 'Using pen and paper or basic spreadsheets' },
      { value: 2, label: 'Basic software', description: 'Simple estimation software without integration' },
      { value: 3, label: 'Digital tools', description: 'Dedicated estimation software with some automation' },
      { value: 4, label: 'Integrated platform', description: 'Full digital workflow with CRM and project management' },
      { value: 5, label: 'Advanced automation', description: 'AI-powered estimation with real-time pricing' }
    ]
  },
  {
    id: 'project-tracking',
    category: 'Project Management',
    question: 'How do you track project progress and materials?',
    description: 'Evaluating your project management capabilities',
    options: [
      { value: 1, label: 'Paper-based', description: 'Physical notes and manual tracking' },
      { value: 2, label: 'Spreadsheets', description: 'Excel or Google Sheets for tracking' },
      { value: 3, label: 'Basic software', description: 'Simple project management tools' },
      { value: 4, label: 'Integrated system', description: 'Connected project management with real-time updates' },
      { value: 5, label: 'Full automation', description: 'Automated tracking with IoT and real-time dashboards' }
    ]
  },
  {
    id: 'customer-communication',
    category: 'Customer Relations',
    question: 'How do you communicate with customers during projects?',
    description: 'Assessing customer communication workflows',
    options: [
      { value: 1, label: 'Phone calls only', description: 'Primary communication via phone' },
      { value: 2, label: 'Email updates', description: 'Regular email communication' },
      { value: 3, label: 'Text messaging', description: 'SMS updates and quick communication' },
      { value: 4, label: 'Customer portal', description: 'Dedicated customer portal with project updates' },
      { value: 5, label: 'Real-time platform', description: 'Mobile app with live updates and photo sharing' }
    ]
  },
  {
    id: 'quality-control',
    category: 'Quality Assurance',
    question: 'How do you ensure quality control on job sites?',
    description: 'Understanding your quality assurance processes',
    options: [
      { value: 1, label: 'Visual inspection', description: 'Manual visual checks only' },
      { value: 2, label: 'Checklists', description: 'Paper or digital checklists' },
      { value: 3, label: 'Photo documentation', description: 'Digital photo tracking of progress' },
      { value: 4, label: 'Systematic process', description: 'Standardized quality control procedures' },
      { value: 5, label: 'Digital integration', description: 'Automated quality tracking with AI analysis' }
    ]
  }
];

export default function MaturityMapPage() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const handleAnswer = (questionId: string, value: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < assessmentQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setShowResults(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const calculateMaturityScore = () => {
    const totalScore = Object.values(answers).reduce((sum, score) => sum + score, 0);
    const maxScore = assessmentQuestions.length * 5;
    return Math.round((totalScore / maxScore) * 100);
  };

  const getMaturityLevel = (score: number) => {
    if (score >= 80) return { level: 'Advanced', color: 'text-emerald-600', bgColor: 'bg-emerald-50' };
    if (score >= 60) return { level: 'Developing', color: 'text-blue-600', bgColor: 'bg-blue-50' };
    if (score >= 40) return { level: 'Basic', color: 'text-amber-600', bgColor: 'bg-amber-50' };
    return { level: 'Initial', color: 'text-red-600', bgColor: 'bg-red-50' };
  };

  const currentQuestion = assessmentQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / assessmentQuestions.length) * 100;
  const isAnswered = answers[currentQuestion?.id] !== undefined;

  if (showResults) {
    const score = calculateMaturityScore();
    const maturity = getMaturityLevel(score);

    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-paintbox-background)' }}>
        <div className="max-w-4xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-paintbox-brand to-paintbox-accent rounded-2xl flex items-center justify-center shadow-lg">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: 'var(--color-paintbox-text)' }}>
              Your <span className="paintbox-gradient-text">Maturity Assessment</span>
            </h1>
            <p className="text-xl max-w-2xl mx-auto" style={{ color: 'var(--color-paintbox-text-muted)' }}>
              Here's your digital transformation roadmap
            </p>
          </div>

          {/* Results */}
          <div className="paintbox-card p-8 mb-8">
            <div className="text-center mb-8">
              <div className={`inline-flex items-center gap-3 px-6 py-3 ${maturity.bgColor} rounded-full`} style={{ borderColor: 'var(--color-paintbox-border)' }}>
                <div className={`w-3 h-3 ${maturity.color.replace('text-', 'bg-')} rounded-full`}></div>
                <span className={`font-semibold ${maturity.color}`}>{maturity.level} Level</span>
              </div>
              <div className="mt-6">
                <div className="text-6xl font-bold mb-2" style={{ color: 'var(--color-paintbox-text)' }}>{score}%</div>
                <p style={{ color: 'var(--color-paintbox-text-muted)' }}>Digital Maturity Score</p>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {assessmentQuestions.map((question) => (
                <div key={question.id} className="rounded-lg p-4" style={{ borderColor: 'var(--color-paintbox-border)', borderWidth: '1px', borderStyle: 'solid' }}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold" style={{ color: 'var(--color-paintbox-text)' }}>{question.category}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-paintbox-brand">{answers[question.id] || 0}</span>
                      <span className="text-sm" style={{ color: 'var(--color-paintbox-text-muted)' }}>/5</span>
                    </div>
                  </div>
                  <div className="w-full rounded-full h-2" style={{ backgroundColor: 'var(--color-paintbox-border)' }}>
                    <div
                      className="bg-gradient-to-r from-paintbox-brand to-paintbox-accent h-2 rounded-full transition-all duration-300"
                      style={{ width: `${((answers[question.id] || 0) / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Next Steps */}
            <div className="pt-8" style={{ borderTopColor: 'var(--color-paintbox-border)', borderTopWidth: '1px', borderTopStyle: 'solid' }}>
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-paintbox-text)' }}>
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                Recommended Next Steps
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Immediate Actions</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Implement digital estimation tools</li>
                    <li>• Standardize project tracking</li>
                    <li>• Set up customer communication system</li>
                  </ul>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <h4 className="font-semibold text-emerald-900 mb-2">Long-term Goals</h4>
                  <ul className="text-sm text-emerald-800 space-y-1">
                    <li>• Integrate all business processes</li>
                    <li>• Implement real-time reporting</li>
                    <li>• Automate quality control</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => {
                setShowResults(false);
                setCurrentQuestionIndex(0);
                setAnswers({});
              }}
              className="paintbox-btn paintbox-btn-secondary"
            >
              <FileText className="w-4 h-4" />
              Retake Assessment
            </button>
            <button className="paintbox-btn paintbox-btn-primary">
              <ChevronRight className="w-4 h-4" />
              Get Custom Recommendations
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-paintbox-background)' }}>
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-paintbox-brand to-paintbox-accent rounded-2xl flex items-center justify-center shadow-lg">
              <FileText className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: 'var(--color-paintbox-text)' }}>
            Digital <span className="paintbox-gradient-text">Maturity Assessment</span>
          </h1>
          <p className="text-xl max-w-2xl mx-auto" style={{ color: 'var(--color-paintbox-text-muted)' }}>
            Discover your current digital transformation level and get a personalized roadmap for growth.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: 'var(--color-paintbox-text)' }}>
              Question {currentQuestionIndex + 1} of {assessmentQuestions.length}
            </span>
            <span className="text-sm" style={{ color: 'var(--color-paintbox-text-muted)' }}>
              {Math.round(progress)}% Complete
            </span>
          </div>
          <div className="w-full rounded-full h-2" style={{ backgroundColor: 'var(--color-paintbox-border)' }}>
            <div
              className="bg-gradient-to-r from-paintbox-brand to-paintbox-accent h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Question Card */}
        <div className="paintbox-card p-8 mb-8">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 text-paintbox-brand rounded-full text-sm font-medium mb-4" style={{ backgroundColor: 'color-mix(in oklab, var(--color-paintbox-brand) 10%, transparent)' }}>
              {currentQuestion.category}
            </div>
            <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--color-paintbox-text)' }}>
              {currentQuestion.question}
            </h2>
            <p style={{ color: 'var(--color-paintbox-text-muted)' }}>
              {currentQuestion.description}
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option) => (
              <label
                key={option.value}
                className={`block cursor-pointer transition-all duration-200 rounded-lg p-4 ${
                  answers[currentQuestion.id] === option.value
                    ? 'ring-2 ring-paintbox-brand'
                    : ''
                }`}
                style={{
                  borderColor: 'var(--color-paintbox-border)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  backgroundColor: answers[currentQuestion.id] === option.value
                    ? 'color-mix(in oklab, var(--color-paintbox-brand) 5%, transparent)'
                    : 'transparent'
                }}
              >
                <input
                  type="radio"
                  name={currentQuestion.id}
                  value={option.value}
                  checked={answers[currentQuestion.id] === option.value}
                  onChange={() => handleAnswer(currentQuestion.id, option.value)}
                  className="sr-only"
                />
                <div className="flex items-start gap-3">
                  <div
                    className="w-5 h-5 border-2 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      borderColor: answers[currentQuestion.id] === option.value
                        ? 'var(--color-paintbox-brand)'
                        : 'var(--color-paintbox-border)',
                      backgroundColor: answers[currentQuestion.id] === option.value
                        ? 'var(--color-paintbox-brand)'
                        : 'transparent'
                    }}
                  >
                    {answers[currentQuestion.id] === option.value && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold mb-1" style={{ color: 'var(--color-paintbox-text)' }}>
                      {option.label}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--color-paintbox-text-muted)' }}>
                      {option.description}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-paintbox-brand">
                    {option.value}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className={`paintbox-btn ${
              currentQuestionIndex === 0
                ? 'opacity-50 cursor-not-allowed'
                : 'paintbox-btn-secondary'
            }`}
            style={currentQuestionIndex === 0 ? {
              backgroundColor: 'var(--color-paintbox-border)',
              color: 'var(--color-paintbox-text-muted)'
            } : {}}
          >
            Previous
          </button>

          <div className="flex items-center gap-2">
            {!isAnswered && (
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-paintbox-text-muted)' }}>
                <AlertCircle className="w-4 h-4" />
                Please select an answer
              </div>
            )}
          </div>

          <button
            onClick={handleNext}
            disabled={!isAnswered}
            className={`paintbox-btn ${
              !isAnswered
                ? 'opacity-50 cursor-not-allowed'
                : 'paintbox-btn-primary'
            }`}
            style={!isAnswered ? {
              backgroundColor: 'var(--color-paintbox-border)',
              color: 'var(--color-paintbox-text-muted)'
            } : {}}
          >
            {currentQuestionIndex === assessmentQuestions.length - 1 ? 'View Results' : 'Next'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
