import React from 'react';

export const PerformanceOverlay = ({ show = false }: any) => {
  const [fps, setFps] = React.useState(60);

  React.useEffect(() => {
    if (!show) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();

      if (currentTime - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = currentTime;
      }

      animationId = requestAnimationFrame(measureFPS);
    };

    animationId = requestAnimationFrame(measureFPS);

    return () => cancelAnimationFrame(animationId);
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed top-4 right-4 bg-black bg-opacity-80 text-white p-3 rounded-md">
      <div>FPS: {fps}</div>
      <div>Memory: {(performance as any).memory?.usedJSHeapSize ?
        `${Math.round((performance as any).memory.usedJSHeapSize / 1048576)}MB` : 'N/A'}</div>
    </div>
  );
};
