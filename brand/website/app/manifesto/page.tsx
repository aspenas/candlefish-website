import React from 'react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Manifesto — Candlefish',
  description: 'We are an operational design atelier. Not consultants. Not developers. Craftspeople who build systems that outlive their creators.',
}

export default function Manifesto() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0D1B2A] via-[#1B263B] to-[#1C1C1C] pt-24">
      <article className="max-w-3xl mx-auto px-6 pb-32">
        {/* Opening */}
        <header className="mb-20">
          <h1 className="text-5xl md:text-6xl font-light text-[#F8F8F2] mb-8 leading-tight">
            The Candlefish Manifesto
          </h1>
          <p className="text-xl md:text-2xl text-[#415A77] font-light leading-relaxed">
            We are an operational design atelier. Not consultants. Not developers.
            Craftspeople who build systems that outlive their creators.
          </p>
        </header>

        {/* Philosophy */}
        <section className="prose prose-invert prose-lg max-w-none">
          <h2 className="text-3xl font-light text-[#F8F8F2] mb-6">
            On Operational Craft
          </h2>
          <p className="text-xl text-[#E0E1DD] leading-relaxed font-light">
            Every business runs on hidden choreography. Decades of decisions
            crystallized into process. Exceptions that became rules. Workflows
            that no one fully understands but everyone depends upon.
          </p>
          <p className="text-xl text-[#E0E1DD] leading-relaxed font-light">
            We don't arrive with best practices. We arrive with respect for what
            exists. We spend weeks understanding why things are the way they are
            before we ever suggest what they could become.
          </p>
          <p className="text-xl text-[#E0E1DD] leading-relaxed font-light">
            Our systems aren't revolutionary. They're evolutionary. Built to blend
            with existing operations like water finding its level. Designed to be
            understood by the people who use them, not just the people who build them.
          </p>

          <h2 className="text-3xl font-light text-[#F8F8F2] mb-6 mt-16">
            On Time and Attention
          </h2>
          <p className="text-xl text-[#E0E1DD] leading-relaxed font-light">
            We accept three collaborations per quarter. Not because we're precious.
            Because operational excellence requires immersion. You cannot optimize
            what you don't understand. You cannot understand what you don't observe.
          </p>
          <p className="text-xl text-[#E0E1DD] leading-relaxed font-light">
            Each system takes 12-16 weeks to craft. This isn't delay. It's diligence.
            Quick fixes create future problems. We build systems that run for decades.
          </p>

          <h2 className="text-3xl font-light text-[#F8F8F2] mb-6 mt-16">
            On Selection
          </h2>
          <p className="text-xl text-[#E0E1DD] leading-relaxed font-light">
            We choose our collaborations based on problem complexity, not budget size.
            A trophy shop's inventory puzzle interests us more than a Fortune 500's
            generic automation needs.
          </p>
          <p className="text-xl text-[#E0E1DD] leading-relaxed font-light">
            We work with businesses that have been running long enough to have real
            problems. Startups rarely need our kind of help. Established operations
            with years of accumulated complexity - that's where we excel.
          </p>

          <h2 className="text-3xl font-light text-[#F8F8F2] mb-6 mt-16">
            The Refusals
          </h2>
          <ul className="list-none space-y-4 text-[#E0E1DD] pl-0">
            <li className="flex items-start">
              <span className="text-[#3FD3C6] mr-3">—</span>
              <span className="font-light">We don't scale prematurely. Growth without foundation is collapse.</span>
            </li>
            <li className="flex items-start">
              <span className="text-[#3FD3C6] mr-3">—</span>
              <span className="font-light">We don't claim universal solutions. Every operation is unique.</span>
            </li>
            <li className="flex items-start">
              <span className="text-[#3FD3C6] mr-3">—</span>
              <span className="font-light">We don't optimize for optimization's sake. Purpose before efficiency.</span>
            </li>
            <li className="flex items-start">
              <span className="text-[#3FD3C6] mr-3">—</span>
              <span className="font-light">We don't abandon our systems. Evolution is part of the craft.</span>
            </li>
            <li className="flex items-start">
              <span className="text-[#3FD3C6] mr-3">—</span>
              <span className="font-light">We don't pretend AI solves everything. It's a tool, not salvation.</span>
            </li>
          </ul>

          <h2 className="text-3xl font-light text-[#F8F8F2] mb-6 mt-16">
            The Workshop
          </h2>
          <p className="text-xl text-[#E0E1DD] leading-relaxed font-light">
            System architects. Former operational designers for painting
            contractors, event promoters, retail operations. We believe every business
            contains hidden elegance.
          </p>
          <p className="text-xl text-[#E0E1DD] leading-relaxed font-light">
            Implementation craftsmen. We transform architectural
            vision into living systems. Making the complex feel simple.
          </p>
          <p className="text-xl text-[#E0E1DD] leading-relaxed font-light">
            We don't scale our team. We scale our impact through the systems we leave
            behind. Each one running quietly, efficiently, indefinitely.
          </p>
        </section>

        {/* Closing */}
        <footer className="mt-32 pt-16 border-t border-[#415A77]">
          <p className="text-xl text-[#3FD3C6] font-light">
            The candlefish illuminates the depths where others see only darkness.
          </p>
          <p className="text-[#415A77] mt-4 font-light">
            Established 2025. Building operational futures, one system at a time.
          </p>
        </footer>
      </article>
    </main>
  )
}
