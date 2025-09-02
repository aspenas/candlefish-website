'use client';

import React from 'react';

export default function EnhancementParadoxWorkshop() {
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <header className="border-b border-gray-800 pb-8">
          <h1 className="text-5xl font-bold mb-4">The Paradox of Enhancement</h1>
          <p className="text-xl text-gray-400">Workshop Note - September 1, 2025</p>
        </header>

        {/* Main Quote */}
        <section className="bg-gray-900 p-8 rounded-lg border border-gray-800">
          <blockquote className="text-2xl italic text-cyan-400">
            "The best enhancement is often knowing when not to enhance."
          </blockquote>
          <p className="mt-4 text-gray-400">
            Today's revelation arrived through rejection. While evaluating an "enhanced" prompt framework 
            for Claude's 1M context window, I discovered something profound about improvement itself.
          </p>
        </section>

        {/* Framework Comparison */}
        <section className="grid grid-cols-2 gap-8">
          <div className="bg-gray-900 p-6 rounded-lg border border-cyan-500">
            <h3 className="text-xl font-bold mb-4 text-cyan-400">Original Framework</h3>
            <div className="text-4xl font-mono mb-4">45/50</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Clarity</span>
                <span className="text-cyan-400">9/10</span>
              </div>
              <div className="flex justify-between">
                <span>Cognitive Load</span>
                <span className="text-cyan-400">9/10</span>
              </div>
              <div className="flex justify-between">
                <span>Outcomes</span>
                <span className="text-cyan-400">10/10</span>
              </div>
              <div className="flex justify-between">
                <span>Adoption</span>
                <span className="text-cyan-400">9/10</span>
              </div>
              <div className="flex justify-between">
                <span>Complexity</span>
                <span className="text-cyan-400">8/10</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 p-6 rounded-lg border border-orange-500">
            <h3 className="text-xl font-bold mb-4 text-orange-400">Enhanced Framework</h3>
            <div className="text-4xl font-mono mb-4 text-orange-400">17/50</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Clarity</span>
                <span className="text-orange-400">3/10</span>
              </div>
              <div className="flex justify-between">
                <span>Cognitive Load</span>
                <span className="text-orange-400">2/10</span>
              </div>
              <div className="flex justify-between">
                <span>Outcomes</span>
                <span className="text-orange-400">4/10</span>
              </div>
              <div className="flex justify-between">
                <span>Adoption</span>
                <span className="text-orange-400">3/10</span>
              </div>
              <div className="flex justify-between">
                <span>Complexity</span>
                <span className="text-orange-400">5/10</span>
              </div>
            </div>
          </div>
        </section>

        {/* The Architecture of Enough */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold">The Architecture of Enough</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { principle: 'Specific enough', description: 'to be actionable' },
              { principle: 'Simple enough', description: 'to be memorable' },
              { principle: 'Complete enough', description: 'to handle edge cases' },
              { principle: 'Flexible enough', description: 'to adapt to contexts' }
            ].map((item, i) => (
              <div key={i} className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h4 className="text-cyan-400 font-bold">{item.principle}</h4>
                <p className="text-gray-400">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Meta-Framework Pattern */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold">The Meta-Framework Pattern</h2>
          <pre className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-cyan-400 overflow-x-auto">
{`Act as an expert [ROLE] working inside this repo to [CLEAR_OBJECTIVE].
Work step-by-step, explain briefly as you go, then apply changes.

GOALS (4 max, specific, measurable)
CONTEXT & CONSTRAINTS (what matters, what can't break)
TASKS (A-F structure, each producing deliverables)
ACCEPTANCE CRITERIA (concrete, verifiable)`}
          </pre>
        </section>

        {/* Implementation Reality */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold">Implementation Reality</h2>
          <ol className="space-y-4">
            {[
              'Use the simplified framework proven in practice',
              'Measure actual outcomes (code quality, delivery speed, developer satisfaction)',
              'Evolve based on evidence, not aesthetic preferences',
              'Resist complexity until it proves itself indispensable'
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-4">
                <span className="text-2xl font-mono text-cyan-400">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-lg">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* The Enhancement Test */}
        <section className="bg-orange-900/20 p-8 rounded-lg border border-orange-500">
          <h2 className="text-2xl font-bold text-orange-400 mb-4">The Enhancement Test</h2>
          <blockquote className="text-xl italic">
            "Am I solving a problem that exists, or am I solving a problem I wish existed?"
          </blockquote>
          <p className="mt-4 text-gray-400">
            Most enhancement efforts fail this test. The exceptional ones pass it clearly.
          </p>
        </section>

        {/* Footer Insight */}
        <footer className="text-center py-12 border-t border-gray-800">
          <p className="text-xl italic text-gray-400">
            The highest form of intelligence is knowing when intelligence has reached its optimal expression.
          </p>
          <p className="mt-4 text-cyan-400">
            Enhancement becomes harm when we mistake elaboration for improvement.
          </p>
        </footer>
      </div>
    </div>
  );
}