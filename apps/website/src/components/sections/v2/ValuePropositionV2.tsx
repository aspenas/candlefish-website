import React from 'react';
import { Zap, GitBranch, Cpu } from 'lucide-react';
import './ValuePropositionV2.css';

interface ValueCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
}

const ValuePropositionV2: React.FC = () => {
  const values: ValueCard[] = [
    {
      icon: <Zap size={24} />,
      title: 'Excel Automation',
      description: 'Transform manual spreadsheet workflows that take hours into automated AI systems',
      gradient: 'gradient-1'
    },
    {
      icon: <GitBranch size={24} />,
      title: 'System Integration',
      description: 'Connect your disconnected systems with intelligent AI bridges',
      gradient: 'gradient-2'
    },
    {
      icon: <Cpu size={24} />,
      title: 'AI Implementation',
      description: 'Production-ready AI solutions built with enterprise-grade AI platforms',
      gradient: 'gradient-3'
    }
  ];

  return (
    <section className="value-proposition-v2">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">
            <span className="title-main">What is</span>
            <span className="title-accent">Candlefish AI?</span>
          </h2>
          <p className="section-description">
            We specialize in turning your most complex business challenges into
            streamlined, AI-powered solutions that deliver measurable results.
          </p>
        </div>

        <div className="value-grid">
          {values.map((value, index) => (
            <div
              key={index}
              className="value-card"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`card-gradient ${value.gradient}`} />
              <div className="card-content">
                <div className="card-icon">
                  {value.icon}
                </div>
                <h3 className="card-title">{value.title}</h3>
                <p className="card-description">{value.description}</p>
                <button className="card-link">
                  Learn more
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8H13M13 8L8 3M13 8L8 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ValuePropositionV2;
