'use client';

import Link from 'next/link';
import { ArrowRight, Building2, Home, Palette, FileText } from 'lucide-react';
import { animated, useSpring } from '@react-spring/web';
import { useState } from 'react';

const StepCard = ({ number, title, description, icon: Icon, href, delay }: any) => {
  const [hovered, setHovered] = useState(false);

  const spring = useSpring({
    transform: hovered ? 'translateX(10px)' : 'translateX(0px)',
    config: { tension: 300, friction: 20 }
  });

  return (
    <Link href={href}>
      <animated.div
        className="paintbox-card p-6 flex items-center gap-4 cursor-pointer hover:shadow-xl transition-all duration-300"
        style={{ animationDelay: `${delay}ms`, ...spring }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-gradient-to-br from-paintbox-primary to-paintbox-accent rounded-full flex items-center justify-center text-white font-bold text-lg">
            {number}
          </div>
        </div>
        <div className="flex-grow">
          <h3 className="text-lg font-semibold text-paintbox-text mb-1 flex items-center gap-2">
            <Icon className="w-5 h-5 text-paintbox-primary" />
            {title}
          </h3>
          <p className="text-paintbox-text-muted text-sm">{description}</p>
        </div>
        <ArrowRight className="w-5 h-5 text-paintbox-primary flex-shrink-0" />
      </animated.div>
    </Link>
  );
};

export default function NewEstimate() {
  const heroSpring = useSpring({
    from: { opacity: 0, transform: 'translateY(20px)' },
    to: { opacity: 1, transform: 'translateY(0px)' },
    config: { duration: 800 }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-paintbox-primary/5 via-paintbox-background to-paintbox-accent/5">
      <div className="container mx-auto px-4 py-16">
        <animated.div style={heroSpring} className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-paintbox-primary to-paintbox-accent rounded-2xl flex items-center justify-center shadow-xl">
                <FileText className="w-8 h-8 text-white" />
              </div>
            </div>

            <h1 className="text-4xl font-bold text-paintbox-text mb-4">
              Create New Estimate
            </h1>
            <p className="text-lg text-paintbox-text-muted">
              Follow these steps to create a professional painting estimate
            </p>
          </div>

          <div className="space-y-4">
            <StepCard
              number="1"
              title="Client Information"
              description="Enter client details and project location"
              icon={Building2}
              href="/estimate/new/details"
              delay={0}
            />

            <StepCard
              number="2"
              title="Exterior Measurements"
              description="Measure and document exterior surfaces"
              icon={Home}
              href="/estimate/new/exterior"
              delay={100}
            />

            <StepCard
              number="3"
              title="Interior Measurements"
              description="Measure and document interior rooms"
              icon={Palette}
              href="/estimate/new/interior"
              delay={200}
            />

            <StepCard
              number="4"
              title="Review & Finalize"
              description="Review calculations and generate estimate"
              icon={FileText}
              href="/estimate/new/review"
              delay={300}
            />
          </div>

          <div className="mt-12 text-center">
            <Link href="/">
              <button className="paintbox-btn paintbox-btn-secondary">
                Back to Home
              </button>
            </Link>
          </div>
        </animated.div>
      </div>
    </div>
  );
}
