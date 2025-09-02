/**
 * NANDA AI Integration Service
 * Provides AI suggestions and assistance for document editing
 */

import Config from '@/constants/config';
import { getAuthToken } from './auth';
import { Document, ContentBlock } from '@/types';

export interface AISuggestion {
  id: string;
  type: 'completion' | 'improvement' | 'correction' | 'formatting';
  title: string;
  description: string;
  content: string;
  confidence: number;
  position?: {
    blockId: string;
    offset: number;
    length: number;
  };
  metadata?: {
    originalText?: string;
    reasoning?: string;
    sources?: string[];
  };
}

export interface AIContext {
  documentType: string;
  currentContent: string;
  userIntent?: string;
  collaborators?: string[];
  recentChanges?: any[];
}

class NandaIntegrationService {
  private baseUrl: string;
  private isEnabled: boolean;

  constructor() {
    this.baseUrl = Config.NANDA_ENDPOINT;
    this.isEnabled = Config.FEATURES.AI_SUGGESTIONS;
  }

  /**
   * Get AI suggestions for document content
   */
  public async getSuggestions(
    document: Document,
    context?: Partial<AIContext>
  ): Promise<AISuggestion[]> {
    if (!this.isEnabled) return [];

    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`${this.baseUrl}/ai/suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          documentId: document.id,
          documentType: document.type,
          content: this.extractPlainText(document),
          blocks: document.content?.blocks || [],
          context: {
            documentType: document.type,
            currentContent: this.extractPlainText(document),
            ...context,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`NANDA API error: ${response.status}`);
      }

      const data = await response.json();
      return data.suggestions || [];
    } catch (error) {
      console.error('Failed to get AI suggestions:', error);
      return [];
    }
  }

  /**
   * Get text completion suggestions
   */
  public async getTextCompletion(
    text: string,
    cursorPosition: number,
    context?: Partial<AIContext>
  ): Promise<string[]> {
    if (!this.isEnabled) return [];

    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`${this.baseUrl}/ai/completion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          text,
          cursorPosition,
          maxSuggestions: 3,
          context: context || {},
        }),
      });

      if (!response.ok) {
        throw new Error(`NANDA API error: ${response.status}`);
      }

      const data = await response.json();
      return data.completions || [];
    } catch (error) {
      console.error('Failed to get text completion:', error);
      return [];
    }
  }

  /**
   * Get content improvement suggestions
   */
  public async getContentImprovements(
    text: string,
    improvementType: 'clarity' | 'tone' | 'structure' | 'grammar'
  ): Promise<AISuggestion[]> {
    if (!this.isEnabled) return [];

    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`${this.baseUrl}/ai/improve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          text,
          improvementType,
          preserveStyle: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`NANDA API error: ${response.status}`);
      }

      const data = await response.json();
      return data.improvements || [];
    } catch (error) {
      console.error('Failed to get content improvements:', error);
      return [];
    }
  }

  /**
   * Generate document summary
   */
  public async generateSummary(
    document: Document,
    maxLength: number = 200
  ): Promise<string | null> {
    if (!this.isEnabled) return null;

    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`${this.baseUrl}/ai/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: this.extractPlainText(document),
          maxLength,
          documentType: document.type,
        }),
      });

      if (!response.ok) {
        throw new Error(`NANDA API error: ${response.status}`);
      }

      const data = await response.json();
      return data.summary || null;
    } catch (error) {
      console.error('Failed to generate summary:', error);
      return null;
    }
  }

  /**
   * Get writing style suggestions
   */
  public async getStyleSuggestions(
    text: string,
    targetStyle: 'professional' | 'casual' | 'academic' | 'creative'
  ): Promise<AISuggestion[]> {
    if (!this.isEnabled) return [];

    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`${this.baseUrl}/ai/style`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          text,
          targetStyle,
          preserveMeaning: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`NANDA API error: ${response.status}`);
      }

      const data = await response.json();
      return data.styleSuggestions || [];
    } catch (error) {
      console.error('Failed to get style suggestions:', error);
      return [];
    }
  }

  /**
   * Generate content from prompt
   */
  public async generateContent(
    prompt: string,
    contentType: 'paragraph' | 'list' | 'outline' | 'table',
    context?: Partial<AIContext>
  ): Promise<string | null> {
    if (!this.isEnabled) return null;

    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`${this.baseUrl}/ai/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt,
          contentType,
          context: context || {},
          maxTokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`NANDA API error: ${response.status}`);
      }

      const data = await response.json();
      return data.generatedContent || null;
    } catch (error) {
      console.error('Failed to generate content:', error);
      return null;
    }
  }

  /**
   * Detect and suggest document structure improvements
   */
  public async getStructureSuggestions(document: Document): Promise<AISuggestion[]> {
    if (!this.isEnabled) return [];

    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`${this.baseUrl}/ai/structure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: this.extractPlainText(document),
          blocks: document.content?.blocks || [],
          documentType: document.type,
        }),
      });

      if (!response.ok) {
        throw new Error(`NANDA API error: ${response.status}`);
      }

      const data = await response.json();
      return data.structureSuggestions || [];
    } catch (error) {
      console.error('Failed to get structure suggestions:', error);
      return [];
    }
  }

  /**
   * Get collaboration insights
   */
  public async getCollaborationInsights(
    document: Document,
    collaboratorChanges: any[]
  ): Promise<{
    conflictPredictions: any[];
    mergeSuggestions: any[];
    workflowRecommendations: any[];
  }> {
    if (!this.isEnabled) {
      return {
        conflictPredictions: [],
        mergeSuggestions: [],
        workflowRecommendations: [],
      };
    }

    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`${this.baseUrl}/ai/collaboration-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          documentId: document.id,
          content: this.extractPlainText(document),
          collaboratorChanges,
          analysisDepth: 'detailed',
        }),
      });

      if (!response.ok) {
        throw new Error(`NANDA API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        conflictPredictions: data.conflictPredictions || [],
        mergeSuggestions: data.mergeSuggestions || [],
        workflowRecommendations: data.workflowRecommendations || [],
      };
    } catch (error) {
      console.error('Failed to get collaboration insights:', error);
      return {
        conflictPredictions: [],
        mergeSuggestions: [],
        workflowRecommendations: [],
      };
    }
  }

  /**
   * Apply AI suggestion to document
   */
  public async applySuggestion(
    documentId: string,
    suggestion: AISuggestion
  ): Promise<boolean> {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`${this.baseUrl}/ai/apply-suggestion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          documentId,
          suggestionId: suggestion.id,
          suggestionType: suggestion.type,
          content: suggestion.content,
          position: suggestion.position,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to apply AI suggestion:', error);
      return false;
    }
  }

  /**
   * Provide feedback on AI suggestion
   */
  public async provideFeedback(
    suggestionId: string,
    feedback: 'helpful' | 'not_helpful' | 'incorrect',
    details?: string
  ): Promise<boolean> {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`${this.baseUrl}/ai/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          suggestionId,
          feedback,
          details: details || '',
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to provide AI feedback:', error);
      return false;
    }
  }

  /**
   * Extract plain text from document
   */
  private extractPlainText(document: Document): string {
    if (document.content?.plainText) {
      return document.content.plainText;
    }

    if (document.content?.blocks) {
      return document.content.blocks
        .map(block => this.extractBlockText(block))
        .join('\n\n');
    }

    return '';
  }

  /**
   * Extract text from content block
   */
  private extractBlockText(block: ContentBlock): string {
    if (typeof block.content === 'string') {
      return block.content;
    }

    if (Array.isArray(block.content)) {
      return block.content.join(' ');
    }

    return '';
  }

  /**
   * Check if NANDA service is available
   */
  public async isAvailable(): Promise<boolean> {
    if (!this.isEnabled) return false;

    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        timeout: 5000,
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const nandaIntegrationService = new NandaIntegrationService();
export default nandaIntegrationService;