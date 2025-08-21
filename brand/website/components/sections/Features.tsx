import React from 'react';
import { Card, CardContent } from '../ui/Card';
import {
  BoltIcon,
  ChartBarIcon,
  CogIcon,
  ShieldCheckIcon,
  ClockIcon,
  ScaleIcon
} from '@heroicons/react/24/outline';

export interface Feature {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  benefits?: string[];
  metrics?: {
    label: string;
    value: string;
  };
}

export interface FeaturesProps {
  title?: string;
  subtitle?: string;
  features?: Feature[];
  layout?: 'grid' | 'list' | 'cards';
  columns?: 2 | 3 | 4;
}

const defaultFeatures: Feature[] = [
  {
    id: 'modular',
    title: 'Modular AI Solutions',
    description: 'Start small with targeted automation modules. Each solution is self-contained and delivers immediate value.',
    icon: <CogIcon className="h-6 w-6" />,
    benefits: [
      'Quick 2-week implementation',
      'Immediate ROI measurement',
      'Low risk, high impact'
    ],
    metrics: {
      label: 'Avg Implementation',
      value: '14 days'
    }
  },
  {
    id: 'measurable',
    title: 'Measurable Results',
    description: 'Every automation comes with clear metrics and KPIs. Track efficiency gains, cost savings, and time recovered.',
    icon: <ChartBarIcon className="h-6 w-6" />,
    benefits: [
      'Real-time performance tracking',
      'ROI calculations',
      'Efficiency metrics'
    ],
    metrics: {
      label: 'Average ROI',
      value: '340%'
    }
  },
  {
    id: 'rapid',
    title: 'Rapid Deployment',
    description: 'From assessment to implementation in 14 days. Our proven methodology ensures quick wins and immediate impact.',
    icon: <BoltIcon className="h-6 w-6" />,
    benefits: [
      'Structured implementation process',
      'Minimal business disruption',
      'Quick training and adoption'
    ],
    metrics: {
      label: 'Time to Value',
      value: '2 weeks'
    }
  },
  {
    id: 'secure',
    title: 'Enterprise Security',
    description: 'Bank-grade security with compliance-ready frameworks. Your data stays secure and private.',
    icon: <ShieldCheckIcon className="h-6 w-6" />,
    benefits: [
      'SOC 2 Type II compliance',
      'End-to-end encryption',
      'Regular security audits'
    ],
    metrics: {
      label: 'Security Score',
      value: '99.9%'
    }
  },
  {
    id: 'scalable',
    title: 'Infinitely Scalable',
    description: 'Grow your automation ecosystem as your business grows. Add new modules and capabilities over time.',
    icon: <ScaleIcon className="h-6 w-6" />,
    benefits: [
      'Seamless integration',
      'Modular expansion',
      'Future-proof architecture'
    ],
    metrics: {
      label: 'Scalability Factor',
      value: '10x+'
    }
  },
  {
    id: 'continuous',
    title: 'Continuous Optimization',
    description: 'AI that learns and improves over time. Your automations get smarter and more efficient automatically.',
    icon: <ClockIcon className="h-6 w-6" />,
    benefits: [
      'Machine learning optimization',
      'Performance improvements',
      'Adaptive workflows'
    ],
    metrics: {
      label: 'Improvement Rate',
      value: '15% monthly'
    }
  }
];

const Features: React.FC<FeaturesProps> = ({
  title = "Why Candlefish.ai Works",
  subtitle = "Practical automation designed for real businesses",
  features = defaultFeatures,
  layout = 'grid',
  columns = 3
}) => {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4'
  };

  if (layout === 'list') {
    return (
      <section className="py-16 bg-foam/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate mb-4">{title}</h2>
            <p className="text-lg text-mist max-w-3xl mx-auto">{subtitle}</p>
          </div>

          <div className="space-y-8">
            {features.map((feature, index) => (
              <div
                key={feature.id}
                className={`flex items-start gap-6 ${
                  index % 2 === 1 ? 'lg:flex-row-reverse' : ''
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-sea-glow/10 rounded-lg flex items-center justify-center text-sea-glow">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-semibold text-slate">
                      {feature.title}
                    </h3>
                  </div>
                  <p className="text-mist mb-4">{feature.description}</p>
                  {feature.benefits && (
                    <ul className="space-y-2">
                      {feature.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-center text-sm text-slate">
                          <div className="w-2 h-2 bg-sea-glow rounded-full mr-3" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {feature.metrics && (
                  <div className="flex-shrink-0 text-center p-6 bg-white rounded-lg shadow-sm border border-mist/10">
                    <div className="text-2xl font-bold text-sea-glow mb-1">
                      {feature.metrics.value}
                    </div>
                    <div className="text-sm text-mist">
                      {feature.metrics.label}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate mb-4">{title}</h2>
          <p className="text-lg text-mist max-w-3xl mx-auto">{subtitle}</p>
        </div>

        <div className={`grid grid-cols-1 ${gridCols[columns]} gap-8`}>
          {features.map((feature) => (
            <Card
              key={feature.id}
              variant="elevated"
              className="group hover:scale-105 transition-transform duration-200"
            >
              <CardContent>
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-sea-glow/10 rounded-full flex items-center justify-center text-sea-glow group-hover:bg-sea-glow group-hover:text-white transition-colors">
                    {feature.icon}
                  </div>

                  <h3 className="text-xl font-semibold text-slate mb-3">
                    {feature.title}
                  </h3>

                  <p className="text-mist mb-4">
                    {feature.description}
                  </p>

                  {feature.benefits && (
                    <ul className="space-y-2 mb-4">
                      {feature.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-center text-sm text-slate justify-center">
                          <div className="w-1.5 h-1.5 bg-sea-glow rounded-full mr-2" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  )}

                  {feature.metrics && (
                    <div className="pt-4 border-t border-mist/10">
                      <div className="text-2xl font-bold text-sea-glow">
                        {feature.metrics.value}
                      </div>
                      <div className="text-xs text-mist">
                        {feature.metrics.label}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export { Features };
