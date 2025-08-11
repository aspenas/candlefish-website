import React, { useState } from 'react';
import { ArrowRight, Activity, Code, Users, TrendingUp } from 'lucide-react';
import './PilotProjectsV2.css';

interface Project {
  id: string;
  title: string;
  client: string;
  status: 'active' | 'development' | 'planning';
  description: string;
  tech: string[];
  metrics: {
    label: string;
    value: string;
  }[];
  icon: React.ReactNode;
}

const PilotProjectsV2: React.FC = () => {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const projects: Project[] = [
    {
      id: 'enterprise-data',
      title: 'Enterprise Data Platform',
      client: 'Fortune 500 Financial Services',
      status: 'active',
      description: 'Unified data platform consolidating 12+ disparate systems into a single source of truth',
      tech: ['Python', 'Apache Spark', 'AWS', 'Kubernetes'],
      metrics: [
        { label: 'Data Processing Speed', value: '10x faster' },
        { label: 'Cost Reduction', value: '65%' }
      ],
      icon: <Activity size={24} />
    },
    {
      id: 'family-office',
      title: 'Family Office Digital',
      client: 'Private Wealth Management',
      status: 'development',
      description: 'Digital transformation of traditional family office operations with AI-powered insights',
      tech: ['React', 'Node.js', 'PostgreSQL', 'OpenAI'],
      metrics: [
        { label: 'Report Generation', value: '95% faster' },
        { label: 'Accuracy', value: '99.9%' }
      ],
      icon: <Users size={24} />
    },
    {
      id: 'promoter-os',
      title: 'PromoterOS',
      client: 'Entertainment Industry',
      status: 'active',
      description: 'Event management and promotion platform with real-time analytics and automation',
      tech: ['Next.js', 'GraphQL', 'Redis', 'Stripe'],
      metrics: [
        { label: 'Ticket Sales', value: '+45%' },
        { label: 'Operational Efficiency', value: '3x' }
      ],
      icon: <TrendingUp size={24} />
    },
    {
      id: 'crown-trophy',
      title: 'Crown Trophy Digital',
      client: 'Retail Franchise',
      status: 'planning',
      description: 'Digital transformation of trophy and awards customization workflow',
      tech: ['Vue.js', 'Express', 'MongoDB', 'Shopify'],
      metrics: [
        { label: 'Order Processing', value: '80% faster' },
        { label: 'Customer Satisfaction', value: '+35%' }
      ],
      icon: <Code size={24} />
    }
  ];

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'active': return 'status-active';
      case 'development': return 'status-development';
      case 'planning': return 'status-planning';
      default: return '';
    }
  };

  const getStatusLabel = (status: Project['status']) => {
    switch (status) {
      case 'active': return 'Active';
      case 'development': return 'In Development';
      case 'planning': return 'Planning';
      default: return status;
    }
  };

  return (
    <section className="pilot-projects-v2">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Pilot Implementations</h2>
          <p className="section-subtitle">
            Real-world solutions delivering measurable business impact
          </p>
        </div>

        <div className="projects-grid">
          {projects.map((project) => (
            <div
              key={project.id}
              className={`project-card ${selectedProject === project.id ? 'expanded' : ''}`}
              onClick={() => setSelectedProject(selectedProject === project.id ? null : project.id)}
            >
              <div className="project-header">
                <div className="project-icon">
                  {project.icon}
                </div>
                <span className={`project-status ${getStatusColor(project.status)}`}>
                  {getStatusLabel(project.status)}
                </span>
              </div>

              <h3 className="project-title">{project.title}</h3>
              <p className="project-client">{project.client}</p>
              <p className="project-description">{project.description}</p>

              <div className="project-tech">
                {project.tech.map((tech, index) => (
                  <span key={index} className="tech-tag">{tech}</span>
                ))}
              </div>

              {selectedProject === project.id && (
                <div className="project-metrics">
                  <h4 className="metrics-title">Key Results</h4>
                  <div className="metrics-grid">
                    {project.metrics.map((metric, index) => (
                      <div key={index} className="metric">
                        <span className="metric-value">{metric.value}</span>
                        <span className="metric-label">{metric.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button className="project-link">
                View Case Study
                <ArrowRight size={16} />
              </button>
            </div>
          ))}
        </div>

        <div className="projects-cta">
          <h3 className="cta-title">Ready to join our success stories?</h3>
          <p className="cta-description">
            Let's discuss how we can transform your business with AI
          </p>
          <button className="cta-button">
            Start Your Project
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </section>
  );
};

export default PilotProjectsV2;
