import React from 'react';

export const CustomerSearch = ({ onSelect, placeholder = "Search customers..." }: any) => {
  return (
    <input
      type="text"
      placeholder={placeholder}
      className="w-full px-3 py-2 border rounded-md"
      onChange={(e) => onSelect?.({ id: '1', name: e.target.value })}
    />
  );
};
