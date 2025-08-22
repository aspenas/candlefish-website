import React from 'react';
import Link from 'next/link';
import { Button } from '../ui/Button';
import { ArrowRightIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export interface CTAProps {
  variant?: 'primary' | 'secondary' | 'gradient';
  title?: string;
  subtitle?: string;
  description?: string;
  primaryCTA?: {
    text: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryCTA?: {
    text: string;
    href?: string;
    onClick?: () => void;
  };
  benefits?: string[];
  backgroundImage?: string;
  showStats?: boolean;
  stats?: Array<{
    label: string;
    value: string;
  }>;
}

const defaultBenefits = [
  'Free maturity assessment',
  'Custom implementation roadmap',
  'Risk-free 30-day trial',
  'Dedicated success manager'
];

const defaultStats = [
  { label: 'Average ROI', value: '340%' },
  { label: 'Implementation Time', value: '14 days' },
  { label: 'Client Success Rate', value: '98%' }
];

const CallToAction: React.FC<CTAProps> = ({
  variant = 'primary',
  title = "Ready to Transform Your Operations?",
  subtitle = "Start Your Automation Journey Today",
  description = "Join hundreds of businesses that have already automated their way to success. Get a free assessment and see your potential ROI in minutes.",
  primaryCTA = {
    text: "Start Free Assessment",
    href: "/assessment"
  },
  secondaryCTA = {
    text: "Schedule Demo",
    href: "/demo"
  },
  benefits = defaultBenefits,
  backgroundImage,
  showStats = true,
  stats = defaultStats
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-foam text-slate';
      case 'gradient':
        return 'bg-gradient-to-br from-deep-navy via-slate to-deep-navy text-foam';
      default:
        return 'bg-sea-glow text-white';
    }
  };

  const getButtonVariant = () => {
    switch (variant) {
      case 'secondary':
        return 'primary';
      case 'gradient':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getSecondaryButtonClasses = () => {
    switch (variant) {
      case 'secondary':
        return 'border-slate text-slate hover:bg-slate hover:text-foam';
      case 'gradient':
        return 'border-foam/30 text-foam hover:bg-foam/10';
      default:
        return 'border-white/30 text-white hover:bg-white/10';
    }
  };

  return (
    <section
      className={`relative py-16 ${getVariantClasses()}`}
      style={backgroundImage ? {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      } : undefined}
    >
      {/* Background overlay for better text readability */}
      {backgroundImage && (
        <div className="absolute inset-0 bg-slate/80" />
      )}

      {/* Background decorative elements */}
      {variant === 'gradient' && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-96 h-96 bg-sea-glow/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-sea-glow/5 rounded-full blur-3xl" />
        </div>
      )}

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              {title}
            </h2>
            <p className="text-xl mb-4 opacity-90">
              {subtitle}
            </p>
            <p className={`text-lg max-w-3xl mx-auto ${
              variant === 'secondary' ? 'text-mist' : 'opacity-80'
            }`}>
              {description}
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            {primaryCTA.href ? (
              <Link href={primaryCTA.href}>
                <Button
                  size="lg"
                  variant={getButtonVariant()}
                  className="group"
                  onClick={primaryCTA.onClick || (() => window.location.href = primaryCTA.href || '')}
                >
                  {primaryCTA.text}
                  <ArrowRightIcon className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            ) : (
              <Button
                size="lg"
                variant={getButtonVariant()}
                className="group"
                onClick={primaryCTA.onClick || (() => console.log('No action defined for primary CTA'))}
              >
                {primaryCTA.text}
                <ArrowRightIcon className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            )}

            {secondaryCTA && (
              secondaryCTA.href ? (
                <Link href={secondaryCTA.href}>
                  <Button
                    variant="outline"
                    size="lg"
                    className={getSecondaryButtonClasses()}
                    onClick={secondaryCTA.onClick || (() => window.location.href = secondaryCTA.href || '')}
                  >
                    {secondaryCTA.text}
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="outline"
                  size="lg"
                  className={getSecondaryButtonClasses()}
                  onClick={secondaryCTA.onClick || (() => console.log('No action defined for secondary CTA'))}
                >
                  {secondaryCTA.text}
                </Button>
              )
            )}
          </div>

          {/* Benefits */}
          {benefits && benefits.length > 0 && (
            <div className="mb-8">
              <div className="flex flex-wrap justify-center gap-4 max-w-2xl mx-auto">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center text-sm">
                    <CheckCircleIcon className={`h-4 w-4 mr-2 ${
                      variant === 'secondary' ? 'text-sea-glow' : 'text-current'
                    }`} />
                    {benefit}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          {showStats && stats && stats.length > 0 && (
            <div className="border-t border-current/20 pt-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold mb-1">
                      {stat.value}
                    </div>
                    <div className={`text-sm ${
                      variant === 'secondary' ? 'text-mist' : 'opacity-70'
                    }`}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export { CallToAction };
