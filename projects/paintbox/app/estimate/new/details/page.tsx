'use client';

import { useRouter } from 'next/navigation';
import { ClientInfoFormEnhanced } from '@/components/workflow/ClientInfoFormEnhanced';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { animated, useSpring } from '@react-spring/web';

export default function ClientDetailsPage() {
  const router = useRouter();

  const headerSpring = useSpring({
    from: { opacity: 0, transform: 'translateY(-20px)' },
    to: { opacity: 1, transform: 'translateY(0px)' },
    config: { duration: 600 }
  });

  const contentSpring = useSpring({
    from: { opacity: 0, transform: 'translateY(20px)' },
    to: { opacity: 1, transform: 'translateY(0px)' },
    delay: 200,
    config: { duration: 600 }
  });

  const handleNext = () => {
    router.push('/estimate/new/exterior');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-eggshell-brand/5 via-eggshell-background to-eggshell-accent/5">
      <animated.div style={headerSpring} className="bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-lg sticky top-0 z-50 border-b border-eggshell-border">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button
                className="p-2 hover:bg-eggshell-brand/10 rounded-lg transition-colors tap-highlight-none touch-pan"
                aria-label="Go back to home"
              >
                <ArrowLeft className="w-5 h-5 text-eggshell-text" />
              </button>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-eggshell-text">Client Information</h1>
              <p className="text-sm text-eggshell-text-muted">Step 1 of 4 - Let's start with the basics</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-eggshell-text-muted bg-eggshell-background px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span>Draft</span>
            </div>
          </div>

          {/* Enhanced Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-eggshell-text">Progress</span>
              <span className="text-xs text-eggshell-text-muted">25%</span>
            </div>
            <div className="flex gap-1">
              {[
                { step: 1, label: 'Client', active: true },
                { step: 2, label: 'Exterior', active: false },
                { step: 3, label: 'Interior', active: false },
                { step: 4, label: 'Review', active: false }
              ].map(({ step, label, active }) => (
                <div key={step} className="flex-1 group">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      active
                        ? 'bg-gradient-to-r from-eggshell-brand to-eggshell-accent shadow-sm'
                        : 'bg-eggshell-border group-hover:bg-eggshell-border/70'
                    }`}
                  />
                  <div className="text-xs text-center mt-1 text-eggshell-text-muted font-medium">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </animated.div>

      <animated.div style={contentSpring} className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 safe-area-inset">
        <div className="max-w-4xl mx-auto">
          <ClientInfoFormEnhanced onNext={handleNext} />
        </div>
      </animated.div>
    </div>
  );
}
