/**
 * Simple API test to verify Jest is working
 */

describe('Simple API Test', () => {
  it('should verify Jest is working', () => {
    expect(1 + 1).toBe(2);
  });

  it('should mock fetch', () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    );

    expect(global.fetch).toBeDefined();
    expect(typeof global.fetch).toBe('function');
  });
});
