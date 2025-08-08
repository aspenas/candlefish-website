import React from 'react';
import Image from 'next/image';

interface LogoProps {
  variant?: 'horizontal' | 'stacked' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
  animated?: boolean;
}

export function Logo({
  variant = 'horizontal',
  size = 'md',
  className = '',
  showText = true,
  animated = true
}: LogoProps) {
  // Size mappings for different variants
  const sizeMap = {
    sm: { width: 32, height: 32, fontSize: '1rem' },
    md: { width: 48, height: 48, fontSize: '1.25rem' },
    lg: { width: 64, height: 64, fontSize: '1.5rem' },
    xl: { width: 160, height: 160, fontSize: '2rem' }
  } as const;

  const { width, height, fontSize } = sizeMap[size];

  const logoClasses = [
    'candlefish-logo',
    `candlefish-logo--${variant}`,
    `candlefish-logo--${size}`,
    animated && 'candlefish-logo--animated',
    className
  ].filter(Boolean).join(' ');

  const logoMarkClasses = [
    'candlefish-logo__mark',
    animated && 'candlefish-glow'
  ].filter(Boolean).join(' ');

  if (variant === 'icon') {
    return (
      <div className={logoClasses}>
        <div className={logoMarkClasses}>
          <Image
            src="/logo/candlefish_original.png"
            alt="Candlefish AI"
            width={width}
            height={height}
            priority
            className="candlefish-logo__image"
          />
        </div>
      </div>
    );
  }

  if (variant === 'stacked') {
    return (
      <div className={logoClasses}>
      <div className={logoMarkClasses}>
          <Image
            src="/logo/candlefish_original.png"
            alt="Candlefish AI"
            width={width}
            height={height}
            priority
            className="candlefish-logo__image"
          />
        </div>
        {showText && (
          <span className="candlefish-logo__text" style={{ fontSize }}>
            CANDLEFISH
          </span>
        )}
      </div>
    );
  }

  // Default horizontal variant
  return (
    <div className={logoClasses}>
      <div className={logoMarkClasses}>
        <Image
          src="/logo/candlefish_original.png"
          alt="Candlefish AI"
          width={width}
          height={height}
          priority
          className="candlefish-logo__image"
        />
      </div>
      {showText && (
        <span className="candlefish-logo__text" style={{ fontSize }}>
          CANDLEFISH
        </span>
      )}
    </div>
  );
}

// CSS-in-JS styles for the logo component
export const logoStyles = `
  .candlefish-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-semantic-component-gap-md);
    transition: all var(--motion-duration-normal) var(--motion-easing-candlefish-primary);
  }

  .candlefish-logo--horizontal {
    flex-direction: row;
  }

  .candlefish-logo--stacked {
    flex-direction: column;
    gap: var(--spacing-semantic-component-gap-sm);
  }

  .candlefish-logo--icon {
    flex-direction: row;
  }

  .candlefish-logo__mark {
    position: relative;
    border-radius: var(--border-radius-lg);
    overflow: hidden;
    transition: all var(--motion-duration-normal) var(--motion-easing-candlefish-primary);
    container-type: inline-size;
    container-name: logo-mark;
  }

  .candlefish-logo__image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    transition: all var(--motion-duration-normal) var(--motion-easing-candlefish-primary);
  }

  .candlefish-logo__text {
    font-family: var(--typography-font-family-display);
    font-weight: var(--typography-font-weight-regular);
    letter-spacing: var(--typography-letter-spacing-wider);
    color: var(--color-semantic-text-primary);
    white-space: nowrap;
    transition: all var(--motion-duration-normal) var(--motion-easing-candlefish-primary);
  }

  /* Hover effects */
  .candlefish-logo--animated:hover .candlefish-logo__mark {
    transform: var(--motion-transforms-scale-hover);
  }

  .candlefish-logo--animated:hover .candlefish-logo__text {
    color: var(--color-semantic-accent-primary);
  }

  /* Active state */
  .candlefish-logo--animated:active .candlefish-logo__mark {
    transform: var(--motion-transforms-scale-active);
  }

  /* Container queries for responsive logo */
  @container logo-mark (max-width: 40px) {
    .candlefish-logo__text {
      font-size: 0.875rem;
    }
  }

  @container logo-mark (min-width: 80px) {
    .candlefish-logo__text {
      font-size: 1.5rem;
    }
  }

  /* High contrast mode */
  @media (prefers-contrast: high) {
    .candlefish-logo__mark {
      outline: 2px solid var(--color-semantic-text-primary);
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .candlefish-logo,
    .candlefish-logo__mark,
    .candlefish-logo__image,
    .candlefish-logo__text {
      transition: none;
    }

    .candlefish-logo--animated:hover .candlefish-logo__mark,
    .candlefish-logo--animated:active .candlefish-logo__mark {
      transform: none;
    }
  }

  /* Print styles */
  @media print {
    .candlefish-logo {
      filter: grayscale(1);
    }
  }
`;

export default Logo;
