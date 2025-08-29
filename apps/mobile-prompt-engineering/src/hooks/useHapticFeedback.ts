import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useAppSelector } from './redux';

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

export const useHapticFeedback = () => {
  const { settings } = useAppSelector((state) => state.settings);
  const hapticEnabled = settings?.ui?.hapticFeedback !== false;

  const triggerHaptic = useCallback(async (type: HapticType) => {
    if (!hapticEnabled) return;

    try {
      switch (type) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case 'selection':
          await Haptics.selectionAsync();
          break;
      }
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [hapticEnabled]);

  return {
    triggerHaptic,
    hapticEnabled
  };
};