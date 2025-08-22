'use client';

import React from 'react';

interface ScreenReaderAnnouncementProps {
  message: string;
  priority?: 'polite' | 'assertive';
  className?: string;
}

export default function ScreenReaderAnnouncement({
  message,
  priority = 'polite',
  className = ''
}: ScreenReaderAnnouncementProps) {
  return (
    <div
      className={`sr-only ${className}`}
      aria-live={priority}
      aria-atomic="true"
      role="status"
    >
      {message}
    </div>
  );
}
