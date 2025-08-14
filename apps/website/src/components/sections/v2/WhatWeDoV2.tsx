import React, { useState } from 'react';
import { Code2, Database, Brain, Cloud, Shield, Gauge } from 'lucide-react';
import './WhatWeDoV2.css';

interface Service {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
}

const WhatWeDoV2: React.FC = () => {
  const [activeService, setActiveService] = useState('automation');

  const services: Service[] = [
    {
      id: 'automation',
      icon: <Code2 size={24} />,
      title: 'Process Automation',
      description: 'Transform repetitive tasks into intelligent automated workflows',
      features: [
        'Excel and spreadsheet automation',
        'Document processing and extraction',
        'Email and communication automation',
        'Data entry and validation'
      ]
    },
    {
      id: 'integration',
      icon: <Database size={24} />,
      title: 'System Integration',
      description: 'Connect disparate systems with intelligent middleware',
      features: [
        'API development and integration',
        'Database synchronization',
        'Real-time data pipelines',
        'Legacy system modernization'
      ]
    },
    {
      id: 'ai',
      icon: <Brain size={24} />,
      title: 'AI Implementation',
      description: 'Deploy cutting-edge AI solutions tailored to your needs',
      features: [
        'Natural language processing',
        'Computer vision solutions',
        'Predictive analytics',
        'Custom AI model development'
      ]
    },
    {
      id: 'cloud',
      icon: <Cloud size={24} />,
      title: 'Cloud Solutions',
      description: 'Scale your infrastructure with modern cloud architectures',
      features: [
        'Cloud migration strategies',
        'Serverless architecture',
        'Container orchestration',
        'Multi-cloud deployment'
      ]
    },
    {
      id: 'security',
      icon: <Shield size={24} />,
      title: 'Security & Compliance',
      description: 'Protect your data with enterprise-grade security',
      features: [
        'Security audits and assessments',
        'Compliance automation',
        'Data encryption and protection',
        'Access control and monitoring'
      ]
    },
    {
      id: 'performance',
      icon: <Gauge size={24} />,
      title: 'Performance Optimization',
      description: 'Maximize efficiency and reduce operational costs',
      features: [
        'System performance analysis',
        'Code optimization',
        'Database tuning',
        'Cost optimization strategies'
      ]
    }
  ];

  const activeServiceData = services.find(s => s.id === activeService) || services[0];

  return (
    <section className="what-we-do-v2">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Our Services</h2>
          <p className="section-subtitle">
            Comprehensive AI and automation solutions for modern businesses
          </p>
        </div>

        <div className="services-container">
          <div className="services-nav">
            {services.map((service) => (
              <button
                key={service.id}
                className={`service-nav-item ${activeService === service.id ? 'active' : ''}`}
                onClick={() => setActiveService(service.id)}
              >
                <span className="service-icon">{service.icon}</span>
                <span className="service-label">{service.title}</span>
              </button>
            ))}
          </div>

          <div className="service-content">
            <div className="service-header">
              <div className="service-icon-large">
                {activeServiceData.icon}
              </div>
              <h3 className="service-title">{activeServiceData.title}</h3>
              <p className="service-description">{activeServiceData.description}</p>
            </div>

            <div className="service-features">
              <h4 className="features-title">Key Features</h4>
              <ul className="features-list">
                {activeServiceData.features.map((feature, index) => (
                  <li
                    key={index}
                    className="feature-item"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <svg className="feature-icon" width="20" height="20" viewBox="0 0 20 20">
                      <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2"/>
                      <path d="M6 10L9 13L14 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <button className="service-cta">
              Get Started
              <svg width="20" height="20" viewBox="0 0 20 20">
                <path d="M7 10H13M13 10L10 7M13 10L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhatWeDoV2;
