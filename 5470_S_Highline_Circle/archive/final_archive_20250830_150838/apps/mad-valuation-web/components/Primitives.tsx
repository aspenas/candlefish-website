'use client';
import React from 'react';
export const Card = ({ children }: { children: React.ReactNode }) => (
  <section className="bg-white rounded-[var(--mad-radius-xl)] shadow-[var(--mad-shadow-soft)] border border-black/5 p-5">{children}</section>
);
export const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="flex flex-col gap-1">
    <div className="text-slate text-sm">{label}</div>
    <div className="font-serif text-2xl tabular-nums">{value}</div>
    {sub && <div className="text-slate text-xs">{sub}</div>}
  </div>
);
export const Section = ({ kicker, title, children, accent = 'bronze' }:{ kicker?: string; title: string; children: React.ReactNode; accent?: 'bronze' | 'stone' }) => (
  <section className="max-w-[1120px] mx-auto px-6 py-6">
    <div className="grid grid-cols-[6px_1fr] gap-4 items-start">
      <div className={`rounded ${accent === 'bronze' ? 'bg-bronze' : 'bg-stone'}`} />
      <div>
        {kicker && <div className="uppercase tracking-[0.12em] text-slate text-xs">{kicker}</div>}
        <h2 className="font-serif text-[2rem] mt-1 mb-4">{title}</h2>
        {children}
      </div>
    </div>
  </section>
);
