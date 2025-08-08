'use client';

import React, { useState } from 'react';
import { animated, useSpring } from '@react-spring/web';

export default function TestAnimations() {
  const [clicked, setClicked] = useState(false);

  // Simple spring animation
  const props = useSpring({
    from: { opacity: 0, transform: 'scale(0.8)' },
    to: { opacity: 1, transform: clicked ? 'scale(1.2)' : 'scale(1)' },
    config: { tension: 300, friction: 20 }
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-8">Animation Test Page</h1>

        <animated.div style={props} className="inline-block">
          <button
            onClick={() => setClicked(!clicked)}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Click me to test animation!
          </button>
        </animated.div>

        <p className="mt-8 text-gray-600">
          If animations are working, this button should scale when clicked.
        </p>
      </div>
    </div>
  );
}
