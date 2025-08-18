import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  asChild = false,
  ...props
}) => {
  const radius = 'rounded-[var(--radius-2)]';
  const base = `inline-flex items-center justify-center font-medium transition-all duration-200 ${radius}`;

  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5',
    lg: 'px-5 py-3 text-base'
  };

  const variants: Record<ButtonVariant, string> = {
    primary:
      'text-white bg-[var(--color-paintbox-accent)] hover:brightness-95 active:brightness-90 shadow-sm',
    secondary:
      'text-[var(--color-paintbox-text)] bg-[var(--color-paintbox-surface)] border border-[var(--color-paintbox-border)] hover:bg-white/90 shadow-sm',
    outline:
      'text-[var(--color-paintbox-text)] border border-[var(--color-paintbox-border)] bg-transparent hover:bg-[color-mix(in_oklab,_var(--color-paintbox-accent)_8%,_transparent)]',
    ghost:
      'text-[var(--color-paintbox-text)] hover:bg-[color-mix(in_oklab,_var(--color-paintbox-accent-2)_8%,_transparent)]'
  };

  const classes = `${base} ${sizeClasses[size]} ${variants[variant]} ${className}`;

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      className: `${classes} ${(
        (children as React.ReactElement<any>).props?.className || ''
      )}`.trim(),
    });
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
};
