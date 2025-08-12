import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Quote, Star, Building2 } from 'lucide-react'

interface Testimonial {
  id: string
  quote: string
  author: string
  role: string
  company: string
  image: string
  rating: number
  companyLogo?: string
  metrics?: {
    label: string
    value: string
  }[]
}

interface TestimonialsSectionProps {
  className?: string
}

const TestimonialCard: React.FC<{ testimonial: Testimonial; isActive: boolean }> = ({ 
  testimonial, 
  isActive 
}) => {
  return (
    <div className={`transition-all duration-500 ${
      isActive ? 'opacity-100 transform translate-x-0' : 'opacity-0 transform translate-x-8'
    }`}>
      <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 max-w-4xl mx-auto">
        {/* Quote Icon */}
        <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center mb-6">
          <Quote className="w-6 h-6 text-white" />
        </div>

        {/* Quote */}
        <blockquote className="text-xl md:text-2xl text-gray-900 font-medium leading-relaxed mb-8">
          "{testimonial.quote}"
        </blockquote>

        {/* Metrics (if available) */}
        {testimonial.metrics && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8 p-6 bg-gray-50 rounded-xl">
            {testimonial.metrics.map((metric, index) => (
              <div key={index} className="text-center">
                <div className="text-2xl font-bold text-primary-600 mb-1">{metric.value}</div>
                <div className="text-sm text-gray-600">{metric.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Author Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center">
              <Building2 className="w-8 h-8 text-gray-600" />
            </div>
            <div>
              <div className="font-bold text-gray-900 text-lg">{testimonial.author}</div>
              <div className="text-gray-600">{testimonial.role}</div>
              <div className="text-primary-600 font-medium">{testimonial.company}</div>
            </div>
          </div>

          {/* Rating */}
          <div className="flex flex-col items-end">
            <div className="flex gap-1 mb-1">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={`w-4 h-4 ${
                    i < testimonial.rating 
                      ? 'text-yellow-400 fill-current' 
                      : 'text-gray-300'
                  }`} 
                />
              ))}
            </div>
            <div className="text-sm text-gray-500">{testimonial.rating}/5 stars</div>
          </div>
        </div>
      </div>
    </div>
  )
}

const TestimonialsSection: React.FC<TestimonialsSectionProps> = ({ className = '' }) => {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  const testimonials: Testimonial[] = [
    {
      id: '1',
      quote: 'Candlefish AI transformed our entire operation. What used to take weeks now happens in hours. Their team understood our complex requirements and delivered a solution that exceeded our expectations.',
      author: 'Sarah Chen',
      role: 'Chief Technology Officer',
      company: 'GlobalTech Manufacturing',
      image: '/testimonials/sarah-chen.jpg',
      rating: 5,
      metrics: [
        { label: 'Efficiency Increase', value: '300%' },
        { label: 'Cost Reduction', value: '45%' },
        { label: 'Implementation Time', value: '3 weeks' }
      ]
    },
    {
      id: '2',
      quote: 'The ROI has been incredible. Within 6 months, we recovered our investment and are now seeing substantial ongoing savings. The AI models continue to improve and adapt to our business needs.',
      author: 'Michael Rodriguez',
      role: 'VP of Operations',
      company: 'AeroLogistics International',
      image: '/testimonials/michael-rodriguez.jpg',
      rating: 5,
      metrics: [
        { label: 'ROI', value: '400%' },
        { label: 'Annual Savings', value: '$2.1M' },
        { label: 'Payback Period', value: '6 months' }
      ]
    },
    {
      id: '3',
      quote: 'Working with Candlefish AI has been a game-changer for our customer experience. Our personalization engine now drives 40% of our revenue, and customer satisfaction has never been higher.',
      author: 'Emily Watson',
      role: 'Head of Digital Innovation',
      company: 'MegaRetail Corporation',
      image: '/testimonials/emily-watson.jpg',
      rating: 5,
      metrics: [
        { label: 'Revenue from AI', value: '40%' },
        { label: 'Customer Satisfaction', value: '96%' },
        { label: 'Conversion Rate', value: '+180%' }
      ]
    },
    {
      id: '4',
      quote: 'The level of support and expertise from the Candlefish team is unmatched. They are not just a vendor, they are a true partner in our digital transformation journey.',
      author: 'Dr. James Park',
      role: 'Director of Technology',
      company: 'MedTech Solutions',
      image: '/testimonials/james-park.jpg',
      rating: 5,
      metrics: [
        { label: 'Diagnostic Accuracy', value: '98.7%' },
        { label: 'Time Savings', value: '65%' },
        { label: 'Patient Satisfaction', value: '94%' }
      ]
    }
  ]

  // Auto-rotate testimonials
  useEffect(() => {
    if (!isAutoPlaying) return

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length)
    }, 6000)

    return () => clearInterval(interval)
  }, [testimonials.length, isAutoPlaying])

  const goToSlide = (index: number) => {
    setActiveIndex(index)
    setIsAutoPlaying(false)
    // Resume auto-play after 10 seconds
    setTimeout(() => setIsAutoPlaying(true), 10000)
  }

  const goToPrevious = () => {
    const newIndex = activeIndex === 0 ? testimonials.length - 1 : activeIndex - 1
    goToSlide(newIndex)
  }

  const goToNext = () => {
    const newIndex = (activeIndex + 1) % testimonials.length
    goToSlide(newIndex)
  }

  return (
    <section className={`py-20 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden ${className}`}>
      {/* Background Elements */}
      <div className="absolute top-0 right-1/4 w-72 h-72 bg-gradient-to-bl from-primary-100/30 to-accent-100/30 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-gradient-to-tr from-accent-100/30 to-primary-100/30 rounded-full blur-3xl" />
      
      <div className="relative z-10 container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-accent-100/50 text-accent-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Quote className="w-4 h-4" />
            Client Testimonials
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Trusted by{' '}
            <span className="bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">
              Industry Leaders
            </span>
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Don't just take our word for it. Hear from the executives and teams 
            who are driving transformation with our AI solutions.
          </p>
        </div>

        {/* Testimonial Carousel */}
        <div className="relative">
          {/* Navigation Arrows */}
          <button 
            onClick={goToPrevious}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-12 h-12 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          
          <button 
            onClick={goToNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-12 h-12 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label="Next testimonial"
          >
            <ChevronRight className="w-6 h-6 text-gray-600" />
          </button>

          {/* Testimonial Content */}
          <div className="overflow-hidden">
            {testimonials.map((testimonial, index) => (
              <div
                key={testimonial.id}
                className={`${index === activeIndex ? 'block' : 'hidden'}`}
              >
                <TestimonialCard 
                  testimonial={testimonial} 
                  isActive={index === activeIndex}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Dots Indicator */}
        <div className="flex justify-center gap-3 mt-8">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === activeIndex 
                  ? 'bg-primary-500 w-8' 
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to testimonial ${index + 1}`}
            />
          ))}
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 text-center">
          <div className="text-sm text-gray-500 mb-6">Trusted by 500+ companies worldwide</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center opacity-60">
            {[
              'GlobalTech Manufacturing',
              'AeroLogistics International', 
              'MegaRetail Corporation',
              'MedTech Solutions'
            ].map((company, index) => (
              <div key={index} className="flex items-center justify-center">
                <div className="w-8 h-8 bg-gray-400 rounded mr-3" />
                <span className="text-gray-600 font-medium text-sm">{company}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default TestimonialsSection