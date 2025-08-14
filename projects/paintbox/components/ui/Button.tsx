import React from 'react';

export const Button = ({ children, variant = 'default', size = 'md', ...props }: any) => {
  const baseClass = 'rounded-md font-medium transition-colors';

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };

  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-gray-300 hover:bg-gray-50',
    ghost: 'hover:bg-gray-100'
  };

  return (
    <button
      className={`${baseClass} ${sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.md} ${variants[variant as keyof typeof variants] || variants.default}`}
      {...props}
    >
      {children}
    </button>
  );
};
