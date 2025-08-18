/**
 * Jest setup file for Figma plugin tests
 * Provides comprehensive mocks for the Figma API
 */

// Mock global fetch for API tests
global.fetch = jest.fn();

// Mock atob/btoa for base64 handling
global.atob = jest.fn((str: string) => Buffer.from(str, 'base64').toString('binary'));
global.btoa = jest.fn((str: string) => Buffer.from(str, 'binary').toString('base64'));

// Figma API Mock Objects
class MockFigmaNode {
  id: string = 'mock-node-id';
  name: string = 'Mock Node';
  type: string = 'RECTANGLE';
  children: MockFigmaNode[] = [];
  x: number = 0;
  y: number = 0;
  width: number = 100;
  height: number = 100;
  fills: any[] = [];
  strokes: any[] = [];
  strokeWeight: number = 1;
  cornerRadius: number = 0;
  layoutMode: string = 'NONE';
  itemSpacing: number = 0;
  paddingLeft: number = 0;
  paddingRight: number = 0;
  paddingTop: number = 0;
  paddingBottom: number = 0;
  primaryAxisSizingMode: string = 'AUTO';
  counterAxisSizingMode: string = 'AUTO';
  layoutGrids: any[] = [];
  exportSettings: any[] = [];
  variantProperties: Record<string, string> = {};
  fontSize: number = 16;
  fontName: any = { family: 'Inter', style: 'Regular' };
  characters: string = '';
  lineHeight: any = { unit: 'AUTO' };
  letterSpacing: any = { unit: 'PERCENT', value: 0 };

  appendChild(child: MockFigmaNode) {
    this.children.push(child);
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  resizeWithoutConstraints(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
}

class MockPageNode extends MockFigmaNode {
  type = 'PAGE';
}

class MockComponentNode extends MockFigmaNode {
  type = 'COMPONENT';
}

class MockFrameNode extends MockFigmaNode {
  type = 'FRAME';
}

class MockRectangleNode extends MockFigmaNode {
  type = 'RECTANGLE';
}

class MockTextNode extends MockFigmaNode {
  type = 'TEXT';
}

class MockPaintStyle {
  id: string = 'mock-paint-style-id';
  name: string = 'Mock Paint Style';
  paints: any[] = [];
}

class MockTextStyle {
  id: string = 'mock-text-style-id';
  name: string = 'Mock Text Style';
  fontSize: number = 16;
  fontName: any = { family: 'Inter', style: 'Regular' };
  lineHeight: any = { unit: 'AUTO' };
  letterSpacing: any = { unit: 'PERCENT', value: 0 };
}

class MockVariableCollection {
  id: string = 'mock-collection-id';
  name: string = 'Mock Collection';
  modes: any[] = [{ modeId: 'mock-mode-id', name: 'Default' }];
}

class MockVariable {
  id: string = 'mock-variable-id';
  name: string = 'Mock Variable';

  setValueForMode(modeId: string, value: any) {
    // Mock implementation
  }
}

class MockImage {
  hash: string = 'mock-image-hash';
}

// Mock figma global
const mockFigma = {
  root: {
    children: [] as MockPageNode[]
  },
  currentPage: null as MockPageNode | null,

  // Node creation methods
  createPage(): MockPageNode {
    const page = new MockPageNode();
    page.type = 'PAGE';
    this.root.children.push(page);
    return page;
  },

  createComponent(): MockComponentNode {
    return new MockComponentNode();
  },

  createFrame(): MockFrameNode {
    return new MockFrameNode();
  },

  createRectangle(): MockRectangleNode {
    return new MockRectangleNode();
  },

  createText(): MockTextNode {
    return new MockTextNode();
  },

  createImage(bytes: Uint8Array): MockImage {
    return new MockImage();
  },

  // Style creation methods
  createPaintStyle(): MockPaintStyle {
    return new MockPaintStyle();
  },

  createTextStyle(): MockTextStyle {
    return new MockTextStyle();
  },

  // Variable methods
  variables: {
    createVariableCollection(name: string): MockVariableCollection {
      const collection = new MockVariableCollection();
      collection.name = name;
      return collection;
    },

    createVariable(name: string, collection: MockVariableCollection, type: string): MockVariable {
      const variable = new MockVariable();
      variable.name = name;
      return variable;
    }
  },

  // Utility methods
  combineAsVariants(nodes: MockComponentNode[], parent: MockPageNode): MockComponentNode {
    const set = new MockComponentNode();
    set.name = 'Variant Set';
    parent.appendChild(set);
    return set;
  },

  loadFontAsync(fontName: { family: string; style: string }): Promise<void> {
    return Promise.resolve();
  },

  // Plugin lifecycle methods
  showUI(html: string, options?: any) {
    // Mock implementation
  },

  closePlugin() {
    // Mock implementation
  },

  notify(message: string) {
    console.log('Figma notification:', message);
  },

  // UI communication
  ui: {
    onmessage: null as any,
    postMessage: jest.fn()
  }
};

// Make figma available globally
(global as any).figma = mockFigma;

// Mock console methods to reduce noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();

  // Reset figma state
  mockFigma.root.children = [];
  mockFigma.currentPage = null;

  // Mock console methods
  console.log = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

// Export mocks for use in tests
export {
  MockFigmaNode,
  MockPageNode,
  MockComponentNode,
  MockFrameNode,
  MockRectangleNode,
  MockTextNode,
  MockPaintStyle,
  MockTextStyle,
  MockVariableCollection,
  MockVariable,
  MockImage,
  mockFigma
};
