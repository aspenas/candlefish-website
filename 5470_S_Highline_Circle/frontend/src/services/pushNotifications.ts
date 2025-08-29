// Push Notifications Service for PWA
export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
}

export interface SubscriptionInfo {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userId?: string;
  deviceInfo?: {
    userAgent: string;
    platform: string;
    mobile: boolean;
  };
}

class PushNotificationService {
  private vapidPublicKey = 'YOUR_VAPID_PUBLIC_KEY'; // Replace with actual VAPID key
  private apiUrl = '/api/v1';
  private subscription: PushSubscription | null = null;

  constructor() {
    this.init();
  }

  // Initialize push notifications
  async init() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications are not supported');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        this.subscription = existingSubscription;
        console.log('Existing push subscription found');
        return true;
      }
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }

    return false;
  }

  // Request notification permission
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }

    let permission = Notification.permission;

    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission === 'granted') {
      console.log('Notification permission granted');
      return true;
    } else {
      console.warn('Notification permission denied');
      return false;
    }
  }

  // Subscribe to push notifications
  async subscribe(): Promise<SubscriptionInfo | null> {
    try {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        throw new Error('Notification permission not granted');
      }

      const registration = await navigator.serviceWorker.ready;
      
      // Convert VAPID key
      const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      this.subscription = subscription;

      // Prepare subscription data
      const subscriptionInfo: SubscriptionInfo = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: this.arrayBufferToBase64(subscription.getKey('auth')!)
        },
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          mobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        }
      };

      // Send subscription to server
      await this.sendSubscriptionToServer(subscriptionInfo);

      console.log('Push notification subscription successful');
      return subscriptionInfo;

    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe(): Promise<boolean> {
    try {
      if (!this.subscription) {
        const registration = await navigator.serviceWorker.ready;
        this.subscription = await registration.pushManager.getSubscription();
      }

      if (this.subscription) {
        const successful = await this.subscription.unsubscribe();
        
        if (successful) {
          // Remove subscription from server
          await this.removeSubscriptionFromServer(this.subscription.endpoint);
          this.subscription = null;
          console.log('Push notification unsubscription successful');
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Push unsubscription failed:', error);
      return false;
    }
  }

  // Check if subscribed
  async isSubscribed(): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return !!subscription;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }

  // Get current subscription
  async getSubscription(): Promise<PushSubscription | null> {
    try {
      const registration = await navigator.serviceWorker.ready;
      return await registration.pushManager.getSubscription();
    } catch (error) {
      console.error('Error getting subscription:', error);
      return null;
    }
  }

  // Show local notification (fallback)
  showLocalNotification(payload: NotificationPayload) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      console.warn('Cannot show notification - permission not granted');
      return;
    }

    const notification = new Notification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/icon-192x192.png',
      badge: payload.badge || '/icon-72x72.png',
      tag: payload.tag || 'inventory-update',
      data: payload.data,
      requireInteraction: payload.requireInteraction,
      silent: payload.silent,
      actions: payload.actions
    });

    // Handle notification click
    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      
      // Handle custom data
      if (payload.data?.url) {
        window.location.href = payload.data.url;
      }
      
      notification.close();
    };

    // Auto-close after 5 seconds unless requireInteraction is true
    if (!payload.requireInteraction) {
      setTimeout(() => {
        notification.close();
      }, 5000);
    }
  }

  // Inventory-specific notification methods
  async notifyInventoryUpdate(itemName: string, action: 'added' | 'updated' | 'deleted') {
    const actions = {
      added: { title: 'New Item Added', emoji: '➕' },
      updated: { title: 'Item Updated', emoji: '✏️' },
      deleted: { title: 'Item Deleted', emoji: '🗑️' }
    };

    const actionInfo = actions[action];

    this.showLocalNotification({
      title: actionInfo.title,
      body: `${actionInfo.emoji} ${itemName}`,
      tag: 'inventory-update',
      data: { type: 'inventory', action, itemName }
    });
  }

  async notifyPhotoUpload(itemName: string, photoCount: number) {
    this.showLocalNotification({
      title: 'Photos Uploaded',
      body: `📸 ${photoCount} photos uploaded for ${itemName}`,
      tag: 'photo-upload',
      data: { type: 'photo-upload', itemName, photoCount }
    });
  }

  async notifySync(message: string) {
    this.showLocalNotification({
      title: 'Sync Complete',
      body: `🔄 ${message}`,
      tag: 'sync-complete',
      data: { type: 'sync' }
    });
  }

  async notifyValuation(itemName: string, estimatedValue: number) {
    this.showLocalNotification({
      title: 'New Valuation',
      body: `💰 ${itemName}: $${estimatedValue.toLocaleString()}`,
      tag: 'valuation-update',
      data: { type: 'valuation', itemName, estimatedValue },
      requireInteraction: true
    });
  }

  async notifyLowStorage() {
    this.showLocalNotification({
      title: 'Storage Warning',
      body: '⚠️ Device storage is running low. Consider uploading photos.',
      tag: 'storage-warning',
      data: { type: 'storage-warning' },
      requireInteraction: true
    });
  }

  async notifyBackgroundSync(itemsCount: number) {
    this.showLocalNotification({
      title: 'Background Sync',
      body: `📤 ${itemsCount} items synced in background`,
      tag: 'background-sync',
      data: { type: 'background-sync', itemsCount }
    });
  }

  // Utility methods
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
    return window.btoa(binary);
  }

  private async sendSubscriptionToServer(subscription: SubscriptionInfo): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscription)
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      console.log('Subscription sent to server successfully');
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
      // Continue anyway - local notifications will still work
    }
  }

  private async removeSubscriptionFromServer(endpoint: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/notifications/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ endpoint })
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      console.log('Subscription removed from server successfully');
    } catch (error) {
      console.error('Failed to remove subscription from server:', error);
    }
  }
}

// Create singleton instance
export const pushNotificationService = new PushNotificationService();

// React hook for push notifications
export const usePushNotifications = () => {
  const [isSubscribed, setIsSubscribed] = React.useState(false);
  const [permission, setPermission] = React.useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = React.useState(false);

  React.useEffect(() => {
    const checkSupport = () => {
      const supported = 'serviceWorker' in navigator && 
                       'PushManager' in window && 
                       'Notification' in window;
      setIsSupported(supported);
    };

    const checkPermission = () => {
      if ('Notification' in window) {
        setPermission(Notification.permission);
      }
    };

    const checkSubscription = async () => {
      const subscribed = await pushNotificationService.isSubscribed();
      setIsSubscribed(subscribed);
    };

    checkSupport();
    checkPermission();
    checkSubscription();
  }, []);

  const subscribe = React.useCallback(async () => {
    const subscription = await pushNotificationService.subscribe();
    if (subscription) {
      setIsSubscribed(true);
      setPermission('granted');
    }
    return !!subscription;
  }, []);

  const unsubscribe = React.useCallback(async () => {
    const success = await pushNotificationService.unsubscribe();
    if (success) {
      setIsSubscribed(false);
    }
    return success;
  }, []);

  return {
    isSupported,
    isSubscribed,
    permission,
    subscribe,
    unsubscribe,
    notifyInventoryUpdate: pushNotificationService.notifyInventoryUpdate.bind(pushNotificationService),
    notifyPhotoUpload: pushNotificationService.notifyPhotoUpload.bind(pushNotificationService),
    notifySync: pushNotificationService.notifySync.bind(pushNotificationService),
    notifyValuation: pushNotificationService.notifyValuation.bind(pushNotificationService),
    showNotification: pushNotificationService.showLocalNotification.bind(pushNotificationService)
  };
};

export default pushNotificationService;