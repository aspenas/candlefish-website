import React from 'react';

export const Button = ({ children, variant = 'default', ...props }: any) => {
  const baseClass = 'px-4 py-2 rounded-md font-medium transition-colors';
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-gray-300 hover:bg-gray-50',
    ghost: 'hover:bg-gray-100'
  };

  return (
    <button
      className={`${baseClass} ${variants[variant as keyof typeof variants] || variants.default}`}
      {...props}
    >
      {children}
    </button>
  );
};
