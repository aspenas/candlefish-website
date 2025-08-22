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
      'text-white bg-interactive-primary hover:bg-interactive-primary-hover active:bg-interactive-primary-active shadow-eggshell-sm hover:shadow-eggshell-md focus:ring-brown-400 focus:ring-opacity-50 disabled:bg-interactive-primary-disabled disabled:cursor-not-allowed disabled:hover:bg-interactive-primary-disabled disabled:text-text-tertiary transform hover:scale-105 active:scale-98',
    secondary:
      'text-text-primary bg-surface-primary border border-border-primary hover:bg-interactive-secondary-hover hover:border-border-focus hover:text-interactive-primary shadow-eggshell-sm hover:shadow-eggshell-md focus:ring-brown-400 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-98',
    outline:
      'text-text-primary border border-border-primary bg-transparent hover:bg-interactive-secondary-hover hover:border-border-focus focus:ring-brown-400 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-98',
    ghost:
      'text-text-secondary hover:text-text-primary hover:bg-interactive-secondary-hover focus:ring-brown-400 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-98',
    aurora:
      'text-white bg-gradient-to-r from-brown-600 to-brown-400 hover:from-brown-700 hover:to-brown-500 shadow-eggshell-lg hover:shadow-eggshell-xl transform hover:scale-105 active:scale-95 transition-all duration-200 focus:ring-brown-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-eggshell-lg'
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
