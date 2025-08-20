'use client';

import React from 'react';
import { CaseStudiesGallery } from '../../components/sections/CaseStudiesGallery';
import { CaseStudy } from '../../types/api';

export default function CaseStudiesPage() {
  const handleViewCaseStudy = (caseStudy: CaseStudy) => {
    // Track analytics event
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'case_study_view', {
        event_category: 'engagement',
        event_label: caseStudy.slug,
        custom_parameters: {
          industry: caseStudy.industry,
          client: caseStudy.client
        }
      });
    }

    console.log('Viewing case study:', caseStudy);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <section className="bg-gradient-to-br from-foam/5 to-sea-glow/5 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-slate mb-6">
            Client Success Stories
          </h1>
          <p className="text-xl text-mist max-w-3xl mx-auto mb-8">
            See how businesses across industries have transformed their operations with our modular AI automation approach. 
            Real results, real impact, real ROI.
          </p>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-sea-glow mb-1">50+</div>
              <div className="text-sm text-mist">Successful Projects</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-sea-glow mb-1">340%</div>
              <div className="text-sm text-mist">Average ROI</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-sea-glow mb-1">98%</div>
              <div className="text-sm text-mist">Client Satisfaction</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-sea-glow mb-1">2 weeks</div>
              <div className="text-sm text-mist">Avg Implementation</div>
            </div>
          </div>
        </div>
      </section>

      {/* Case Studies Gallery */}
      <section className="py-16">
        <CaseStudiesGallery
          onViewCaseStudy={handleViewCaseStudy}
          showFilters={true}
          itemsPerPage={9}
        />
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-deep-navy to-slate text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Write Your Success Story?
          </h2>
          <p className="text-xl mb-8 text-foam/90">
            Join the businesses already transforming their operations with automation. 
            Start with a free assessment and see your potential ROI.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/assessment" 
              className="bg-sea-glow text-deep-navy px-8 py-3 rounded-md font-medium hover:opacity-90 transition"
            >
              Start Free Assessment
            </a>
            <a 
              href="/contact" 
              className="border border-foam/30 text-foam px-8 py-3 rounded-md font-medium hover:bg-foam/10 transition"
            >
              Schedule Consultation
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}