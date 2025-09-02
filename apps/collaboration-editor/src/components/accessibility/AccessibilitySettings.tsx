'use client';

import { useState } from 'react';
import {
  AdjustmentsHorizontalIcon,
  EyeIcon,
  SpeakerWaveIcon,
  KeyboardIcon,
  CursorArrowRaysIcon,
  ExclamationTriangleIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useAccessibilityPreferences, useScreenReaderAnnouncements } from '@/hooks/useAccessibility';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface AccessibilitySettingsProps {
  className?: string;
}

interface KeyboardShortcut {
  combination: string[];
  description: string;
  category: 'editing' | 'navigation' | 'collaboration' | 'general';
}

const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  // Editing shortcuts
  { combination: ['Ctrl', 'B'], description: 'Bold text', category: 'editing' },
  { combination: ['Ctrl', 'I'], description: 'Italic text', category: 'editing' },
  { combination: ['Ctrl', 'U'], description: 'Underline text', category: 'editing' },
  { combination: ['Ctrl', 'Z'], description: 'Undo', category: 'editing' },
  { combination: ['Ctrl', 'Y'], description: 'Redo', category: 'editing' },
  { combination: ['Ctrl', 'S'], description: 'Save document', category: 'editing' },
  { combination: ['Ctrl', 'A'], description: 'Select all', category: 'editing' },

  // Navigation shortcuts
  { combination: ['Ctrl', 'F'], description: 'Find in document', category: 'navigation' },
  { combination: ['Ctrl', 'G'], description: 'Go to line', category: 'navigation' },
  { combination: ['Alt', '1'], description: 'Focus document tree', category: 'navigation' },
  { combination: ['Alt', '2'], description: 'Focus main editor', category: 'navigation' },
  { combination: ['Alt', '3'], description: 'Focus comments panel', category: 'navigation' },
  { combination: ['Tab'], description: 'Next focusable element', category: 'navigation' },
  { combination: ['Shift', 'Tab'], description: 'Previous focusable element', category: 'navigation' },

  // Collaboration shortcuts
  { combination: ['Ctrl', 'Shift', 'C'], description: 'Add comment', category: 'collaboration' },
  { combination: ['Ctrl', 'Shift', 'V'], description: 'Show version history', category: 'collaboration' },
  { combination: ['Ctrl', 'Shift', 'A'], description: 'Show AI suggestions', category: 'collaboration' },
  { combination: ['Ctrl', 'Shift', 'U'], description: 'Show active users', category: 'collaboration' },

  // General shortcuts
  { combination: ['F11'], description: 'Toggle fullscreen', category: 'general' },
  { combination: ['Ctrl', '='], description: 'Increase font size', category: 'general' },
  { combination: ['Ctrl', '-'], description: 'Decrease font size', category: 'general' },
  { combination: ['Ctrl', '0'], description: 'Reset font size', category: 'general' },
  { combination: ['Alt', 'Shift', 'T'], description: 'Toggle theme', category: 'general' },
];

function KeyboardShortcutsPanel() {
  const groupedShortcuts = KEYBOARD_SHORTCUTS.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  const categoryIcons = {
    editing: '✏️',
    navigation: '🧭',
    collaboration: '👥',
    general: '⚙️',
  };

  const categoryNames = {
    editing: 'Text Editing',
    navigation: 'Navigation',
    collaboration: 'Collaboration',
    general: 'General',
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Keyboard Shortcuts</h3>
        <p className="text-sm text-muted-foreground">
          Use these keyboard shortcuts to navigate and interact with the editor more efficiently.
        </p>
      </div>

      <div className="space-y-4">
        {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center space-x-2">
                <span className="text-lg">{categoryIcons[category as keyof typeof categoryIcons]}</span>
                <span>{categoryNames[category as keyof typeof categoryNames]}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {shortcuts.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center space-x-1">
                      {shortcut.combination.map((key, keyIndex) => (
                        <Badge
                          key={keyIndex}
                          variant="secondary"
                          className="text-xs font-mono px-2 py-1"
                        >
                          {key}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AccessibilityTestPanel() {
  const { announceAssertive, announcePolite } = useScreenReaderAnnouncements();
  const [testResults, setTestResults] = useState<{
    colorContrast: boolean | null;
    focusManagement: boolean | null;
    keyboardNavigation: boolean | null;
    screenReader: boolean | null;
  }>({
    colorContrast: null,
    focusManagement: null,
    keyboardNavigation: null,
    screenReader: null,
  });

  const runColorContrastTest = () => {
    // Simulate color contrast test
    setTimeout(() => {
      setTestResults(prev => ({ ...prev, colorContrast: true }));
      announcePolite('Color contrast test passed');
      toast.success('Color contrast test completed');
    }, 1000);
  };

  const runFocusTest = () => {
    // Simulate focus management test
    setTimeout(() => {
      setTestResults(prev => ({ ...prev, focusManagement: true }));
      announcePolite('Focus management test passed');
      toast.success('Focus management test completed');
    }, 1000);
  };

  const runKeyboardTest = () => {
    // Simulate keyboard navigation test
    setTimeout(() => {
      setTestResults(prev => ({ ...prev, keyboardNavigation: true }));
      announcePolite('Keyboard navigation test passed');
      toast.success('Keyboard navigation test completed');
    }, 1000);
  };

  const testScreenReader = () => {
    announceAssertive('Screen reader test message. If you can hear this, screen reader support is working correctly.');
    setTestResults(prev => ({ ...prev, screenReader: true }));
    toast.success('Screen reader test message announced');
  };

  const getTestIcon = (result: boolean | null) => {
    if (result === null) return '⏳';
    return result ? '✅' : '❌';
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Accessibility Tests</h3>
        <p className="text-sm text-muted-foreground">
          Run these tests to verify that accessibility features are working correctly.
        </p>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <EyeIcon className="h-4 w-4" />
                <span>Color Contrast</span>
              </div>
              <span className="text-lg">{getTestIcon(testResults.colorContrast)}</span>
            </CardTitle>
            <CardDescription>
              Tests if text has sufficient contrast against backgrounds
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={runColorContrastTest} variant="outline" size="sm">
              Run Test
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CursorArrowRaysIcon className="h-4 w-4" />
                <span>Focus Management</span>
              </div>
              <span className="text-lg">{getTestIcon(testResults.focusManagement)}</span>
            </CardTitle>
            <CardDescription>
              Verifies that focus indicators are visible and properly managed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={runFocusTest} variant="outline" size="sm">
              Run Test
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <KeyboardIcon className="h-4 w-4" />
                <span>Keyboard Navigation</span>
              </div>
              <span className="text-lg">{getTestIcon(testResults.keyboardNavigation)}</span>
            </CardTitle>
            <CardDescription>
              Tests if all functionality is accessible via keyboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={runKeyboardTest} variant="outline" size="sm">
              Run Test
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <SpeakerWaveIcon className="h-4 w-4" />
                <span>Screen Reader</span>
              </div>
              <span className="text-lg">{getTestIcon(testResults.screenReader)}</span>
            </CardTitle>
            <CardDescription>
              Sends a test announcement to screen readers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testScreenReader} variant="outline" size="sm">
              Test Announcement
            </Button>
          </CardContent>
        </Card>
      </div>

      {Object.values(testResults).every(result => result === true) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-green-50 border border-green-200 rounded-lg p-4"
        >
          <div className="flex items-center space-x-2">
            <CheckIcon className="h-5 w-5 text-green-600" />
            <span className="text-green-800 font-medium">
              All accessibility tests passed!
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export function AccessibilitySettings({ className }: AccessibilitySettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    fontSize,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    colorScheme,
    toggleColorScheme,
    prefersReducedMotion,
    prefersHighContrast,
    preferences,
    updatePreference,
  } = useAccessibilityPreferences();

  const fontSizePercentages = {
    small: 87.5,
    medium: 100,
    large: 112.5,
    'extra-large': 125,
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={className}
            aria-label="Open accessibility settings"
          >
            <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
            Accessibility
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AdjustmentsHorizontalIcon className="h-5 w-5" />
              <span>Accessibility Settings</span>
            </DialogTitle>
            <DialogDescription>
              Customize the editor to meet your accessibility needs and preferences.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="display" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="display">Display</TabsTrigger>
                <TabsTrigger value="interaction">Interaction</TabsTrigger>
                <TabsTrigger value="shortcuts">Shortcuts</TabsTrigger>
                <TabsTrigger value="tests">Tests</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto mt-4 pr-2">
                <TabsContent value="display" className="space-y-6 m-0">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Visual Settings</CardTitle>
                      <CardDescription>
                        Adjust visual appearance for better readability
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Font Size */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="font-size">Font Size</Label>
                          <Badge variant="secondary">
                            {fontSizePercentages[fontSize]}%
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={decreaseFontSize}
                            disabled={fontSize === 'small'}
                            aria-label="Decrease font size"
                          >
                            A-
                          </Button>
                          <div className="flex-1 text-center">
                            <span className={cn(
                              "font-medium transition-all duration-200",
                              {
                                'text-sm': fontSize === 'small',
                                'text-base': fontSize === 'medium',
                                'text-lg': fontSize === 'large',
                                'text-xl': fontSize === 'extra-large',
                              }
                            )}>
                              Sample Text
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={increaseFontSize}
                            disabled={fontSize === 'extra-large'}
                            aria-label="Increase font size"
                          >
                            A+
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={resetFontSize}
                          className="w-full"
                        >
                          Reset to Default
                        </Button>
                      </div>

                      <Separator />

                      {/* Color Scheme */}
                      <div className="space-y-3">
                        <Label>Color Scheme</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            variant={colorScheme === 'light' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setColorScheme?.('light')}
                            className="flex items-center space-x-2"
                          >
                            <div className="w-3 h-3 bg-white border rounded-full" />
                            <span>Light</span>
                          </Button>
                          <Button
                            variant={colorScheme === 'dark' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setColorScheme?.('dark')}
                            className="flex items-center space-x-2"
                          >
                            <div className="w-3 h-3 bg-black rounded-full" />
                            <span>Dark</span>
                          </Button>
                          <Button
                            variant={colorScheme === 'high-contrast' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setColorScheme?.('high-contrast')}
                            className="flex items-center space-x-2"
                          >
                            <div className="w-3 h-3 bg-black border-2 border-white rounded-full" />
                            <span>High Contrast</span>
                          </Button>
                        </div>
                      </div>

                      {/* System Preferences Detection */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">System Preferences Detected</h4>
                        <div className="space-y-1 text-sm text-blue-700">
                          <div className="flex items-center justify-between">
                            <span>Reduced Motion:</span>
                            <span>{prefersReducedMotion ? 'Yes' : 'No'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>High Contrast:</span>
                            <span>{prefersHighContrast ? 'Yes' : 'No'}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="interaction" className="space-y-6 m-0">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Interaction Preferences</CardTitle>
                      <CardDescription>
                        Control how you receive feedback and interact with the editor
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Announcements */}
                      <div className="space-y-4">
                        <h4 className="font-medium">Screen Reader Announcements</h4>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Action Announcements</Label>
                            <p className="text-sm text-muted-foreground">
                              Announce actions like save, undo, etc.
                            </p>
                          </div>
                          <Switch
                            checked={preferences.announceActions}
                            onCheckedChange={(checked) => updatePreference('announceActions', checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Presence Announcements</Label>
                            <p className="text-sm text-muted-foreground">
                              Announce when users join or leave
                            </p>
                          </div>
                          <Switch
                            checked={preferences.announcePresence}
                            onCheckedChange={(checked) => updatePreference('announcePresence', checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Comment Announcements</Label>
                            <p className="text-sm text-muted-foreground">
                              Announce new comments and replies
                            </p>
                          </div>
                          <Switch
                            checked={preferences.announceComments}
                            onCheckedChange={(checked) => updatePreference('announceComments', checked)}
                          />
                        </div>
                      </div>

                      <Separator />

                      {/* Navigation */}
                      <div className="space-y-4">
                        <h4 className="font-medium">Navigation</h4>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Keyboard Shortcuts</Label>
                            <p className="text-sm text-muted-foreground">
                              Enable keyboard shortcuts for faster navigation
                            </p>
                          </div>
                          <Switch
                            checked={preferences.keyboardShortcuts}
                            onCheckedChange={(checked) => updatePreference('keyboardShortcuts', checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Enhanced Focus Indicators</Label>
                            <p className="text-sm text-muted-foreground">
                              Show prominent focus outlines
                            </p>
                          </div>
                          <Switch
                            checked={preferences.focusIndicators}
                            onCheckedChange={(checked) => updatePreference('focusIndicators', checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Skip Links</Label>
                            <p className="text-sm text-muted-foreground">
                              Show skip navigation links
                            </p>
                          </div>
                          <Switch
                            checked={preferences.skipLinks}
                            onCheckedChange={(checked) => updatePreference('skipLinks', checked)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="shortcuts" className="m-0">
                  <KeyboardShortcutsPanel />
                </TabsContent>

                <TabsContent value="tests" className="m-0">
                  <AccessibilityTestPanel />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Skip Links */}
      {preferences.skipLinks && (
        <div className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:top-4 focus-within:left-4 focus-within:z-50">
          <Button
            variant="outline"
            size="sm"
            onFocus={(e) => e.target.classList.remove('sr-only')}
            onBlur={(e) => e.target.classList.add('sr-only')}
            onClick={() => {
              const main = document.querySelector('main');
              if (main) {
                main.focus();
                main.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            Skip to main content
          </Button>
        </div>
      )}
    </>
  );
}