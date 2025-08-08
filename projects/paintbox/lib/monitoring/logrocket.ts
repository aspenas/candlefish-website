export const trackFormInteraction = (action: string, event?: string, data?: any) => {
  // Placeholder for LogRocket tracking
  if (typeof window !== 'undefined') {
    console.log('Track:', action, event, data);
  }
};
