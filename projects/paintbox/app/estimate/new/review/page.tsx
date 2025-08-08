'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Download, Send, CheckCircle } from 'lucide-react';
import { animated, useSpring } from '@react-spring/web';
import { ReviewCalculations } from '@/components/workflow/ReviewCalculations';
import { useEstimateStore } from '@/stores/useEstimateStore';
import { useState } from 'react';

export default function ReviewEstimatePage() {
  const router = useRouter();
  const { estimate, markStepCompleted } = useEstimateStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const headerSpring = useSpring({
    from: { opacity: 0, transform: 'translateY(-20px)' },
    to: { opacity: 1, transform: 'translateY(0px)' },
    config: { duration: 600 }
  });

  const successSpring = useSpring({
    opacity: showSuccess ? 1 : 0,
    transform: showSuccess ? 'scale(1)' : 'scale(0.8)',
    config: { tension: 300, friction: 20 }
  });

  const handleFinalize = async () => {
    setIsGenerating(true);

    // Simulate PDF generation
    await new Promise(resolve => setTimeout(resolve, 2000));

    markStepCompleted('review');
    setIsGenerating(false);
    setShowSuccess(true);

    // Redirect after showing success
    setTimeout(() => {
      router.push('/estimate/success');
    }, 2000);
  };

  const handleSaveDraft = () => {
    // Save draft logic
    console.log('Saving draft...');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-paintbox-primary/5 via-paintbox-background to-paintbox-accent/5">
      <animated.div style={headerSpring} className="bg-white shadow-paintbox sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/estimate/new/interior">
                <button className="p-2 hover:bg-paintbox-primary/10 rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5 text-paintbox-text" />
                </button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-paintbox-text">Review & Finalize</h1>
                <p className="text-sm text-paintbox-text-muted">Step 4 of 4</p>
              </div>
            </div>
            <FileText className="w-6 h-6 text-paintbox-primary" />
          </div>
          <div className="mt-4 flex gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className="h-1 flex-1 rounded-full bg-gradient-to-r from-paintbox-primary to-paintbox-accent transition-all duration-300"
              />
            ))}
          </div>
        </div>
      </animated.div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Client Summary */}
          <div className="paintbox-card p-6 mb-6">
            <h2 className="text-xl font-semibold text-paintbox-text mb-4">Client Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-paintbox-text-muted">Client Name</p>
                <p className="font-medium text-paintbox-text">{estimate.clientInfo?.clientName || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-paintbox-text-muted">Phone</p>
                <p className="font-medium text-paintbox-text">{estimate.clientInfo?.bestPhone || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-paintbox-text-muted">Email</p>
                <p className="font-medium text-paintbox-text">{estimate.clientInfo?.bestEmail || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-paintbox-text-muted">Address</p>
                <p className="font-medium text-paintbox-text">
                  {estimate.clientInfo?.address ?
                    `${estimate.clientInfo.address}, ${estimate.clientInfo.city}, ${estimate.clientInfo.state} ${estimate.clientInfo.zipCode}`
                    : 'Not provided'}
                </p>
              </div>
            </div>
          </div>

          {/* Review Calculations Component */}
          <ReviewCalculations />

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between mt-8">
            <div className="flex gap-4">
              <button
                onClick={handleSaveDraft}
                className="paintbox-btn paintbox-btn-secondary"
              >
                Save Draft
              </button>
              <Link href="/estimate/new/interior">
                <button className="paintbox-btn paintbox-btn-secondary">
                  Back to Edit
                </button>
              </Link>
            </div>

            <div className="flex gap-4">
              <button className="paintbox-btn paintbox-btn-secondary">
                <Download className="w-4 h-4" />
                Download PDF
              </button>
              <button
                onClick={handleFinalize}
                disabled={isGenerating}
                className={`paintbox-btn paintbox-btn-primary ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Finalize Estimate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <animated.div
            style={successSpring}
            className="bg-white rounded-2xl p-8 text-center max-w-md mx-4"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-paintbox-success to-paintbox-accent rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-paintbox-text mb-2">Estimate Created!</h3>
            <p className="text-paintbox-text-muted">
              Your estimate has been generated successfully. Redirecting...
            </p>
          </animated.div>
        </div>
      )}
    </div>
  );
}
