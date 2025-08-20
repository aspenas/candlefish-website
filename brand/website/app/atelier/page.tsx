'use client';

import React from 'react';
import { EntryPortal } from '../../components/atelier/EntryPortal';
import { OperationalStatement } from '../../components/atelier/OperationalStatement';
import { AmbientAudio } from '../../components/atelier/AmbientAudio';
import { CursorTrail } from '../../components/atelier/CursorTrail';
import { TemporalEvolution } from '../../components/atelier/TemporalEvolution';

export default function Home() {
  return (
    <div className="min-h-screen relative">
      {/* Temporal Evolution - Time-based atmosphere */}
      <TemporalEvolution />
      
      {/* Entry Portal - WebGL Background */}
      <EntryPortal />
      
      {/* Main Content Layer */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <div className="max-w-6xl mx-auto">
          <OperationalStatement />
        </div>
      </div>

      {/* Interactive Cursor Trail */}
      <CursorTrail />

      {/* Ambient Audio Control */}
      <AmbientAudio />
    </div>
  );
}