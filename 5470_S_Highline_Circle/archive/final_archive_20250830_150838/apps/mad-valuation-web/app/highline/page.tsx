'use client';
import React, { useMemo, useState } from 'react';
import Logo from '@/components/Logo';
import { Card, Stat, Section } from '@/components/Primitives';
import { ChartCard } from '@/components/Charts';
import { SUBJECT, MARKET, COMPS } from './data';
import { fmtMoney, fmtMoney2, fmtM } from './format';

export default function Page() {
  const [marketAdjPct, setMarketAdjPct] = useState(9);
  const v = useMemo(() => {
    const c1AgVal = SUBJECT.aboveGradeSqft * COMPS.preserve1.psfAg;
    const c1TotVal = SUBJECT.totalFinishedSqft * COMPS.preserve1.psfTot;
    const c1Avg = (c1AgVal + c1TotVal) / 2;
    const c1Adj = c1Avg * (1 - marketAdjPct / 100);
    const c2AgVal = SUBJECT.aboveGradeSqft * COMPS.preserve2.psfAg;
    const c2TotVal = SUBJECT.totalFinishedSqft * COMPS.preserve2.psfTot;
    const c2Avg = (c2AgVal + c2TotVal) / 2;
    const c2Adj = c2Avg * (1 - marketAdjPct / 100);
    const preserveAvg = (c1Adj + c2Adj) / 2;
    const c3AgBase = SUBJECT.aboveGradeSqft * COMPS.stanford.psfAg;
    const c3TotBase = SUBJECT.totalFinishedSqft * COMPS.stanford.psfTot;
    const adjCommon = COMPS.stanford.adjLot + COMPS.stanford.adjLoc + COMPS.stanford.adjUpgrade;
    const c3AgFinal = c3AgBase + adjCommon;
    const c3TotFinal = c3TotBase + adjCommon;
    const stanfordAdjAvg = (c3AgFinal + c3TotFinal) / 2;
    const rangeLow = Math.min(preserveAvg, stanfordAdjAvg);
    const rangeHigh = Math.max(preserveAvg, stanfordAdjAvg);
    return { c1AgVal, c1TotVal, c1Avg, c1Adj, c2AgVal, c2TotVal, c2Avg, c2Adj, preserveAvg, c3AgBase, c3TotBase, c3AgFinal, c3TotFinal, stanfordAdjAvg, rangeLow, rangeHigh };
  }, [marketAdjPct]);

  const cpLpData = useMemo(() => [{ name: 'Avg CP/LP', value: MARKET.cpLpAvg }], []);
  const valueData = useMemo(() => [{ name: 'Preserve Avg', value: v.preserveAvg }, { name: 'Stanford Adj Avg', value: v.stanfordAdjAvg }], [v.preserveAvg, v.stanfordAdjAvg]);

  return (
    <>
      <header className="max-w-[1120px] mx-auto px-6 pt-8 pb-4">
        <Logo size={110} />
        <div className="uppercase tracking-[0.12em] text-slate text-xs mt-3">M A D — Meaningful | Authentic | Denver</div>
        <h1 className="font-serif text-[2.6rem] leading-tight mt-1">{SUBJECT.address}</h1>
        <p className="text-slate mt-2">Tomlan Realty x M A D • Due Diligence • August 16, 2025</p>
        <div className="mt-3 flex gap-2 flex-wrap">
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-stone bg-white text-[var(--mad-ink)] hover:shadow-brand" onClick={() => window.print()}>Export PDF</button>
          <a className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-stone bg-white hover:shadow-brand" href="#sources">Jump to Sources</a>
        </div>
      </header>
      <Section kicker="Executive Summary" title="Quiet, data-first valuation.">
        <div className="grid gap-4 md:grid-cols-3">
          <Card><Stat label="Indicated Value (Range)" value={`${fmtM(v.rangeLow)} – ${fmtM(v.rangeHigh)}`} sub="Preserve average + Stanford-adjusted benchmark" /></Card>
          <Card><Stat label="List Price" value={fmtMoney(SUBJECT.listPrice)} sub={`AG ${fmtMoney2(SUBJECT.psfAboveGrade)}/sf • Total ${fmtMoney2(SUBJECT.psfTotal)}/sf`} /></Card>
          <Card><Stat label="Market Close-to-List" value={`${MARKET.cpLpAvg.toFixed(2)}%`} sub="$5M+ (Jun–Aug 2025)" /></Card>
        </div>
      </Section>
      <Section kicker="Market" title="Summer 2025 Overview" accent="stone">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <div className="grid gap-5 md:grid-cols-2">
              <Stat label="Scope" value="Greenwood Village → Cherry Hills → Denver" sub="Closed sales ≥ $5M" />
              <Stat label="Period" value="Jun–Aug 2025" sub="14 closed transactions" />
            </div>
            <div className="h-px bg-black/5 my-4" />
            <p className="text-slate">
              Pricing sits close to ask; best-in-class assets can clear at list. Where no reductions occur, bids have tracked lower (~91%). Stanford (Aug 11) validated full-price clearing at the top end.
            </p>
          </Card>
          <ChartCard title="Average Close-to-List" subtitle="Source: CMA Pro Report" data={cpLpData} dataKey="value" unit="%" />
        </div>
      </Section>
      <Section kicker="Subject" title="Property Metrics">
        <div className="grid gap-4 md:grid-cols-3">
          <Card><Stat label="Above Grade" value={`${SUBJECT.aboveGradeSqft.toLocaleString()} sf`} sub={`${fmtMoney2(SUBJECT.psfAboveGrade)}/sf`} /></Card>
          <Card><Stat label="Total Finished" value={`${SUBJECT.totalFinishedSqft.toLocaleString()} sf`} sub={`${fmtMoney2(SUBJECT.psfTotal)}/sf`} /></Card>
          <Card><Stat label="Lot Size" value={`${SUBJECT.lotAcres.toFixed(2)} acres`} sub="Normalization handled in comps" /></Card>
        </div>
      </Section>
      <Section kicker="Comps" title="Comparable Sales — Applied Mapping" accent="bronze">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <h3 className="text-base mb-1">4151 Preserve Parkway N</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Stat label="Rates" value="$1,286.53/sf AG • $739.25/sf Ttl" />
              <Stat label="AG Basis → Avg" value={`${fmtM(v.c1AgVal)} → ${fmtM(v.c1Avg)}`} sub={`${fmtMoney(Math.round(v.c1AgVal))} → ${fmtMoney(Math.round(v.c1Avg))}`} />
            </div>
            <div className="h-px bg-black/5 my-3" />
            <Stat label={`Market Adj (–${marketAdjPct}%)`} value={`${fmtM(v.c1Adj)}`} sub={`${fmtMoney(Math.round(v.c1Adj))}`} />
          </Card>
          <Card>
            <h3 className="text-base mb-1">4090 Preserve Parkway</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Stat label="Rates" value="$930.00/sf AG • $681.00/sf Ttl" />
              <Stat label="AG Basis → Avg" value={`${fmtM(v.c2AgVal)} → ${fmtM(v.c2Avg)}`} sub={`${fmtMoney(Math.round(v.c2AgVal))} → ${fmtMoney(Math.round(v.c2Avg))}`} />
            </div>
            <div className="h-px bg-black/5 my-3" />
            <Stat label={`Market Adj (–${marketAdjPct}%)`} value={`${fmtM(v.c2Adj)}`} sub={`${fmtMoney(Math.round(v.c2Adj))}`} />
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2 mt-4">
          <Card>
            <h3 className="text-base mb-1">5650 E Stanford Drive (Adjusted)</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <Stat label="Lot Adj (2ac→1ac)" value="–$1,500,000" />
              <Stat label="Location Adj (CH→GV)" value="–$1,000,000" />
              <Stat label="Upgrades" value="+$686,000" />
            </div>
            <div className="h-px bg-black/5 my-3" />
            <div className="grid gap-4 md:grid-cols-2">
              <Stat label="AG Base → Final" value={`${fmtM(v.c3AgBase)} → ${fmtM(v.c3AgFinal)}`} sub={`${fmtMoney(Math.round(v.c3AgBase))} → ${fmtMoney(Math.round(v.c3AgFinal))}`} />
              <Stat label="Ttl Base → Final" value={`${fmtM(v.c3TotBase)} → ${fmtM(v.c3TotFinal)}`} sub={`${fmtMoney(Math.round(v.c3TotBase))} → ${fmtMoney(Math.round(v.c3TotFinal))}`} />
            </div>
          </Card>
          <Card>
            <div className="flex items-baseline justify-between">
              <h3 className="text-base">Preserve vs. Stanford — Indicated Values</h3>
              <div className="text-slate text-sm">All figures USD</div>
            </div>
            <div className="h-[260px]">
              <ChartCard title="" data={[{name:'Preserve Avg', value: v.preserveAvg},{name:'Stanford Adj Avg', value: v.stanfordAdjAvg}]} dataKey="value" />
            </div>
            <div className="h-px bg-black/5 my-3" />
            <div className="controls flex items-center gap-2 flex-wrap">
              <label className="text-slate text-sm">Market Adjustment for Preserve:</label>
              <input type="range" min={0} max={15} step={0.5} value={marketAdjPct} onChange={(e) => setMarketAdjPct(parseFloat((e.target as HTMLInputElement).value))} />
              <span className="tabular-nums">–{marketAdjPct}%</span>
            </div>
          </Card>
        </div>
      </Section>
      <Section kicker="Synthesis" title="Indicated Valuation Range" accent="stone">
        <div className="grid gap-4 md:grid-cols-3">
          <Card><Stat label="Preserve Average" value={`${fmtM(v.preserveAvg)}`} sub={`${fmtMoney(Math.round(v.preserveAvg))} • After market adjustment`} /></Card>
          <Card><Stat label="Stanford Adjusted Avg" value={`${fmtM(v.stanfordAdjAvg)}`} sub={`${fmtMoney(Math.round(v.stanfordAdjAvg))} • Lot, location, upgrades normalized`} /></Card>
          <Card><Stat label="Indicated Range" value={`${fmtM(v.rangeLow)} – ${fmtM(v.rangeHigh)}`} sub={`${fmtMoney(Math.round(v.rangeLow))} – ${fmtMoney(Math.round(v.rangeHigh))} • List: ${fmtMoney(SUBJECT.listPrice)} • CP/LP: ${MARKET.cpLpAvg.toFixed(2)}%`} /></Card>
        </div>
        <p className="text-slate mt-4">
          Positioning: Negotiate from comps and CP/LP realities. Upper-range targeting is defensible given subject cohesion and systems.
        </p>
      </Section>
      <Section kicker="Sources" title="Data & Methodology" accent="bronze">
        <div id="sources" className="grid gap-4 md:grid-cols-2">
          <Card>
            <h3 className="text-base mb-1">Sources</h3>
            <ul className="text-slate leading-7">
              <li>CMA Pro Report (REcolorado), August 16, 2025.</li>
              <li>CP/LP Average 96.44% across 14 sales ≥ $5M (June–Aug 2025).</li>
              <li>Closed sales: 4151 Preserve Pkwy N; 4090 Preserve Pkwy; 5650 E Stanford Dr (full list).</li>
            </ul>
          </Card>
          <Card>
            <h3 className="text-base mb-1">Method</h3>
            <ul className="text-slate leading-7">
              <li>Closed data only; no finish/lot-orientation opinions.</li>
              <li>Standardized $/sf mapping; conservative market adjustment for Preserve comps.</li>
              <li>Stanford normalized for lot, location, and upgrades.</li>
              <li>E&O excepted; verify measurements independently.</li>
            </ul>
          </Card>
        </div>
        <div className="mt-4 flex gap-2 flex-wrap">
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-bronze text-[var(--mad-ink)]" onClick={() => window.print()}>Export PDF</button>
        </div>
      </Section>
      <footer className="max-w-[1120px] mx-auto px-6 pb-10">
        <div className="text-slate">Modern Architecture Denver — Prepared by Jeff Tomlan, Broker Owner • 303-828-8747.</div>
      </footer>
    </>
  );
}
