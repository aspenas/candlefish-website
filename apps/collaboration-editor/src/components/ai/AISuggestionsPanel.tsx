'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useSubscription, useMutation } from '@apollo/client';
import {
  SparklesIcon,
  CheckIcon,
  XMarkIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { AI_SUGGESTION_RECEIVED, APPLY_AI_SUGGESTION } from '@/graphql/operations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

interface AISuggestion {
  id: string;
  type: 'grammar' | 'style' | 'clarity' | 'structure' | 'tone' | 'factual' | 'creative';
  title: string;
  description: string;
  suggestion: string;
  confidence: number;
  position: {
    blockId: string;
    startOffset: number;
    endOffset: number;
  };
  metadata: {
    originalText?: string;
    suggestedText?: string;
    reasoning?: string;
    alternatives?: string[];
    impact?: 'low' | 'medium' | 'high';
    category?: string;
  };
  status: 'pending' | 'applied' | 'dismissed';
  createdAt: string;
  appliedAt?: string;
  priority?: 'low' | 'medium' | 'high';
}

interface AISuggestionsPanelProps {
  documentId: string;
  isVisible?: boolean;
  onToggleVisibility?: () => void;
  onApplySuggestion?: (suggestion: AISuggestion) => void;
  onDismissSuggestion?: (suggestionId: string) => void;
  className?: string;
}

interface SuggestionItemProps {
  suggestion: AISuggestion;
  isExpanded: boolean;
  onToggle: () => void;
  onApply: () => void;
  onDismiss: () => void;
  onViewInContext: () => void;
}

interface AISettingsProps {
  settings: AISettings;
  onSettingsChange: (settings: AISettings) => void;
}

interface AISettings {
  enabled: boolean;
  confidence: number;
  types: {
    grammar: boolean;
    style: boolean;
    clarity: boolean;
    structure: boolean;
    tone: boolean;
    factual: boolean;
    creative: boolean;
  };
  realtime: boolean;
  notifications: boolean;
}

// AI suggestion item component
function SuggestionItem({
  suggestion,
  isExpanded,
  onToggle,
  onApply,
  onDismiss,
  onViewInContext,
}: SuggestionItemProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'grammar':
        return '📝';
      case 'style':
        return '🎨';
      case 'clarity':
        return '💡';
      case 'structure':
        return '🏗️';
      case 'tone':
        return '🎭';
      case 'factual':
        return '📊';
      case 'creative':
        return '✨';
      default:
        return '🤖';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'grammar':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'style':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'clarity':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'structure':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'tone':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'factual':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'creative':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500';
      case 'medium':
        return 'border-l-yellow-500';
      case 'low':
        return 'border-l-green-500';
      default:
        return 'border-l-gray-300';
    }
  };

  const confidenceColor = suggestion.confidence >= 0.8 
    ? 'text-green-600' 
    : suggestion.confidence >= 0.6 
    ? 'text-yellow-600' 
    : 'text-red-600';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "border rounded-lg p-4 border-l-4 bg-white hover:shadow-md transition-shadow",
        getPriorityColor(suggestion.priority || 'medium')
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {/* Type Icon */}
          <div className="text-2xl">{getTypeIcon(suggestion.type)}</div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <h4 className="font-medium text-sm truncate">{suggestion.title}</h4>
              <Badge className={cn("text-xs", getTypeColor(suggestion.type))}>
                {suggestion.type}
              </Badge>
              <div className={cn("text-xs font-medium", confidenceColor)}>
                {Math.round(suggestion.confidence * 100)}%
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-3">
              {suggestion.description}
            </p>

            {/* Preview */}
            {suggestion.metadata.originalText && (
              <div className="mb-3">
                <div className="bg-red-50 border border-red-200 rounded p-2 mb-2">
                  <div className="text-xs text-red-600 font-medium mb-1">Original:</div>
                  <div className="text-sm text-red-800">{suggestion.metadata.originalText}</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded p-2">
                  <div className="text-xs text-green-600 font-medium mb-1">Suggested:</div>
                  <div className="text-sm text-green-800">{suggestion.metadata.suggestedText}</div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center space-x-2 mb-2">
              <Button
                variant="default"
                size="sm"
                onClick={onApply}
                className="bg-green-600 hover:bg-green-700"
                disabled={suggestion.status === 'applied'}
              >
                <CheckIcon className="h-3 w-3 mr-1" />
                {suggestion.status === 'applied' ? 'Applied' : 'Apply'}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={onDismiss}
                disabled={suggestion.status === 'dismissed'}
              >
                <XMarkIcon className="h-3 w-3 mr-1" />
                {suggestion.status === 'dismissed' ? 'Dismissed' : 'Dismiss'}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onViewInContext}
              >
                View in Context
              </Button>
            </div>

            {/* Toggle Details */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="text-xs h-6"
            >
              {isExpanded ? (
                <>
                  <ChevronDownIcon className="h-3 w-3 mr-1" />
                  Less Details
                </>
              ) : (
                <>
                  <ChevronRightIcon className="h-3 w-3 mr-1" />
                  More Details
                </>
              )}
            </Button>

            {/* Expanded Details */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-3 pt-3 border-t overflow-hidden"
                >
                  <div className="space-y-3 text-sm">
                    {/* Reasoning */}
                    {suggestion.metadata.reasoning && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-1">Why this suggestion?</h5>
                        <p className="text-gray-600">{suggestion.metadata.reasoning}</p>
                      </div>
                    )}

                    {/* Alternatives */}
                    {suggestion.metadata.alternatives && suggestion.metadata.alternatives.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Alternative suggestions:</h5>
                        <div className="space-y-1">
                          {suggestion.metadata.alternatives.map((alt, index) => (
                            <div key={index} className="flex items-center justify-between bg-gray-50 rounded p-2">
                              <span className="text-gray-700">{alt}</span>
                              <Button variant="ghost" size="sm" className="h-6 text-xs">
                                Use This
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                      <div>
                        <span className="font-medium">Impact:</span> {suggestion.metadata.impact || 'medium'}
                      </div>
                      <div>
                        <span className="font-medium">Category:</span> {suggestion.metadata.category || 'general'}
                      </div>
                      <div>
                        <span className="font-medium">Created:</span> {new Date(suggestion.createdAt).toLocaleString()}
                      </div>
                      <div>
                        <span className="font-medium">Position:</span> {suggestion.position.startOffset}-{suggestion.position.endOffset}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// AI Settings Component
function AISettingsPanel({ settings, onSettingsChange }: AISettingsProps) {
  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">AI Assistant Settings</h3>
        <Switch
          checked={settings.enabled}
          onCheckedChange={(enabled) =>
            onSettingsChange({ ...settings, enabled })
          }
        />
      </div>

      {settings.enabled && (
        <div className="space-y-4">
          {/* Confidence Threshold */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Confidence Threshold: {Math.round(settings.confidence * 100)}%
            </label>
            <Slider
              value={[settings.confidence]}
              onValueChange={([value]) =>
                onSettingsChange({ ...settings, confidence: value })
              }
              max={1}
              min={0.1}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Only show suggestions with at least this confidence level
            </p>
          </div>

          {/* Suggestion Types */}
          <div>
            <h4 className="text-sm font-medium mb-3">Suggestion Types</h4>
            <div className="space-y-3">
              {Object.entries(settings.types).map(([type, enabled]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{type === 'grammar' ? '📝' : type === 'style' ? '🎨' : type === 'clarity' ? '💡' : type === 'structure' ? '🏗️' : type === 'tone' ? '🎭' : type === 'factual' ? '📊' : '✨'}</span>
                    <span className="text-sm capitalize">{type}</span>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked) =>
                      onSettingsChange({
                        ...settings,
                        types: { ...settings.types, [type]: checked },
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Real-time suggestions */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Real-time Suggestions</div>
              <div className="text-xs text-muted-foreground">
                Show suggestions as you type
              </div>
            </div>
            <Switch
              checked={settings.realtime}
              onCheckedChange={(realtime) =>
                onSettingsChange({ ...settings, realtime })
              }
            />
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Notifications</div>
              <div className="text-xs text-muted-foreground">
                Get notified of new suggestions
              </div>
            </div>
            <Switch
              checked={settings.notifications}
              onCheckedChange={(notifications) =>
                onSettingsChange({ ...settings, notifications })
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Main AI Suggestions Panel
export function AISuggestionsPanel({
  documentId,
  isVisible = true,
  onToggleVisibility,
  onApplySuggestion,
  onDismissSuggestion,
  className,
}: AISuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'pending' | 'applied' | 'dismissed' | 'all'>('pending');
  const [settings, setSettings] = useState<AISettings>({
    enabled: true,
    confidence: 0.6,
    types: {
      grammar: true,
      style: true,
      clarity: true,
      structure: true,
      tone: false,
      factual: true,
      creative: false,
    },
    realtime: true,
    notifications: true,
  });

  // Subscribe to AI suggestions
  const { data: suggestionData } = useSubscription(AI_SUGGESTION_RECEIVED, {
    variables: { documentId },
    skip: !documentId || !settings.enabled,
  });

  const [applyAISuggestion] = useMutation(APPLY_AI_SUGGESTION);

  // Handle new suggestions
  useEffect(() => {
    if (suggestionData?.aiSuggestionReceived) {
      const newSuggestion = suggestionData.aiSuggestionReceived.insight;
      
      // Filter by confidence threshold and enabled types
      if (
        newSuggestion.confidence >= settings.confidence &&
        settings.types[newSuggestion.type as keyof typeof settings.types]
      ) {
        setSuggestions(prev => {
          // Avoid duplicates
          if (prev.some(s => s.id === newSuggestion.id)) {
            return prev;
          }
          return [newSuggestion, ...prev];
        });

        // Show notification if enabled
        if (settings.notifications) {
          toast.custom((t) => (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg max-w-md">
              <div className="flex items-start space-x-3">
                <SparklesIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    New AI suggestion
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    {newSuggestion.title}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toast.dismiss(t.id)}
                  className="h-6 w-6 p-0"
                >
                  <XMarkIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ), {
            duration: 5000,
          });
        }
      }
    }
  }, [suggestionData, settings]);

  const handleApplySuggestion = useCallback(async (suggestion: AISuggestion) => {
    try {
      await applyAISuggestion({
        variables: {
          id: suggestion.id,
          action: 'ACCEPT',
        },
      });

      setSuggestions(prev =>
        prev.map(s =>
          s.id === suggestion.id
            ? { ...s, status: 'applied', appliedAt: new Date().toISOString() }
            : s
        )
      );

      onApplySuggestion?.(suggestion);
      toast.success('Suggestion applied successfully');
    } catch (error) {
      toast.error('Failed to apply suggestion');
    }
  }, [applyAISuggestion, onApplySuggestion]);

  const handleDismissSuggestion = useCallback(async (suggestionId: string) => {
    try {
      await applyAISuggestion({
        variables: {
          id: suggestionId,
          action: 'REJECT',
        },
      });

      setSuggestions(prev =>
        prev.map(s =>
          s.id === suggestionId
            ? { ...s, status: 'dismissed' }
            : s
        )
      );

      onDismissSuggestion?.(suggestionId);
      toast.success('Suggestion dismissed');
    } catch (error) {
      toast.error('Failed to dismiss suggestion');
    }
  }, [applyAISuggestion, onDismissSuggestion]);

  const handleToggleExpanded = useCallback((suggestionId: string) => {
    setExpandedSuggestions(prev => {
      const next = new Set(prev);
      if (next.has(suggestionId)) {
        next.delete(suggestionId);
      } else {
        next.add(suggestionId);
      }
      return next;
    });
  }, []);

  const handleViewInContext = useCallback((suggestion: AISuggestion) => {
    // Scroll to and highlight the relevant text in the editor
    const blockElement = document.querySelector(`[data-lexical-editor] [data-key="${suggestion.position.blockId}"]`);
    if (blockElement) {
      blockElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add temporary highlight
      blockElement.classList.add('highlight-suggestion');
      setTimeout(() => {
        blockElement.classList.remove('highlight-suggestion');
      }, 3000);
    }
  }, []);

  const filteredSuggestions = useMemo(() => {
    return suggestions.filter(suggestion => {
      switch (activeTab) {
        case 'pending':
          return suggestion.status === 'pending';
        case 'applied':
          return suggestion.status === 'applied';
        case 'dismissed':
          return suggestion.status === 'dismissed';
        default:
          return true;
      }
    });
  }, [suggestions, activeTab]);

  const suggestionCounts = useMemo(() => {
    return suggestions.reduce(
      (counts, suggestion) => {
        counts[suggestion.status]++;
        counts.all++;
        return counts;
      },
      { pending: 0, applied: 0, dismissed: 0, all: 0 }
    );
  }, [suggestions]);

  if (!isVisible) return null;

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <SparklesIcon className="h-5 w-5 text-blue-600" />
            <span>AI Assistant</span>
          </div>
          {onToggleVisibility && (
            <Button variant="ghost" size="sm" onClick={onToggleVisibility}>
              <XMarkIcon className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="flex-1 flex flex-col">
          <div className="px-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pending" className="relative">
                Pending
                {suggestionCounts.pending > 0 && (
                  <Badge className="ml-1 h-4 w-4 p-0 text-xs bg-red-500">
                    {suggestionCounts.pending}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="applied">
                Applied
                {suggestionCounts.applied > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-xs">
                    {suggestionCounts.applied}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="dismissed">
                Dismissed
                {suggestionCounts.dismissed > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-xs">
                    {suggestionCounts.dismissed}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="all">
                All ({suggestionCounts.all})
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 mt-4">
            <TabsContent value="pending" className="h-full m-0">
              <ScrollArea className="h-full px-4">
                {filteredSuggestions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <LightBulbIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No pending suggestions</p>
                    <p className="text-sm">Keep writing for AI-powered suggestions!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredSuggestions.map((suggestion) => (
                      <SuggestionItem
                        key={suggestion.id}
                        suggestion={suggestion}
                        isExpanded={expandedSuggestions.has(suggestion.id)}
                        onToggle={() => handleToggleExpanded(suggestion.id)}
                        onApply={() => handleApplySuggestion(suggestion)}
                        onDismiss={() => handleDismissSuggestion(suggestion.id)}
                        onViewInContext={() => handleViewInContext(suggestion)}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="applied" className="h-full m-0">
              <ScrollArea className="h-full px-4">
                {filteredSuggestions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No applied suggestions yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredSuggestions.map((suggestion) => (
                      <SuggestionItem
                        key={suggestion.id}
                        suggestion={suggestion}
                        isExpanded={expandedSuggestions.has(suggestion.id)}
                        onToggle={() => handleToggleExpanded(suggestion.id)}
                        onApply={() => handleApplySuggestion(suggestion)}
                        onDismiss={() => handleDismissSuggestion(suggestion.id)}
                        onViewInContext={() => handleViewInContext(suggestion)}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="dismissed" className="h-full m-0">
              <ScrollArea className="h-full px-4">
                {filteredSuggestions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <XMarkIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No dismissed suggestions</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredSuggestions.map((suggestion) => (
                      <SuggestionItem
                        key={suggestion.id}
                        suggestion={suggestion}
                        isExpanded={expandedSuggestions.has(suggestion.id)}
                        onToggle={() => handleToggleExpanded(suggestion.id)}
                        onApply={() => handleApplySuggestion(suggestion)}
                        onDismiss={() => handleDismissSuggestion(suggestion.id)}
                        onViewInContext={() => handleViewInContext(suggestion)}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="all" className="h-full m-0">
              <Tabs defaultValue="suggestions" className="h-full">
                <div className="px-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="suggestions">All Suggestions</TabsTrigger>
                    <TabsTrigger value="settings">
                      <AdjustmentsHorizontalIcon className="h-4 w-4 mr-1" />
                      Settings
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="suggestions" className="h-full m-0 mt-4">
                  <ScrollArea className="h-full px-4">
                    {suggestions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <SparklesIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No suggestions yet</p>
                        <p className="text-sm">AI suggestions will appear as you write</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {suggestions.map((suggestion) => (
                          <SuggestionItem
                            key={suggestion.id}
                            suggestion={suggestion}
                            isExpanded={expandedSuggestions.has(suggestion.id)}
                            onToggle={() => handleToggleExpanded(suggestion.id)}
                            onApply={() => handleApplySuggestion(suggestion)}
                            onDismiss={() => handleDismissSuggestion(suggestion.id)}
                            onViewInContext={() => handleViewInContext(suggestion)}
                          />
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="settings" className="h-full m-0 mt-4">
                  <ScrollArea className="h-full">
                    <AISettingsPanel
                      settings={settings}
                      onSettingsChange={setSettings}
                    />
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}