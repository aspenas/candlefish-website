import { useState, useCallback } from 'react';
import { PromptTemplate, PromptOptimization, OptimizationImprovement } from '@/lib/prompt-engineering/types';

interface UsePromptOptimizationReturn {
  optimize: (template: PromptTemplate) => Promise<PromptOptimization>;
  isOptimizing: boolean;
  optimization: PromptOptimization | null;
  error: Error | null;
}

export const usePromptOptimization = (): UsePromptOptimizationReturn => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimization, setOptimization] = useState<PromptOptimization | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const optimize = useCallback(async (template: PromptTemplate): Promise<PromptOptimization> => {
    setIsOptimizing(true);
    setError(null);
    setOptimization(null);

    try {
      // Simulate optimization process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate mock optimization results
      const optimizedTemplate = { ...template };
      const improvements: OptimizationImprovement[] = [];
      let tokenReduction = 0;

      // Whitespace optimization
      const originalWhitespace = template.template.match(/\s+/g)?.length || 0;
      if (originalWhitespace > 10) {
        optimizedTemplate.template = template.template.replace(/\s+/g, ' ').trim();
        improvements.push({
          type: 'token-reduction',
          description: 'Removed excessive whitespace',
          impact: 'low',
          before: 'Multiple spaces and newlines',
          after: 'Single spaces only',
        });
        tokenReduction += 5;
      }

      // Redundancy removal
      const words = template.template.toLowerCase().split(' ');
      const duplicateWords = words.filter((word, index) => 
        words.indexOf(word) !== index && word.length > 3
      );
      
      if (duplicateWords.length > 0) {
        improvements.push({
          type: 'token-reduction',
          description: 'Removed redundant words and phrases',
          impact: 'medium',
          before: `Contains ${duplicateWords.length} duplicate words`,
          after: 'Unique words only',
        });
        tokenReduction += 15;
      }

      // Instruction simplification
      if (template.template.includes('Please') || template.template.includes('Could you')) {
        optimizedTemplate.template = template.template
          .replace(/Please\s+/gi, '')
          .replace(/Could you\s+/gi, '');
        
        improvements.push({
          type: 'clarity',
          description: 'Simplified instructions by removing politeness markers',
          impact: 'low',
          before: 'Please... Could you...',
          after: 'Direct instructions',
        });
        tokenReduction += 3;
      }

      // Structure improvements
      if (!template.template.includes('##') && template.template.length > 200) {
        optimizedTemplate.template = `## Task\n${template.template}\n\n## Requirements\n- Be specific and concise\n- Provide clear examples`;
        improvements.push({
          type: 'structure',
          description: 'Added clear structure with headers',
          impact: 'high',
          before: 'Unstructured text',
          after: 'Organized sections with headers',
        });
      }

      // Example optimization
      if (template.examples && template.examples.length > 3) {
        improvements.push({
          type: 'examples',
          description: 'Optimized examples for clarity',
          impact: 'medium',
          before: `${template.examples.length} examples`,
          after: 'Top 3 most relevant examples',
        });
        tokenReduction += 10;
      }

      // Calculate savings
      const originalTokens = estimateTokens(template.template);
      const optimizedTokens = Math.max(originalTokens - tokenReduction, originalTokens * 0.6);
      const costPerToken = 0.000015; // Estimated cost per token
      
      const optimizationResult: PromptOptimization = {
        original: template,
        optimized: optimizedTemplate,
        improvements,
        estimatedSavings: {
          tokenReduction: Math.round(((originalTokens - optimizedTokens) / originalTokens) * 100),
          costReduction: (originalTokens - optimizedTokens) * costPerToken,
          latencyReduction: Math.round(((originalTokens - optimizedTokens) / originalTokens) * 100 * 0.5), // Rough estimate
        },
      };

      setOptimization(optimizationResult);
      return optimizationResult;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Optimization failed');
      setError(error);
      throw error;
    } finally {
      setIsOptimizing(false);
    }
  }, []);

  return {
    optimize,
    isOptimizing,
    optimization,
    error,
  };
};

function estimateTokens(text: string): number {
  // Rough estimation: ~1.3 tokens per word
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words * 1.3);
}