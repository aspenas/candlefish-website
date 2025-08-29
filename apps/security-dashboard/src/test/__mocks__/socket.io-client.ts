// Mock Socket.IO client for testing
export const mockSocket = {
  on: vi.fn(),
  emit: vi.fn(),
  off: vi.fn(),
  disconnect: vi.fn(),
  connect: vi.fn(),
  connected: true,
  id: 'mock-socket-id',
};

const mockIo = vi.fn(() => mockSocket);

export default mockIo;

// Mock socket events
export const mockSocketEvents = {
  connect: 'connect',
  disconnect: 'disconnect',
  security_event: 'security_event',
  threat_detected: 'threat_detected',
  incident_updated: 'incident_updated',
  system_alert: 'system_alert',
};

export const emitMockEvent = (event: string, data: any) => {
  const handler = mockSocket.on.mock.calls.find(call => call[0] === event);
  if (handler) {
    handler[1](data);
  }
};