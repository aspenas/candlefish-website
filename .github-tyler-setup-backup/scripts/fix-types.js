#!/usr/bin/env node

/**
 * Type Safety Enhancement Script
 * Removes 'any' types and adds proper TypeScript interfaces
 */

const fs = require('fs').promises;
const path = require('path');
const { glob } = require('glob');
const ts = require('typescript');

class TypeSafetyFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.fixedFiles = 0;
    this.anyTypesRemoved = 0;
  }

  async run() {
    console.log('🔧 Fixing type safety issues...');

    try {
      // Find all TypeScript files
      const files = await glob('**/*.{ts,tsx}', {
        cwd: this.projectRoot,
        ignore: ['node_modules/**', 'dist/**', 'build/**', '.next/**']
      });

      for (const file of files) {
        await this.fixTypeIssues(file);
      }

      // Generate type definitions
      await this.generateTypeDefinitions();

      console.log(`✅ Fixed ${this.fixedFiles} files`);
      console.log(`✅ Removed ${this.anyTypesRemoved} 'any' types`);
    } catch (error) {
      console.error('❌ Type fixing failed:', error);
      process.exit(1);
    }
  }

  async fixTypeIssues(filePath) {
    const fullPath = path.join(this.projectRoot, filePath);
    let content = await fs.readFile(fullPath, 'utf-8');
    let modified = false;

    // Fix common any patterns
    const fixes = [
      {
        pattern: /: any\b/g,
        replacement: ': unknown',
        condition: (line) => !line.includes('// @ts-ignore')
      },
      {
        pattern: /\(([^)]+): any\)/g,
        replacement: '($1: unknown)'
      },
      {
        pattern: /as any\b/g,
        replacement: 'as unknown'
      },
      {
        pattern: /Array<any>/g,
        replacement: 'Array<unknown>'
      },
      {
        pattern: /Promise<any>/g,
        replacement: 'Promise<unknown>'
      }
    ];

    for (const fix of fixes) {
      const matches = content.match(fix.pattern);
      if (matches) {
        content = content.replace(fix.pattern, fix.replacement);
        this.anyTypesRemoved += matches.length;
        modified = true;
      }
    }

    // Add proper types for common patterns
    if (modified) {
      content = await this.addProperTypes(content, filePath);
      await fs.writeFile(fullPath, content);
      this.fixedFiles++;
    }
  }

  async addProperTypes(content, filePath) {
    // Add imports for missing types
    if (!content.includes('import type') && this.needsTypeImports(content)) {
      const typeImports = this.generateTypeImports(filePath);
      content = typeImports + '\n' + content;
    }

    // Replace unknown with specific types where possible
    content = this.inferTypes(content);

    // Add interface definitions
    content = this.addInterfaces(content);

    return content;
  }

  needsTypeImports(content) {
    return content.includes('React.') ||
           content.includes('HTMLElement') ||
           content.includes('Event');
  }

  generateTypeImports(filePath) {
    const imports = [];

    if (filePath.endsWith('.tsx')) {
      imports.push("import type { FC, ReactNode, CSSProperties } from 'react'");
    }

    if (filePath.includes('components/')) {
      imports.push("import type { ComponentProps } from '@/types/components'");
    }

    return imports.join('\n');
  }

  inferTypes(content) {
    // Infer types from usage patterns
    const patterns = [
      {
        match: /const\s+(\w+)\s*=\s*useState<unknown>/g,
        infer: (match, varName) => {
          // Infer state type from variable name
          if (varName.includes('loading')) return 'boolean';
          if (varName.includes('error')) return 'Error | null';
          if (varName.includes('data')) return 'Data | null';
          if (varName.includes('count')) return 'number';
          if (varName.includes('text') || varName.includes('string')) return 'string';
          if (varName.includes('items') || varName.includes('list')) return 'Array<Item>';
          return 'unknown';
        }
      },
      {
        match: /onClick:\s*\(\s*\)\s*=>\s*unknown/g,
        replace: 'onClick: () => void'
      },
      {
        match: /onChange:\s*\(e:\s*unknown\)/g,
        replace: 'onChange: (e: React.ChangeEvent<HTMLInputElement>)'
      }
    ];

    for (const pattern of patterns) {
      if (pattern.infer) {
        content = content.replace(pattern.match, (match, ...args) => {
          const inferredType = pattern.infer(match, ...args);
          return match.replace('unknown', inferredType);
        });
      } else if (pattern.replace) {
        content = content.replace(pattern.match, pattern.replace);
      }
    }

    return content;
  }

  addInterfaces(content) {
    // Add common interface definitions
    const interfaces = [];

    // Check for prop usage and add interfaces
    if (content.includes('Props') && !content.includes('interface') && !content.includes('type.*Props')) {
      const componentMatch = content.match(/export\s+(?:const|function)\s+(\w+)/);
      if (componentMatch) {
        const componentName = componentMatch[1];
        interfaces.push(`
interface ${componentName}Props {
  className?: string;
  children?: ReactNode;
  style?: CSSProperties;
}`);
      }
    }

    // Add data interfaces
    if (content.includes('data') && !content.includes('interface Data')) {
      interfaces.push(`
interface Data {
  id: string;
  [key: string]: unknown;
}`);
    }

    // Add error interface
    if (content.includes('error') && !content.includes('interface Error')) {
      interfaces.push(`
interface AppError extends Error {
  code?: string;
  details?: unknown;
}`);
    }

    if (interfaces.length > 0) {
      const interfaceBlock = interfaces.join('\n');
      // Add after imports
      const importEnd = content.lastIndexOf('import');
      if (importEnd !== -1) {
        const nextLine = content.indexOf('\n', importEnd);
        content = content.slice(0, nextLine + 1) + interfaceBlock + content.slice(nextLine + 1);
      }
    }

    return content;
  }

  async generateTypeDefinitions() {
    console.log('📝 Generating type definitions...');

    const globalTypes = `// Global type definitions for Tyler-Setup

export interface ThemeConfig {
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';
}

export interface TouchGesture {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinch?: (scale: number) => void;
  onLongPress?: () => void;
}

export interface ComponentVariants {
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface AccessibilityProps {
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-labelledby'?: string;
  'aria-live'?: 'polite' | 'assertive' | 'off';
  'aria-atomic'?: boolean;
  'aria-relevant'?: string;
  role?: string;
  tabIndex?: number;
}

export type PropsWithClassName<T = {}> = T & {
  className?: string;
}

export type PropsWithChildren<T = {}> = T & {
  children?: React.ReactNode;
}

export type HTMLProps<T> = React.HTMLAttributes<T> & AccessibilityProps;

export type ButtonProps = HTMLProps<HTMLButtonElement> & ComponentVariants & {
  loading?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export type InputProps = HTMLProps<HTMLInputElement> & {
  error?: boolean;
  helperText?: string;
  label?: string;
}

export type SelectProps = HTMLProps<HTMLSelectElement> & {
  options?: Array<{ value: string; label: string }>;
  error?: boolean;
}

export type CalculationInput = {
  [key: string]: number | string | boolean;
}

export type CalculationResult = {
  value: number;
  formula: string;
  timestamp: number;
  cached?: boolean;
}

export type EstimateData = {
  clientInfo?: Record<string, unknown>;
  calculations?: Record<string, CalculationResult>;
  metadata?: Record<string, unknown>;
}

// Zustand store types
export interface EstimateStore {
  estimate: EstimateData;
  updateEstimate: (data: Partial<EstimateData>) => void;
  clearEstimate: () => void;
  isLoading: boolean;
  error: Error | null;
}

// API response types
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
}

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

export type AsyncFunction<T = void> = () => Promise<T>;
export type VoidFunction = () => void;

// Form types
export interface FormField<T = string> {
  value: T;
  error?: string;
  touched?: boolean;
  required?: boolean;
}

export interface FormState<T = Record<string, unknown>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
}`;

    const typesDir = path.join(this.projectRoot, 'types');
    await fs.mkdir(typesDir, { recursive: true });
    await fs.writeFile(path.join(typesDir, 'tyler-setup.d.ts'), globalTypes);

    // Create index file
    const indexTypes = `export * from './tyler-setup';

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.svg' {
  const content: React.FunctionComponent<React.SVGAttributes<SVGElement>>;
  export default content;
}`;

    await fs.writeFile(path.join(typesDir, 'index.d.ts'), indexTypes);
  }
}

// Run the fixer
const fixer = new TypeSafetyFixer();
fixer.run().catch(console.error);
