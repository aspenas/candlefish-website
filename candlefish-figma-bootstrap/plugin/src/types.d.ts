/**
 * Candlefish Figma Plugin - Comprehensive Type Definitions
 * Enhanced type safety for design tokens, components, and plugin functionality
 */

// Design Token Interfaces
export interface ColorToken {
  readonly name: string;
  readonly hex: string;
  readonly rgb: RGB;
  readonly hsl?: { h: number; s: number; l: number };
  readonly category: 'brand' | 'neutral' | 'accent' | 'semantic';
  readonly weight?: number;
}

export interface TypographyToken {
  readonly name: string;
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly fontWeight: 'Regular' | 'Medium' | 'SemiBold' | 'Bold';
  readonly letterSpacing: number;
  readonly fontFamily: string;
  readonly category: 'heading' | 'body' | 'caption' | 'display';
}

export interface SpacingToken {
  readonly name: string;
  readonly value: number;
  readonly scale: 'base' | '2x' | '4x' | '8x';
  readonly usage: 'component' | 'layout' | 'content';
}

export interface RadiusToken {
  readonly name: string;
  readonly value: number;
  readonly usage: 'button' | 'card' | 'input' | 'modal';
}

export interface ShadowToken {
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly blur: number;
  readonly spread: number;
  readonly color: string;
  readonly elevation: 'low' | 'medium' | 'high';
}

// Design System Configuration
export interface DesignSystemConfig {
  readonly colors: ReadonlyArray<ColorToken>;
  readonly typography: ReadonlyArray<TypographyToken>;
  readonly spacing: ReadonlyArray<SpacingToken>;
  readonly radius: ReadonlyArray<RadiusToken>;
  readonly shadows: ReadonlyArray<ShadowToken>;
  readonly grid: {
    readonly columns: number;
    readonly gutter: number;
    readonly margin: number;
    readonly maxWidth: number;
  };
}

// Component Creation Types
export interface ComponentConfig<T extends ComponentNode = ComponentNode> {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly category: 'layout' | 'input' | 'display' | 'feedback' | 'navigation';
  readonly variants?: ReadonlyArray<VariantConfig>;
  readonly properties?: ComponentProperties;
  readonly autoLayout?: AutoLayoutConfig;
  readonly styling?: ComponentStyling;
}

export interface VariantConfig {
  readonly name: string;
  readonly properties: Record<string, string>;
  readonly overrides?: Partial<ComponentStyling>;
}

export interface ComponentProperties {
  readonly [key: string]: 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP' | 'VARIANT';
}

export interface AutoLayoutConfig {
  readonly direction: 'HORIZONTAL' | 'VERTICAL' | 'NONE';
  readonly spacing: number;
  readonly padding: {
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
  };
  readonly alignment: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH';
  readonly distribution: 'SPACE_BETWEEN' | 'PACKED';
}

export interface ComponentStyling {
  readonly fills?: ReadonlyArray<Paint>;
  readonly strokes?: ReadonlyArray<Paint>;
  readonly strokeWeight?: number;
  readonly cornerRadius?: number | ReadonlyArray<number>;
  readonly effects?: ReadonlyArray<Effect>;
  readonly opacity?: number;
}

// Plugin Message Types
export interface PluginMessage {
  readonly type: string;
  readonly data?: unknown;
}

export interface BootstrapMessage extends PluginMessage {
  readonly type: 'bootstrap';
  readonly data: {
    readonly logoBytes?: Uint8Array;
    readonly config?: Partial<DesignSystemConfig>;
    readonly options?: BootstrapOptions;
  };
}

export interface TokenGenerationMessage extends PluginMessage {
  readonly type: 'generate-tokens';
  readonly data: {
    readonly format: 'json' | 'css' | 'scss' | 'tailwind';
    readonly includeMetadata?: boolean;
  };
}

export interface ExportAssetsMessage extends PluginMessage {
  readonly type: 'export-assets';
  readonly data: {
    readonly formats: ReadonlyArray<ExportFormat>;
    readonly components: ReadonlyArray<string>;
  };
}

// Plugin Configuration
export interface BootstrapOptions {
  readonly createPages: boolean;
  readonly createComponents: boolean;
  readonly createTokens: boolean;
  readonly createStyles: boolean;
  readonly enableGrid: boolean;
  readonly fontFallback: string;
}

export interface ExportFormat {
  readonly format: 'SVG' | 'PNG' | 'JPG' | 'PDF';
  readonly scale?: number;
  readonly suffix?: string;
  readonly contentsOnly?: boolean;
}

// Utility Types for Type Safety
export type StrictColorHex = `#${string}`;
export type FontWeight = 'Regular' | 'Medium' | 'SemiBold' | 'Bold';
export type ComponentCategory = 'layout' | 'input' | 'display' | 'feedback' | 'navigation';
export type TokenCategory = 'brand' | 'neutral' | 'accent' | 'semantic';

// Generic Utility Types
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends (infer U)[]
    ? ReadonlyArray<DeepReadonly<U>>
    : T[P] extends object
    ? DeepReadonly<T[P]>
    : T[P];
};

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Error Types
export class PluginError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PluginError';
  }
}

export class TokenValidationError extends PluginError {
  constructor(message: string, public readonly token: string) {
    super(message, 'TOKEN_VALIDATION_ERROR', { token });
    this.name = 'TokenValidationError';
  }
}

export class ComponentCreationError extends PluginError {
  constructor(message: string, public readonly componentName: string) {
    super(message, 'COMPONENT_CREATION_ERROR', { componentName });
    this.name = 'ComponentCreationError';
  }
}

// Type Guards
export function isColorToken(token: unknown): token is ColorToken {
  return (
    typeof token === 'object' &&
    token !== null &&
    'name' in token &&
    'hex' in token &&
    'rgb' in token &&
    'category' in token
  );
}

export function isTypographyToken(token: unknown): token is TypographyToken {
  return (
    typeof token === 'object' &&
    token !== null &&
    'name' in token &&
    'fontSize' in token &&
    'lineHeight' in token &&
    'fontWeight' in token
  );
}

export function isValidHexColor(hex: string): hex is StrictColorHex {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
}

// Plugin State Management
export interface PluginState {
  readonly isInitialized: boolean;
  readonly currentStep: BootstrapStep;
  readonly progress: number;
  readonly errors: ReadonlyArray<PluginError>;
  readonly config: DeepReadonly<DesignSystemConfig>;
}

export type BootstrapStep =
  | 'idle'
  | 'initializing'
  | 'creating-pages'
  | 'creating-tokens'
  | 'creating-styles'
  | 'creating-components'
  | 'creating-specimens'
  | 'complete'
  | 'error';

// Figma API Extensions
declare global {
  namespace Figma {
    interface PluginAPI {
      readonly state: PluginState;
      updateState(updates: Partial<PluginState>): void;
      validateToken<T>(token: unknown, guard: (token: unknown) => token is T): T;
    }
  }
}

// Re-export Figma API types with enhancements
export type {
  RGB,
  HSL,
  Paint,
  SolidPaint,
  GradientPaint,
  ImagePaint,
  Effect,
  DropShadowEffect,
  InnerShadowEffect,
  BlurEffect,
  LayoutGrid,
  LineHeight,
  LetterSpacing,
  FontName,
  ExportSettings,
  ComponentNode,
  FrameNode,
  RectangleNode,
  TextNode,
  PageNode,
  PaintStyle,
  TextStyle,
  EffectStyle,
  GridStyle,
  VariableCollection,
  Variable,
} from '@figma/plugin-typings';
