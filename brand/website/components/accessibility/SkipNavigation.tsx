'use client';

import React from 'react';

interface SkipNavigationProps {
  links?: Array<{
    href: string;
    label: string;
  }>;
}

const defaultLinks = [
  { href: '#main-content', label: 'Skip to main content' },
  { href: '#navigation', label: 'Skip to navigation' },
  { href: '#footer', label: 'Skip to footer' }
];

export default function SkipNavigation({ links = defaultLinks }: SkipNavigationProps) {
  return (
    <div className="sr-only focus-within:not-sr-only">
      <nav aria-label="Skip navigation links" className="fixed top-0 left-0 z-[9999] bg-pearl p-2">
        <ul className="flex flex-col space-y-2">
          {links.map(({ href, label }) => (
            <li key={href}>
              <a
                href={href}
                className="
                  bg-copper text-graphite px-4 py-2 text-sm font-medium
                  focus:outline-none focus:ring-2 focus:ring-living-cyan focus:ring-offset-2
                  hover:bg-copper/90 transition-colors
                  inline-block
                "
                onFocus={(e) => {
                  // Ensure the skip link is visible when focused
                  e.currentTarget.scrollIntoView({ block: 'nearest' });
                }}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
