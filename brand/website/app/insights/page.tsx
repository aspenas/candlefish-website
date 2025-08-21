'use client';

import React from 'react';
import { BlogGallery } from '../../components/sections/BlogGallery';
import { NewsletterForm } from '../../components/ui/NewsletterForm';
import { BlogPost } from '../../types/api';

export default function InsightsPage() {
  const handleViewPost = (post: BlogPost) => {
    // Track analytics event
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'blog_post_view', {
        event_category: 'engagement',
        event_label: post.slug,
        custom_parameters: {
          category: post.categories[0],
          author: post.author.name
        }
      });
    }

    console.log('Viewing blog post:', post);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <section className="bg-gradient-to-br from-foam/5 to-sea-glow/5 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-slate mb-6">
            Automation Insights & Strategies
          </h1>
          <p className="text-xl text-mist max-w-3xl mx-auto mb-8">
            Expert perspectives on AI automation, implementation strategies, and real-world case studies. 
            Stay ahead with practical insights from our automation specialists.
          </p>
          
          {/* Newsletter Signup */}
          <div className="max-w-lg mx-auto">
            <NewsletterForm 
              variant="compact"
              theme="light"
              source="insights-page"
            />
          </div>
        </div>
      </section>

      {/* Blog Gallery */}
      <section className="py-16">
        <BlogGallery
          onViewPost={handleViewPost}
          showFilters={true}
          itemsPerPage={9}
        />
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-deep-navy to-slate text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Apply These Insights?
          </h2>
          <p className="text-xl mb-8 text-foam/90">
            Turn strategy into action. Get a personalized automation assessment 
            and roadmap for your business.
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