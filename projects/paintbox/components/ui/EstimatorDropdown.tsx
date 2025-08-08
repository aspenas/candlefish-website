import React from 'react';

export const EstimatorDropdown = ({ value, onChange, options = [] }: any) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border rounded-md"
    >
      <option value="">Select estimator...</option>
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};
