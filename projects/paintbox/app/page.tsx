'use client';

import Link from 'next/link';
import { ChevronRight, Calculator, FileText, Home, Building, Activity, Sparkles, Users, Clock, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ActionButtonProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  variant: 'primary' | 'secondary' | 'accent' | 'success';
}

const ActionButton = ({ href, icon: Icon, title, description, variant }: ActionButtonProps) => {
  const variantClasses = {
    primary: 'bg-gradient-to-r from-paintbox-brand to-paintbox-brand-400 text-white shadow-lg hover:shadow-xl hover-glow',
    secondary: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl hover-glow',
    accent: 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg hover:shadow-xl hover-glow',
    success: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg hover:shadow-xl hover-glow'
  };

  return (
    <Link
      href={href}
      className={`group flex items-center p-4 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 tap-highlight-none ${variantClasses[variant]}`}
      role="button"
      aria-label={`${title} - ${description}`}
    >
      <div className="flex items-center space-x-4 w-full">
        <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110">
          <Icon className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="flex-grow min-w-0">
          <h3 className="font-semibold text-lg truncate">{title}</h3>
          <p className="text-sm opacity-90 truncate">{description}</p>
        </div>
        <ChevronRight className="w-5 h-5 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" aria-hidden="true" />
      </div>
    </Link>
  );
};

interface FeatureCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: string[];
}

const FeatureCard = ({ icon: Icon, title, items }: FeatureCardProps) => (
  <div className="paintbox-card p-6 group hover-lift transition-all duration-200 slide-up-fade">
    <div className="flex items-center space-x-3 mb-4">
      <div className="w-10 h-10 bg-gradient-to-r from-paintbox-brand to-paintbox-accent rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
        <Icon className="w-5 h-5 text-white" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-paintbox-text">{title}</h3>
    </div>
    <ul className="space-y-2" role="list">
      {items.map((item, index) => (
        <li key={index} className="text-sm text-paintbox-text-muted flex items-center space-x-2 group-hover:translate-x-1 transition-transform" style={{ transitionDelay: `${index * 50}ms` }}>
          <div className="w-1.5 h-1.5 bg-paintbox-accent rounded-full flex-shrink-0 group-hover:scale-125 transition-transform" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

interface StatusIndicatorProps {
  label: string;
  value: string;
  status?: 'operational' | 'warning' | 'error';
}

const StatusIndicator = ({ label, value, status = 'operational' }: StatusIndicatorProps) => {
  const statusColors = {
    operational: 'text-emerald-600',
    warning: 'text-amber-600',
    error: 'text-red-600'
  };

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-paintbox-text-muted">{label}:</span>
      <span className={`text-sm font-medium ${status !== 'operational' ? statusColors[status] : 'text-paintbox-text'}`}>
        {status === 'operational' && value.includes('Operational') ? '✓ ' : ''}
        {value}
      </span>
    </div>
  );
};

export default function HomePage() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-paintbox-brand/5 via-transparent to-paintbox-accent/5" />
        <div className="relative max-w-7xl mx-auto px-6 py-12">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-paintbox-brand to-paintbox-accent rounded-2xl flex items-center justify-center shadow-lg hover-glow pulse-gentle">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-paintbox-text mb-4 tracking-tight slide-up-fade">
              <span className="paintbox-gradient-text">Paintbox</span> Estimator
            </h1>
            <p className="text-xl md:text-2xl text-paintbox-text-muted max-w-3xl mx-auto leading-relaxed slide-up-fade">
              Professional painting estimates designed for field contractors.
              <br className="hidden sm:block" />
              <span className="font-medium text-paintbox-brand">Precise, fast, and ready for iPad.</span>
            </p>

            {/* Professional Badge */}
            <div className="flex justify-center mt-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-full text-sm font-medium text-emerald-700 slide-up-fade hover-lift">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span>Trusted by Professional Contractors</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            <ActionButton
              href="/estimate/new"
              icon={Calculator}
              title="New Estimate"
              description="Start fresh estimate"
              variant="primary"
            />
            <ActionButton
              href="/estimate/new/details"
              icon={FileText}
              title="Client Details"
              description="Manage client info"
              variant="secondary"
            />
            <ActionButton
              href="/estimate/new/exterior"
              icon={Home}
              title="Exterior"
              description="Exterior painting"
              variant="accent"
            />
            <ActionButton
              href="/estimate/new/interior"
              icon={Building}
              title="Interior"
              description="Interior painting"
              variant="success"
            />
          </div>
        </div>
      </div>

      {/* Features and Status Section */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Features */}
          <FeatureCard
            icon={Sparkles}
            title="Core Features"
            items={[
              'Excel formula compatibility',
              'Offline-first architecture',
              'Real-time calculations',
              'Salesforce integration',
              'Company Cam photos'
            ]}
          />

          {/* System Status */}
          <div className="paintbox-card p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-paintbox-text">System Status</h3>
            </div>
            <div className="space-y-1">
              <StatusIndicator label="Version" value="1.0.0" />
              <StatusIndicator label="Environment" value="Production" />
              <StatusIndicator label="Status" value="Operational" status="operational" />
              <StatusIndicator
                label="Last Updated"
                value={currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              />
            </div>
          </div>

          {/* Deployment Info */}
          <div className="paintbox-card p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-paintbox-text">Deployment</h3>
            </div>
            <div className="space-y-1">
              <StatusIndicator label="Platform" value="Fly.io" />
              <StatusIndicator label="Region" value="US East" />
              <StatusIndicator label="CDN" value="Global" />
              <div className="pt-2">
                <a
                  href="https://paintbox.candlefish.ai"
                  className="text-sm text-paintbox-brand hover:text-paintbox-accent transition-colors font-medium"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  paintbox.candlefish.ai ↗
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Status Banner */}
        <div className="mt-8 paintbox-card p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-400">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-900">Production Environment</p>
              <p className="text-xs text-amber-700">
                All estimate calculations are performed in real-time with Excel-level precision.
                Optimized for field use on iPad and mobile devices.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
