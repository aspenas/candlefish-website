'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authorize } from '../actions';
export default function Gate() {
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const router = useRouter();
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    const res = await authorize(pass);
    if (res.ok) router.refresh(); else setErr('Incorrect passphrase.');
  }
  return (
    <form onSubmit={onSubmit} className="bg-white rounded-[var(--mad-radius-xl)] shadow-[var(--mad-shadow-soft)] border border-black/5 p-6 max-w-md">
      <h3 className="font-serif text-xl mb-2">Confidential Access</h3>
      <p className="text-slate text-sm mb-4">Enter the passphrase provided by Jeff Tomlan.</p>
      <input type="password" value={pass} onChange={(e)=>setPass(e.currentTarget.value)} placeholder="Passphrase" className="w-full border border-stone rounded-xl px-3 py-2 outline-none" />
      {err && <div className="text-red-600 text-sm mt-2">{err}</div>}
      <button className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-bronze text-[var(--mad-ink)]" type="submit">Unlock</button>
    </form>
  );
}
