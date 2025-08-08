import React from 'react';

export const PricingBreakdown = ({ data }: any) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Pricing Breakdown</h3>
      <div className="space-y-2">
        {Object.entries(data || {}).map(([key, value]) => (
          <div key={key} className="flex justify-between">
            <span className="text-gray-600">{key}:</span>
            <span className="font-medium">${String(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
