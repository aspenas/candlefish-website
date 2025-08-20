import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { StarIcon } from '@heroicons/react/24/solid';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export interface Testimonial {
  id: string;
  name: string;
  title: string;
  company: string;
  industry: string;
  avatar?: string;
  quote: string;
  rating: number;
  results?: {
    metric: string;
    improvement: string;
  }[];
  caseStudyUrl?: string;
}

export interface TestimonialsProps {
  title?: string;
  subtitle?: string;
  testimonials?: Testimonial[];
  autoplay?: boolean;
  autoplayInterval?: number;
  showControls?: boolean;
  itemsPerPage?: number;
}

const defaultTestimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    title: 'Operations Director',
    company: 'TechFlow Solutions',
    industry: 'Technology Services',
    quote: 'Candlefish.ai transformed our customer onboarding process. What used to take 3 days now happens in 4 hours, and our team can focus on high-value client relationships instead of paperwork.',
    rating: 5,
    results: [
      { metric: 'Processing Time', improvement: '85% faster' },
      { metric: 'Error Rate', improvement: '92% reduction' },
      { metric: 'Team Efficiency', improvement: '3x improvement' }
    ],
    caseStudyUrl: '/case-studies/techflow-solutions'
  },
  {
    id: '2',
    name: 'Marcus Rodriguez',
    title: 'CEO',
    company: 'GreenLeaf Manufacturing',
    industry: 'Manufacturing',
    quote: 'The ROI was immediate and measurable. Our inventory management automation saved us $50K in the first quarter alone, and the system keeps getting smarter.',
    rating: 5,
    results: [
      { metric: 'Cost Savings', improvement: '$200K annually' },
      { metric: 'Inventory Accuracy', improvement: '99.7%' },
      { metric: 'Order Processing', improvement: '60% faster' }
    ],
    caseStudyUrl: '/case-studies/greenleaf-manufacturing'
  },
  {
    id: '3',
    name: 'Emily Thompson',
    title: 'Financial Controller',
    company: 'Precision Consulting',
    industry: 'Professional Services',
    quote: 'Implementation was seamless - 2 weeks from assessment to full deployment. Our month-end closing process went from 5 days to 8 hours. Game changer.',
    rating: 5,
    results: [
      { metric: 'Month-end Process', improvement: '84% time reduction' },
      { metric: 'Report Accuracy', improvement: '100% error-free' },
      { metric: 'Team Satisfaction', improvement: '95% positive' }
    ],
    caseStudyUrl: '/case-studies/precision-consulting'
  },
  {
    id: '4',
    name: 'David Park',
    title: 'Operations Manager',
    company: 'HealthCare Plus',
    industry: 'Healthcare',
    quote: 'Patient scheduling automation eliminated double-bookings and reduced no-shows by 40%. Our staff stress levels dropped significantly and patient satisfaction soared.',
    rating: 5,
    results: [
      { metric: 'Scheduling Conflicts', improvement: '100% elimination' },
      { metric: 'No-shows', improvement: '40% reduction' },
      { metric: 'Patient Satisfaction', improvement: '4.8/5 rating' }
    ]
  }
];

const Testimonials: React.FC<TestimonialsProps> = ({
  title = "What Our Clients Say",
  subtitle = "Real results from real businesses",
  testimonials = defaultTestimonials,
  autoplay = true,
  autoplayInterval = 5000,
  showControls = true,
  itemsPerPage = 1
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const maxIndex = Math.max(0, testimonials.length - itemsPerPage);

  // Auto-advance testimonials
  useEffect(() => {
    if (!autoplay || testimonials.length <= itemsPerPage) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, autoplayInterval);

    return () => clearInterval(interval);
  }, [autoplay, autoplayInterval, maxIndex, testimonials.length, itemsPerPage]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  const visibleTestimonials = testimonials.slice(currentIndex, currentIndex + itemsPerPage);

  return (
    <section className="py-16 bg-gradient-to-br from-foam/5 to-sea-glow/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate mb-4">{title}</h2>
          <p className="text-lg text-mist max-w-3xl mx-auto">{subtitle}</p>
        </div>

        <div className="relative">
          {/* Testimonials Grid */}
          <div className={`grid grid-cols-1 ${itemsPerPage > 1 ? `lg:grid-cols-${itemsPerPage}` : ''} gap-8`}>
            {visibleTestimonials.map((testimonial) => (
              <Card 
                key={testimonial.id} 
                variant="elevated" 
                className="h-full"
              >
                <CardContent className="h-full flex flex-col">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-sea-glow to-sea-glow/80 rounded-full flex items-center justify-center text-white font-semibold">
                        {testimonial.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate">{testimonial.name}</h4>
                        <p className="text-sm text-mist">{testimonial.title}</p>
                        <p className="text-sm text-mist font-medium">{testimonial.company}</p>
                      </div>
                    </div>
                    <Badge variant="outline" size="sm">
                      {testimonial.industry}
                    </Badge>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center mb-4">
                    {Array.from({ length: 5 }, (_, i) => (
                      <StarIcon
                        key={i}
                        className={`h-4 w-4 ${
                          i < testimonial.rating ? 'text-yellow-400' : 'text-gray-200'
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-sm text-mist">
                      {testimonial.rating}/5
                    </span>
                  </div>

                  {/* Quote */}
                  <blockquote className="text-slate italic mb-6 flex-grow">
                    "{testimonial.quote}"
                  </blockquote>

                  {/* Results */}
                  {testimonial.results && (
                    <div className="border-t border-mist/10 pt-4">
                      <h5 className="text-sm font-semibold text-slate mb-3">
                        Key Results:
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {testimonial.results.map((result, idx) => (
                          <div key={idx} className="text-center">
                            <div className="text-lg font-bold text-sea-glow">
                              {result.improvement}
                            </div>
                            <div className="text-xs text-mist">
                              {result.metric}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Case Study Link */}
                  {testimonial.caseStudyUrl && (
                    <div className="mt-4 pt-4 border-t border-mist/10">
                      <a
                        href={testimonial.caseStudyUrl}
                        className="text-sm text-sea-glow hover:text-sea-glow/80 font-medium transition-colors"
                      >
                        Read full case study →
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Navigation Controls */}
          {showControls && testimonials.length > itemsPerPage && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center text-slate hover:text-sea-glow transition-colors"
                aria-label="Previous testimonial"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              
              <button
                onClick={goToNext}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center text-slate hover:text-sea-glow transition-colors"
                aria-label="Next testimonial"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {/* Dots Indicator */}
        {testimonials.length > itemsPerPage && (
          <div className="flex justify-center mt-8 space-x-2">
            {Array.from({ length: maxIndex + 1 }, (_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-sea-glow' : 'bg-mist/30'
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export { Testimonials, type Testimonial, type TestimonialsProps };