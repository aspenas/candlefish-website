import React from 'react';

export const InteractiveButton = React.forwardRef<HTMLButtonElement, any>(
  ({ children, className = '', ...props }, ref) => (
    <button
      ref={ref}
      className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all transform hover:scale-105 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
);
InteractiveButton.displayName = 'InteractiveButton';

export const TouchHoverCard = ({ children }: any) => (
  <div className="p-4 border rounded-lg hover:shadow-lg transition-shadow cursor-pointer">
    {children}
  </div>
);

export const AnimatedCounter = ({ value = 0 }: any) => (
  <span className="font-bold text-2xl">{value}</span>
);

export const SlideInPanel = ({ children, isOpen }: any) => (
  <div className={`transform transition-transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
    {children}
  </div>
);

export const ScaleInCard = ({ children }: any) => (
  <div className="transform transition-transform hover:scale-105">
    {children}
  </div>
);

export const RippleEffect = ({ children }: any) => (
  <div className="relative overflow-hidden">
    {children}
    <div className="absolute inset-0 pointer-events-none">
      <div className="ripple" />
    </div>
  </div>
);

export const InteractiveInput = ({ label, error, ...props }: any) => (
  <div>
    {label && <label className="block text-sm font-medium mb-2">{label}</label>}
    <input className="w-full px-3 py-2 border rounded-md" {...props} />
    {error && <span className="text-sm text-red-600 mt-1">{error}</span>}
  </div>
);

export const InteractiveCheckbox = ({ label, ...props }: any) => (
  <label className="flex items-center gap-2">
    <input type="checkbox" className="w-4 h-4" {...props} />
    {label && <span>{label}</span>}
  </label>
);

export const InteractiveRadio = ({ label, ...props }: any) => (
  <label className="flex items-center gap-2">
    <input type="radio" className="w-4 h-4" {...props} />
    {label && <span>{label}</span>}
  </label>
);

export const InteractiveToggle = ({ label, ...props }: any) => (
  <label className="flex items-center gap-2">
    <input type="checkbox" className="w-4 h-4" {...props} />
    {label && <span>{label}</span>}
  </label>
);
