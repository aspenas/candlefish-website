'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils/cn';

interface PaintboxLogoProps {
  size?: 'mobile' | 'desktop' | 'large' | 'splash';
  className?: string;
  priority?: boolean;
  showText?: boolean;
}

const sizeClasses = {
  mobile: 'h-8 w-8', // 32px
  desktop: 'h-10 w-10', // 40px
  large: 'h-16 w-16', // 64px
  splash: 'h-32 w-32', // 128px
};

const imageSizes = {
  mobile: 32,
  desktop: 40,
  large: 64,
  splash: 128,
};

export default function PaintboxLogo({
  size = 'desktop',
  className,
  priority = false,
  showText = false
}: PaintboxLogoProps) {
  const logoSize = imageSizes[size];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <picture>
        <source
          srcSet={`/logo-${logoSize}.avif`}
          type="image/avif"
        />
        <source
          srcSet={`/logo-${logoSize}.webp`}
          type="image/webp"
        />
        <Image
          src={`/logo-${logoSize === 32 ? 'mobile' : logoSize === 40 ? 'desktop' : logoSize}.png`}
          alt="Paintbox - Professional Painting Estimates"
          width={logoSize}
          height={logoSize}
          className={cn(
            'object-contain',
            sizeClasses[size]
          )}
          priority={priority}
          sizes={`${logoSize}px`}
        />
      </picture>

      {showText && (
        <div className="flex flex-col">
          <span className={cn(
            'font-bold text-slate-900',
            size === 'mobile' && 'text-lg',
            size === 'desktop' && 'text-xl',
            size === 'large' && 'text-2xl',
            size === 'splash' && 'text-4xl'
          )}>
            Paintbox
          </span>
          <span className={cn(
            'text-xs font-medium tracking-wider uppercase text-slate-600',
            size === 'large' && 'text-sm',
            size === 'splash' && 'text-base'
          )}>
            Made by Candlefish.ai
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Responsive logo component with multiple size variants and optimized image formats
 *
 * Usage examples:
 * - <PaintboxLogo size="mobile" priority /> // For mobile header with priority loading
 * - <PaintboxLogo size="desktop" showText /> // For desktop header with brand text
 * - <PaintboxLogo size="large" className="mx-auto" /> // For landing pages
 * - <PaintboxLogo size="splash" showText className="flex-col items-center" /> // For PWA splash screens
 *
 * Features:
 * - Automatic format selection (AVIF > WebP > PNG fallback)
 * - Responsive sizing for different screen contexts
 * - Optional brand text display
 * - Proper accessibility with descriptive alt text
 * - Optimized loading with Next.js Image component
 */
