import React, { useEffect, useState } from 'react';
import { Search, Hammer, Rocket, BarChart3 } from 'lucide-react';
import './HowItWorksV2.css';

interface Step {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const HowItWorksV2: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  const steps: Step[] = [
    {
      number: '01',
      title: 'Identify Biggest Pain Point',
      description: 'We analyze your workflows to find the highest-impact automation opportunities',
      icon: <Search size={24} />
    },
    {
      number: '02',
      title: 'Build Working Prototype',
      description: 'Rapid development of a functional proof-of-concept to validate the solution',
      icon: <Hammer size={24} />
    },
    {
      number: '03',
      title: 'Deploy to Production',
      description: 'Seamless integration with your existing systems and workflows',
      icon: <Rocket size={24} />
    },
    {
      number: '04',
      title: 'Measure Real Results',
      description: 'Track performance metrics and ROI to ensure continuous improvement',
      icon: <BarChart3 size={24} />
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <section className="how-it-works-v2">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">The Candlefish Method</h2>
          <p className="section-subtitle">
            Our proven 4-step process delivers results in weeks, not months
          </p>
        </div>

        <div className="process-container">
          <div className="process-timeline">
            <div className="timeline-progress" style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }} />
          </div>

          <div className="process-steps">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`process-step ${index === activeStep ? 'active' : ''} ${index < activeStep ? 'completed' : ''}`}
                onClick={() => setActiveStep(index)}
              >
                <div className="step-marker">
                  <div className="marker-inner">
                    {index < activeStep ? (
                      <svg width="20" height="20" viewBox="0 0 20 20">
                        <path d="M5 10L8 13L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <span>{step.number}</span>
                    )}
                  </div>
                </div>

                <div className="step-content">
                  <div className="step-icon">
                    {step.icon}
                  </div>
                  <h3 className="step-title">{step.title}</h3>
                  <p className="step-description">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="process-details">
            <div className="detail-card">
              <div className="detail-icon">
                {steps[activeStep].icon}
              </div>
              <div className="detail-content">
                <h3 className="detail-title">{steps[activeStep].title}</h3>
                <p className="detail-description">{steps[activeStep].description}</p>
                <div className="detail-features">
                  <div className="feature">
                    <span className="feature-label">Timeline:</span>
                    <span className="feature-value">1-2 weeks</span>
                  </div>
                  <div className="feature">
                    <span className="feature-label">Deliverable:</span>
                    <span className="feature-value">
                      {activeStep === 0 && 'Assessment Report'}
                      {activeStep === 1 && 'Working Demo'}
                      {activeStep === 2 && 'Live Solution'}
                      {activeStep === 3 && 'Performance Dashboard'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksV2;
