'use client';

import React from 'react';
import { Hero } from '../../components/sections/Hero';
import { Features } from '../../components/sections/Features';
import { Testimonials } from '../../components/sections/Testimonials';
import { CallToAction } from '../../components/sections/CallToAction';

export default function MarketingHome() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <Hero
        title="Practical Automation That Compounds"
        subtitle="Candlefish.ai"
        description="Modular AI solutions for SMB operations. Measurable results in 2 weeks. No hype, just operational improvement."
        primaryCTA={{
          text: "Start Assessment",
          href: "/assessment",
          onClick: () => {
            // Track analytics event
            if (typeof window !== 'undefined' && (window as any).gtag) {
              (window as any).gtag('event', 'cta_click', {
                event_category: 'engagement',
                event_label: 'hero_primary_cta'
              });
            }
          }
        }}
        secondaryCTA={{
          text: "Watch Demo",
          href: "/demo"
        }}
        stats={[
          { label: "Average ROI", value: "340%" },
          { label: "Implementation Time", value: "2 weeks" },
          { label: "Client Satisfaction", value: "98%" },
          { label: "Processes Automated", value: "1,200+" }
        ]}
      />

      {/* Problem Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate mb-4">The SMB Automation Gap</h2>
            <p className="text-lg text-mist max-w-3xl mx-auto">
              Most small and medium businesses know they need automation, but existing solutions are either too complex, too expensive, or too risky.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-red-600 text-2xl" role="img" aria-label="Warning">⚠️</span>
              </div>
              <h3 className="text-xl font-semibold text-slate mb-3">Too Complex</h3>
              <p className="text-mist">Enterprise solutions require IT teams and months of implementation</p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-yellow-600 text-2xl" role="img" aria-label="Money">💰</span>
              </div>
              <h3 className="text-xl font-semibold text-slate mb-3">Too Expensive</h3>
              <p className="text-mist">High upfront costs with unclear ROI and long payback periods</p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-orange-600 text-2xl" role="img" aria-label="Dice">🎲</span>
              </div>
              <h3 className="text-xl font-semibold text-slate mb-3">Too Risky</h3>
              <p className="text-mist">All-or-nothing approaches that disrupt operations and may not work</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <Features
        title="Our Approach: Modular & Measurable"
        subtitle="Start small, prove value, scale what works. Each module delivers immediate ROI while building toward comprehensive automation."
      />

      {/* Testimonials Section */}
      <Testimonials />

      {/* Call to Action */}
      <CallToAction
        variant="gradient"
        title="Ready to Transform Your Operations?"
        subtitle="Start Your Automation Journey Today"
        description="Join hundreds of businesses that have already automated their way to success. Get a free assessment and see your potential ROI in minutes."
        primaryCTA={{
          text: "Start Free Assessment",
          href: "/assessment",
          onClick: () => {
            // Track analytics event
            if (typeof window !== 'undefined' && (window as any).gtag) {
              (window as any).gtag('event', 'cta_click', {
                event_category: 'engagement',
                event_label: 'bottom_cta'
              });
            }
          }
        }}
        secondaryCTA={{
          text: "Schedule Demo",
          href: "/demo"
        }}
        benefits={[
          'Free maturity assessment',
          'Custom implementation roadmap',
          'Risk-free 30-day trial',
          'Dedicated success manager'
        ]}
      />
    </div>
  );
}
