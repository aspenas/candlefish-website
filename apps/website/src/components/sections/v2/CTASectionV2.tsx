import React from 'react';
import { ArrowRight, Mail, Calendar } from 'lucide-react';
import './CTASectionV2.css';

const CTASectionV2: React.FC = () => {
  return (
    <section className="cta-section-v2">
      <div className="cta-background">
        <div className="cta-gradient" />
        <div className="cta-pattern" />
      </div>

      <div className="container">
        <div className="cta-content">
          <h2 className="cta-title">
            Ready to transform your business?
          </h2>
          <p className="cta-subtitle">
            We're selectively partnering with organizations ready to embrace AI transformation.
            Let's discuss how we can accelerate your success.
          </p>

          <div className="cta-actions">
            <button className="cta-primary">
              <Mail size={20} />
              <span>Start a Conversation</span>
              <ArrowRight size={20} />
            </button>

            <button className="cta-secondary">
              <Calendar size={20} />
              <span>Schedule a Demo</span>
            </button>
          </div>

          <div className="cta-stats">
            <div className="stat">
              <span className="stat-value">2-4 weeks</span>
              <span className="stat-label">Average time to first deployment</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-value">10x ROI</span>
              <span className="stat-label">Average return on investment</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-value">24/7</span>
              <span className="stat-label">Automated operations</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASectionV2;
