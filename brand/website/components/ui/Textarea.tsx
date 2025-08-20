import React, { forwardRef, TextareaHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  wrapperClassName?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className, 
    label, 
    error, 
    helperText, 
    wrapperClassName,
    id,
    required,
    ...props 
  }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = error ? `${textareaId}-error` : undefined;
    const helperId = helperText ? `${textareaId}-helper` : undefined;

    return (
      <div className={cn('w-full', wrapperClassName)}>
        {label && (
          <label 
            htmlFor={textareaId} 
            className="block text-sm font-medium text-slate mb-2"
          >
            {label}
            {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
          </label>
        )}
        
        <textarea
          className={cn(
            'block w-full rounded-md border border-mist/30 px-3 py-2 text-slate placeholder-mist/60 shadow-sm transition-colors resize-y',
            'focus:border-sea-glow focus:outline-none focus:ring-1 focus:ring-sea-glow',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-mist/5',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className
          )}
          ref={ref}
          id={textareaId}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={cn(errorId, helperId)}
          {...props}
        />
        
        {error && (
          <p 
            id={errorId} 
            className="mt-1 text-sm text-red-600" 
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}
        
        {helperText && !error && (
          <p 
            id={helperId} 
            className="mt-1 text-sm text-mist/80"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };