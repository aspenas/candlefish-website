import React from 'react'
import Link from 'next/link'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0D1B2A] text-[#E0E1DD]">
      <div className="max-w-4xl mx-auto px-6 py-20">
        <Link href="/" className="text-sm text-[#415A77] hover:text-[#3FD3C6] transition-colors">
          ← Back to Home
        </Link>

        <h1 className="text-4xl font-light text-[#F8F8F2] mt-8 mb-12">Terms of Service</h1>

        <div className="prose prose-lg max-w-none space-y-8 text-[#E0E1DD]">
          <section>
            <h2 className="text-2xl font-light text-[#F8F8F2] mb-4">Acceptance</h2>
            <p className="text-lg font-light leading-relaxed">
              By accessing Candlefish.ai or using our operational assessment tools, you agree to these terms.
              If you disagree with any part, please discontinue use immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-light text-[#F8F8F2] mb-4">Service Description</h2>
            <p className="text-lg font-light leading-relaxed">
              Candlefish provides operational system design services, assessment tools, and consultation.
              Our instruments analyze organizational metrics to identify improvement opportunities. Services
              are provided as-is, with continuous refinement based on real operational data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-light text-[#F8F8F2] mb-4">Intellectual Property</h2>
            <p className="text-lg font-light leading-relaxed">
              Assessment methodologies, operational instruments, and system designs remain property of Candlefish.
              Client data and specific implementations belong to respective organizations. Open-source components
              are licensed under their respective terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-light text-[#F8F8F2] mb-4">Use Restrictions</h2>
            <p className="text-lg font-light leading-relaxed">
              You may not reverse-engineer our assessment algorithms, automate interactions without permission,
              or misrepresent assessment results. Tools are for legitimate business evaluation only.
              Commercial use requires explicit agreement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-light text-[#F8F8F2] mb-4">Engagement Terms</h2>
            <p className="text-lg font-light leading-relaxed">
              Full engagements are governed by separate agreements. Assessment tools provide preliminary analysis
              only. Queue placement does not guarantee engagement. Selection is based on mutual fit and
              operational readiness.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-light text-[#F8F8F2] mb-4">Limitation of Liability</h2>
            <p className="text-lg font-light leading-relaxed">
              Candlefish provides tools and services without warranty. We are not liable for business decisions
              based on assessment results. Total liability is limited to fees paid for services. Operational
              improvements depend on implementation quality.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-light text-[#F8F8F2] mb-4">Confidentiality</h2>
            <p className="text-lg font-light leading-relaxed">
              We maintain strict confidentiality of all client information. Public case studies use anonymized
              data with permission. Operational metrics shown on our site are either simulated or approved
              for display.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-light text-[#F8F8F2] mb-4">Termination</h2>
            <p className="text-lg font-light leading-relaxed">
              We reserve the right to terminate access for violations of these terms. You may discontinue
              use at any time. Data deletion requests will be honored within 48 hours.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-light text-[#F8F8F2] mb-4">Governing Law</h2>
            <p className="text-lg font-light leading-relaxed">
              These terms are governed by the laws of the United States. Disputes will be resolved through
              binding arbitration. These terms constitute the entire agreement for website use.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-light text-[#F8F8F2] mb-4">Contact</h2>
            <p className="text-lg font-light leading-relaxed">
              For questions about these terms, contact legal@candlefish.ai. For operational inquiries,
              use our consideration form. Response time: 48 hours.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-[#415A77]/30">
          <p className="text-sm text-[#415A77]">
            Last updated: August 2025 · Contact: legal@candlefish.ai
          </p>
        </div>
      </div>
    </main>
  )
}
