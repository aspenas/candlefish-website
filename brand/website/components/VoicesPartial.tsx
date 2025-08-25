'use client'

import React from 'react'

interface Testimonial {
  quote: string
  attribution: string
  role: string
  metric?: string
}

const testimonial: Testimonial = {
  quote: "In 20 years running this business, I&apos;ve never seen operational efficiency improve this dramatically. What took our team 45 minutes now takes seconds.",
  attribution: "Regional Trophy Operator",
  role: "Owner",
  metric: "97% time reduction on engraving orders"
}

export const VoicesPartial: React.FC = () => {
  return (
    <section className="py-20 bg-[#1B263B]/30">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-sm text-[#3FD3C6] uppercase tracking-wider mb-8">Client Voice</h2>

        <blockquote className="relative">
          <div className="absolute -left-4 -top-2 text-6xl text-[#3FD3C6]/20 font-serif">"</div>

          <p className="text-2xl text-[#F8F8F2] font-light leading-relaxed mb-6 pl-8">
            {testimonial.quote}
          </p>

          <footer className="pl-8">
            <cite className="not-italic">
              <p className="text-sm text-[#E0E1DD]">
                — {testimonial.attribution}, {testimonial.role}
              </p>
              {testimonial.metric && (
                <p className="text-xs text-[#415A77] mt-1">
                  {testimonial.metric}
                </p>
              )}
            </cite>
          </footer>
        </blockquote>
      </div>
    </section>
  )
}
