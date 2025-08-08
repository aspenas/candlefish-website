import React from 'react';

export const FloatingInput = ({ label, ...props }: any) => {
  return (
    <div className="relative">
      <input
        {...props}
        className="w-full px-3 py-2 border rounded-md peer"
        placeholder=" "
      />
      <label className="absolute left-2 -top-2.5 bg-white px-1 text-sm text-gray-600 transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-focus:-top-2.5 peer-focus:text-sm">
        {label}
      </label>
    </div>
  );
};
