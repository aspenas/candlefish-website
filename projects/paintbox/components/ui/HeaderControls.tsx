"use client";
import React from 'react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function HeaderControls() {
  return (
    <div className="flex items-center gap-3">
      <ThemeToggle />
    </div>
  );
}
