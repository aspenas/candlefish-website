import React, { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const Card: React.FC<CardProps> = ({ 
  className, 
  variant = 'default', 
  padding = 'md',
  children, 
  ...props 
}) => {
  return (
    <div
      className={cn(
        'rounded-lg transition-all',
        {
          'bg-white shadow-sm border border-mist/10': variant === 'default',
          'bg-white shadow-lg border border-mist/10 hover:shadow-xl': variant === 'elevated',
          'bg-white border-2 border-mist/20': variant === 'outlined',
        },
        {
          'p-0': padding === 'none',
          'p-4': padding === 'sm',
          'p-6': padding === 'md',
          'p-8': padding === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

const CardHeader: React.FC<CardHeaderProps> = ({ className, children, ...props }) => (
  <div className={cn('mb-4', className)} {...props}>
    {children}
  </div>
);

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

const CardTitle: React.FC<CardTitleProps> = ({ 
  className, 
  as: Component = 'h3', 
  children, 
  ...props 
}) => (
  <Component 
    className={cn('text-lg font-semibold text-slate', className)} 
    {...props}
  >
    {children}
  </Component>
);

export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

const CardDescription: React.FC<CardDescriptionProps> = ({ className, children, ...props }) => (
  <p className={cn('text-sm text-mist', className)} {...props}>
    {children}
  </p>
);

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

const CardContent: React.FC<CardContentProps> = ({ className, children, ...props }) => (
  <div className={cn(className)} {...props}>
    {children}
  </div>
);

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

const CardFooter: React.FC<CardFooterProps> = ({ className, children, ...props }) => (
  <div className={cn('mt-4 pt-4 border-t border-mist/10', className)} {...props}>
    {children}
  </div>
);

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };