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
    <div className="min-h-screen bg-gradient-to-br from-paintbox-primary/5 via-paintbox-background to-paintbox-accent/5">
      <animated.div style={headerSpring} className="bg-white shadow-paintbox sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/estimate/new">
              <button className="p-2 hover:bg-paintbox-primary/10 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-paintbox-text" />
              </button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-paintbox-text">Client Information</h1>
              <p className="text-sm text-paintbox-text-muted">Step 1 of 4</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  step === 1
                    ? 'bg-gradient-to-r from-paintbox-primary to-paintbox-accent'
                    : 'bg-paintbox-border'
                }`}
              />
            ))}
          </div>
        </div>
      </animated.div>

      <animated.div style={contentSpring} className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <ClientInfoFormEnhanced onNext={handleNext} />
        </div>
      </animated.div>
    </div>
  );
}
