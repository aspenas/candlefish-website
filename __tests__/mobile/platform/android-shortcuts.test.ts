import { AndroidShortcutsService } from '../../../apps/mobile-dashboard/src/services/platform/android-shortcuts';
import { ShortcutManager } from 'react-native-shortcuts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, PermissionsAndroid } from 'react-native';

// Mock react-native-shortcuts
jest.mock('react-native-shortcuts', () => ({
  ShortcutManager: {
    setDynamicShortcuts: jest.fn(),
    clearDynamicShortcuts: jest.fn(),
    addPinnedShortcut: jest.fn(),
    updateShortcuts: jest.fn(),
    getShortcuts: jest.fn(),
    removeShortcut: jest.fn(),
    isRequestPinShortcutSupported: jest.fn(),
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
}));

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
    Version: 33,
    select: jest.fn((obj) => obj.android || obj.default),
  },
  PermissionsAndroid: {
    request: jest.fn(),
    check: jest.fn(),
    PERMISSIONS: {
      INSTALL_SHORTCUT: 'android.permission.INSTALL_SHORTCUT',
    },
    RESULTS: {
      GRANTED: 'granted',
      DENIED: 'denied',
      NEVER_ASK_AGAIN: 'never_ask_again',
    },
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 393, height: 852 })),
  },
  DeviceEventEmitter: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
}));

// Mock Intent handling
jest.mock('react-native-intent-launcher', () => ({
  startActivity: jest.fn(),
  IntentConstant: {
    ACTION_CREATE_SHORTCUT: 'android.intent.action.CREATE_SHORTCUT',
  },
}));

describe('AndroidShortcutsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'android';
    Platform.Version = 33;
  });

  describe('Initialization', () => {
    it('should initialize shortcuts service on Android', async () => {
      // Arrange
      (ShortcutManager.getShortcuts as jest.Mock).mockResolvedValue([]);
      (PermissionsAndroid.check as jest.Mock).mockResolvedValue('granted');

      // Act
      await AndroidShortcutsService.initialize();

      // Assert
      expect(ShortcutManager.getShortcuts).toHaveBeenCalled();
      expect(PermissionsAndroid.check).toHaveBeenCalledWith(
        PermissionsAndroid.PERMISSIONS.INSTALL_SHORTCUT
      );
    });

    it('should skip initialization on non-Android platforms', async () => {
      // Arrange
      Platform.OS = 'ios';

      // Act
      const result = await AndroidShortcutsService.initialize();

      // Assert
      expect(result).toBe(false);
      expect(ShortcutManager.getShortcuts).not.toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      // Arrange
      (ShortcutManager.getShortcuts as jest.Mock).mockRejectedValue(
        new Error('Shortcuts initialization failed')
      );

      // Act & Assert
      await expect(AndroidShortcutsService.initialize()).resolves.not.toThrow();
    });

    it('should request permissions when not granted', async () => {
      // Arrange
      (PermissionsAndroid.check as jest.Mock).mockResolvedValue('denied');
      (PermissionsAndroid.request as jest.Mock).mockResolvedValue('granted');

      // Act
      await AndroidShortcutsService.initialize();

      // Assert
      expect(PermissionsAndroid.request).toHaveBeenCalledWith(
        PermissionsAndroid.PERMISSIONS.INSTALL_SHORTCUT
      );
    });
  });

  describe('Dynamic Shortcuts Management', () => {
    beforeEach(async () => {
      await AndroidShortcutsService.initialize();
    });

    it('should create dynamic shortcuts for dashboards', async () => {
      // Arrange
      const shortcuts = [
        {
          id: 'dashboard_main',
          label: 'Main Dashboard',
          shortLabel: 'Main',
          longLabel: 'Open Main Dashboard',
          iconName: 'ic_dashboard',
          data: JSON.stringify({
            action: 'open_dashboard',
            dashboardId: 'dashboard-123',
            screen: 'Dashboard',
          }),
        },
        {
          id: 'dashboard_analytics',
          label: 'Analytics Dashboard',
          shortLabel: 'Analytics',
          longLabel: 'View Analytics Dashboard',
          iconName: 'ic_analytics',
          data: JSON.stringify({
            action: 'open_dashboard',
            dashboardId: 'dashboard-456',
            screen: 'Analytics',
          }),
        },
      ];

      // Act
      await AndroidShortcutsService.setDynamicShortcuts(shortcuts);

      // Assert
      expect(ShortcutManager.setDynamicShortcuts).toHaveBeenCalledWith(shortcuts);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'dynamic_shortcuts',
        JSON.stringify(shortcuts)
      );
    });

    it('should update existing dynamic shortcuts', async () => {
      // Arrange
      const existingShortcuts = [
        {
          id: 'dashboard_main',
          label: 'Main Dashboard',
          shortLabel: 'Main',
        },
      ];

      const updatedShortcuts = [
        {
          id: 'dashboard_main',
          label: 'Updated Main Dashboard',
          shortLabel: 'Main',
          longLabel: 'Open Updated Main Dashboard',
        },
        {
          id: 'dashboard_new',
          label: 'New Dashboard',
          shortLabel: 'New',
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(existingShortcuts)
      );

      // Act
      await AndroidShortcutsService.updateDynamicShortcuts(updatedShortcuts);

      // Assert
      expect(ShortcutManager.updateShortcuts).toHaveBeenCalledWith(updatedShortcuts);
    });

    it('should clear all dynamic shortcuts', async () => {
      // Act
      await AndroidShortcutsService.clearDynamicShortcuts();

      // Assert
      expect(ShortcutManager.clearDynamicShortcuts).toHaveBeenCalled();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('dynamic_shortcuts');
    });

    it('should limit dynamic shortcuts to maximum allowed (4 on most devices)', async () => {
      // Arrange
      const tooManyShortcuts = Array.from({ length: 10 }, (_, i) => ({
        id: `shortcut_${i}`,
        label: `Shortcut ${i}`,
        shortLabel: `S${i}`,
      }));

      // Act
      await AndroidShortcutsService.setDynamicShortcuts(tooManyShortcuts);

      // Assert
      const calledShortcuts = (ShortcutManager.setDynamicShortcuts as jest.Mock)
        .mock.calls[0][0];
      expect(calledShortcuts).toHaveLength(4);
    });
  });

  describe('Pinned Shortcuts Management', () => {
    beforeEach(async () => {
      await AndroidShortcutsService.initialize();
    });

    it('should check if pinned shortcuts are supported', async () => {
      // Arrange
      (ShortcutManager.isRequestPinShortcutSupported as jest.Mock).mockResolvedValue(
        true
      );

      // Act
      const isSupported = await AndroidShortcutsService.isPinShortcutSupported();

      // Assert
      expect(isSupported).toBe(true);
      expect(ShortcutManager.isRequestPinShortcutSupported).toHaveBeenCalled();
    });

    it('should request to pin shortcut to launcher', async () => {
      // Arrange
      const shortcutConfig = {
        id: 'pin_dashboard_main',
        label: 'Main Dashboard',
        shortLabel: 'Main',
        longLabel: 'Quick access to Main Dashboard',
        iconName: 'ic_dashboard_pin',
        data: JSON.stringify({
          action: 'open_dashboard',
          dashboardId: 'dashboard-123',
          isPinned: true,
        }),
      };

      (ShortcutManager.isRequestPinShortcutSupported as jest.Mock).mockResolvedValue(
        true
      );
      (ShortcutManager.addPinnedShortcut as jest.Mock).mockResolvedValue({
        success: true,
      });

      // Act
      const result = await AndroidShortcutsService.requestPinShortcut(shortcutConfig);

      // Assert
      expect(result.success).toBe(true);
      expect(ShortcutManager.addPinnedShortcut).toHaveBeenCalledWith(shortcutConfig);
    });

    it('should handle unsupported pin shortcut requests', async () => {
      // Arrange
      (ShortcutManager.isRequestPinShortcutSupported as jest.Mock).mockResolvedValue(
        false
      );

      const shortcutConfig = {
        id: 'pin_dashboard',
        label: 'Dashboard',
        shortLabel: 'Dash',
      };

      // Act
      const result = await AndroidShortcutsService.requestPinShortcut(shortcutConfig);

      // Assert
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Pinned shortcuts not supported');
    });

    it('should handle pin shortcut errors', async () => {
      // Arrange
      (ShortcutManager.isRequestPinShortcutSupported as jest.Mock).mockResolvedValue(
        true
      );
      (ShortcutManager.addPinnedShortcut as jest.Mock).mockRejectedValue(
        new Error('Pin failed')
      );

      const shortcutConfig = {
        id: 'pin_dashboard',
        label: 'Dashboard',
        shortLabel: 'Dash',
      };

      // Act
      const result = await AndroidShortcutsService.requestPinShortcut(shortcutConfig);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Pin failed');
    });
  });

  describe('Shortcut Intent Handling', () => {
    it('should handle dashboard shortcut intents', async () => {
      // Arrange
      const intent = {
        action: 'open_dashboard',
        data: JSON.stringify({
          dashboardId: 'dashboard-123',
          screen: 'Dashboard',
          filters: { dateRange: 'last7days' },
        }),
      };

      // Act
      const result = await AndroidShortcutsService.handleShortcutIntent(intent);

      // Assert
      expect(result).toEqual({
        action: 'navigate',
        screen: 'Dashboard',
        params: {
          dashboardId: 'dashboard-123',
          filters: { dateRange: 'last7days' },
        },
      });
    });

    it('should handle analytics shortcut intents', async () => {
      // Arrange
      const intent = {
        action: 'open_analytics',
        data: JSON.stringify({
          screen: 'Analytics',
          report: 'user_engagement',
          timeframe: 'monthly',
        }),
      };

      // Act
      const result = await AndroidShortcutsService.handleShortcutIntent(intent);

      // Assert
      expect(result).toEqual({
        action: 'navigate',
        screen: 'Analytics',
        params: {
          report: 'user_engagement',
          timeframe: 'monthly',
        },
      });
    });

    it('should handle quick action shortcuts', async () => {
      // Arrange
      const intent = {
        action: 'quick_add_widget',
        data: JSON.stringify({
          widgetType: 'metric',
          dashboardId: 'dashboard-123',
        }),
      };

      // Act
      const result = await AndroidShortcutsService.handleShortcutIntent(intent);

      // Assert
      expect(result).toEqual({
        action: 'quick_action',
        type: 'add_widget',
        params: {
          widgetType: 'metric',
          dashboardId: 'dashboard-123',
        },
      });
    });

    it('should handle malformed intent data gracefully', async () => {
      // Arrange
      const intent = {
        action: 'open_dashboard',
        data: 'invalid_json_data',
      };

      // Act
      const result = await AndroidShortcutsService.handleShortcutIntent(intent);

      // Assert
      expect(result).toEqual({
        action: 'navigate',
        screen: 'Home',
        params: {},
      });
    });
  });

  describe('Adaptive Icons and Theming', () => {
    it('should create shortcuts with adaptive icons', async () => {
      // Arrange
      const shortcutConfig = {
        id: 'adaptive_dashboard',
        label: 'Dashboard',
        shortLabel: 'Dash',
        iconResource: 'ic_dashboard_adaptive',
        iconType: 'adaptive',
        backgroundColor: '#2196F3',
        foregroundColor: '#FFFFFF',
      };

      // Act
      await AndroidShortcutsService.createAdaptiveIconShortcut(shortcutConfig);

      // Assert
      expect(ShortcutManager.setDynamicShortcuts).toHaveBeenCalledWith([
        expect.objectContaining({
          iconName: 'ic_dashboard_adaptive',
          iconType: 'adaptive',
        }),
      ]);
    });

    it('should support themed shortcuts for Android 13+', async () => {
      // Arrange
      Platform.Version = 33; // Android 13
      const themedShortcut = {
        id: 'themed_dashboard',
        label: 'Dashboard',
        shortLabel: 'Dash',
        iconName: 'ic_dashboard_themed',
        supportsThemedIcon: true,
        monochromeIcon: 'ic_dashboard_mono',
      };

      // Act
      await AndroidShortcutsService.createThemedShortcut(themedShortcut);

      // Assert
      expect(ShortcutManager.setDynamicShortcuts).toHaveBeenCalledWith([
        expect.objectContaining({
          supportsThemedIcon: true,
          monochromeIcon: 'ic_dashboard_mono',
        }),
      ]);
    });

    it('should fallback to regular icons on older Android versions', async () => {
      // Arrange
      Platform.Version = 28; // Android 9
      const themedShortcut = {
        id: 'themed_dashboard',
        label: 'Dashboard',
        shortLabel: 'Dash',
        iconName: 'ic_dashboard_regular',
        supportsThemedIcon: true,
      };

      // Act
      await AndroidShortcutsService.createThemedShortcut(themedShortcut);

      // Assert
      expect(ShortcutManager.setDynamicShortcuts).toHaveBeenCalledWith([
        expect.objectContaining({
          iconName: 'ic_dashboard_regular',
          supportsThemedIcon: false,
        }),
      ]);
    });
  });

  describe('Shortcut Analytics and Usage', () => {
    it('should track shortcut usage', async () => {
      // Arrange
      const usage = {
        shortcutId: 'dashboard_main',
        action: 'open_dashboard',
        timestamp: Date.now(),
        source: 'launcher',
      };

      const mockTrackUsage = jest.fn().mockResolvedValue({ success: true });
      AndroidShortcutsService['trackShortcutUsage'] = mockTrackUsage;

      // Act
      await AndroidShortcutsService.trackUsage(usage);

      // Assert
      expect(mockTrackUsage).toHaveBeenCalledWith(usage);
    });

    it('should get shortcut usage statistics', async () => {
      // Arrange
      const mockStats = {
        totalUsage: 150,
        shortcuts: [
          { id: 'dashboard_main', usage: 85, lastUsed: '2024-01-15T10:30:00Z' },
          { id: 'dashboard_analytics', usage: 65, lastUsed: '2024-01-14T16:20:00Z' },
        ],
        topShortcut: 'dashboard_main',
      };

      const mockGetStats = jest.fn().mockResolvedValue(mockStats);
      AndroidShortcutsService['getUsageStatistics'] = mockGetStats;

      // Act
      const stats = await AndroidShortcutsService.getUsageStats();

      // Assert
      expect(stats).toEqual(mockStats);
      expect(mockGetStats).toHaveBeenCalled();
    });

    it('should optimize shortcuts based on usage', async () => {
      // Arrange
      const usageData = [
        { id: 'dashboard_main', usage: 85 },
        { id: 'dashboard_analytics', usage: 65 },
        { id: 'dashboard_sales', usage: 45 },
        { id: 'dashboard_marketing', usage: 25 },
        { id: 'dashboard_support', usage: 10 },
      ];

      // Act
      await AndroidShortcutsService.optimizeShortcutsByUsage(usageData);

      // Assert
      // Should keep top 4 most used shortcuts
      expect(ShortcutManager.setDynamicShortcuts).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'dashboard_main' }),
          expect.objectContaining({ id: 'dashboard_analytics' }),
          expect.objectContaining({ id: 'dashboard_sales' }),
          expect.objectContaining({ id: 'dashboard_marketing' }),
        ])
      );
    });
  });

  describe('Shortcut Context Menus (Android 7.1+)', () => {
    beforeEach(() => {
      Platform.Version = 30; // Android 11, supports context menus
    });

    it('should create shortcuts with context menu actions', async () => {
      // Arrange
      const shortcutWithMenu = {
        id: 'dashboard_with_menu',
        label: 'Dashboard',
        shortLabel: 'Dash',
        iconName: 'ic_dashboard',
        contextMenuActions: [
          {
            id: 'open_in_edit_mode',
            label: 'Edit Dashboard',
            iconName: 'ic_edit',
          },
          {
            id: 'share_dashboard',
            label: 'Share Dashboard',
            iconName: 'ic_share',
          },
          {
            id: 'export_data',
            label: 'Export Data',
            iconName: 'ic_export',
          },
        ],
      };

      // Act
      await AndroidShortcutsService.createShortcutWithContextMenu(shortcutWithMenu);

      // Assert
      expect(ShortcutManager.setDynamicShortcuts).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'dashboard_with_menu',
          contextMenuActions: expect.arrayContaining([
            expect.objectContaining({ id: 'open_in_edit_mode' }),
            expect.objectContaining({ id: 'share_dashboard' }),
            expect.objectContaining({ id: 'export_data' }),
          ]),
        }),
      ]);
    });

    it('should handle context menu action intents', async () => {
      // Arrange
      const contextIntent = {
        action: 'context_menu_action',
        shortcutId: 'dashboard_main',
        actionId: 'share_dashboard',
        data: JSON.stringify({
          dashboardId: 'dashboard-123',
        }),
      };

      // Act
      const result = await AndroidShortcutsService.handleContextMenuIntent(
        contextIntent
      );

      // Assert
      expect(result).toEqual({
        action: 'context_action',
        type: 'share_dashboard',
        params: {
          dashboardId: 'dashboard-123',
        },
      });
    });
  });

  describe('App Widgets Integration', () => {
    it('should create shortcuts for app widgets', async () => {
      // Arrange
      const widgetShortcut = {
        id: 'widget_dashboard_metrics',
        label: 'Dashboard Widget',
        shortLabel: 'Widget',
        iconName: 'ic_widget',
        data: JSON.stringify({
          action: 'configure_widget',
          widgetType: 'dashboard_metrics',
          size: 'medium',
        }),
      };

      // Act
      await AndroidShortcutsService.createWidgetShortcut(widgetShortcut);

      // Assert
      expect(ShortcutManager.setDynamicShortcuts).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'widget_dashboard_metrics',
          data: expect.stringContaining('configure_widget'),
        }),
      ]);
    });

    it('should handle widget configuration shortcuts', async () => {
      // Arrange
      const widgetIntent = {
        action: 'configure_widget',
        data: JSON.stringify({
          widgetType: 'dashboard_chart',
          size: 'large',
          dashboardId: 'dashboard-123',
        }),
      };

      // Act
      const result = await AndroidShortcutsService.handleWidgetShortcutIntent(
        widgetIntent
      );

      // Assert
      expect(result).toEqual({
        action: 'configure_widget',
        widgetType: 'dashboard_chart',
        size: 'large',
        dashboardId: 'dashboard-123',
      });
    });
  });

  describe('Backup and Restore', () => {
    it('should backup shortcut configurations', async () => {
      // Arrange
      const shortcuts = [
        { id: 'dashboard_1', label: 'Dashboard 1', shortLabel: 'D1' },
        { id: 'dashboard_2', label: 'Dashboard 2', shortLabel: 'D2' },
      ];

      (ShortcutManager.getShortcuts as jest.Mock).mockResolvedValue(shortcuts);

      // Act
      const backup = await AndroidShortcutsService.backupShortcuts();

      // Assert
      expect(backup.shortcuts).toEqual(shortcuts);
      expect(backup.timestamp).toBeTruthy();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'shortcuts_backup',
        JSON.stringify(backup)
      );
    });

    it('should restore shortcuts from backup', async () => {
      // Arrange
      const backup = {
        shortcuts: [
          { id: 'dashboard_1', label: 'Dashboard 1', shortLabel: 'D1' },
          { id: 'dashboard_2', label: 'Dashboard 2', shortLabel: 'D2' },
        ],
        timestamp: Date.now(),
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(backup)
      );

      // Act
      const result = await AndroidShortcutsService.restoreShortcuts();

      // Assert
      expect(result.success).toBe(true);
      expect(ShortcutManager.setDynamicShortcuts).toHaveBeenCalledWith(
        backup.shortcuts
      );
    });

    it('should handle restore with no backup available', async () => {
      // Arrange
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await AndroidShortcutsService.restoreShortcuts();

      // Assert
      expect(result.success).toBe(false);
      expect(result.reason).toBe('No backup available');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle shortcut creation failures', async () => {
      // Arrange
      (ShortcutManager.setDynamicShortcuts as jest.Mock).mockRejectedValue(
        new Error('Shortcut creation failed')
      );

      const shortcuts = [{ id: 'test', label: 'Test', shortLabel: 'T' }];

      // Act & Assert
      await expect(
        AndroidShortcutsService.setDynamicShortcuts(shortcuts)
      ).resolves.not.toThrow();
    });

    it('should handle invalid shortcut data gracefully', async () => {
      // Arrange
      const invalidShortcuts = [
        null,
        { id: '', label: 'Empty ID' }, // Invalid: empty ID
        { id: 'valid', label: '' }, // Invalid: empty label
      ].filter(Boolean);

      // Act
      await AndroidShortcutsService.setDynamicShortcuts(invalidShortcuts as any);

      // Assert
      // Should filter out invalid shortcuts
      expect(ShortcutManager.setDynamicShortcuts).toHaveBeenCalledWith([
        expect.objectContaining({
          id: expect.stringMatching(/.+/), // Non-empty ID
          label: expect.stringMatching(/.+/), // Non-empty label
        }),
      ]);
    });

    it('should handle permission denied scenarios', async () => {
      // Arrange
      (PermissionsAndroid.request as jest.Mock).mockResolvedValue('denied');

      // Act
      const result = await AndroidShortcutsService.initialize();

      // Assert
      expect(result).toBe(false);
    });
  });
});
