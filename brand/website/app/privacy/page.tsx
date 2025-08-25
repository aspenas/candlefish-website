import React from 'react'
import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0D1B2A] text-[#E0E1DD]">
      <div className="max-w-4xl mx-auto px-6 py-20">
        <Link href="/" className="text-sm text-[#415A77] hover:text-[#3FD3C6] transition-colors">
          ← Back to Home
        </Link>

        <h1 className="text-4xl font-light text-[#F8F8F2] mt-8 mb-12">Privacy Policy</h1>

        <div className="prose prose-lg max-w-none space-y-8 text-[#E0E1DD]">
          <section>
            <h2 className="text-2xl font-light text-[#F8F8F2] mb-4">Data Collection</h2>
            <p className="text-lg font-light leading-relaxed">
              We collect minimal data necessary for operational assessments and system design. This includes:
              organizational metrics submitted through our assessment forms, email addresses for communication,
              and basic analytics to improve our instruments.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-light text-[#F8F8F2] mb-4">Data Storage</h2>
            <p className="text-lg font-light leading-relaxed">
              Assessment responses are encrypted at rest using AES-256 encryption. Data is stored in secure
              cloud infrastructure with regular security audits. Client-side data may be stored in your browser's
              local storage for convenience and is never transmitted without explicit action.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-light text-[#F8F8F2] mb-4">Data Sharing</h2>
            <p className="text-lg font-light leading-relaxed">
              We never sell, rent, or share your data with third parties. Assessment results and organizational
              information remain strictly confidential. Anonymized, aggregated metrics may be used to improve
              our operational instruments, but individual responses are never disclosed.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-light text-[#F8F8F2] mb-4">Data Retention</h2>
            <p className="text-lg font-light leading-relaxed">
              Assessment data is retained for 90 days after submission to allow for follow-up and consultation.
              After this period, data is automatically purged from our systems. You may request immediate deletion
              at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-light text-[#F8F8F2] mb-4">Your Rights</h2>
            <p className="text-lg font-light leading-relaxed">
              You have the right to access, correct, or delete your data at any time. To exercise these rights
              or for any privacy-related inquiries, contact us at privacy@candlefish.ai. We respond to all
              requests within 48 hours.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-light text-[#F8F8F2] mb-4">Security Measures</h2>
            <p className="text-lg font-light leading-relaxed">
              We implement industry-standard security measures including HTTPS encryption for all data transmission,
              regular security audits, access controls, and monitoring. Our infrastructure is designed with
              privacy and security as foundational principles.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-light text-[#F8F8F2] mb-4">Updates</h2>
            <p className="text-lg font-light leading-relaxed">
              This privacy policy may be updated to reflect changes in our practices. Significant changes will
              be communicated via email to affected users. Last updated: August 2025.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-[#415A77]/30">
          <p className="text-sm text-[#415A77]">
            Questions? Contact privacy@candlefish.ai
          </p>
        </div>
      </div>
    </main>
  )
}
