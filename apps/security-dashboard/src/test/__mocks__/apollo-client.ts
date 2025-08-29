import { MockedProvider } from '@apollo/client/testing';
import { ReactElement } from 'react';
import { vi } from 'vitest';

// Mock Apollo Client for testing
export const mockApolloClient = {
  query: vi.fn(),
  mutate: vi.fn(),
  watchQuery: vi.fn(),
  subscribe: vi.fn(),
  readQuery: vi.fn(),
  writeQuery: vi.fn(),
  resetStore: vi.fn(),
  clearStore: vi.fn(),
};

// Test wrapper with Apollo MockedProvider
export const createApolloTestWrapper = (mocks: any[] = []) => {
  return ({ children }: { children: ReactElement }) => (
    <MockedProvider mocks={mocks} addTypename={false}>
      {children}
    </MockedProvider>
  );
};

export { MockedProvider };