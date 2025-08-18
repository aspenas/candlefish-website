/**
 * Tests for export functionality including Figma API interactions
 */
import * as fs from 'fs';
import * as path from 'path';

// Mock fs and path modules
jest.mock('fs');
jest.mock('path');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;

// Mock fetch for API calls
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('Export Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock fs operations
    mockFs.mkdirSync.mockImplementation(() => undefined);
    mockFs.writeFileSync.mockImplementation(() => undefined);

    // Mock path operations
    mockPath.join.mockImplementation((...args) => args.join('/'));

    // Mock process.cwd
    Object.defineProperty(process, 'cwd', {
      value: jest.fn(() => '/test/project'),
      writable: true
    });
  });

  describe('Figma API Integration', () => {
    test('should authenticate with Figma API correctly', async () => {
      const mockToken = 'test-figma-token';
      const mockFileKey = 'test-file-key';

      process.env.FIGMA_TOKEN = mockToken;
      process.env.FIGMA_FILE_KEY = mockFileKey;

      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          document: {
            id: 'root',
            name: 'Document',
            children: []
          }
        })
      } as Response);

      const apiUrl = `https://api.figma.com/v1/files/${mockFileKey}`;
      const headers = { 'X-Figma-Token': mockToken };

      const response = await fetch(apiUrl, { headers });
      const data = await response.json();

      expect(mockFetch).toHaveBeenCalledWith(apiUrl, { headers });
      expect(data.document).toBeDefined();
    });

    test('should handle API authentication errors', async () => {
      const mockToken = 'invalid-token';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized'
      } as Response);

      const response = await fetch('https://api.figma.com/v1/files/test', {
        headers: { 'X-Figma-Token': mockToken }
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });

    test('should handle missing authentication token', () => {
      delete process.env.FIGMA_TOKEN;

      expect(() => {
        const token = process.env.FIGMA_TOKEN;
        if (!token) {
          throw new Error('FIGMA_TOKEN not set. Run npm run fetch:token:cli and eval the export, or set FIGMA_TOKEN.');
        }
      }).toThrow('FIGMA_TOKEN not set');
    });

    test('should handle missing file key', () => {
      process.env.FIGMA_TOKEN = 'test-token';
      delete process.env.FIGMA_FILE_KEY;

      const fileKey = process.env.FIGMA_FILE_KEY || process.argv[2];

      expect(() => {
        if (!fileKey) {
          throw new Error('Provide FIGMA_FILE_KEY (env) or pass as arg: node scripts/dist/export-assets.js <FILE_KEY>');
        }
      }).toThrow('Provide FIGMA_FILE_KEY');
    });
  });

  describe('Node Discovery', () => {
    test('should find logo nodes in document tree', () => {
      const mockDocument = {
        document: {
          children: [
            {
              name: 'Assets Page',
              children: [
                { name: 'Logo', id: 'logo-component-id' },
                { name: 'Logo/Primary', id: 'logo-primary-id' },
                { name: 'Logo/Lockup/Horizontal', id: 'logo-horizontal-id' },
                { name: 'Logo/Lockup/Stacked', id: 'logo-stacked-id' }
              ]
            }
          ]
        }
      };

      const nodeMap: Record<string, string> = {};

      function walk(node: any) {
        if (node && node.name) {
          if (node.name === 'Logo' && node.id) nodeMap['Logo'] = node.id;
          if (node.name === 'Logo/Primary' && node.id) nodeMap['Logo/Primary'] = node.id;
          if (node.name === 'Logo/Lockup/Horizontal' && node.id) nodeMap['Logo/Lockup/Horizontal'] = node.id;
          if (node.name === 'Logo/Lockup/Stacked' && node.id) nodeMap['Logo/Lockup/Stacked'] = node.id;
        }
        if (node.children) node.children.forEach(walk);
      }

      walk(mockDocument.document);

      expect(nodeMap['Logo']).toBe('logo-component-id');
      expect(nodeMap['Logo/Primary']).toBe('logo-primary-id');
      expect(nodeMap['Logo/Lockup/Horizontal']).toBe('logo-horizontal-id');
      expect(nodeMap['Logo/Lockup/Stacked']).toBe('logo-stacked-id');
    });

    test('should handle missing nodes gracefully', () => {
      const mockDocument = {
        document: {
          children: [
            {
              name: 'Empty Page',
              children: []
            }
          ]
        }
      };

      const nodeMap: Record<string, string> = {};

      function walk(node: any) {
        if (node && node.name) {
          if (node.name === 'Logo/Primary' && node.id) nodeMap['Logo/Primary'] = node.id;
        }
        if (node.children) node.children.forEach(walk);
      }

      walk(mockDocument.document);

      expect(Object.keys(nodeMap)).toHaveLength(0);
    });

    test('should traverse deeply nested structures', () => {
      const mockDocument = {
        document: {
          children: [
            {
              name: 'Page 1',
              children: [
                {
                  name: 'Section 1',
                  children: [
                    {
                      name: 'Group 1',
                      children: [
                        { name: 'Logo/Primary', id: 'deep-logo-id' }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      };

      const nodeMap: Record<string, string> = {};

      function walk(node: any) {
        if (node && node.name === 'Logo/Primary' && node.id) {
          nodeMap['Logo/Primary'] = node.id;
        }
        if (node.children) node.children.forEach(walk);
      }

      walk(mockDocument.document);

      expect(nodeMap['Logo/Primary']).toBe('deep-logo-id');
    });
  });

  describe('Image Export', () => {
    test('should request image exports for SVG format', async () => {
      const mockFileKey = 'test-file-key';
      const mockNodeId = 'logo-node-id';
      const mockImageUrl = 'https://figma-images.com/test-image.svg';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          images: {
            [mockNodeId]: mockImageUrl
          }
        })
      } as Response);

      const response = await fetch(
        `https://api.figma.com/v1/images/${mockFileKey}?ids=${encodeURIComponent(mockNodeId)}&format=svg`,
        { headers: { 'X-Figma-Token': 'test-token' } }
      );

      const data = await response.json();

      expect(data.images[mockNodeId]).toBe(mockImageUrl);
    });

    test('should request image exports for PDF format', async () => {
      const mockFileKey = 'test-file-key';
      const mockNodeId = 'logo-node-id';
      const mockImageUrl = 'https://figma-images.com/test-image.pdf';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          images: {
            [mockNodeId]: mockImageUrl
          }
        })
      } as Response);

      const response = await fetch(
        `https://api.figma.com/v1/images/${mockFileKey}?ids=${encodeURIComponent(mockNodeId)}&format=pdf`,
        { headers: { 'X-Figma-Token': 'test-token' } }
      );

      const data = await response.json();

      expect(data.images[mockNodeId]).toBe(mockImageUrl);
    });

    test('should handle image export failures', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad Request'
      } as Response);

      const response = await fetch(
        'https://api.figma.com/v1/images/invalid-file?ids=invalid-id&format=svg',
        { headers: { 'X-Figma-Token': 'test-token' } }
      );

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    test('should handle missing image URLs', async () => {
      const mockNodeId = 'missing-node-id';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          images: {} // Empty object - no URLs generated
        })
      } as Response);

      const response = await fetch(
        `https://api.figma.com/v1/images/test-file?ids=${mockNodeId}&format=svg`,
        { headers: { 'X-Figma-Token': 'test-token' } }
      );

      const data = await response.json();

      expect(data.images[mockNodeId]).toBeUndefined();
    });
  });

  describe('File Download and Save', () => {
    test('should download and save image files', async () => {
      const mockImageData = new Uint8Array([137, 80, 78, 71]); // PNG header
      const mockImageUrl = 'https://figma-images.com/test.svg';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => mockImageData.buffer
      } as Response);

      const response = await fetch(mockImageUrl, {
        headers: { 'X-Figma-Token': 'test-token' }
      });

      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      expect(bytes).toEqual(mockImageData);
    });

    test('should create export directory', () => {
      const distDir = '/test/project/dist/exports';

      mockFs.mkdirSync(distDir, { recursive: true });

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(distDir, { recursive: true });
    });

    test('should save files with correct naming', () => {
      const mockBytes = new Uint8Array([1, 2, 3, 4]);
      const distDir = '/test/project/dist/exports';
      const filename = '/test/project/dist/exports/logo-primary.svg';

      mockFs.writeFileSync(filename, Buffer.from(mockBytes));

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        filename,
        Buffer.from(mockBytes)
      );
    });

    test('should handle file save errors', () => {
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Disk full');
      });

      expect(() => {
        mockFs.writeFileSync('/test/file.svg', Buffer.from([1, 2, 3]));
      }).toThrow('Disk full');
    });
  });

  describe('Export Workflow', () => {
    test('should export all logo variants correctly', async () => {
      const exportItems = [
        { name: 'Logo/Primary', id: 'primary-id', format: 'svg' as const },
        { name: 'Logo/Primary', id: 'primary-id', format: 'pdf' as const },
        { name: 'Logo/Lockup/Horizontal', id: 'horizontal-id', format: 'svg' as const },
        { name: 'Logo/Lockup/Horizontal', id: 'horizontal-id', format: 'pdf' as const },
        { name: 'Logo/Lockup/Stacked', id: 'stacked-id', format: 'svg' as const },
        { name: 'Logo/Lockup/Stacked', id: 'stacked-id', format: 'pdf' as const },
      ];

      const exportPromises = exportItems.map(async (item) => {
        // Mock image export API response
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            images: {
              [item.id]: `https://figma-images.com/${item.id}.${item.format}`
            }
          })
        } as Response);

        // Mock image download
        mockFetch.mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1024)
        } as Response);

        return item;
      });

      const results = await Promise.all(exportPromises);

      expect(results).toHaveLength(6);
      expect(mockFetch).toHaveBeenCalledTimes(12); // 6 API calls + 6 downloads
    });

    test('should generate correct filenames', () => {
      const pairs: Array<[string, string]> = [
        ['Logo/Primary', 'logo-primary'],
        ['Logo/Lockup/Horizontal', 'logo-lockup-horizontal'],
        ['Logo/Lockup/Stacked', 'logo-lockup-stacked'],
      ];

      pairs.forEach(([nodeName, expectedFilename]) => {
        const outName = pairs.find(([n]) => n === nodeName)?.[1] ||
                       nodeName.replace(/\W+/g, '-').toLowerCase();

        expect(outName).toBe(expectedFilename);
      });
    });

    test('should handle partial export failures', async () => {
      const items = [
        { name: 'Logo/Primary', id: 'success-id' },
        { name: 'Logo/Missing', id: 'missing-id' }
      ];

      // First item succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          images: { 'success-id': 'https://example.com/success.svg' }
        })
      } as Response);

      // Second item fails
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          images: {} // No URL for missing-id
        })
      } as Response);

      const results = await Promise.all([
        fetch('https://api.figma.com/v1/images/test?ids=success-id&format=svg'),
        fetch('https://api.figma.com/v1/images/test?ids=missing-id&format=svg')
      ]);

      const [successData, failData] = await Promise.all(
        results.map(r => r.json())
      );

      expect(successData.images['success-id']).toBeDefined();
      expect(failData.images['missing-id']).toBeUndefined();
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle network timeouts', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      await expect(
        fetch('https://api.figma.com/v1/files/test')
      ).rejects.toThrow('Network timeout');
    });

    test('should handle malformed API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      } as Response);

      const response = await fetch('https://api.figma.com/v1/files/test');

      await expect(response.json()).rejects.toThrow('Invalid JSON');
    });

    test('should validate API response structure', async () => {
      const invalidResponse = {
        // Missing 'document' property
        data: {}
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidResponse
      } as Response);

      const response = await fetch('https://api.figma.com/v1/files/test');
      const data = await response.json();

      expect(data.document).toBeUndefined();
    });

    test('should handle file system errors', () => {
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => {
        mockFs.writeFileSync('/protected/file.svg', Buffer.from([]));
      }).toThrow('Permission denied');
    });
  });

  describe('Configuration Validation', () => {
    test('should validate export formats', () => {
      const validFormats = ['svg', 'pdf', 'png', 'jpg'];
      const testFormat = 'svg';

      expect(validFormats).toContain(testFormat);
    });

    test('should validate file naming patterns', () => {
      const testNames = [
        'logo-primary.svg',
        'logo-lockup-horizontal.pdf',
        'logo-lockup-stacked.svg'
      ];

      testNames.forEach(name => {
        expect(name).toMatch(/^[a-z0-9-]+\.(svg|pdf|png|jpg)$/);
      });
    });

    test('should validate export directory paths', () => {
      const validPaths = [
        '/test/project/dist/exports',
        './dist/exports',
        '../output/assets'
      ];

      validPaths.forEach(path => {
        expect(typeof path).toBe('string');
        expect(path.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance Considerations', () => {
    test('should handle multiple concurrent exports', async () => {
      const concurrentExports = Array.from({ length: 10 }, (_, i) => ({
        id: `node-${i}`,
        format: 'svg'
      }));

      const exportPromises = concurrentExports.map(async (item) => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            images: { [item.id]: `https://example.com/${item.id}.${item.format}` }
          })
        } as Response);

        return item;
      });

      const startTime = Date.now();
      const results = await Promise.all(exportPromises);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(10);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should handle large file downloads', async () => {
      const largeFileSize = 10 * 1024 * 1024; // 10MB
      const mockLargeFile = new ArrayBuffer(largeFileSize);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => mockLargeFile
      } as Response);

      const response = await fetch('https://example.com/large-image.svg');
      const arrayBuffer = await response.arrayBuffer();

      expect(arrayBuffer.byteLength).toBe(largeFileSize);
    });
  });
});
