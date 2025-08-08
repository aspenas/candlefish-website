'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle, Download, Send, Home, FileText } from 'lucide-react';
import { animated, useSpring, useTrail } from '@react-spring/web';

export default function EstimateSuccessPage() {
  const heroSpring = useSpring({
    from: { opacity: 0, scale: 0.8 },
    to: { opacity: 1, scale: 1 },
    config: { tension: 200, friction: 20 }
  });

  const contentSpring = useSpring({
    from: { opacity: 0, transform: 'translateY(20px)' },
    to: { opacity: 1, transform: 'translateY(0px)' },
    delay: 300,
    config: { duration: 600 }
  });

  const actions = [
    { icon: Download, label: 'Download PDF', color: 'from-paintbox-primary to-paintbox-accent' },
    { icon: Send, label: 'Email to Client', color: 'from-paintbox-success to-paintbox-accent' },
    { icon: FileText, label: 'View Estimate', color: 'from-paintbox-warning to-paintbox-accent' },
  ];

  const trail = useTrail(actions.length, {
    from: { opacity: 0, transform: 'translateY(20px)' },
    to: { opacity: 1, transform: 'translateY(0px)' },
    delay: 500,
    config: { tension: 200, friction: 20 }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-paintbox-primary/5 via-paintbox-background to-paintbox-accent/5 flex items-center justify-center">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <animated.div style={heroSpring} className="mb-8">
            <div className="w-32 h-32 bg-gradient-to-br from-paintbox-success to-paintbox-accent rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <CheckCircle className="w-16 h-16 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-paintbox-text mb-4">
              Estimate Created Successfully!
            </h1>
            <p className="text-xl text-paintbox-text-muted">
              Your professional painting estimate is ready
            </p>
          </animated.div>

          <animated.div style={contentSpring} className="paintbox-card p-8 mb-8">
            <div className="grid grid-cols-2 gap-4 text-left">
              <div>
                <p className="text-sm text-paintbox-text-muted">Estimate Number</p>
                <p className="font-semibold text-paintbox-text">#EST-2025-001</p>
              </div>
              <div>
                <p className="text-sm text-paintbox-text-muted">Date Created</p>
                <p className="font-semibold text-paintbox-text">{new Date().toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-paintbox-text-muted">Total Amount</p>
                <p className="font-semibold text-xl paintbox-gradient-text">$4,850.00</p>
              </div>
              <div>
                <p className="text-sm text-paintbox-text-muted">Status</p>
                <p className="font-semibold text-paintbox-success">Ready to Send</p>
              </div>
            </div>
          </animated.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {trail.map((style, index) => (
              <animated.button
                key={index}
                style={style}
                className="paintbox-card p-6 hover:shadow-xl transition-all duration-300 group"
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${actions[index].color} rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                  {React.createElement(actions[index].icon, { className: "w-6 h-6 text-white" })}
                </div>
                <p className="font-medium text-paintbox-text">{actions[index].label}</p>
              </animated.button>
            ))}
          </div>

          <div className="flex gap-4 justify-center">
            <Link href="/estimate/new">
              <button className="paintbox-btn paintbox-btn-secondary">
                Create Another
              </button>
            </Link>
            <Link href="/">
              <button className="paintbox-btn paintbox-btn-primary">
                <Home className="w-4 h-4" />
                Back to Home
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
