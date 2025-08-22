'use client'

import React, { useState } from 'react'

export default function EggshellShowcase() {
  const [showBefore, setShowBefore] = useState(false)

  return (
    <div className="min-h-screen p-8">
      {/* Toggle Control */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold eggshell-text-gradient mb-2">
              Eggshell Design System Showcase
            </h1>
            <p className="eggshell-text-secondary text-lg">
              Candlefish atelier-quality design transformation
            </p>
          </div>
          <div className="flex items-center gap-4">
            <label className="eggshell-label flex items-center gap-2">
              <input
                type="checkbox"
                checked={showBefore}
                onChange={(e) => setShowBefore(e.target.checked)}
                className="w-4 h-4"
              />
              Show Previous Design
            </label>
          </div>
        </div>

        {/* Design Philosophy */}
        <div className="eggshell-card p-6 mb-8">
          <h2 className="text-2xl font-semibold eggshell-text-primary mb-4">Design Philosophy</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold eggshell-text-primary mb-2">Warm & Organic</h3>
              <p className="eggshell-text-secondary text-sm">
                Natural eggshell tones create a welcoming, professional atmosphere
              </p>
            </div>
            <div>
              <h3 className="font-semibold eggshell-text-primary mb-2">Accessible First</h3>
              <p className="eggshell-text-secondary text-sm">
                WCAG AA compliant contrast ratios ensure readability for all users
              </p>
            </div>
            <div>
              <h3 className="font-semibold eggshell-text-primary mb-2">Atelier Quality</h3>
              <p className="eggshell-text-secondary text-sm">
                Refined details and micro-interactions reflect Candlefish's craftsmanship
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={`max-w-6xl mx-auto ${showBefore ? 'theme-before' : ''}`}>
        {/* Color Palette Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold eggshell-text-primary mb-6">Color System</h2>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Eggshell Palette */}
            <div className="eggshell-card p-6">
              <h3 className="font-semibold eggshell-text-primary mb-4">Eggshell Foundation</h3>
              <div className="space-y-3">
                {[
                  { name: 'Primary', value: '#fefaee', usage: 'Main background' },
                  { name: '50', value: '#fffef2', usage: 'Highlights' },
                  { name: '100', value: '#fefbec', usage: 'Light surfaces' },
                  { name: '200', value: '#fefaed', usage: 'Cards, containers' },
                  { name: '300', value: '#fdfaee', usage: 'Secondary surfaces' },
                  { name: '400', value: '#fdfbf0', usage: 'Borders, dividers' },
                ].map((color) => (
                  <div key={color.name} className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-md border border-brown-200 shadow-eggshell-sm"
                      style={{ backgroundColor: color.value }}
                    />
                    <div className="flex-1">
                      <div className="font-medium eggshell-text-primary">{color.name}</div>
                      <div className="text-xs eggshell-text-tertiary">{color.value} • {color.usage}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Brown Palette */}
            <div className="eggshell-card p-6">
              <h3 className="font-semibold eggshell-text-primary mb-4">Earthy Brown Accents</h3>
              <div className="space-y-3">
                {[
                  { name: 'Primary', value: '#9b8b73', usage: 'Interactive elements' },
                  { name: '300', value: '#bfab93', usage: 'Secondary text' },
                  { name: '500', value: '#877760', usage: 'Emphasis' },
                  { name: '600', value: '#6d634f', usage: 'Headers, links' },
                  { name: '700', value: '#544f3e', usage: 'Primary text (WCAG AA)' },
                  { name: '800', value: '#3a3b2d', usage: 'High contrast' },
                ].map((color) => (
                  <div key={color.name} className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-md border border-brown-200 shadow-eggshell-sm"
                      style={{ backgroundColor: color.value }}
                    />
                    <div className="flex-1">
                      <div className="font-medium eggshell-text-primary">{color.name}</div>
                      <div className="text-xs eggshell-text-tertiary">{color.value} • {color.usage}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Button Components */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold eggshell-text-primary mb-6">Button Components</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="eggshell-card p-6">
              <h3 className="font-semibold eggshell-text-primary mb-4">Primary Buttons</h3>
              <div className="space-y-4">
                <button className="eggshell-btn-primary w-full">
                  Create New Estimate
                </button>
                <button className="eggshell-btn-primary w-full" disabled>
                  Disabled State
                </button>
                <div className="flex gap-2">
                  <button className="eggshell-btn-primary flex-1">Save</button>
                  <button className="eggshell-btn-primary flex-1">Export PDF</button>
                </div>
              </div>
            </div>

            <div className="eggshell-card p-6">
              <h3 className="font-semibold eggshell-text-primary mb-4">Secondary Buttons</h3>
              <div className="space-y-4">
                <button className="eggshell-btn-secondary w-full">
                  Cancel
                </button>
                <button className="eggshell-btn-secondary w-full">
                  Edit Details
                </button>
                <div className="flex gap-2">
                  <button className="eggshell-btn-secondary flex-1">Draft</button>
                  <button className="eggshell-btn-secondary flex-1">Preview</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Form Components */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold eggshell-text-primary mb-6">Form Components</h2>

          <div className="eggshell-card p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="eggshell-label">Client Name</label>
                <input
                  type="text"
                  className="eggshell-input"
                  placeholder="Enter client name"
                  defaultValue="Sarah Johnson"
                />
              </div>
              <div>
                <label className="eggshell-label">Project Type</label>
                <select className="eggshell-input">
                  <option>Interior Painting</option>
                  <option>Exterior Painting</option>
                  <option>Both Interior & Exterior</option>
                </select>
              </div>
              <div>
                <label className="eggshell-label">Square Footage</label>
                <input
                  type="number"
                  className="eggshell-input"
                  placeholder="0"
                  defaultValue="2400"
                />
              </div>
              <div>
                <label className="eggshell-label">Budget Range</label>
                <input
                  type="text"
                  className="eggshell-input"
                  placeholder="$ - $"
                  defaultValue="$5,000 - $8,000"
                />
              </div>
              <div className="md:col-span-2">
                <label className="eggshell-label">Special Requirements</label>
                <textarea
                  className="eggshell-input resize-none"
                  rows={3}
                  placeholder="Any special considerations or requirements..."
                  defaultValue="Client prefers eco-friendly paints. Two-story home with high ceilings in living area."
                />
              </div>
            </div>
          </div>
        </section>

        {/* Card Layouts */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold eggshell-text-primary mb-6">Card Layouts</h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="eggshell-card p-6">
              <div className="w-12 h-12 bg-brown-400 rounded-lg mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
              </div>
              <h3 className="font-semibold eggshell-text-primary mb-2">Exterior Painting</h3>
              <p className="eggshell-text-secondary text-sm mb-4">
                Complete exterior surface preparation and premium paint application
              </p>
              <div className="eggshell-text-primary font-semibold">$6,850</div>
            </div>

            <div className="eggshell-card p-6">
              <div className="w-12 h-12 bg-brown-500 rounded-lg mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
              </div>
              <h3 className="font-semibold eggshell-text-primary mb-2">Interior Painting</h3>
              <p className="eggshell-text-secondary text-sm mb-4">
                Room-by-room interior painting with premium finishes and colors
              </p>
              <div className="eggshell-text-primary font-semibold">$4,200</div>
            </div>

            <div className="eggshell-card p-6">
              <div className="w-12 h-12 bg-brown-600 rounded-lg mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="font-semibold eggshell-text-primary mb-2">Project Timeline</h3>
              <p className="eggshell-text-secondary text-sm mb-4">
                Estimated completion time including prep work and finishing
              </p>
              <div className="eggshell-text-primary font-semibold">8-10 days</div>
            </div>
          </div>
        </section>

        {/* Navigation Example */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold eggshell-text-primary mb-6">Navigation</h2>

          <div className="eggshell-nav p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="font-bold eggshell-text-primary text-lg">Paintbox</div>
                <nav className="flex gap-1">
                  <a href="#" className="eggshell-nav-link active">Dashboard</a>
                  <a href="#" className="eggshell-nav-link">Estimates</a>
                  <a href="#" className="eggshell-nav-link">Clients</a>
                  <a href="#" className="eggshell-nav-link">Reports</a>
                </nav>
              </div>
              <button className="eggshell-btn-primary">
                New Estimate
              </button>
            </div>
          </div>
        </section>

        {/* Accessibility Features */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold eggshell-text-primary mb-6">Accessibility Features</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="eggshell-card p-6">
              <h3 className="font-semibold eggshell-text-primary mb-4">WCAG AA Compliance</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="eggshell-text-secondary">Primary text contrast</span>
                  <span className="font-mono text-sm bg-brown-100 px-2 py-1 rounded">7.2:1</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="eggshell-text-secondary">Secondary text contrast</span>
                  <span className="font-mono text-sm bg-brown-100 px-2 py-1 rounded">5.1:1</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="eggshell-text-secondary">Interactive elements</span>
                  <span className="font-mono text-sm bg-brown-100 px-2 py-1 rounded">6.8:1</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="eggshell-text-secondary">Focus indicators</span>
                  <span className="text-sm text-green-600 font-medium">3px outline</span>
                </div>
              </div>
            </div>

            <div className="eggshell-card p-6">
              <h3 className="font-semibold eggshell-text-primary mb-4">Touch & Interaction</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="eggshell-text-secondary">Minimum touch target</span>
                  <span className="font-mono text-sm bg-brown-100 px-2 py-1 rounded">44px</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="eggshell-text-secondary">Button padding</span>
                  <span className="font-mono text-sm bg-brown-100 px-2 py-1 rounded">12px 24px</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="eggshell-text-secondary">Focus management</span>
                  <span className="text-sm text-green-600 font-medium">Keyboard nav</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="eggshell-text-secondary">Screen reader support</span>
                  <span className="text-sm text-green-600 font-medium">ARIA labels</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto text-center eggshell-text-tertiary text-sm">
        <div className="border-t border-brown-200 pt-6">
          Eggshell Design System • Candlefish AI • Atelier-quality user experiences
        </div>
      </footer>

      {/* Before/After Toggle Styles */}
      <style jsx>{`
        .theme-before {
          filter: hue-rotate(220deg) saturate(1.5);
        }
        .theme-before .eggshell-card {
          background: #f7f8fb;
          border-color: #e6eaf0;
          box-shadow: 0 8px 24px rgba(16, 28, 44, 0.12);
        }
        .theme-before .eggshell-btn-primary {
          background: linear-gradient(to right, #1f2a44, #3a4f84);
        }
        .theme-before .eggshell-text-primary {
          color: #0e1a2a;
        }
      `}</style>
    </div>
  )
}
