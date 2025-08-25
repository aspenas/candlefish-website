'use client';
import React from 'react';
type Item = { name: string; href: string; type?: string };
export default function Attachments({ items }:{ items: Item[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((it, i) => (
        <a key={i} href={it.href} target="_blank" rel="noopener noreferrer"
           className="bg-white rounded-[var(--mad-radius-xl)] shadow-[var(--mad-shadow-soft)] border border-black/5 p-4 hover:shadow-brand transition">
          <div className="flex items-center justify-between">
            <div className="font-medium">{it.name}</div>
            <span className="text-slate text-xs uppercase tracking-wide">{(it.type||'file')}</span>
          </div>
          <div className="text-slate text-xs mt-1">Open in new tab · read-only</div>
        </a>
      ))}
    </div>
  );
}
