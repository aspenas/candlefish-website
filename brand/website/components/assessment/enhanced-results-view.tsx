'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import dynamic from 'next/dynamic';
import { 
  TrophyIcon, 
  SparklesIcon, 
  ChartBarIcon,
  BoltIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import type { AssessmentScore, OperationalPortrait } from '@/types/assessment';

// Dynamically import heavy components with loading states
const MaturitySphere = dynamic(() => import('./maturity-sphere'), { 
  ssr: false,
  loading: () => <div className="w-[300px] h-[300px] bg-gray-800/50 animate-pulse rounded-full" />
});
const ParticleField = dynamic(() => import('./particle-field'), { 
  ssr: false,
  loading: () => null
});

interface EnhancedResultsViewProps {
  score: AssessmentScore;
  portrait: OperationalPortrait;
  responses: any[];
  sessionId: string;
  onRequestConsultation: () => void;
}

// Achievement unlock animation
const AchievementUnlock = ({ dimension, score }: { dimension: string; score: number }) => {
  const [show, setShow] = useState(false);
  
  useEffect(() => {
    if (score > 70) {
      setTimeout(() => {
        setShow(true);
        setTimeout(() => setShow(false), 3000);
      }, 2000);
    }
  }, [score]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, rotate: -180, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="fixed top-20 right-8 z-50 bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600 
                     p-6 rounded-2xl shadow-2xl shadow-amber-500/50"
        >
          <div className="flex items-center gap-4">
            <TrophyIcon className="w-12 h-12 text-white animate-bounce" />
            <div>
              <p className="text-white font-bold text-lg">Achievement Unlocked!</p>
              <p className="text-amber-100">Excellence in {dimension}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Animated score reveal
const ScoreReveal = ({ score }: { score: number }) => {
  const [displayScore, setDisplayScore] = useState(0);
  
  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = score / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= score) {
        setDisplayScore(score);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [score]);

  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
      className="relative"
    >
      <div className="text-8xl md:text-9xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 
                      bg-clip-text text-transparent">
        {displayScore}%
      </div>
      
      {/* Particle burst on complete */}
      {displayScore === score && <ParticleField count={50} burst />}
    </motion.div>
  );
};

// Industry benchmark comparison
const BenchmarkComparison = ({ userScore, industry }: { userScore: number; industry: any }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="relative h-64 bg-gradient-to-b from-slate-900/50 to-slate-900/0 rounded-xl p-6"
    >
      <div className="absolute inset-0">
        {/* Grid background */}
        <div className="absolute inset-0 bg-grid-white/[0.02]" />
        
        {/* Industry zones */}
        <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-red-500/10 to-transparent">
          <span className="absolute bottom-2 left-2 text-xs text-red-400">Lagging</span>
        </div>
        <div className="absolute bottom-1/4 left-0 right-0 h-1/4 bg-gradient-to-t from-amber-500/10 to-transparent">
          <span className="absolute bottom-2 left-2 text-xs text-amber-400">Average</span>
        </div>
        <div className="absolute bottom-2/4 left-0 right-0 h-1/4 bg-gradient-to-t from-blue-500/10 to-transparent">
          <span className="absolute bottom-2 left-2 text-xs text-blue-400">Leading</span>
        </div>
        <div className="absolute bottom-3/4 left-0 right-0 h-1/4 bg-gradient-to-t from-green-500/10 to-transparent">
          <span className="absolute bottom-2 left-2 text-xs text-green-400">Innovating</span>
        </div>
      </div>
      
      {/* User position */}
      <motion.div
        initial={{ scaleY: 0 }}
        animate={{ scaleY: userScore / 100 }}
        transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 bg-gradient-to-t from-cyan-500 to-cyan-400 
                   origin-bottom rounded-t-lg shadow-lg shadow-cyan-500/50"
        style={{ height: '100%' }}
      >
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 2 }}
          className="absolute -top-8 left-1/2 -translate-x-1/2"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-cyan-400 rounded-full animate-ping" />
            <div className="relative bg-cyan-500 text-white px-3 py-1 rounded-full text-sm font-bold">
              You: {userScore}%
            </div>
          </div>
        </motion.div>
      </motion.div>
      
      {/* Industry average line */}
      <div 
        className="absolute left-0 right-0 h-px bg-yellow-500/50 border-t border-dashed border-yellow-500"
        style={{ bottom: `${industry.average}%` }}
      >
        <span className="absolute -top-5 right-2 text-xs text-yellow-500">
          Industry Avg: {industry.average}%
        </span>
      </div>
    </motion.div>
  );
};

// Value proposition cards with animations
const ValuePropCard = ({ icon: Icon, title, value, delay }: any) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ scale: 1.05, y: -5 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl 
                 border border-slate-700/50 rounded-2xl p-6 overflow-hidden group cursor-pointer"
    >
      {/* Glow effect on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10"
          />
        )}
      </AnimatePresence>
      
      <Icon className="w-8 h-8 text-cyan-400 mb-3" />
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      <p className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
        {value}
      </p>
      
      {/* Animated particles on hover */}
      {isHovered && (
        <div className="absolute inset-0 pointer-events-none">
          <SparklesIcon className="absolute top-2 right-2 w-4 h-4 text-cyan-400 animate-pulse" />
          <SparklesIcon className="absolute bottom-2 left-2 w-4 h-4 text-purple-400 animate-pulse delay-75" />
        </div>
      )}
    </motion.div>
  );
};

// Social proof carousel
const SocialProofCarousel = () => {
  const testimonials = [
    {
      company: "TechCorp",
      logo: "🏢",
      quote: "43% efficiency gain in just 3 months",
      author: "Sarah Chen, COO"
    },
    {
      company: "RetailGiant", 
      logo: "🛍️",
      quote: "$2.3M saved through automation",
      author: "Michael Ross, VP Operations"
    },
    {
      company: "StartupX",
      logo: "🚀", 
      quote: "5x faster deployment cycles",
      author: "Alex Kumar, CTO"
    }
  ];
  
  const [current, setCurrent] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);
  
  return (
    <div className="relative h-32">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          className="absolute inset-0 bg-gradient-to-r from-slate-800/30 to-slate-900/30 
                     backdrop-blur-sm border border-slate-700/30 rounded-xl p-6"
        >
          <div className="flex items-center gap-4">
            <div className="text-4xl">{testimonials[current].logo}</div>
            <div className="flex-1">
              <p className="text-cyan-400 font-semibold">{testimonials[current].quote}</p>
              <p className="text-slate-400 text-sm mt-1">
                — {testimonials[current].author}, {testimonials[current].company}
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// Transformation roadmap with timeline
const TransformationRoadmap = ({ steps }: { steps: any[] }) => {
  const { scrollYProgress } = useScroll();
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);
  
  return (
    <div className="relative">
      {/* Timeline line */}
      <svg className="absolute left-8 top-0 h-full w-px">
        <motion.line
          x1="0"
          y1="0"
          x2="0"
          y2="100%"
          stroke="url(#gradient)"
          strokeWidth="2"
          style={{ pathLength }}
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Steps */}
      <div className="space-y-12 pl-20">
        {steps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.2 }}
            className="relative"
          >
            {/* Step indicator */}
            <div className="absolute -left-12 top-2 w-6 h-6 bg-gradient-to-br from-cyan-500 to-purple-500 
                            rounded-full shadow-lg shadow-cyan-500/50" />
            
            {/* Step content */}
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/30 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                <span className="text-sm text-cyan-400">{step.timeframe}</span>
              </div>
              <p className="text-slate-400 mb-4">{step.description}</p>
              
              {/* Expected outcomes */}
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <ArrowTrendingUpIcon className="w-4 h-4 text-green-400" />
                  <span className="text-green-400">{step.impact}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <ClockIcon className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-400">{step.effort}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Main enhanced results component
export function EnhancedResultsView({
  score,
  portrait,
  responses,
  sessionId,
  onRequestConsultation
}: EnhancedResultsViewProps) {
  const [showUrgency, setShowUrgency] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  
  // Urgency timer
  useEffect(() => {
    const showTimer = setTimeout(() => setShowUrgency(true), 30000); // Show after 30s
    
    const countdown = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdown);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      clearTimeout(showTimer);
      clearInterval(countdown);
    };
  }, []);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Mock data for demonstration
  const transformationSteps = [
    {
      title: "Quick Wins Implementation",
      timeframe: "Week 1-2",
      description: "Automate repetitive tasks and optimize existing workflows",
      impact: "+15% efficiency",
      effort: "2 hours/day"
    },
    {
      title: "System Integration",
      timeframe: "Week 3-6",
      description: "Connect disparate systems and establish data pipelines",
      impact: "+35% visibility",
      effort: "4 hours/week"
    },
    {
      title: "AI-Powered Optimization",
      timeframe: "Week 7-12",
      description: "Deploy intelligent automation and predictive analytics",
      impact: "+60% productivity",
      effort: "2 hours/week"
    }
  ];
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950">
      {/* Hero section with animated score reveal */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-grid-white/[0.02]" />
          <ParticleField count={100} />
        </div>
        
        {/* Main content */}
        <div className="relative z-10 text-center px-6">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl md:text-3xl text-slate-400 mb-4"
          >
            Your Operational Maturity Score
          </motion.h1>
          
          <ScoreReveal score={score.percentage || 0} />
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            className="text-xl text-slate-300 mt-6"
          >
            You're performing better than{' '}
            <span className="text-cyan-400 font-bold">{score.percentile}%</span> of similar operations
          </motion.p>
          
          {/* Achievement unlocks */}
          {score.dimensions.map((dim, i) => (
            <AchievementUnlock
              key={i}
              dimension={dim.name}
              score={(dim.rawScore / 4) * 100}
            />
          ))}
        </div>
        
        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm text-slate-400">Explore your results</span>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <ChartBarIcon className="w-6 h-6 text-cyan-400" />
            </motion.div>
          </div>
        </motion.div>
      </section>
      
      {/* Benchmark comparison */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="text-4xl font-bold text-white mb-12 text-center"
        >
          Industry Comparison
        </motion.h2>
        
        <BenchmarkComparison
          userScore={score.percentage || 0}
          industry={{ average: 45, top: 75 }}
        />
      </section>
      
      {/* Value propositions */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="text-4xl font-bold text-white mb-12 text-center"
        >
          Your Transformation Potential
        </motion.h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          <ValuePropCard
            icon={BoltIcon}
            title="Time Savings"
            value="12 hrs/week"
            delay={0}
          />
          <ValuePropCard
            icon={ArrowTrendingUpIcon}
            title="Efficiency Gain"
            value="+47%"
            delay={0.1}
          />
          <ValuePropCard
            icon={CheckCircleIcon}
            title="ROI Timeline"
            value="3 months"
            delay={0.2}
          />
        </div>
      </section>
      
      {/* Social proof */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="text-4xl font-bold text-white mb-12 text-center"
        >
          Success Stories
        </motion.h2>
        
        <SocialProofCarousel />
      </section>
      
      {/* Transformation roadmap */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="text-4xl font-bold text-white mb-12 text-center"
        >
          Your Transformation Roadmap
        </motion.h2>
        
        <TransformationRoadmap steps={transformationSteps} />
      </section>
      
      {/* CTA section */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-600 to-purple-600 p-12"
        >
          {/* Animated background */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-grid-white/[0.05]" />
          </div>
          
          <div className="relative z-10 text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Ready to Transform Your Operations?
            </h2>
            <p className="text-xl text-cyan-100 mb-8">
              Unlock ${Math.floor(score.percentage * 1000)} in monthly savings
            </p>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onRequestConsultation()}
              className="px-8 py-4 bg-white text-purple-600 rounded-xl font-bold text-lg 
                         shadow-2xl shadow-white/20 hover:shadow-white/30 transition-shadow"
            >
              Schedule Your Strategy Call
            </motion.button>
            
            <p className="text-sm text-cyan-100 mt-4">
              ✓ No commitment required • ✓ 30-minute call • ✓ Custom roadmap included
            </p>
          </div>
        </motion.div>
      </section>
      
      {/* Urgency popup */}
      <AnimatePresence>
        {showUrgency && timeLeft > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-6 right-6 bg-gradient-to-r from-red-600 to-orange-600 
                       text-white p-6 rounded-2xl shadow-2xl max-w-sm z-50"
          >
            <div className="flex items-center gap-3 mb-3">
              <ClockIcon className="w-6 h-6" />
              <span className="font-bold text-lg">Limited Time Offer</span>
            </div>
            <p className="mb-4">
              Get 20% off implementation when you start this week
            </p>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-mono font-bold">
                {formatTime(timeLeft)}
              </span>
              <button
                onClick={() => onRequestConsultation()}
                className="px-4 py-2 bg-white text-red-600 rounded-lg font-semibold"
              >
                Claim Offer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}