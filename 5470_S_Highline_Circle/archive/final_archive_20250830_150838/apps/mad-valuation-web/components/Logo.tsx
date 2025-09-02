'use client';
import Image from 'next/image';
export default function Logo({ size = 140 }:{ size?: number }) {
  return (
    <div className="inline-flex items-center gap-3">
      <span className="sr-only">Modern Architecture Denver</span>
      <Image src="/brand/mad-lockup.webp" alt="MAD — Modern Architecture Denver" width={size*2} height={Math.round(size*1.2)} priority className="h-auto w-auto" />
    </div>
  );
}
