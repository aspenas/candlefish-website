'use client';

import { PaintboxLogo as BasePaintboxLogo } from '@candlefish-ai/ui-components';
import type { LogoProps } from '@candlefish-ai/ui-components';

interface PaintboxLogoProps extends Omit<LogoProps, 'size'> {
  size?: 'mobile' | 'desktop' | 'large' | 'splash';
  priority?: boolean;
}

// Map Paintbox-specific sizes to the unified Logo component sizes
const sizeMapping = {
  mobile: 'sm',
  desktop: 'md',
  large: 'lg',
  splash: 'xl',
} as const;

export default function PaintboxLogo({
  size = 'desktop',
  className,
  priority = false,
  showText = false,
  ...props
}: PaintboxLogoProps) {
  const unifiedSize = sizeMapping[size];

  return (
    <BasePaintboxLogo
      size={unifiedSize}
      showText={showText}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      {...props}
    />
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
