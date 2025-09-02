'use client';
import Logo from '@/components/Logo';

export default function ShareHighline() {
  return (
    <>
      <header className="max-w-[1120px] mx-auto px-6 pt-8 pb-4">
        <Logo size={110} />
        <div className="uppercase tracking-[0.12em] text-slate text-xs mt-3">M A D — Confidential Share</div>
        <h1 className="font-serif text-[2rem] leading-tight mt-1">5470 S Highline Circle</h1>
      </header>
      <section className="max-w-[1120px] mx-auto px-6 pb-10">
        <div className="bg-white rounded-[var(--mad-radius-xl)] shadow-[var(--mad-shadow-soft)] border border-black/5 overflow-hidden">
          <div className="px-5 py-3 border-b border-black/5 flex items-center justify-between">
            <div className="text-slate text-sm">Viewing: Highline Valuation</div>
            <a className="text-sm underline" href="/highline" target="_blank">Open full view ↗</a>
          </div>
          <div className="w-full" style={{height: '2200px'}}>
            <iframe src="/highline" title="Highline Valuation" className="w-full h-full" />
          </div>
        </div>
      </section>
      <footer className="max-w-[1120px] mx-auto px-6 pb-10">
        <div className="text-slate">Modern Architecture Denver — Prepared by Jeff Tomlan, Broker Owner • 303-828-8747.</div>
      </footer>
    </>
  );
}
