'use client';

import { AssessmentForm } from '../../components/forms/AssessmentForm';

export default function AssessmentPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0D1B2A] via-[#1B263B] to-[#1C1C1C] pt-20">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-light text-[#F8F8F2] mb-4">
            Automation Maturity Assessment
          </h1>
          <p className="text-[#E0E1DD] text-lg font-light">
            Discover your automation readiness and get a custom roadmap for implementation.
          </p>
        </div>
        <AssessmentForm />
      </div>
    </div>
  );
}
