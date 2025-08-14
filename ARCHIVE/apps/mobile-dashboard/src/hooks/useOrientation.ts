import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

interface OrientationInfo {
  orientation: 'portrait' | 'landscape';
  dimensions: {
    width: number;
    height: number;
  };
}

export const useOrientation = (): OrientationInfo => {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [dimensions, setDimensions] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return { width, height };
  });

  useEffect(() => {
    const updateOrientation = () => {
      const { width, height } = Dimensions.get('window');
      setDimensions({ width, height });
      setOrientation(width > height ? 'landscape' : 'portrait');
    };

    // Initial update
    updateOrientation();

    // Listen for dimension changes
    const subscription = Dimensions.addEventListener('change', updateOrientation);

    return () => subscription?.remove();
  }, []);

  return {
    orientation,
    dimensions,
  };
};

export const useOrientationLock = (allowedOrientations: ScreenOrientation.OrientationLock[]) => {
  useEffect(() => {
    const lockOrientation = async () => {
      try {
        if (allowedOrientations.length === 1) {
          await ScreenOrientation.lockAsync(allowedOrientations[0]);
        } else {
          // If multiple orientations are allowed, unlock
          await ScreenOrientation.unlockAsync();
        }
      } catch (error) {
        console.error('Failed to set orientation lock:', error);
      }
    };

    lockOrientation();

    return () => {
      // Reset to default when component unmounts
      ScreenOrientation.unlockAsync().catch(console.error);
    };
  }, [allowedOrientations]);
};
