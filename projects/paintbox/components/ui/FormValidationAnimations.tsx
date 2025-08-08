import React from 'react';

export const ValidationMessage = ({ type = 'success', message }: any) => {
  const colors = {
    success: 'text-green-600 bg-green-50',
    error: 'text-red-600 bg-red-50',
    warning: 'text-yellow-600 bg-yellow-50'
  };

  return (
    <div className={`p-3 rounded-md ${colors[type as keyof typeof colors]}`}>
      {message}
    </div>
  );
};

export const ValidatedField = ({ children, isValid }: any) => {
  return (
    <div className={`relative ${isValid ? 'border-green-500' : 'border-gray-300'} border rounded-md`}>
      {children}
    </div>
  );
};

export const ValidationSteps = ({ steps }: any) => {
  return (
    <div className="space-y-2">
      {steps?.map((step: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full ${step.completed ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span>{step.label}</span>
        </div>
      ))}
    </div>
  );
};

export const SuccessOverlay = ({ show }: any) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-green-600">Success!</h2>
      </div>
    </div>
  );
};

export const InlineValidation = ({ error }: any) => {
  if (!error) return null;

  return (
    <span className="text-sm text-red-600 mt-1">{error}</span>
  );
};
