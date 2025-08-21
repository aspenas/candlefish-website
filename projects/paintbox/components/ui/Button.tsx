import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'aurora';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
  loadingText?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  asChild = false,
  icon,
  iconPosition = 'left',
  isLoading = false,
  loadingText = 'Loading...',
  disabled,
  ...props
}) => {
  const radius = 'rounded-[var(--radius-2)]';
  const base = `inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 tap-highlight-none touch-pan no-select ${radius}`;

  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'px-3 py-2 text-sm min-h-[36px]',
    md: 'px-4 py-2.5 min-h-[44px]',
    lg: 'px-5 py-3 text-base min-h-[48px]'
  };

  const variants: Record<ButtonVariant, string> = {
    primary:
      'text-white bg-[var(--color-paintbox-accent)] hover:brightness-95 active:brightness-90 shadow-sm focus:ring-[var(--color-paintbox-accent)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100',
    secondary:
      'text-[var(--color-paintbox-text)] bg-[var(--color-paintbox-surface)] border border-[var(--color-paintbox-border)] hover:bg-white/90 shadow-sm focus:ring-[var(--color-paintbox-brand)] disabled:opacity-50 disabled:cursor-not-allowed',
    outline:
      'text-[var(--color-paintbox-text)] border border-[var(--color-paintbox-border)] bg-transparent hover:bg-[color-mix(in_oklab,_var(--color-paintbox-accent)_8%,_transparent)] focus:ring-[var(--color-paintbox-brand)] disabled:opacity-50 disabled:cursor-not-allowed',
    ghost:
      'text-[var(--color-paintbox-text)] hover:bg-[color-mix(in_oklab,_var(--color-paintbox-accent-2)_8%,_transparent)] focus:ring-[var(--color-paintbox-brand)] disabled:opacity-50 disabled:cursor-not-allowed',
    aurora:
      'text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-lg'
  };

  const isDisabled = disabled || isLoading;
  const classes = `${base} ${sizeClasses[size]} ${variants[variant]} ${className}`;

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      className: `${classes} ${(
        (children as React.ReactElement<any>).props?.className || ''
      )}`.trim(),
    });
  }

  return (
    <button
      className={classes}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-describedby={isLoading ? `${props.id || 'button'}-loading` : undefined}
      {...props}
    >
      {isLoading && (
        <div className="mr-2 w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {!isLoading && icon && iconPosition === 'left' && (
        <span className="mr-2" aria-hidden="true">{icon}</span>
      )}
      <span>{isLoading ? loadingText : children}</span>
      {!isLoading && icon && iconPosition === 'right' && (
        <span className="ml-2" aria-hidden="true">{icon}</span>
      )}
      {isLoading && (
        <span id={`${props.id || 'button'}-loading`} className="sr-only">
          Loading, please wait...
        </span>
      )}
    </button>
  );
};
